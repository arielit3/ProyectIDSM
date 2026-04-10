from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

import models
from deps import get_db, get_current_user  

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reportes", tags=["Reportes"])

# MODELOS PYDANTIC

class ReporteVendedorCreate(BaseModel):
    """Modelo para crear un reporte contra un vendedor"""
    vendedor_id: int
    motivo: str

class ReporteVendedorUpdate(BaseModel):
    """Modelo para actualizar un reporte (solo administradores)"""
    estado: Optional[str] = None  # Valores posibles: pendiente, resuelto, rechazado
    respuesta_admin: Optional[str] = None

class ReporteVendedorResponse(BaseModel):
    """Modelo de respuesta para reportes con datos del comprador y vendedor"""
    id: int
    comprador_id: int
    vendedor_id: int
    motivo: str
    estado: str
    respuesta_admin: Optional[str] = None
    fecha_creacion: datetime
    fecha_resolucion: Optional[datetime] = None
    comprador_nombre: Optional[str] = None
    vendedor_nombre: Optional[str] = None

    class Config:
        from_attributes = True

# FUNCIONES AUXILIARES
def crear_notificacion_admin(db: Session, reporte, comprador_nombre: str, vendedor_nombre: str):
    """
    Notifica a todos los administradores cuando se crea un nuevo reporte.
    
    Lógica:
    - Busca todos los usuarios con rol "administrador"
    - Para cada administrador, crea una notificación con el tipo "reporte"
    - La notificación incluye quién reportó y a quién
    
    Retorna: None (solo crea notificaciones en BD)
    """
    admins = db.query(models.Usuario).filter(
        models.Usuario.relacion.has(rol="administrador")
    ).all()
    
    for admin in admins:
        notificacion = models.Notificacion(
            usuario_id=admin.id,
            titulo="Nuevo reporte de vendedor",
            mensaje=f"El comprador {comprador_nombre} ha reportado al vendedor {vendedor_nombre}",
            tipo="reporte"
        )
        db.add(notificacion)
    db.commit()

def crear_notificacion_comprador(db: Session, reporte, vendedor_nombre: str):
    """
    Notifica al comprador cuando su reporte es resuelto o rechazado.
    
    Lógica:
    - Solo se ejecuta si el estado del reporte es "resuelto" o "rechazado"
    - Incluye la respuesta del administrador en el mensaje
    
    Retorna: None (solo crea notificaciones en BD)
    """
    if reporte.estado in ["resuelto", "rechazado"]:
        notificacion = models.Notificacion(
            usuario_id=reporte.comprador_id,
            titulo=f"Reporte {reporte.estado}",
            mensaje=f"Tu reporte contra {vendedor_nombre} ha sido {reporte.estado}. {reporte.respuesta_admin or ''}",
            tipo="reporte"
        )
        db.add(notificacion)
        db.commit()

def crear_notificacion_vendedor(db: Session, vendedor_id: int, mensaje: str):
    """
    Notifica al vendedor que ha recibido un reporte.
    
    Lógica:
    - Crea una notificación tipo "reporte_vendedor"
    - El mensaje puede personalizarse según el motivo del reporte
    
    Retorna: None (solo crea notificaciones en BD)
    """
    notificacion = models.Notificacion(
        usuario_id=vendedor_id,
        titulo="Has recibido un reporte",
        mensaje=mensaje,
        tipo="reporte_vendedor"
    )
    db.add(notificacion)
    db.commit()

