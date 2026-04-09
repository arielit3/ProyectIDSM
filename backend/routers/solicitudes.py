from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json
import models
from deps import get_db, get_current_user

router = APIRouter(prefix="/solicitudes", tags=["Solicitudes"])


class CrearSolicitudData(BaseModel):
    producto_id: int
    vendedor_id: int
    cantidad: int
    mensaje: Optional[str] = ""


class ActualizarEstadoData(BaseModel):
    estado: str  # aceptado, rechazado, entregado, completado
    respuesta: Optional[str] = None


class CalificarProductoData(BaseModel):
    solicitud_id: int
    puntuacion: int  # 1-5
    comentario: Optional[str] = None


def crear_notificacion(db: Session, usuario_id: int, titulo: str, mensaje: str, tipo: str, data: dict = None):
    """Funcion auxiliar para crear notificaciones"""
    notificacion = models.Notificacion(
        usuario_id=usuario_id,
        titulo=titulo,
        mensaje=mensaje,
        tipo=tipo,
        data=json.dumps(data) if data else None
    )
    db.add(notificacion)
    return notificacion


@router.post("/")
def crear_solicitud(
    data: CrearSolicitudData,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Comprador crea una solicitud de producto"""
    
    producto = db.query(models.Productos).filter(
        models.Productos.id == data.producto_id
    ).first()
    
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if current_user.id == data.vendedor_id:
        raise HTTPException(status_code=400, detail="No puedes solicitarte un producto a ti mismo")
    
    solicitud = models.SolicitudProducto(
        producto_id=data.producto_id,
        comprador_id=current_user.id,
        vendedor_id=data.vendedor_id,
        cantidad=data.cantidad,
        mensaje=data.mensaje,
        estado="pendiente"
    )
    
    db.add(solicitud)
    db.flush()
    
    # Notificar al vendedor
    crear_notificacion(
        db=db,
        usuario_id=data.vendedor_id,
        titulo="Nueva solicitud de producto",
        mensaje=f"{current_user.apodo or current_user.nombre} quiere {data.cantidad} unidad(es) de {producto.nombre}",
        tipo="solicitud",
        data={"solicitud_id": solicitud.id, "producto_id": producto.id}
    )
    
    db.commit()
    db.refresh(solicitud)
    
    result = {
        "id": solicitud.id,
        "producto_id": solicitud.producto_id,
        "comprador_id": solicitud.comprador_id,
        "vendedor_id": solicitud.vendedor_id,
        "cantidad": solicitud.cantidad,
        "mensaje": solicitud.mensaje,
        "estado": solicitud.estado,
        "fecha_solicitud": solicitud.fecha_solicitud,
        "producto": {
            "id": producto.id,
            "nombre": producto.nombre,
            "precio": producto.precio
        }
    }
    
    return result


@router.get("/recibidas")
def obtener_solicitudes_recibidas(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Vendedor obtiene todas las solicitudes que ha recibido"""
    
    solicitudes = db.query(models.SolicitudProducto).filter(
        models.SolicitudProducto.vendedor_id == current_user.id
    ).order_by(models.SolicitudProducto.fecha_solicitud.desc()).all()
    
    resultado = []
    for s in solicitudes:
        resultado.append({
            "id": s.id,
            "producto_id": s.producto_id,
            "comprador_id": s.comprador_id,
            "vendedor_id": s.vendedor_id,
            "cantidad": s.cantidad,
            "mensaje": s.mensaje,
            "estado": s.estado,
            "fecha_solicitud": s.fecha_solicitud,
            "fecha_respuesta": s.fecha_respuesta,
            "fecha_entrega": s.fecha_entrega,
            "producto": {
                "id": s.producto.id,
                "nombre": s.producto.nombre,
                "precio": s.producto.precio
            } if s.producto else None,
            "comprador": {
                "id": s.comprador.id,
                "nombre": s.comprador.nombre,
                "apodo": s.comprador.apodo
            } if s.comprador else None
        })
    
    return resultado


@router.get("/enviadas")
def obtener_solicitudes_enviadas(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Comprador obtiene todas las solicitudes que ha enviado"""
    
    solicitudes = db.query(models.SolicitudProducto).filter(
        models.SolicitudProducto.comprador_id == current_user.id
    ).order_by(models.SolicitudProducto.fecha_solicitud.desc()).all()
    
    resultado = []
    for s in solicitudes:
        resultado.append({
            "id": s.id,
            "producto_id": s.producto_id,
            "comprador_id": s.comprador_id,
            "vendedor_id": s.vendedor_id,
            "cantidad": s.cantidad,
            "mensaje": s.mensaje,
            "estado": s.estado,
            "fecha_solicitud": s.fecha_solicitud,
            "fecha_respuesta": s.fecha_respuesta,
            "fecha_entrega": s.fecha_entrega,
            "producto": {
                "id": s.producto.id,
                "nombre": s.producto.nombre,
                "precio": s.producto.precio
            } if s.producto else None,
            "vendedor": {
                "id": s.vendedor.id,
                "nombre": s.vendedor.nombre,
                "apodo": s.vendedor.apodo
            } if s.vendedor else None
        })
    
    return resultado


@router.get("/notificaciones")
def obtener_notificaciones(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Obtiene todas las notificaciones del usuario actual"""
    
    notificaciones = db.query(models.Notificacion).filter(
        models.Notificacion.usuario_id == current_user.id
    ).order_by(models.Notificacion.fecha_creacion.desc()).all()
    
    resultado = []
    for n in notificaciones:
        resultado.append({
            "id": n.id,
            "titulo": n.titulo,
            "mensaje": n.mensaje,
            "tipo": n.tipo,
            "leida": n.leida,
            "data": json.loads(n.data) if n.data else None,
            "fecha_creacion": n.fecha_creacion
        })
    
    return resultado


@router.put("/{solicitud_id}/estado")
def actualizar_estado_solicitud(
    solicitud_id: int,
    data: ActualizarEstadoData,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Vendedor actualiza estado de una solicitud (aceptar/rechazar)"""
    
    solicitud = db.query(models.SolicitudProducto).filter(
        models.SolicitudProducto.id == solicitud_id
    ).first()
    
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if solicitud.vendedor_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta solicitud")
    
    if solicitud.estado != "pendiente":
        raise HTTPException(status_code=400, detail=f"Esta solicitud ya fue {solicitud.estado}")
    
    solicitud.estado = data.estado
    solicitud.fecha_respuesta = datetime.utcnow()
    
    db.commit()
    db.refresh(solicitud)
    
    # Notificar al comprador
    titulo = "Solicitud aceptada" if data.estado == "aceptado" else "Solicitud rechazada"
    mensaje = f"Tu solicitud para {solicitud.producto.nombre} fue {data.estado}"
    
    crear_notificacion(
        db=db,
        usuario_id=solicitud.comprador_id,
        titulo=titulo,
        mensaje=mensaje,
        tipo="respuesta_aceptada" if data.estado == "aceptado" else "respuesta_rechazada",
        data={"solicitud_id": solicitud.id, "producto_id": solicitud.producto_id, "estado": data.estado}
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
    
    solicitud = db.query(models.SolicitudProducto).filter(
        models.SolicitudProducto.id == solicitud_id
    ).first()
    
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if solicitud.comprador_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta solicitud")
    
    if solicitud.estado != "aceptado":
        raise HTTPException(status_code=400, detail="La solicitud debe estar aceptada para marcar como entregada")
    
    # Obtener producto para calcular el total
    producto = db.query(models.Productos).filter(
        models.Productos.id == solicitud.producto_id
    ).first()
    
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Calcular total
    total = producto.precio * solicitud.cantidad
    
    # Crear registro de venta
    venta = models.Venta(
        solicitud_id=solicitud.id,
        comprador_id=solicitud.comprador_id,
        vendedor_id=solicitud.vendedor_id,
        producto_id=solicitud.producto_id,
        cantidad=solicitud.cantidad,
        precio_unitario=producto.precio,
        total=total
    )
    
    db.add(venta)
    
    # Actualizar stock del producto
    producto.stock -= solicitud.cantidad
    
    solicitud.estado = "entregado"
    solicitud.fecha_entrega = datetime.utcnow()
    
    db.commit()
    
    # Notificar al vendedor
    crear_notificacion(
        db=db,
        usuario_id=solicitud.vendedor_id,
        titulo="Venta confirmada",
        mensaje=f"¡Venta realizada! {solicitud.comprador.apodo or solicitud.comprador.nombre} compró {solicitud.cantidad} unidad(es) de {producto.nombre} por ${total}",
        tipo="venta",
        data={"solicitud_id": solicitud.id, "producto_id": solicitud.producto_id, "total": total}
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
    """Comprador califica el producto recibido"""
    
    solicitud = db.query(models.SolicitudProducto).filter(
        models.SolicitudProducto.id == data.solicitud_id
    ).first()
    
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if solicitud.comprador_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para calificar esta solicitud")
    
    if solicitud.estado != "entregado":
        raise HTTPException(status_code=400, detail="El producto debe estar entregado para calificarlo")
    
    if data.puntuacion < 1 or data.puntuacion > 5:
        raise HTTPException(status_code=400, detail="La puntuacion debe ser entre 1 y 5")
    
    # Verificar si ya existe calificacion
    calificacion_existente = db.query(models.CalificacionProducto).filter(
        models.CalificacionProducto.solicitud_id == data.solicitud_id
    ).first()
    
    if calificacion_existente:
        raise HTTPException(status_code=400, detail="Este producto ya fue calificado")
    
    calificacion = models.CalificacionProducto(
        solicitud_id=data.solicitud_id,
        producto_id=solicitud.producto_id,
        comprador_id=current_user.id,
        vendedor_id=solicitud.vendedor_id,
        puntuacion=data.puntuacion,
        comentario=data.comentario
    )
    
    db.add(calificacion)
    
    solicitud.estado = "completado"
    
    db.commit()
    
    # Notificar al vendedor
    crear_notificacion(
        db=db,
        usuario_id=solicitud.vendedor_id,
        titulo="Nueva calificacion",
        mensaje=f"{current_user.apodo or current_user.nombre} califico {solicitud.producto.nombre} con {data.puntuacion} estrellas",
        tipo="calificacion",
        data={"solicitud_id": solicitud.id, "producto_id": solicitud.producto_id, "puntuacion": data.puntuacion}
    )
    
    db.commit()
    
    return {"mensaje": "Calificacion registrada", "puntuacion": data.puntuacion}


@router.put("/notificaciones/leer/{notificacion_id}")
def marcar_notificacion_leida(
    notificacion_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Marca una notificacion como leida"""
    
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
    
    db.query(models.Notificacion).filter(
        models.Notificacion.usuario_id == current_user.id,
        models.Notificacion.leida == False
    ).update({"leida": True})
    
    db.commit()
    
    return {"mensaje": "Todas las notificaciones marcadas como leidas"}

#VENTAS

@router.get("/mis-ventas")
def obtener_mis_ventas(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Vendedor obtiene todas sus ventas"""
    
    ventas = db.query(models.Venta).filter(
        models.Venta.vendedor_id == current_user.id
    ).order_by(models.Venta.fecha_venta.desc()).all()
    
    resultado = []
    for v in ventas:
        resultado.append({
            "id": v.id,
            "solicitud_id": v.solicitud_id,
            "cantidad": v.cantidad,
            "precio_unitario": v.precio_unitario,
            "total": v.total,
            "fecha_venta": v.fecha_venta,
            "estado": v.estado,
            "producto": {
                "id": v.producto.id,
                "nombre": v.producto.nombre
            } if v.producto else None,
            "comprador": {
                "id": v.comprador.id,
                "nombre": v.comprador.nombre,
                "apodo": v.comprador.apodo
            } if v.comprador else None
        })
    
    return resultado


@router.get("/mis-compras")
def obtener_mis_compras(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Comprador obtiene todas sus compras realizadas"""
    
    ventas = db.query(models.Venta).filter(
        models.Venta.comprador_id == current_user.id
    ).order_by(models.Venta.fecha_venta.desc()).all()
    
    resultado = []
    for v in ventas:
        resultado.append({
            "id": v.id,
            "solicitud_id": v.solicitud_id,
            "cantidad": v.cantidad,
            "precio_unitario": v.precio_unitario,
            "total": v.total,
            "fecha_venta": v.fecha_venta,
            "estado": v.estado,
            "producto": {
                "id": v.producto.id,
                "nombre": v.producto.nombre
            } if v.producto else None,
            "vendedor": {
                "id": v.vendedor.id,
                "nombre": v.vendedor.nombre,
                "apodo": v.vendedor.apodo
            } if v.vendedor else None
        })
    
    return resultado