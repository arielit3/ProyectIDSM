from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import models
from deps import get_db, get_current_user
from crypto_utils import encrypt_text, decrypt_text

#:> Este router junta solicitudes de compra, mensajes, ventas y notificaciones del flujo comprador vendedor
router = APIRouter(prefix="/solicitudes", tags=["Solicitudes"])


class CrearSolicitudData(BaseModel):
    #:> Este modelo recibe los datos para levantar una solicitud sobre un producto
    producto_id: int
    vendedor_id: int
    cantidad: int
    mensaje: Optional[str] = ""


class ActualizarEstadoData(BaseModel):
    #:> Este modelo recibe el nuevo estado cuando el vendedor acepta o rechaza
    estado: str  # aceptado, rechazado, entregado, completado
    respuesta: Optional[str] = None


class CalificarProductoData(BaseModel):
    #:> Este modelo queda reservado para una futura calificacion de ventas cerradas
    solicitud_id: int
    puntuacion: int  # 1-5
    comentario: Optional[str] = None


class CrearMensajeSolicitudData(BaseModel):
    #:> Este modelo recibe el texto de un mensaje dentro de una solicitud
    mensaje: str


def crear_notificacion(
    db: Session,
    usuario_id: int,
    titulo: str,
    mensaje: str,
    tipo: str,
    solicitud_id: Optional[int] = None,
    producto_id: Optional[int] = None,
    venta_id: Optional[int] = None,
    reporte_id: Optional[int] = None
):
    #:> Esta funcion centraliza la creacion de notificaciones.
    #:> En lugar de guardar un JSON con referencias mezcladas, guarda FKs explicitas.
    #:> Esto mantiene la estructura de la BD mas clara y facilita consultas y defensa de 3FN.
    notificacion = models.Notificacion(
        usuario_id=usuario_id,
        titulo=titulo,
        mensaje=mensaje,
        tipo=tipo,
        solicitud_id=solicitud_id,
        producto_id=producto_id,
        venta_id=venta_id,
        reporte_id=reporte_id
    )
    db.add(notificacion)
    return notificacion


def obtener_vendedor_desde_solicitud(solicitud: models.SolicitudProducto):
    #:> El vendedor no vive en la tabla de solicitudes.
    #:> Se obtiene desde el producto relacionado para no duplicar ese dato.
    #:> Esta funcion arma el bloque que el frontend espera recibir.
    if not solicitud.producto or not solicitud.producto.vendedor:
        return None

    vendedor = solicitud.producto.vendedor
    return {
        "id": vendedor.id,
        "nombre": vendedor.nombre,
        "apodo": vendedor.apodo
    }


def serializar_notificacion(notificacion: models.Notificacion):
    #:> El frontend actual espera un campo data.
    #:> Esta funcion lo reconstruye a partir de las FKs reales para no romper la interfaz.
    #:> Asi mantenemos compatibilidad sin volver a guardar JSON en la tabla.
    data = None
    if any([
        notificacion.solicitud_id is not None,
        notificacion.producto_id is not None,
        notificacion.venta_id is not None,
        notificacion.reporte_id is not None,
    ]):
        data = {
            "solicitud_id": notificacion.solicitud_id,
            "producto_id": notificacion.producto_id,
            "venta_id": notificacion.venta_id,
            "reporte_id": notificacion.reporte_id,
        }

    return {
        "id": notificacion.id,
        "titulo": notificacion.titulo,
        "mensaje": notificacion.mensaje,
        "tipo": notificacion.tipo,
        "leida": notificacion.leida,
        "data": data,
        "fecha_creacion": notificacion.fecha_creacion
    }


