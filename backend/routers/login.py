from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models
from auth import verify_password, create_access_token
from deps import get_db

#:> Este router maneja el inicio de sesion y devuelve el JWT del usuario
router = APIRouter(tags=["default"])  #con los tangs podemos separar por secciones


@router.post("/login")#metodo post
def login(#funcion login que usaremos 
    form_data: OAuth2PasswordRequestForm = Depends(),#el tipo de dato que admite
    db: Session = Depends(get_db)#la conexion a la bd
):
    #:> Este endpoint valida correo y contrasena
    #:> Si todo sale bien devuelve token bearer y datos basicos del usuario
    user = db.query(models.Usuario).filter(models.Usuario.correo == form_data.username).first()
    #usuario es igual a 
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    if not verify_password(form_data.password, user.relacion.password):
        raise HTTPException(
            status_code=401,
            detail="Contraseña incorrecta"
        )

    #:> Si la cuenta esta bloqueada cortamos el login aqui con un mensaje claro
    if user.relacion.estado == 0:
        raise HTTPException(
            status_code=403,
            detail="Usuario bloqueado, comuniquese con toritoseats@gmail.com para revisar su caso"
        )

    token = create_access_token({"sub": user.correo})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": { 
            "id": user.id,
            "nombre": user.nombre,
            "correo": user.correo,
            "rol": user.relacion.rol  
        }
    }#si el usuario puede ingresar corrrectamente, crea un token que usamos para la authentication de el usuario
