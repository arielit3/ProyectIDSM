from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import users, login, productos, email, solicitudes, reportes
from fastapi.staticfiles import StaticFiles #Para las imagenes estaticas

import os

app = FastAPI()
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
]

# Detecta si esta en desarrollo o produccion
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
allow_origins = DEVELOPMENT_ORIGINS if ENVIRONMENT == "development" else PRODUCTION_ORIGINS

# Configuracion de permisos para permitir conexion de front a back
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluimos todos los endpoints a esta conexion
app.include_router(users.router)
app.include_router(login.router)
app.include_router(productos.router)
app.include_router(email.router)
app.include_router(solicitudes.router)
app.include_router(reportes.router)