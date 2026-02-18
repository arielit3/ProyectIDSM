from sqlalchemy import Column, Float, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

#modelos de la bd
class Rol(Base):
    __tablename__ = "rol"

    id = Column(Integer, primary_key=True, index=True)
    rol = Column(String, nullable=False)

    # Relación: un rol puede estar asignado a muchos usuarios
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
    estado = Column(String, nullable=False, default="activo")
    #estado del usuario (activo/inactivo/bloqueado)
    #para que Funcionara: guarda si el usuario está disponible o le damos de baja.
    #Default:sirve para que  siempre que agregemos un usario queda como "activo".
    rol_id = Column(Integer, ForeignKey("rol.id"))

    rol = relationship("Rol", back_populates="usuarios")
 
    # Nuevo favoritos del usuario
    # Relación: un usuario puede tener muchos favoritos (cada favorito liga usuario al producto)
    # ¿Por qué también existe y lo agregue en Favoritos?
    # - Para poder volver del favorito hacia el usuario: favorito.usuario
    # Eso es lo que hace todo  "bidireccional" y asi  evitamos consultas manuales.
    favoritos = relationship(
        "Favorito",
        back_populates="usuario",
        cascade="all, delete-orphan"  # si borramos el usuario, se borran sus favoritos
    )
# Nuevo tabla categoria
class Categoria(Base):
    __tablename__ = "categoria"

    id = Column(Integer, primary_key=True, index=True)
    # Nombre de la categoría ("Burritos", "Bebidas", "Postres",etc.)
    nombre = Column(String, nullable=False)
    # Relación: una categoría puede tener muchos productos
    productos = relationship("Productos", back_populates="categoria")


class Productos(Base):
    __tablename__ = "productos"

    # Campos principales de nuestros productos 
    id = Column(Integer, primary_key=True, index=True)  # ID único del producto
    vendedor = Column(Integer, index=True, nullable=False)
    nombre = Column(String, nullable=False)
    # Descripción del producto (ingredientes, tamaño y todo lo que pueda poner los vendedores)
    descripcion = Column(String, nullable=False)
    # Precio del producto
    precio = Column(Float, nullable=False)
    # Stock disponibilidad de los  productos
    stock = Column(Integer, nullable=False, default=0)
    # Estado del producto (si tiene el productos o no
    estado = Column(String, nullable=False, default="activo")
    # nueva relacion con categoria, para que cada producto tenga una categoria asignada (Burritos, Bebidas, Postres, etc.)
    # Llave foránea: los productos pertenecen a una categoría (categoria.id)
    categoria_id = Column(Integer, ForeignKey("categoria.id"), nullable=True)
    # Relación: nos permite acceder a la categoría desde el producto -> producto.categoria
    categoria = relationship("Categoria", back_populates="productos")
    # Para consultarlo quiénes marcaron este producto como favorito: producto.favoritos
    # Para ir del favorito hacia el producto: favorito.productos
    favoritos = relationship(
        "Favorito",
        back_populates="producto",
        cascade="all, delete-orphan"  # si borras el producto, se borran sus favoritos
    )


# nueva tabla para manejar los favoritos de los usuarios, es una tabla intermedia entre Usuario y Productos
class Favorito(Base):
    __tablename__ = "favorito"
    # usuario_id y producto_id forman la "llave compuesta"
    # Esto evita que un usuario repita el mismo producto como favorito 2 veces.
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), primary_key=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), primary_key=True)
    # Relación: favorito -> usuario
    usuario = relationship("Usuario", back_populates="favoritos")
    # Relación: favorito -> producto
    producto = relationship("Productos", back_populates="favoritos")