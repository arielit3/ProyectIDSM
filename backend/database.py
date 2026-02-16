from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Esto establece la conexion con la bd
DATABASE_URL = "postgresql://postgres:038625@localhost:5432/toroeats"
#para que la conexion sea exitosa, es recomendable 
# que el usuario de pgadmin sea postgres y su contrasenia igual
#para que la conexion sea exitosa, es recomendable que el puerto de pgadmin sea postgresql y
# la contraseña de la base de datos sea postgres, y el nombre de la base de datos sea toroeats

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()