from sqlalchemy import Column, Float, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class UsuarioRelacion(Base):
    __tablename__ = "usuario_relacion"

    id = Column(Integer, primary_key=True, index=True)
    matricula = Column(Integer, nullable=False, unique=True)
    password = Column(String, nullable=False)
    estado = Column(Integer, nullable=False, default=1)  # 1: activo, 0: inactivo
    rol = Column(String, nullable=False)  # 'administrador', 'vendedor', 'cliente'

    # Relación uno a uno con Usuario
    usuario = relationship("Usuario", back_populates="relacion", uselist=False)


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    apodo = Column(String, nullable=True)
    nombre = Column(String, nullable=False)
    correo = Column(String, unique=True, index=True, nullable=False)
    telefono = Column(String, unique=True, nullable=True)
    
    # Clave foránea que conecta con UsuarioRelacion
    usuario_relacion_id = Column(Integer, ForeignKey("usuario_relacion.id"), unique=True, nullable=False)

    # Relaciones
    relacion = relationship("UsuarioRelacion", back_populates="usuario")
    favoritos = relationship("Favorito", back_populates="usuario", cascade="all, delete-orphan")
    productos = relationship("Productos", back_populates="vendedor")


class Productos(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    vendedor_id = Column(Integer, ForeignKey("usuarios.id"), index=True, nullable=False)
    nombre = Column(String, nullable=False)
    descripcion = Column(String, nullable=False)
    precio = Column(Float, nullable=False)
    stock = Column(Integer, nullable=False, default=0)

    # Relaciones
    vendedor = relationship("Usuario", back_populates="productos")
    favoritos = relationship("Favorito", back_populates="producto", cascade="all, delete-orphan")


class Favorito(Base):
    __tablename__ = "favorito"

    # Clave primaria compuesta: un usuario no puede tener el mismo producto como favorito dos veces
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), primary_key=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), primary_key=True)

    # Relaciones
    usuario = relationship("Usuario", back_populates="favoritos")
    producto = relationship("Productos", back_populates="favoritos")