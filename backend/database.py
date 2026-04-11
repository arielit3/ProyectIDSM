from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import  os

#:> Este archivo centraliza la conexion a la BD para que todo el backend use la misma base
#:> engine abre la conexion general con postgres
#:> SessionLocal crea sesiones cortas para cada request
#:> Base sirve como clase madre para todos los modelos
# Esto establece la conexion con la bd
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Corrección para compatibilidad con SQLAlchemy (cambiar postgres:// por postgresql://)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Forzar sslmode=require para conexiones externas desde Railway a Render
    if "sslmode=" not in DATABASE_URL:
        DATABASE_URL += "?sslmode=require" if "?" not in DATABASE_URL else "&sslmode=require"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
