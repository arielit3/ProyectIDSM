from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models
from auth import verify_password, create_access_token
from deps import get_db

router = APIRouter(tags=["default"])  #con los tangs podemos separar por secciones


@router.post("/login")#metodo post
def login(#funcion login que usaremos 
    form_data: OAuth2PasswordRequestForm = Depends(),#el tipo de dato que admite
    db: Session = Depends(get_db)#la conexion a la bd
):
    user = db.query(models.Usuario).filter(models.Usuario.correo == form_data.username).first()
    #usuario es igual a 
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    if not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=401,
            detail="Contraseña incorrecta"
        )

    token = create_access_token({"sub": user.correo})

    return {
        "access_token": token,
        "token_type": "bearer"
    }#si el usuario puede ingresar corrrectamente, crea un token que usamos para la authentication de el usuario