from fastapi import Depends, HTTPException, status
from jose import jwt, JWTError
from sqlalchemy.orm import Session

import database, models
from auth import oauth2_scheme, SECRET_KEY, ALGORITHM


def get_db():
    #:> Esto abre una sesion de BD por request y la cierra al terminar
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    #:> Esta dependencia valida el JWT y devuelve el usuario real desde la BD
    #:> Se usa en endpoints protegidos para saber quien esta haciendo la accion
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado o token inválido",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        correo: str = payload.get("sub")

        if correo is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = db.query(models.Usuario).filter(models.Usuario.correo == correo).first()

    if user is None:
        raise credentials_exception

    #:> Si la cuenta fue bloqueada tampoco dejamos usar tokens viejos
    if user.relacion and user.relacion.estado == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario bloqueado, comuniquese con toritoseats@gmail.com para revisar su caso",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
