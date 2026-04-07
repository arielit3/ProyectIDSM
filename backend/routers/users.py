from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel
from typing import Literal
import models
from deps import get_db, get_current_user
from auth import hash_password

router = APIRouter(prefix="/usuarios", tags=["Users"])


# ────────────────────────────────────────────
# Modelos Pydantic
# ────────────────────────────────────────────

class UsuarioCreate(BaseModel):
    apodo: str
    nombre: str
    correo: str
    telefono: str
    matricula: int
    password: str
    rol: Literal["administrador", "vendedor", "cliente"]
    recaptcha_token: str | None = None


class CampoUpdate(BaseModel):
    valor: str  # usado en todos los PUT de perfil, incluyendo password


# ────────────────────────────────────────────
# RUTAS ESTÁTICAS — van antes de /{param}
# ────────────────────────────────────────────

@router.get("/me")
def obtener_usuario_actual(
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    usuario = db.query(models.Usuario).options(
        selectinload(models.Usuario.relacion)
    ).filter(models.Usuario.id == current_user.id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


@router.get("/")
def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="No tienes permiso para listar usuarios")
    return db.query(models.Usuario).options(
        selectinload(models.Usuario.relacion)
    ).all()


# ────────────────────────────────────────────
# CREAR USUARIO (registro público)
# ────────────────────────────────────────────

@router.post("/", status_code=201)
def crear_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db)):
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
        db.flush()

        # Crear el usuario principal
        nuevo_usuario = models.Usuario(
            apodo=usuario.apodo,
            nombre=usuario.nombre,
            correo=usuario.correo,
            telefono=usuario.telefono,
            usuario_relacion_id=relacion.id
        )
        db.add(nuevo_usuario)
        db.commit()
        
        # Limpiar el OTP ya utilizado
        db.delete(otp_verificado)
        db.commit()

        # Retornar el usuario creado con su informacion completa
        usuario_completo = db.query(models.Usuario).options(
            selectinload(models.Usuario.relacion)
        ).filter(models.Usuario.id == nuevo_usuario.id).first()

        return usuario_completo

    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")


# ────────────────────────────────────────────
# ELIMINAR USUARIO
# ────────────────────────────────────────────

@router.delete("/{usuario_id}")
def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
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
    current_user.relacion.password = hash_password(datos.valor)
    db.commit()
    db.refresh(current_user)
    return {"mensaje": "Contraseña actualizada correctamente"}