def serializar_venta(venta: models.Venta):
    #:> Esta funcion arma la respuesta de ventas usando la solicitud relacionada.
    #:> Sirve para que el frontend siga viendo comprador, vendedor, producto, cantidad y total.
    #:> Esos datos ya no se guardan repetidos en la tabla ventas.
    solicitud = venta.solicitud
    producto = solicitud.producto if solicitud else None
    comprador = solicitud.comprador if solicitud else None
    vendedor = producto.vendedor if producto else None
    cantidad = solicitud.cantidad if solicitud else 0
    total = venta.precio_unitario * cantidad

    return {
        "id": venta.id,
        "solicitud_id": venta.solicitud_id,
        "cantidad": cantidad,
        "precio_unitario": venta.precio_unitario,
        "total": total,
        "fecha_venta": venta.fecha_venta,
        "estado": venta.estado,
        "producto": {
            "id": producto.id,
            "nombre": producto.nombre
        } if producto else None,
        "comprador": {
            "id": comprador.id,
            "nombre": comprador.nombre,
            "apodo": comprador.apodo
        } if comprador else None,
        "vendedor": {
            "id": vendedor.id,
            "nombre": vendedor.nombre,
            "apodo": vendedor.apodo
        } if vendedor else None
    }


def serializar_mensaje(mensaje: models.MensajeSolicitud):
    #:> Esto deja el mensaje listo para el front ya descifrado
    return {
        "id": mensaje.id,
        "solicitud_id": mensaje.solicitud_id,
        "emisor_id": mensaje.emisor_id,
        "mensaje": decrypt_text(mensaje.mensaje_cifrado),
        "fecha_creacion": mensaje.fecha_creacion,
        "emisor": {
            "id": mensaje.emisor.id,
            "nombre": mensaje.emisor.nombre,
            "apodo": mensaje.emisor.apodo
        } if mensaje.emisor else None
    }