# ENDPOINTS
@router.post("/vendedor", response_model=ReporteVendedorResponse)
def reportar_vendedor(
    reporte: ReporteVendedorCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Permite a un comprador reportar a un vendedor.
    
    Lógica de validación:
    - Verifica que el usuario actual tenga rol "cliente" (solo compradores pueden reportar)
    - Verifica que no se esté reportando a sí mismo
    - Verifica que el vendedor exista y tenga rol "vendedor"
    - Verifica que el motivo tenga al menos 10 caracteres (evita reportes vacíos)
    
    Flujo:
    - Crea el reporte con estado "pendiente"
    - Notifica a todos los administradores
    - Retorna el reporte creado con nombres del comprador y vendedor
    
    Retorna: ReporteVendedorResponse con los datos del reporte
    """
    if current_user.relacion.rol != "cliente":
        raise HTTPException(status_code=403, detail="Solo compradores pueden reportar")
    
    if current_user.id == reporte.vendedor_id:
        raise HTTPException(status_code=400, detail="No puedes reportarte a ti mismo")
    
    vendedor = db.query(models.Usuario).filter(models.Usuario.id == reporte.vendedor_id).first()
    if not vendedor or vendedor.relacion.rol != "vendedor":
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    
    if len(reporte.motivo.strip()) < 10:
        raise HTTPException(status_code=400, detail="El motivo debe tener al menos 10 caracteres")
    
    nuevo_reporte = models.ReporteVendedor(
        comprador_id=current_user.id,
        vendedor_id=reporte.vendedor_id,
        motivo=reporte.motivo,
        estado="pendiente"
    )
    
    db.add(nuevo_reporte)
    db.commit()
    db.refresh(nuevo_reporte)
    
    crear_notificacion_admin(db, nuevo_reporte, current_user.nombre, vendedor.nombre)
    
    return ReporteVendedorResponse(
        id=nuevo_reporte.id,
        comprador_id=nuevo_reporte.comprador_id,
        vendedor_id=nuevo_reporte.vendedor_id,
        motivo=nuevo_reporte.motivo,
        estado=nuevo_reporte.estado,
        respuesta_admin=nuevo_reporte.respuesta_admin,
        fecha_creacion=nuevo_reporte.fecha_creacion,
        fecha_resolucion=nuevo_reporte.fecha_resolucion,
        comprador_nombre=current_user.nombre,
        vendedor_nombre=vendedor.nombre
    )


@router.get("/todos", response_model=List[ReporteVendedorResponse])
def obtener_todos_reportes(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
    estado: Optional[str] = None
):
    """
    Obtiene todos los reportes (solo administradores).
    
    Lógica:
    - Verifica que el usuario sea administrador
    - Permite filtrar por estado (pendiente, resuelto, rechazado)
    - Ordena por fecha de creación descendente (más recientes primero)
    - Incluye nombres del comprador y vendedor mediante relaciones
    
    Retorna: Lista de ReporteVendedorResponse
    """
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    query = db.query(models.ReporteVendedor)
    if estado:
        query = query.filter(models.ReporteVendedor.estado == estado)
    
    reportes = query.order_by(models.ReporteVendedor.fecha_creacion.desc()).all()
    
    resultado = []
    for r in reportes:
        resultado.append(ReporteVendedorResponse(
            id=r.id,
            comprador_id=r.comprador_id,
            vendedor_id=r.vendedor_id,
            motivo=r.motivo,
            estado=r.estado,
            respuesta_admin=r.respuesta_admin,
            fecha_creacion=r.fecha_creacion,
            fecha_resolucion=r.fecha_resolucion,
            comprador_nombre=r.comprador.nombre if r.comprador else None,
            vendedor_nombre=r.vendedor.nombre if r.vendedor else None
        ))
    
    return resultado


@router.get("/vendedor/{vendedor_id}", response_model=List[ReporteVendedorResponse])
def obtener_reportes_vendedor(
    vendedor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Obtiene todos los reportes de un vendedor específico (solo administradores).
    
    Lógica:
    - Verifica que el usuario sea administrador
    - Filtra reportes por vendedor_id
    - Ordena por fecha de creación descendente
    - Incluye nombres del comprador y vendedor
    
    Retorna: Lista de ReporteVendedorResponse para el vendedor solicitado
    """
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    reportes = db.query(models.ReporteVendedor).filter(
        models.ReporteVendedor.vendedor_id == vendedor_id
    ).order_by(models.ReporteVendedor.fecha_creacion.desc()).all()
    
    resultado = []
    for r in reportes:
        resultado.append(ReporteVendedorResponse(
            id=r.id,
            comprador_id=r.comprador_id,
            vendedor_id=r.vendedor_id,
            motivo=r.motivo,
            estado=r.estado,
            respuesta_admin=r.respuesta_admin,
            fecha_creacion=r.fecha_creacion,
            fecha_resolucion=r.fecha_resolucion,
            comprador_nombre=r.comprador.nombre if r.comprador else None,
            vendedor_nombre=r.vendedor.nombre if r.vendedor else None
        ))
    
    return resultado


@router.put("/{reporte_id}", response_model=ReporteVendedorResponse)
def actualizar_reporte(
    reporte_id: int,
    actualizacion: ReporteVendedorUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Actualiza un reporte (solo administradores).
    
    Lógica:
    - Verifica que el usuario sea administrador
    - Busca el reporte por ID (404 si no existe)
    - Si se actualiza el estado a "resuelto" o "rechazado", establece fecha_resolucion
    - Si se proporciona respuesta_admin, la guarda
    - Notifica al comprador sobre la resolución/rechazo
    
    Estados posibles:
    - pendiente: reporte sin resolver
    - resuelto: reporte aceptado y resuelto a favor del comprador
    - rechazado: reporte rechazado (sin mérito)
    
    Retorna: ReporteVendedorResponse actualizado
    """
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    reporte = db.query(models.ReporteVendedor).filter(
        models.ReporteVendedor.id == reporte_id
    ).first()
    
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    
    # Actualizar estado si se proporcionó
    if actualizacion.estado:
        reporte.estado = actualizacion.estado
        if actualizacion.estado in ["resuelto", "rechazado"]:
            reporte.fecha_resolucion = datetime.utcnow()
    
    # Actualizar respuesta del admin si se proporcionó
    if actualizacion.respuesta_admin:
        reporte.respuesta_admin = actualizacion.respuesta_admin
    
    db.commit()
    db.refresh(reporte)
    
    comprador_nombre = reporte.comprador.nombre if reporte.comprador else None
    vendedor_nombre = reporte.vendedor.nombre if reporte.vendedor else None
    
    # Notificar al comprador si el reporte fue resuelto o rechazado
    if vendedor_nombre:
        crear_notificacion_comprador(db, reporte, vendedor_nombre)
    
    return ReporteVendedorResponse(
        id=reporte.id,
        comprador_id=reporte.comprador_id,
        vendedor_id=reporte.vendedor_id,
        motivo=reporte.motivo,
        estado=reporte.estado,
        respuesta_admin=reporte.respuesta_admin,
        fecha_creacion=reporte.fecha_creacion,
        fecha_resolucion=reporte.fecha_resolucion,
        comprador_nombre=comprador_nombre,
        vendedor_nombre=vendedor_nombre
    )


@router.get("/vendedor/{vendedor_id}/contar")
def contar_reportes_vendedor(
    vendedor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Obtiene estadísticas de reportes para un vendedor específico (solo administradores).
    
    Lógica:
    - Verifica que el usuario sea administrador
    - Cuenta total de reportes del vendedor
    - Cuenta reportes pendientes
    - Cuenta reportes resueltos
    
    Útil para:
    - Dashboard de administración
    - Identificar vendedores problemáticos
    - Monitorear volumen de reportes
    
    Retorna: Diccionario con conteos (total, pendientes, resueltos)
    """
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    total = db.query(models.ReporteVendedor).filter(
        models.ReporteVendedor.vendedor_id == vendedor_id
    ).count()
    
    pendientes = db.query(models.ReporteVendedor).filter(
        models.ReporteVendedor.vendedor_id == vendedor_id,
        models.ReporteVendedor.estado == "pendiente"
    ).count()
    
    resueltos = db.query(models.ReporteVendedor).filter(
        models.ReporteVendedor.vendedor_id == vendedor_id,
        models.ReporteVendedor.estado == "resuelto"
    ).count()
    
    return {
        "vendedor_id": vendedor_id,
        "total": total,
        "pendientes": pendientes,
        "resueltos": resueltos
    }