from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models

from routers import users, login 
from routers import productos #añadimos productos

app = FastAPI()

models.Base.metadata.create_all(bind=engine) #esta linea crea las tablas en postgres

# Configuracion de permisos para permitir conexion de front a back
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # ingresamos desde donte se permitira la conexion
    allow_credentials=True, #permitimos todas las conexiones
    allow_methods=["*"],  # permitir todos los metodos (GET, POST, DELETE, etc.)
    allow_headers=["*"],  # permitir todos los headers (tipos de envio/formato de datos)
)

# Incluimos todos los endpoints a esta conexion
app.include_router(users.router)
app.include_router(login.router)
app.include_router(productos.router) #incluimos el router de productos