from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
import models, database

app = FastAPI()

# Dependencia para obtener sesion
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

#establece un metodo post para crear usuarios directamente en la tabla usuarios
@app.post("/usuarios/")
def crear_usuario(nombre: str, correo: str, matricula: int, rol_id: int, db: Session = Depends(get_db)):
    nuevo_usuario = models.Usuario(
        nombre=nombre,
        correo=correo,
        matricula=matricula,
        rol_id=rol_id
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario

#metodo get para obtener usuarios
@app.get("/usuarios/")
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(models.Usuario).all()