@router.post("/")
def crear_solicitud(
    data: CrearSolicitudData,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Comprador crea una solicitud de producto"""
    #:> Este endpoint abre una solicitud nueva y notifica al vendedor del producto

    producto = db.query(models.Productos).filter(
        models.Productos.id == data.producto_id
    ).first()

    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    #:> El frontend todavia manda vendedor_id.
    #:> Aqui se valida contra el vendedor real del producto para mantener compatibilidad sin volver a guardar ese dato en la tabla.
    if producto.vendedor_id != data.vendedor_id:
        raise HTTPException(status_code=400, detail="El vendedor no coincide con el producto seleccionado")

    if current_user.id == producto.vendedor_id:
        raise HTTPException(status_code=400, detail="No puedes solicitarte un producto a ti mismo")

    if data.cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")

    if data.cantidad > producto.stock:
        raise HTTPException(status_code=400, detail="No hay stock suficiente para esta solicitud")

    solicitud = models.SolicitudProducto(
        producto_id=data.producto_id,
        comprador_id=current_user.id,
        cantidad=data.cantidad,
        mensaje=encrypt_text(data.mensaje) if data.mensaje else None,
        estado="pendiente"
    )

    db.add(solicitud)
    db.flush()

    crear_notificacion(
        db=db,
        usuario_id=producto.vendedor_id,
        titulo="Nueva solicitud de producto",
        mensaje=f"{current_user.apodo or current_user.nombre} quiere {data.cantidad} unidad(es) de {producto.nombre}",
        tipo="solicitud",
        solicitud_id=solicitud.id,
        producto_id=producto.id
    )

    db.commit()
    db.refresh(solicitud)

    return {
        "id": solicitud.id,
        "producto_id": solicitud.producto_id,
        "comprador_id": solicitud.comprador_id,
        "vendedor_id": producto.vendedor_id,
        "cantidad": solicitud.cantidad,
        "mensaje": decrypt_text(solicitud.mensaje) if solicitud.mensaje else "",
        "estado": solicitud.estado,
        "fecha_solicitud": solicitud.fecha_solicitud,
        "producto": {
            "id": producto.id,
            "nombre": producto.nombre,
            "precio": producto.precio
        }
    }


@router.get("/recibidas")
def obtener_solicitudes_recibidas(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Vendedor obtiene todas las solicitudes que ha recibido"""
    #:> Este endpoint devuelve al vendedor las solicitudes ligadas a sus productos

    #:> Como la solicitud ya no guarda vendedor_id, se consulta por el vendedor del producto asociado.
    #:> Esto conserva el mismo resultado funcional sin romper la normalizacion lograda.
    solicitudes = db.query(models.SolicitudProducto).join(
        models.Productos, models.SolicitudProducto.producto_id == models.Productos.id
    ).filter(
        models.Productos.vendedor_id == current_user.id
    ).order_by(models.SolicitudProducto.fecha_solicitud.desc()).all()

    resultado = []
    for solicitud in solicitudes:
        resultado.append({
            "id": solicitud.id,
            "producto_id": solicitud.producto_id,
            "comprador_id": solicitud.comprador_id,
            "vendedor_id": solicitud.producto.vendedor_id if solicitud.producto else None,
            "cantidad": solicitud.cantidad,
            "mensaje": decrypt_text(solicitud.mensaje) if solicitud.mensaje else "",
            "estado": solicitud.estado,
            "fecha_solicitud": solicitud.fecha_solicitud,
            "fecha_respuesta": solicitud.fecha_respuesta,
            "fecha_entrega": solicitud.fecha_entrega,
            "producto": {
                "id": solicitud.producto.id,
                "nombre": solicitud.producto.nombre,
                "precio": solicitud.producto.precio
            } if solicitud.producto else None,
            "comprador": {
                "id": solicitud.comprador.id,
                "nombre": solicitud.comprador.nombre,
                "apodo": solicitud.comprador.apodo
            } if solicitud.comprador else None
        })

    return resultado


@router.get("/enviadas")
def obtener_solicitudes_enviadas(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Comprador obtiene todas las solicitudes que ha enviado"""
    #:> Este endpoint devuelve al comprador las solicitudes que el mismo levanto

    solicitudes = db.query(models.SolicitudProducto).filter(
        models.SolicitudProducto.comprador_id == current_user.id
    ).order_by(models.SolicitudProducto.fecha_solicitud.desc()).all()

    resultado = []
    for solicitud in solicitudes:
        vendedor = obtener_vendedor_desde_solicitud(solicitud)
        resultado.append({
            "id": solicitud.id,
            "producto_id": solicitud.producto_id,
            "comprador_id": solicitud.comprador_id,
            "vendedor_id": vendedor["id"] if vendedor else None,
            "cantidad": solicitud.cantidad,
            "mensaje": decrypt_text(solicitud.mensaje) if solicitud.mensaje else "",
            "estado": solicitud.estado,
            "fecha_solicitud": solicitud.fecha_solicitud,
            "fecha_respuesta": solicitud.fecha_respuesta,
            "fecha_entrega": solicitud.fecha_entrega,
            "producto": {
                "id": solicitud.producto.id,
                "nombre": solicitud.producto.nombre,
                "precio": solicitud.producto.precio
            } if solicitud.producto else None,
            "vendedor": vendedor
        })

    return resultado


@router.get("/notificaciones")
def obtener_notificaciones(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Obtiene todas las notificaciones del usuario actual"""
    #:> Este endpoint devuelve avisos del sistema ordenados del mas nuevo al mas viejo

    notificaciones = db.query(models.Notificacion).filter(
        models.Notificacion.usuario_id == current_user.id
    ).order_by(models.Notificacion.fecha_creacion.desc()).all()

    return [serializar_notificacion(notificacion) for notificacion in notificaciones]


@router.put("/{solicitud_id}/estado")
def actualizar_estado_solicitud(
    solicitud_id: int,
    data: ActualizarEstadoData,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Vendedor actualiza estado de una solicitud (aceptar/rechazar)"""
    #:> Este endpoint deja al vendedor aceptar o rechazar una solicitud pendiente

    solicitud = db.query(models.SolicitudProducto).filter(
        models.SolicitudProducto.id == solicitud_id
    ).first()

    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    vendedor_id = solicitud.producto.vendedor_id if solicitud.producto else None
    if vendedor_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta solicitud")

    if solicitud.estado != "pendiente":
        raise HTTPException(status_code=400, detail=f"Esta solicitud ya fue {solicitud.estado}")

    if data.estado not in ["aceptado", "rechazado"]:
        raise HTTPException(status_code=400, detail="Estado no valido para esta accion")

    solicitud.estado = data.estado
    solicitud.fecha_respuesta = datetime.utcnow()

    db.commit()
    db.refresh(solicitud)

    titulo = "Solicitud aceptada" if data.estado == "aceptado" else "Solicitud rechazada"
    mensaje = f"Tu solicitud para {solicitud.producto.nombre} fue {data.estado}"

    crear_notificacion(
        db=db,
        usuario_id=solicitud.comprador_id,
        titulo=titulo,
        mensaje=mensaje,
        tipo="respuesta_aceptada" if data.estado == "aceptado" else "respuesta_rechazada",
        solicitud_id=solicitud.id,
        producto_id=solicitud.producto_id
    )

    db.commit()

    return {
        "id": solicitud.id,
        "estado": solicitud.estado,
        "mensaje": f"Solicitud {data.estado} correctamente"
    }


@router.put("/{solicitud_id}/entregar")
def marcar_como_entregado(
    solicitud_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Comprador marca la solicitud como entregada y se crea el registro de venta"""
    #:> Este endpoint cierra la solicitud como entrega y genera la venta historica

    solicitud = db.query(models.SolicitudProducto).filter(
        models.SolicitudProducto.id == solicitud_id
    ).first()

    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    if solicitud.comprador_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta solicitud")

    if solicitud.estado != "aceptado":
        raise HTTPException(status_code=400, detail="La solicitud debe estar aceptada para marcar como entregada")

    producto = db.query(models.Productos).filter(
        models.Productos.id == solicitud.producto_id
    ).first()

    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if solicitud.cantidad > producto.stock:
        raise HTTPException(status_code=400, detail="Ya no hay stock suficiente para completar la entrega")

    total = producto.precio * solicitud.cantidad

    #:> La venta conserva solo lo que realmente pertenece a la venta.
    #:> El precio unitario se guarda porque puede cambiar con el tiempo y debe quedar historico.
    #:> Producto, comprador, vendedor y cantidad se recuperan desde la solicitud.
    venta = models.Venta(
        solicitud_id=solicitud.id,
        precio_unitario=producto.precio
    )

    db.add(venta)

    producto.stock -= solicitud.cantidad
    solicitud.estado = "entregado"
    solicitud.fecha_entrega = datetime.utcnow()

    db.commit()
    db.refresh(venta)

    crear_notificacion(
        db=db,
        usuario_id=producto.vendedor_id,
        titulo="Venta confirmada",
        mensaje=f"Venta realizada. {solicitud.comprador.apodo or solicitud.comprador.nombre} compro {solicitud.cantidad} unidad(es) de {producto.nombre} por ${total}",
        tipo="venta",
        solicitud_id=solicitud.id,
        producto_id=solicitud.producto_id,
        venta_id=venta.id
    )

    db.commit()

    return {
        "mensaje": "Producto marcado como entregado",
        "estado": solicitud.estado,
        "venta": {
            "id": venta.id,
            "total": total,
            "cantidad": solicitud.cantidad,
            "producto": producto.nombre
        }
    }


@router.post("/calificar")
def calificar_producto(
    data: CalificarProductoData,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint sigue apagado porque todavia no existe modelo estable de calificaciones
    #:> Este endpoint se deja bloqueado de forma explicita.
    #:> La razon es que no existe todavia una tabla de calificaciones bien definida en el modelo actual.
    #:> Es mejor declarar esto que inventar una estructura que rompa la coherencia de la BD.
    raise HTTPException(
        status_code=501,
        detail="La funcionalidad de calificacion aun no esta implementada en el modelo de datos actual"
    )


@router.get("/{solicitud_id}/mensajes")
def obtener_mensajes_solicitud(
    solicitud_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint devuelve la conversacion completa de una solicitud
    #:> Aqui sale la conversacion de una solicitud ya lista para pintarse en pantalla
    solicitud = db.query(models.SolicitudProducto).filter(
        models.SolicitudProducto.id == solicitud_id
    ).first()

    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    vendedor_id = solicitud.producto.vendedor_id if solicitud.producto else None
    if current_user.id not in [solicitud.comprador_id, vendedor_id]:
        raise HTTPException(status_code=403, detail="No puedes ver estos mensajes")

    mensajes = db.query(models.MensajeSolicitud).filter(
        models.MensajeSolicitud.solicitud_id == solicitud_id
    ).order_by(models.MensajeSolicitud.fecha_creacion.asc()).all()

    return [serializar_mensaje(mensaje) for mensaje in mensajes]


@router.post("/{solicitud_id}/mensajes")
def crear_mensaje_solicitud(
    solicitud_id: int,
    data: CrearMensajeSolicitudData,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Ahora comprador y vendedor pueden hablar dentro de la misma solicitud
    #:> El texto se cifra antes de guardarse para que no quede en claro en la BD
    solicitud = db.query(models.SolicitudProducto).filter(
        models.SolicitudProducto.id == solicitud_id
    ).first()

    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    vendedor_id = solicitud.producto.vendedor_id if solicitud.producto else None
    if current_user.id not in [solicitud.comprador_id, vendedor_id]:
        raise HTTPException(status_code=403, detail="No puedes enviar mensajes en esta solicitud")

    if not data.mensaje.strip():
        raise HTTPException(status_code=400, detail="El mensaje no puede ir vacio")

    mensaje = models.MensajeSolicitud(
        solicitud_id=solicitud_id,
        emisor_id=current_user.id,
        mensaje_cifrado=encrypt_text(data.mensaje.strip())
    )

    db.add(mensaje)
    db.flush()

    destinatario_id = vendedor_id if current_user.id == solicitud.comprador_id else solicitud.comprador_id
    crear_notificacion(
        db=db,
        usuario_id=destinatario_id,
        titulo="Nuevo mensaje en solicitud",
        mensaje=f"{current_user.apodo or current_user.nombre} te mando un mensaje sobre {solicitud.producto.nombre}",
        tipo="mensaje_solicitud",
        solicitud_id=solicitud.id,
        producto_id=solicitud.producto_id
    )

    db.commit()
    db.refresh(mensaje)

    return serializar_mensaje(mensaje)


@router.put("/notificaciones/leer/{notificacion_id}")
def marcar_notificacion_leida(
    notificacion_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Marca una notificacion como leida"""
    #:> Este endpoint marca una sola notificacion como leida para el usuario actual

    notificacion = db.query(models.Notificacion).filter(
        models.Notificacion.id == notificacion_id,
        models.Notificacion.usuario_id == current_user.id
    ).first()

    if not notificacion:
        raise HTTPException(status_code=404, detail="Notificacion no encontrada")

    notificacion.leida = True
    db.commit()

    return {"mensaje": "Notificacion marcada como leida"}


@router.put("/notificaciones/leer-todas")
def marcar_todas_notificaciones_leidas(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Marca todas las notificaciones del usuario como leidas"""
    #:> Este endpoint limpia de golpe el estado de no leidas del usuario actual

    db.query(models.Notificacion).filter(
        models.Notificacion.usuario_id == current_user.id,
        models.Notificacion.leida == False
    ).update({"leida": True})

    db.commit()

    return {"mensaje": "Todas las notificaciones marcadas como leidas"}


@router.get("/mis-ventas")
def obtener_mis_ventas(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Vendedor obtiene todas sus ventas"""
    #:> Este endpoint devuelve ventas cerradas del vendedor autenticado

    #:> El vendedor se identifica desde el producto ligado a cada solicitud.
    #:> Asi se puede listar ventas del vendedor sin guardar vendedor_id dentro de ventas.
    ventas = db.query(models.Venta).join(
        models.SolicitudProducto, models.Venta.solicitud_id == models.SolicitudProducto.id
    ).join(
        models.Productos, models.SolicitudProducto.producto_id == models.Productos.id
    ).filter(
        models.Productos.vendedor_id == current_user.id
    ).order_by(models.Venta.fecha_venta.desc()).all()

    return [serializar_venta(venta) for venta in ventas]


@router.get("/mis-compras")
def obtener_mis_compras(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Comprador obtiene todas sus compras realizadas"""
    #:> Este endpoint devuelve ventas cerradas donde el comprador autenticado participo

    #:> El comprador se identifica desde la solicitud ligada a cada venta.
    #:> Asi se puede listar compras del comprador sin guardar comprador_id dentro de ventas.
    ventas = db.query(models.Venta).join(
        models.SolicitudProducto, models.Venta.solicitud_id == models.SolicitudProducto.id
    ).filter(
        models.SolicitudProducto.comprador_id == current_user.id
    ).order_by(models.Venta.fecha_venta.desc()).all()

    return [serializar_venta(venta) for venta in ventas]
