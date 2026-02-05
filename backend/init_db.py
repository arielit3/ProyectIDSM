from database import Base, engine
import models

#Creamos bd en base a modelos
print("Creando tablas en la base de datos...")
Base.metadata.create_all(bind=engine)
print("Listo.")