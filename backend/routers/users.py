from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Literal
import models
from deps import get_db, get_current_user
from auth import hash_password

# Se define el router con prefijo /usuarios
router = APIRouter(prefix="/usuarios", tags=["Users"])

# Modelo Pydantic para validar datos de entrada al crear usuario
class UsuarioCreate(BaseModel):
    #creamos una clase que usaremos para guardar las propiedades de el nuevo usuario
    apodo: str
    nombre: str
    correo: str
    telefono: str
    matricula: int
    password: str
    rol: Literal["administrador", "vendedor", "cliente"]

class ModificarNombre(BaseModel):
    nombre: str

class ModificarCorreo(BaseModel):
    correo: str

class ModificarApodo(BaseModel):
    apodo: str

class ModificarTelefono(BaseModel):
    telefono: str

class ModificarPassword(BaseModel):
    password: str  

@router.post("/")
def crear_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db)):

    existente = db.query(models.Usuario).filter(
        models.Usuario.correo == usuario.correo
    ).first()

    if existente:
        raise HTTPException(
            status_code=400,
            detail="El correo ya esta registrado"
        )

    existente_matricula = db.query(models.UsuarioRelacion).filter(
        models.UsuarioRelacion.matricula == usuario.matricula
    ).first()

    if existente_matricula:
        raise HTTPException(
            status_code=400,
            detail="La matrícula ya está registrada"
        )

    relacion = models.UsuarioRelacion(
        matricula=usuario.matricula,
        password=hash_password(usuario.password),
        rol=usuario.rol
    )

    db.add(relacion)
    db.flush()  # obtiene el id sin hacer commit

    nuevo_usuario = models.Usuario(
        apodo=usuario.apodo,
        nombre=usuario.nombre,
        correo=usuario.correo,
        telefono=usuario.telefono,
        usuario_relacion_id=relacion.id
    )

    db.add(nuevo_usuario)
    db.commit()

    db.refresh(nuevo_usuario)

    return nuevo_usuario

# -------- LISTAR USUARIOS --------
@router.get("/")  # ruta protegida
def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)  # requiere usuario autenticado
):
    return db.query(models.Usuario).all()

# -------- ELIMINAR USUARIO --------
@router.delete("/{usuario_id}")  # eliminar por id, ruta protegida
def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )
    db.delete(usuario)
    db.commit()
    return {"mensaje": f"Usuario {usuario_id} eliminado correctamente"}

# -------- USUARIO ACTUAL --------
@router.get("/me")
def obtener_usuario_actual(
    current_user: models.Usuario = Depends(get_current_user)
):
    # esta funcion devuelve el usuario actual segun el token
    # get_current_user ya valida el token y busca el usuario en la base
    #de esta forma mantenemos la seguridad de que el usuario y token esten unidos
    return current_user

# -------- MODIFICAR APODO --------
@router.put("/modificar-apodo")
def modificar_apodo(
    datos: ModificarApodo,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):

    current_user.apodo = datos.apodo

    db.commit()
    db.refresh(current_user)

    return {"mensaje": "Apodo actualizado correctamente"}

# -------- MODIFICAR TELEFONO --------
@router.put("/modificar-telefono")
def modificar_telefono(
    datos: ModificarTelefono,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    current_user.telefono = datos.telefono

    db.commit()
    db.refresh(current_user)

    return {"mensaje": "Telefono actualizado correctamente"}

# -------- MODIFICAR PASSWORD --------
@router.put("/modificar-password")
def modificar_password(
    datos: ModificarPassword,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):

    nueva_password = hash_password(datos.password)

    current_user.relacion.password = nueva_password

    db.commit()
    db.refresh(current_user)

    return {"mensaje": "Contrasena actualizada correctamente"}

# -------- MODIFICAR NOMBRE --------
@router.put("/modificar-nombre")
def modificar_nombre(
    datos: ModificarNombre,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):

    current_user.nombre = datos.nombre

    db.commit()
    db.refresh(current_user)

    return {"mensaje": "Nombre actualizado correctamente"}

# -------- MODIFICAR CORREO --------
@router.put("/modificar-correo")
def modificar_correo(
    datos: ModificarCorreo,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):

    existente = db.query(models.Usuario).filter(
        models.Usuario.correo == datos.correo
    ).first()

    if existente:
        raise HTTPException(
            status_code=400,
            detail="El correo ya está en uso"
        )

    current_user.correo = datos.correo

    db.commit()
    db.refresh(current_user)

    return {"mensaje": "Correo actualizado correctamente"}

