from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from pydantic import BaseModel
from typing import Literal
import models
from deps import get_db, get_current_user
from auth import hash_password

#:> Este router maneja registro, lectura y cambios de perfil de usuario
router = APIRouter(prefix="/usuarios", tags=["Users"])


# ────────────────────────────────────────────
# Modelos Pydantic
# ────────────────────────────────────────────

class UsuarioCreate(BaseModel):
    #:> Este modelo recibe todos los datos del formulario de registro
    apodo: str
    nombre: str
    correo: str
    telefono: str
    matricula: int
    password: str
    rol: Literal["administrador", "vendedor", "cliente"]
    recaptcha_token: str | None = None


class CampoUpdate(BaseModel):
    #:> Este modelo reutilizable recibe el valor nuevo en cambios simples de perfil
    valor: str  # usado en todos los PUT de perfil, incluyendo password


# asiel: Modelo de respuesta para usuario después de crear o consultar
class UsuarioResponse(BaseModel):
    #:> Este modelo deja una respuesta simple de usuario para altas o consultas
    id: int
    nombre: str
    apodo: str | None
    correo: str
    telefono: str | None
    rol_id: int = None  # Este será el ID del rol desde relacion
    
    class Config:
        from_attributes = True


# asiel: Modelo de respuesta que incluye relación anidada
class UsuarioResponseWithRelacion(BaseModel):
    #:> Este modelo deja la respuesta con la relacion del usuario ya anidada
    id: int
    nombre: str
    apodo: str | None
    correo: str
    telefono: str | None
    relacion: dict | None = None
    
    class Config:
        from_attributes = True


# ────────────────────────────────────────────
# RUTAS ESTÁTICAS — van antes de /{param}
# ────────────────────────────────────────────

@router.get("/me")
def obtener_usuario_actual(
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    #:> Este endpoint devuelve el perfil del usuario autenticado
    """asiel: Retorna el usuario actual con su relación anidada"""
    usuario = db.query(models.Usuario).options(
        selectinload(models.Usuario.relacion)
    ).filter(models.Usuario.id == current_user.id).first()
    
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # asiel: Serializar como diccionario para evitar problemas de serializacion
    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "correo": usuario.correo,
        "apodo": usuario.apodo,
        "telefono": usuario.telefono,
        "relacion": {
            "matricula": usuario.relacion.matricula,
            "rol": usuario.relacion.rol,
            "estado": usuario.relacion.estado
        }
    }


@router.get("/")
def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint deja al admin listar todos los usuarios con rol y estado
    """asiel: Lista todos los usuarios (solo administradores)"""
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="No tienes permiso para listar usuarios")
    
    usuarios = db.query(models.Usuario).options(
        selectinload(models.Usuario.relacion)
    ).all()
    
    # asiel: Serializar cada usuario como diccionario
    respuesta = []
    for usuario in usuarios:
        respuesta.append({
            "id": usuario.id,
            "nombre": usuario.nombre,
            "correo": usuario.correo,
            "apodo": usuario.apodo,
            "telefono": usuario.telefono,
            "relacion": {
                "matricula": usuario.relacion.matricula,
                "rol": usuario.relacion.rol,
                "estado": usuario.relacion.estado
            }
        })
    
    return respuesta


# ────────────────────────────────────────────
# CREAR USUARIO (registro público)
# ────────────────────────────────────────────

@router.post("/", status_code=201)
def crear_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    #:> Este endpoint registra un usuario nuevo y crea su acceso en usuario_relacion
    """
    Crea un nuevo usuario en la BD.
    
    Validaciones previas:
    1. El email no debe estar ya registrado
    2. La matricula no debe estar ya registrada
    3. Debe existir un OTP verificado (estado='usado') para ese email
    
    Si el OTP es valido, se crea el usuario y se elimina el registro de OTP.
    """
    # Las validaciones de negocio van FUERA del try/except de SQLAlchemy
    # para que sus HTTPException lleguen intactas al cliente.
    
    # Validar que el email no este ya registrado
    existente = db.query(models.Usuario).filter(
        models.Usuario.correo == usuario.correo
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="El correo ya esta registrado")

    # Validar que la matricula no este ya registrada
    existente_matricula = db.query(models.UsuarioRelacion).filter(
        models.UsuarioRelacion.matricula == usuario.matricula
    ).first()
    if existente_matricula:
        raise HTTPException(status_code=400, detail="La matricula ya esta registrada")
    
    # Validar que el OTP haya sido verificado para este email
    otp_verificado = db.query(models.VerificacionOTP).filter(
        models.VerificacionOTP.email == usuario.correo,
        models.VerificacionOTP.estado == 'usado'
    ).first()
    
    if not otp_verificado:
        raise HTTPException(
            status_code=400,
            detail="Email no verificado. Debes ingresar el codigo OTP primero"
        )

    # Solo los errores de BD van dentro del try/except
    try:
        # Crear la relacion del usuario (credenciales)
        relacion = models.UsuarioRelacion(
            matricula=usuario.matricula,
            password=hash_password(usuario.password),
            rol=usuario.rol,
            estado=1
        )
        db.add(relacion)
        db.flush()  # Para obtener el ID de la relacion antes de crear el usuario
        print(f"UsuarioRelacion creada con ID: {relacion.id}")

        # Crear el usuario principal
        nuevo_usuario = models.Usuario(
            apodo=usuario.apodo,
            nombre=usuario.nombre,
            correo=usuario.correo,
            telefono=usuario.telefono,
            usuario_relacion_id=relacion.id
        )
        db.add(nuevo_usuario)
        db.commit()  # Commit principal
        print(f"Usuario creado con ID: {nuevo_usuario.id}")
        
        # asiel: Limpiar el OTP ya utilizado después de crear al usuario
        try:
            db.delete(otp_verificado)
            db.commit()
            print(f"OTP eliminado para {usuario.correo}")
        except Exception as e:
            # Si falla el delete del OTP, no causa error en la creacion del usuario
            print(f"Advertencia: No se pudo borrar OTP: {str(e)}")
            db.rollback()

        # Retornar respuesta simple pero completa
        return {
            "id": nuevo_usuario.id,
            "nombre": nuevo_usuario.nombre,
            "correo": nuevo_usuario.correo,
            "apodo": nuevo_usuario.apodo or "",
            "telefono": nuevo_usuario.telefono or "",
            "relacion": {
                "matricula": relacion.matricula,
                "rol": relacion.rol,
                "estado": relacion.estado
            }
        }

    except Exception as e:
        db.rollback()
        import traceback
        print(f"Error al crear usuario: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error al crear usuario: {str(e)}")


