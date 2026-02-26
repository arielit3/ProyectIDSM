from sqlalchemy import Column, Float, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

#modelos de la bd
class Rol(Base):
    __tablename__ = "rol"

    id = Column(Integer, primary_key=True, index=True)
    rol = Column(String, nullable=False)

    # Un rol los pueden  tener muchos usuarios
    usuarios = relationship("Usuario", back_populates="rol")

class EstadoUsuario(Base):
    __tablename__ = "estado_usuario"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False, unique=True)  # activo / inactivo / bloqueado

    usuarios = relationship("Usuario", back_populates="estado")

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
    estado_id = Column(Integer, ForeignKey("estado_usuario.id"), nullable=False, default=1)
    
    estado = relationship("EstadoUsuario", back_populates="usuarios")

    rol_id = Column(Integer, ForeignKey("rol.id"))
    rol = relationship("Rol", back_populates="usuarios")

    # Favoritos del usuario
    favoritos = relationship(
        "Favorito",
        back_populates="usuario",
        cascade="all, delete-orphan"
    )

   
#con esto  podemos consultar usuario,productos y asegurar que el vendedor exista.
    productos = relationship("Productos", back_populates="vendedor")


class Categoria(Base):
    __tablename__ = "categoria"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)

    productos = relationship("Productos", back_populates="categoria")


class Productos(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)

   # antes era vendedor lo teniamos como (Integer). 
   # Ahora es vendedor_id con FK a usuarios.id porque lo hice: integridad referencial y la NF3 (el vendedor debe existir en usuarios).
    vendedor_id = Column(Integer, ForeignKey("usuarios.id"), index=True, nullable=False)
    vendedor = relationship("Usuario", back_populates="productos")
    nombre = Column(String, nullable=False)
    descripcion = Column(String, nullable=False)
    precio = Column(Float, nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    categoria_id = Column(Integer, ForeignKey("categoria.id"), nullable=True)
    categoria = relationship("Categoria", back_populates="productos")

    favoritos = relationship(
        "Favorito",
        back_populates="producto",
        cascade="all, delete-orphan"
    )


# aqui esta esta Tabla intermedia para favoritos (evita el  duplicado con PK compuesta:la clave primaria son dos columnas juntas”)
class Favorito(Base):
    __tablename__ = "favorito"

    usuario_id = Column(Integer, ForeignKey("usuarios.id"), primary_key=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), primary_key=True)

    usuario = relationship("Usuario", back_populates="favoritos")
    producto = relationship("Productos", back_populates="favoritos")