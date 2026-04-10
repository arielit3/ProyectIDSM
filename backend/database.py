from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

#:> Este archivo centraliza la conexion a la BD para que todo el backend use la misma base
#:> engine abre la conexion general con postgres
#:> SessionLocal crea sesiones cortas para cada request
#:> Base sirve como clase madre para todos los modelos
# Esto establece la conexion con la bd
DATABASE_URL = "postgresql://postgres:12345@localhost:5432/toroeats"
#para que la conexion sea exitosa, es recomendable 
# que el usuario de pgadmin sea postgres y su contrasenia igual


engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