# ────────────────────────────────────────────
# ELIMINAR USUARIO
# ────────────────────────────────────────────

@router.delete("/{usuario_id}")
def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint deja al admin eliminar un usuario completo del sistema
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar usuarios")

    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    try:
        db.delete(usuario)
        db.commit()
        return {"mensaje": f"Usuario {usuario_id} eliminado correctamente"}
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar: {str(e)}")


# ────────────────────────────────────────────
# MODIFICAR PERFIL
# Todos usan CampoUpdate { valor: str }
# incluyendo password — alineado con users.ts
# ────────────────────────────────────────────

@router.put("/modificar-nombre")
def modificar_nombre(
    datos: CampoUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint cambia el nombre visible del usuario autenticado
    current_user.nombre = datos.valor
    db.commit()
    db.refresh(current_user)
    return {"mensaje": "Nombre actualizado correctamente"}


@router.put("/modificar-correo")
def modificar_correo(
    datos: CampoUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint cambia el correo del usuario si no esta repetido
    existente = db.query(models.Usuario).filter(
        models.Usuario.correo == datos.valor
    ).first()
    if existente and existente.id != current_user.id:
        raise HTTPException(status_code=400, detail="El correo ya está en uso")

    current_user.correo = datos.valor
    db.commit()
    db.refresh(current_user)
    return {"mensaje": "Correo actualizado correctamente"}


@router.put("/modificar-apodo")
def modificar_apodo(
    datos: CampoUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint cambia el apodo del usuario autenticado
    current_user.apodo = datos.valor
    db.commit()
    db.refresh(current_user)
    return {"mensaje": "Apodo actualizado correctamente"}


@router.put("/modificar-telefono")
def modificar_telefono(
    datos: CampoUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint cambia el telefono del usuario autenticado
    current_user.telefono = datos.valor
    db.commit()
    db.refresh(current_user)
    return {"mensaje": "Teléfono actualizado correctamente"}


@router.put("/modificar-password")
def modificar_password(
    datos: CampoUpdate,  # espera { valor: "nueva_password" }
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint cambia la contrasena del usuario aplicando hash antes de guardar
    current_user.relacion.password = hash_password(datos.valor)
    db.commit()
    db.refresh(current_user)
    return {"mensaje": "Contraseña actualizada correctamente"}


from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .database import SessionLocal
from . import models

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()




# ────────────────────────────────────────────
# ENDPOINT DE PRUEBA — Crear usuario administrador
# ────────────────────────────────────────────

@router.post("/init-admin")
def crear_admin(db: Session = Depends(get_db)):
    # verificar si ya existe un usuario con ese correo
    existente = db.query(models.Usuario).filter(
        models.Usuario.correo == "toritoseats@gmail.com"
    ).first()
    if existente:
        return {"mensaje": "Ya existe el usuario administrador", "id": existente.id}

    # crear la relación de credenciales
    relacion = models.UsuarioRelacion(
        matricula=999999,  # número fijo de prueba
        password=hash_password("Asiel1234"),  # contraseña de prueba
        rol="administrador",  # rol administrador
        estado=1
    )
    db.add(relacion)
    db.flush()  # obtener el ID antes de crear el usuario

    # crear el usuario principal
    admin = models.Usuario(
        apodo="admin",
        nombre="Administrador",
        correo="toritoseats@gmail.com",
        telefono="0000000000",
        usuario_relacion_id=relacion.id
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    return {
        "mensaje": "Usuario administrador creado correctamente",
        "id": admin.id,
        "correo": admin.correo,
        "rol": relacion.rol
    }
