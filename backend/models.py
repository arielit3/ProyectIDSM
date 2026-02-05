from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

#modelos de bd de datos
class Rol(Base):
    __tablename__ = "rol"

    id = Column(Integer, primary_key=True, index=True)
    rol = Column(String, nullable=False)

    usuarios = relationship("Usuario", back_populates="rol")


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    correo = Column(String, unique=True, index=True, nullable=False)
    matricula = Column(Integer, nullable=False)
    rol_id = Column(Integer, ForeignKey("rol.id"))

    rol = relationship("Rol", back_populates="usuarios")