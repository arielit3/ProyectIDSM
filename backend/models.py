from sqlalchemy import Column, Float, Integer, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class UsuarioRelacion(Base):
    __tablename__ = "usuario_relacion"

    id = Column(Integer, primary_key=True, index=True)
    matricula = Column(Integer, nullable=False, unique=True)
    password = Column(String, nullable=False)
    estado = Column(Integer, nullable=False, default=1)  
    rol = Column(String, nullable=False)                 

    usuario = relationship("Usuario", back_populates="relacion", uselist=False)


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    apodo = Column(String, nullable=True)
    nombre = Column(String, nullable=False)
    correo = Column(String, unique=True, index=True, nullable=False)
    telefono = Column(String, unique=False)

    usuario_relacion_id = Column(Integer, ForeignKey("usuario_relacion.id"), unique=True, nullable=False)

    relacion = relationship("UsuarioRelacion", back_populates="usuario")

    favoritos = relationship("Favorito", back_populates="usuario", cascade="all, delete-orphan")
    productos = relationship("Productos", back_populates="vendedor")
    
    solicitudes_enviadas = relationship(
        "SolicitudProducto",
        foreign_keys="SolicitudProducto.comprador_id",
        back_populates="comprador",
        cascade="all, delete-orphan"
    )
    
    solicitudes_recibidas = relationship(
        "SolicitudProducto",
        foreign_keys="SolicitudProducto.vendedor_id",
        back_populates="vendedor",
        cascade="all, delete-orphan"
    )
    
    notificaciones = relationship("Notificacion", back_populates="usuario", cascade="all, delete-orphan")


class Productos(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    vendedor_id = Column(Integer, ForeignKey("usuarios.id"), index=True, nullable=False)
    vendedor = relationship("Usuario", back_populates="productos")
    nombre = Column(String, nullable=False)
    descripcion = Column(String, nullable=False)
    precio = Column(Float, nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    categoria = Column(String, nullable=False)
    imagen_nombre = Column(String, nullable=True)
    activo = Column(Integer, nullable=False, default=1)

    favoritos = relationship("Favorito", back_populates="producto", cascade="all, delete-orphan")
    solicitudes = relationship("SolicitudProducto", back_populates="producto", cascade="all, delete-orphan")


class Favorito(Base):
    __tablename__ = "favorito"

    usuario_id = Column(Integer, ForeignKey("usuarios.id"), primary_key=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), primary_key=True)

    usuario = relationship("Usuario", back_populates="favoritos")
    producto = relationship("Productos", back_populates="favoritos")


class VerificacionOTP(Base):
    __tablename__ = "verificacion_otp"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    codigo = Column(String(6), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    intentos_restantes = Column(Integer, default=4, nullable=False)
    estado = Column(String, default='vigente', nullable=False)


# ============================================================================
# SOLICITUDES
# ============================================================================

class SolicitudProducto(Base):
    __tablename__ = "solicitudes_producto"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    comprador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    vendedor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    mensaje = Column(Text, nullable=True)
    estado = Column(String, default="pendiente", nullable=False)
    fecha_solicitud = Column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_respuesta = Column(DateTime, nullable=True)
    fecha_entrega = Column(DateTime, nullable=True)
    
    producto = relationship("Productos", back_populates="solicitudes")
    comprador = relationship("Usuario", foreign_keys=[comprador_id], back_populates="solicitudes_enviadas")
    vendedor = relationship("Usuario", foreign_keys=[vendedor_id], back_populates="solicitudes_recibidas")


# ============================================================================
# NOTIFICACIONES
# ============================================================================

class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    titulo = Column(String, nullable=False)
    mensaje = Column(Text, nullable=False)
    tipo = Column(String, nullable=False)  # favorito, solicitud, respuesta_aceptada, respuesta_rechazada, entrega_confirmada
    leida = Column(Boolean, default=False, nullable=False)
    data = Column(Text, nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    usuario = relationship("Usuario", back_populates="notificaciones")