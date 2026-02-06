from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from deps import get_db, get_current_user
from auth import hash_password

router = APIRouter(prefix="/usuarios", tags=["Users"])


@router.post("/")#funcion para crear usuarios
def crear_usuario(
    nombre: str,
    correo: str,
    telefono: str,
    matricula: int,
    password: str,
    rol_id: int,
    db: Session = Depends(get_db) #datos de la bd
):
    nuevo_usuario = models.Usuario(
        nombre=nombre,
        correo=correo,
        telefono=telefono,
        matricula=matricula,
        password=hash_password(password),  #ciframos la contrasenia
        rol_id=rol_id 
    )#establecemos los campos para el nuevo usuario

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return nuevo_usuario



@router.get("/") #esta ruta esta protegida
def listar_usuarios(#funcion para crear usuarios
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user) #usamos esto para que solo pueda ser usado por
    #usuarios iniciados de sesion
    #aun no se establecen permisos por algun rol
):
    return db.query(models.Usuario).all()


@router.delete("/{usuario_id}")#metodo para eliminar usuarios por id
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


@router.delete("/matricula/{matricula}")#eliminar usuario por matricula
def eliminar_usuario_por_matricula(
    matricula: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    usuario = db.query(models.Usuario).filter(models.Usuario.matricula == matricula).first()
    
    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )
    
    db.delete(usuario)
    db.commit()
    
    return {"mensaje": f"Usuario con matrícula {matricula} eliminado correctamente"}

#las dos funciones de eliminar estan protegidas 