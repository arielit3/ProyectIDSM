from sqlalchemy import Column, Float, Integer, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


#:> Esta tabla guarda datos de acceso y control del usuario como rol, matricula y estado
class UsuarioRelacion(Base):
    __tablename__ = "usuario_relacion"

    id = Column(Integer, primary_key=True, index=True)
    matricula = Column(Integer, nullable=False, unique=True)
    password = Column(String, nullable=False)
    estado = Column(Integer, nullable=False, default=1)  
    rol = Column(String, nullable=False)                 

    usuario = relationship("Usuario", back_populates="relacion", uselist=False)


#:> Esta tabla guarda los datos personales visibles del usuario
#:> Se separa de UsuarioRelacion para no mezclar perfil con acceso
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

    notificaciones = relationship("Notificacion", back_populates="usuario", cascade="all, delete-orphan")
    solicitudes_vendedor = relationship("SolicitudVendedor", back_populates="usuario", cascade="all, delete-orphan")
    sanciones_recibidas = relationship("SancionUsuario", foreign_keys="SancionUsuario.usuario_id", back_populates="usuario")
    sanciones_aplicadas = relationship("SancionUsuario", foreign_keys="SancionUsuario.admin_id", back_populates="admin")


#:> Esta tabla guarda las publicaciones que vende cada usuario vendedor
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


#:> Esta tabla pivote conecta usuarios con productos marcados como favorito
class Favorito(Base):
    __tablename__ = "favorito"

    usuario_id = Column(Integer, ForeignKey("usuarios.id"), primary_key=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), primary_key=True)

    usuario = relationship("Usuario", back_populates="favoritos")
    producto = relationship("Productos", back_populates="favoritos")


