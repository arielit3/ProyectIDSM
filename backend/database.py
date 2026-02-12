from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Esto establece la conexion con la bd
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/toroeats"
#para que la conexion sea exitosa, es recomendable 
# que el usuario de pgadmin sea postgres y su contrasenia igual


engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()