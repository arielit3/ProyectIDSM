from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import users, login, productos, email, solicitudes, reportes, solicitudes_vendedor
from fastapi.staticfiles import StaticFiles #Para las imagenes estaticas

import os

#:> Este archivo levanta FastAPI y conecta middleware, rutas y archivos subidos
app = FastAPI()
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

from database import Base, engine
import models

@app.on_event("startup")
def startup_event():
    #:> Este script crea las tablas declaradas en models usando el engine configurado
    # Al ponerlo aqui, nos aseguramos de que el proceso de inicio sea ordenado
    print("Creando tablas en la base de datos...")
    Base.metadata.create_all(bind=engine)
    print("Base de datos lista para recibir conexiones.")


# CONFIGURACION DE CORS DINAMICA
# En desarrollo: permite localhost en diferentes puertos
# En produccion: cambia esto a tu dominio real (ejemplo: https://tudominio.com)
DEVELOPMENT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

PRODUCTION_ORIGINS = [
    # Cuando despliegues, reemplaza esto con tu dominio real
    # Ejemplos:
    # "https://tudominio.com",
    # "https://www.tudominio.com",
    # "https://app.tudominio.com",
    "https://toroeats.vercel.app",
    "https://toroeats-6fzayokyd-brandon-asiel-guevara-reyes-projects.vercel.app",
]

# Detecta si esta en desarrollo o produccion
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
#allow_origins = DEVELOPMENT_ORIGINS if ENVIRONMENT == "development" else PRODUCTION_ORIGINS
allow_origins = PRODUCTION_ORIGINS


# Configuracion de permisos para permitir conexion de front a back
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#:> Aqui se registran todos los routers para que sus endpoints queden activos
# Incluimos todos los endpoints a esta conexion
app.include_router(users.router)
app.include_router(login.router)
app.include_router(productos.router)
app.include_router(email.router)
app.include_router(solicitudes.router)
app.include_router(reportes.router)
app.include_router(solicitudes_vendedor.router)
