from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

import models
from deps import get_db, get_current_user
from crypto_utils import encrypt_text, decrypt_text

#:> Este router maneja el flujo para que un cliente pida subir a vendedor
router = APIRouter(prefix="/solicitudes-vendedor", tags=["Solicitudes Vendedor"])


class SolicitudVendedorCreate(BaseModel):
    #:> Este modelo recibe el motivo que manda el cliente para pedir cambio de rol
    motivo: str


class SolicitudVendedorUpdate(BaseModel):
    #:> Este modelo recibe la decision del admin y su respuesta opcional
    estado: str
    respuesta_admin: Optional[str] = None


def serializar_solicitud(solicitud: models.SolicitudVendedor):
    #:> Este helper prepara la solicitud con textos descifrados para el frontend
    #:> Esto deja la solicitud con textos legibles para el panel del front
    return {
        "id": solicitud.id,
        "usuario_id": solicitud.usuario_id,
        "motivo": decrypt_text(solicitud.motivo),
        "estado": solicitud.estado,
        "fecha_solicitud": solicitud.fecha_solicitud,
        "fecha_respuesta": solicitud.fecha_respuesta,
        "respuesta_admin": decrypt_text(solicitud.respuesta_admin) if solicitud.respuesta_admin else None,
        "usuario": {
            "id": solicitud.usuario.id,
            "nombre": solicitud.usuario.nombre,
            "apodo": solicitud.usuario.apodo,
            "correo": solicitud.usuario.correo
        } if solicitud.usuario else None
    }


@router.post("/")
def crear_solicitud_vendedor(
    data: SolicitudVendedorCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Aqui un cliente manda su solicitud para subir a vendedor
    if current_user.relacion.rol != "cliente":
        raise HTTPException(status_code=403, detail="Solo clientes pueden mandar esta solicitud")

    if not data.motivo.strip():
        raise HTTPException(status_code=400, detail="Debes escribir un motivo para la solicitud")

    existente = db.query(models.SolicitudVendedor).filter(
        models.SolicitudVendedor.usuario_id == current_user.id,
        models.SolicitudVendedor.estado == "pendiente"
    ).first()

    if existente:
        raise HTTPException(status_code=400, detail="Ya tienes una solicitud pendiente")

    solicitud = models.SolicitudVendedor(
        usuario_id=current_user.id,
        motivo=encrypt_text(data.motivo.strip()),
        estado="pendiente"
    )
    db.add(solicitud)
    db.flush()

    admins = db.query(models.Usuario).filter(
        models.Usuario.relacion.has(rol="administrador")
    ).all()

    for admin in admins:
        db.add(models.Notificacion(
            usuario_id=admin.id,
            titulo="Nueva solicitud para ser vendedor",
            mensaje=f"{current_user.apodo or current_user.nombre} quiere ser vendedor",
            tipo="solicitud_vendedor"
        ))

    db.commit()
    db.refresh(solicitud)
    return serializar_solicitud(solicitud)


@router.get("/")
def obtener_solicitudes_vendedor(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint deja al admin ver todas las solicitudes de cambio a vendedor
    #:> Este listado es para que el admin revise solicitudes pendientes o resueltas
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="No autorizado")

    solicitudes = db.query(models.SolicitudVendedor).order_by(
        models.SolicitudVendedor.fecha_solicitud.desc()
    ).all()

    return [serializar_solicitud(solicitud) for solicitud in solicitudes]


@router.get("/mi-solicitud")
def obtener_mi_solicitud_vendedor(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint deja al cliente consultar su propia solicitud mas reciente
    #:> Esto le deja al cliente ver en que va su solicitud mas reciente
    solicitud = db.query(models.SolicitudVendedor).filter(
        models.SolicitudVendedor.usuario_id == current_user.id
    ).order_by(models.SolicitudVendedor.fecha_solicitud.desc()).first()

    if not solicitud:
        return None

    return serializar_solicitud(solicitud)


@router.put("/{solicitud_id}")
def procesar_solicitud_vendedor(
    solicitud_id: int,
    data: SolicitudVendedorUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint deja al admin aprobar o rechazar la solicitud y actualizar el rol si aplica
    #:> Aqui el admin aprueba o rechaza la solicitud y deja respuesta
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="No autorizado")

    if data.estado not in ["aprobado", "rechazado"]:
        raise HTTPException(status_code=400, detail="Estado no valido")

    solicitud = db.query(models.SolicitudVendedor).filter(
        models.SolicitudVendedor.id == solicitud_id
    ).first()

    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    if solicitud.estado != "pendiente":
        raise HTTPException(status_code=400, detail="Esta solicitud ya fue procesada")

    solicitud.estado = data.estado
    solicitud.fecha_respuesta = datetime.utcnow()
    if data.respuesta_admin:
        solicitud.respuesta_admin = encrypt_text(data.respuesta_admin)

    if data.estado == "aprobado" and solicitud.usuario and solicitud.usuario.relacion:
        solicitud.usuario.relacion.rol = "vendedor"
        solicitud.usuario.relacion.estado = 1

    db.add(models.Notificacion(
        usuario_id=solicitud.usuario_id,
        titulo="Solicitud para ser vendedor actualizada",
        mensaje=f"Tu solicitud fue marcada como {data.estado}",
        tipo="solicitud_vendedor"
    ))

    db.commit()
    db.refresh(solicitud)
    return serializar_solicitud(solicitud)
