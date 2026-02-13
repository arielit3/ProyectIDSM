from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

#modelos de la bd
class Rol(Base):
    __tablename__ = "rol"

    id = Column(Integer, primary_key=True, index=True)
    rol = Column(String, nullable=False)

    usuarios = relationship("Usuario", back_populates="rol")

#Cada clase representa una base de datos que nos sirve para la creacion base de las tablas en postgresql
class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    apodo = Column(String, nullable=True)
    nombre = Column(String, nullable=False)
    correo = Column(String, unique=True, index=True, nullable=False)
    telefono = Column(String, unique=True)
    matricula = Column(Integer, nullable=False)
    password = Column(String, nullable=False)
    rol_id = Column(Integer, ForeignKey("rol.id"))

    rol = relationship("Rol", back_populates="usuarios")