#:> Esta tabla guarda los codigos OTP que se mandan durante registro o verificacion
class VerificacionOTP(Base):
    __tablename__ = "verificacion_otp"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    codigo = Column(String(6), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    intentos_restantes = Column(Integer, default=4, nullable=False)
    estado = Column(String, default='vigente', nullable=False)


#:> Esta tabla guarda una solicitud de compra hecha por un comprador sobre un producto
# SOLICITUDES
class SolicitudProducto(Base):
    __tablename__ = "solicitudes_producto"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    comprador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    mensaje = Column(Text, nullable=True)
    estado = Column(String, default="pendiente", nullable=False)
    fecha_solicitud = Column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_respuesta = Column(DateTime, nullable=True)
    fecha_entrega = Column(DateTime, nullable=True)

    #:> Esta tabla guarda la solicitud que hace un comprador sobre un producto
    #:> Se relaciona con productos para saber que se pidio y con usuarios para saber quien lo pidio
    #:> El vendedor ya no se guarda aqui porque se obtiene desde productos.vendedor_id
    #:> Esto evita duplicar un dato que ya existe en otra tabla y ayuda a mantener 3FN
    producto = relationship("Productos", back_populates="solicitudes")
    comprador = relationship("Usuario", foreign_keys=[comprador_id], back_populates="solicitudes_enviadas")

    #:> Una solicitud puede terminar en una sola venta
    #:> Por eso la relacion con ventas es de uno a uno
    venta = relationship("Venta", back_populates="solicitud", uselist=False, cascade="all, delete-orphan")
    mensajes = relationship("MensajeSolicitud", back_populates="solicitud", cascade="all, delete-orphan")

#:> Esta tabla guarda la venta cerrada que nace desde una solicitud aceptada
# VENTAS
class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, ForeignKey("solicitudes_producto.id"), unique=True, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    fecha_venta = Column(DateTime, default=datetime.utcnow, nullable=False)
    estado = Column(String, default="completada", nullable=False)

    #:> Esta tabla registra el cierre de una solicitud aceptada
    #:> Guarda solo lo propio de la venta: la solicitud asociada, el precio unitario del momento, la fecha y el estado
    #:> Comprador, vendedor, producto y cantidad se obtienen desde la solicitud relacionada
    #:> Asi se evita repetir columnas que dependian de solicitud_id y se mantiene mejor la 3FN
    solicitud = relationship("SolicitudProducto", back_populates="venta")

#:> Esta tabla guarda avisos del sistema para compradores, vendedores y admins
# NOTIFICACIONES
class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    titulo = Column(String, nullable=False)
    mensaje = Column(Text, nullable=False)
    tipo = Column(String, nullable=False)  # favorito, solicitud, respuesta_aceptada, respuesta_rechazada, entrega_confirmada, venta
    leida = Column(Boolean, default=False, nullable=False)
    solicitud_id = Column(Integer, ForeignKey("solicitudes_producto.id"), nullable=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=True)
    venta_id = Column(Integer, ForeignKey("ventas.id"), nullable=True)
    reporte_id = Column(Integer, ForeignKey("reportes_vendedor.id"), nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)

    #:> Esta tabla guarda avisos para los usuarios del sistema
    #:> Antes usaba un campo data en JSON para guardar referencias, pero eso mezclaba datos estructurados dentro de texto
    #:> Ahora cada referencia importante tiene su propia FK: solicitud, producto, venta o reporte
    #:> Eso hace la tabla mas clara, mas consultable y mas defendible en 3FN
    usuario = relationship("Usuario", back_populates="notificaciones")

#:> Esta tabla guarda reportes que un comprador levanta contra un vendedor
# REPORTES DE VENDEDORES 

class ReporteVendedor(Base):
    __tablename__ = "reportes_vendedor"
    
    id = Column(Integer, primary_key=True, index=True)
    comprador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    vendedor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    admin_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    motivo = Column(Text, nullable=False)
    estado = Column(String(20), default="pendiente")
    respuesta_admin = Column(Text, nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_resolucion = Column(DateTime, nullable=True)

    #:> Esta tabla guarda los reportes que un comprador levanta contra un vendedor
    #:> Se relaciona con el comprador, el vendedor y ahora tambien con el admin que resolvio el caso
    #:> admin_id se agrega para dejar trazabilidad sin mezclar ese dato en texto libre
    comprador = relationship("Usuario", foreign_keys=[comprador_id], backref="reportes_enviados")
    vendedor = relationship("Usuario", foreign_keys=[vendedor_id], backref="reportes_recibidos")
    admin = relationship("Usuario", foreign_keys=[admin_id], backref="reportes_resueltos")
    sanciones = relationship("SancionUsuario", back_populates="reporte")


#:> Esta tabla guarda cuando un cliente pide subir a vendedor
class SolicitudVendedor(Base):
    __tablename__ = "solicitudes_vendedor"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    motivo = Column(Text, nullable=False)
    estado = Column(String(20), default="pendiente", nullable=False)
    respuesta_admin = Column(Text, nullable=True)
    fecha_solicitud = Column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_respuesta = Column(DateTime, nullable=True)

    #:> Esta tabla guarda cuando un cliente pide convertirse en vendedor
    #:> Sirve para que ese flujo vaya aparte y no se mezcle con usuarios ni con reportes
    usuario = relationship("Usuario", back_populates="solicitudes_vendedor")


#:> Esta tabla guarda mensajes entre comprador y vendedor dentro de una solicitud
class MensajeSolicitud(Base):
    __tablename__ = "mensajes_solicitud"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, ForeignKey("solicitudes_producto.id"), nullable=False)
    emisor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    mensaje_cifrado = Column(Text, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)

    #:> Esta tabla guarda mensajes entre comprador y vendedor sobre una solicitud
    #:> El texto se guarda cifrado para no dejar conversaciones en plano en la BD
    solicitud = relationship("SolicitudProducto", back_populates="mensajes")
    emisor = relationship("Usuario")


#:> Esta tabla guarda sanciones aplicadas por un admin como historial independiente del reporte
class SancionUsuario(Base):
    __tablename__ = "sanciones_usuario"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    admin_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    reporte_id = Column(Integer, ForeignKey("reportes_vendedor.id"), nullable=True)
    motivo = Column(Text, nullable=False)
    tipo = Column(String(30), nullable=False)
    activa = Column(Boolean, default=True, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)

    #:> Esta tabla guarda la sancion como accion aparte del reporte
    #:> Asi se distingue entre lo que se reporto y lo que el admin decidio aplicar
    usuario = relationship("Usuario", foreign_keys=[usuario_id], back_populates="sanciones_recibidas")
    admin = relationship("Usuario", foreign_keys=[admin_id], back_populates="sanciones_aplicadas")
    reporte = relationship("ReporteVendedor", back_populates="sanciones")
