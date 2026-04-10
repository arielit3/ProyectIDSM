from database import Base, engine
import models

#:> Este script crea las tablas declaradas en models usando el engine configurado

#Creamos bd en base a modelos
print("Creando tablas en la base de datos...")
Base.metadata.create_all(bind=engine)
print("Listo.")
