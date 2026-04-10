from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

import models
from deps import get_db, get_current_user
from crypto_utils import encrypt_text, decrypt_text

#:> Este router maneja reportes contra vendedores y sanciones aplicadas por admins
router = APIRouter(prefix="/reportes", tags=["Reportes"])


class ReporteVendedorCreate(BaseModel):
    #:> Este modelo recibe los datos minimos para levantar un reporte contra un vendedor
    vendedor_id: int
    motivo: str


class ReporteVendedorUpdate(BaseModel):
    #:> Este modelo recibe el nuevo estado del reporte y respuesta opcional del admin
    estado: Optional[str] = None
    respuesta_admin: Optional[str] = None


class SancionCreate(BaseModel):
    #:> Este modelo recibe el tipo de sancion y el motivo escrito por el admin
    tipo: str
    motivo: str


class LevantarSancionData(BaseModel):
    #:> Este modelo recibe el motivo opcional cuando un admin retira una sancion
    motivo: Optional[str] = None


class ReporteVendedorResponse(BaseModel):
    #:> Este modelo arma la respuesta serializada de un reporte para el frontend
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


class SancionUsuarioResponse(BaseModel):
    #:> Este modelo arma la respuesta serializada de una sancion para el frontend
    id: int
    usuario_id: int
    admin_id: int
    reporte_id: Optional[int] = None
    motivo: str
    tipo: str
    activa: bool
    fecha_creacion: datetime
    usuario_nombre: Optional[str] = None
    admin_nombre: Optional[str] = None

    class Config:
        from_attributes = True


def serializar_reporte(reporte: models.ReporteVendedor):
    #:> Esto deja el reporte listo para el front con los textos ya descifrados
    return ReporteVendedorResponse(
        id=reporte.id,
        comprador_id=reporte.comprador_id,
        vendedor_id=reporte.vendedor_id,
        motivo=decrypt_text(reporte.motivo),
        estado=reporte.estado,
        respuesta_admin=decrypt_text(reporte.respuesta_admin) if reporte.respuesta_admin else None,
        fecha_creacion=reporte.fecha_creacion,
        fecha_resolucion=reporte.fecha_resolucion,
        comprador_nombre=reporte.comprador.nombre if reporte.comprador else None,
        vendedor_nombre=reporte.vendedor.nombre if reporte.vendedor else None
    )


def serializar_sancion(sancion: models.SancionUsuario):
    #:> Esto deja la sancion lista para el panel del admin con nombres y motivo legible
    return SancionUsuarioResponse(
        id=sancion.id,
        usuario_id=sancion.usuario_id,
        admin_id=sancion.admin_id,
        reporte_id=sancion.reporte_id,
        motivo=decrypt_text(sancion.motivo),
        tipo=sancion.tipo,
        activa=sancion.activa,
        fecha_creacion=sancion.fecha_creacion,
        usuario_nombre=sancion.usuario.nombre if sancion.usuario else None,
        admin_nombre=sancion.admin.nombre if sancion.admin else None
    )


def crear_notificacion_admin(db: Session, reporte: models.ReporteVendedor, comprador_nombre: str, vendedor_nombre: str):
    #:> Cuando entra un reporte se avisa a todos los admins para que salga en su panel
    admins = db.query(models.Usuario).filter(
        models.Usuario.relacion.has(rol="administrador")
    ).all()

    for admin in admins:
        db.add(models.Notificacion(
            usuario_id=admin.id,
            titulo="Nuevo reporte de vendedor",
            mensaje=f"El comprador {comprador_nombre} reporto al vendedor {vendedor_nombre}",
            tipo="reporte",
            reporte_id=reporte.id
        ))


def crear_notificacion_comprador(db: Session, reporte: models.ReporteVendedor, vendedor_nombre: str):
    #:> Cuando el admin resuelve el reporte tambien se le avisa al comprador
    if reporte.estado in ["resuelto", "rechazado"]:
        db.add(models.Notificacion(
            usuario_id=reporte.comprador_id,
            titulo=f"Reporte {reporte.estado}",
            mensaje=f"Tu reporte contra {vendedor_nombre} fue {reporte.estado}. {decrypt_text(reporte.respuesta_admin) if reporte.respuesta_admin else ''}",
            tipo="reporte",
            reporte_id=reporte.id
        ))


def construir_notificacion_sancion(tipo: str, motivo: str):
    #:> Esto arma el titulo y mensaje segun la sancion para que el vendedor entienda que paso
    motivo_limpio = motivo.strip()

    if tipo == "advertencia":
        return {
            "titulo": "Advertencia administrativa",
            "mensaje": f"El administrador envio esta advertencia: {motivo_limpio}"
        }

    return {
        "titulo": "Cuenta bloqueada",
        "mensaje": f"Tu cuenta fue bloqueada. Motivo: {motivo_limpio}. Comunicate con toritoseats@gmail.com"
    }


@router.post("/vendedor", response_model=ReporteVendedorResponse)
def reportar_vendedor(
    reporte: ReporteVendedorCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint deja a un comprador reportar a un vendedor con motivo cifrado
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
        motivo=encrypt_text(reporte.motivo.strip()),
        estado="pendiente"
    )

    db.add(nuevo_reporte)
    db.flush()

    crear_notificacion_admin(db, nuevo_reporte, current_user.nombre, vendedor.nombre)
    db.commit()
    db.refresh(nuevo_reporte)

    return serializar_reporte(nuevo_reporte)


@router.get("/todos", response_model=List[ReporteVendedorResponse])
def obtener_todos_reportes(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
    estado: Optional[str] = None
):
    #:> Este endpoint deja al admin listar reportes con filtro opcional por estado
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="No autorizado")

    query = db.query(models.ReporteVendedor)
    if estado:
        query = query.filter(models.ReporteVendedor.estado == estado)

    reportes = query.order_by(models.ReporteVendedor.fecha_creacion.desc()).all()
    return [serializar_reporte(reporte) for reporte in reportes]


@router.get("/vendedor/{vendedor_id}", response_model=List[ReporteVendedorResponse])
def obtener_reportes_vendedor(
    vendedor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint deja al admin ver el historial de reportes de un vendedor puntual
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="No autorizado")

    reportes = db.query(models.ReporteVendedor).filter(
        models.ReporteVendedor.vendedor_id == vendedor_id
    ).order_by(models.ReporteVendedor.fecha_creacion.desc()).all()

    return [serializar_reporte(reporte) for reporte in reportes]


@router.put("/{reporte_id}", response_model=ReporteVendedorResponse)
def actualizar_reporte(
    reporte_id: int,
    actualizacion: ReporteVendedorUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint deja al admin resolver o rechazar un reporte y notificar al comprador
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="No autorizado")

    reporte = db.query(models.ReporteVendedor).filter(
        models.ReporteVendedor.id == reporte_id
    ).first()

    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    if actualizacion.estado:
        if actualizacion.estado not in ["pendiente", "resuelto", "rechazado"]:
            raise HTTPException(status_code=400, detail="Estado no valido")
        reporte.estado = actualizacion.estado
        if actualizacion.estado in ["resuelto", "rechazado"]:
            #:> Se guarda quien resolvio para que luego no quede en el aire
            reporte.admin_id = current_user.id
            reporte.fecha_resolucion = datetime.utcnow()

    if actualizacion.respuesta_admin:
        #:> La respuesta del admin tambien se guarda cifrada
        reporte.respuesta_admin = encrypt_text(actualizacion.respuesta_admin)

    vendedor_nombre = reporte.vendedor.nombre if reporte.vendedor else "el vendedor"
    crear_notificacion_comprador(db, reporte, vendedor_nombre)

    db.commit()
    db.refresh(reporte)

    return serializar_reporte(reporte)


@router.get("/sanciones", response_model=List[SancionUsuarioResponse])
def obtener_sanciones(
    activas: Optional[bool] = None,
    usuario_id: Optional[int] = None,
    tipo: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint le da al admin el listado de sanciones para mostrar en su panel
    #:> Se puede usar sin filtros para ver todo o con filtros para ver activas, por usuario o por tipo
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="No autorizado")

    query = db.query(models.SancionUsuario)

    if activas is not None:
        query = query.filter(models.SancionUsuario.activa == activas)

    if usuario_id is not None:
        query = query.filter(models.SancionUsuario.usuario_id == usuario_id)

    if tipo:
        query = query.filter(models.SancionUsuario.tipo == tipo)

    sanciones = query.order_by(models.SancionUsuario.fecha_creacion.desc()).all()
    return [serializar_sancion(sancion) for sancion in sanciones]


@router.get("/sanciones/{sancion_id}", response_model=SancionUsuarioResponse)
def obtener_sancion(
    sancion_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint sirve para ver una sancion puntual si luego quieres abrir detalle o modal
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="No autorizado")

    sancion = db.query(models.SancionUsuario).filter(
        models.SancionUsuario.id == sancion_id
    ).first()

    if not sancion:
        raise HTTPException(status_code=404, detail="Sancion no encontrada")

    return serializar_sancion(sancion)


@router.post("/{reporte_id}/sancionar")
def sancionar_vendedor(
    reporte_id: int,
    data: SancionCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Aqui ya no solo se marca el reporte
    #:> Ahora tambien se puede aplicar una sancion formal al vendedor
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="No autorizado")

    if data.tipo not in ["advertencia", "bloqueo"]:
        raise HTTPException(status_code=400, detail="Tipo de sancion no valido")

    reporte = db.query(models.ReporteVendedor).filter(
        models.ReporteVendedor.id == reporte_id
    ).first()

    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    if not data.motivo.strip():
        raise HTTPException(status_code=400, detail="Debes indicar el motivo de la sancion")

    sancion = models.SancionUsuario(
        usuario_id=reporte.vendedor_id,
        admin_id=current_user.id,
        reporte_id=reporte.id,
        motivo=encrypt_text(data.motivo.strip()),
        tipo=data.tipo,
        activa=True
    )
    db.add(sancion)

    #:> Solo el bloqueo cambia estado porque la advertencia debe quedar como antecedente sin tumbar acceso
    if reporte.vendedor and reporte.vendedor.relacion and data.tipo == "bloqueo":
        reporte.vendedor.relacion.estado = 0

    #:> Al sancionar tambien dejamos el reporte cerrado para que no quede doble trabajo
    reporte.estado = "resuelto"
    reporte.admin_id = current_user.id
    reporte.fecha_resolucion = datetime.utcnow()

    notificacion_sancion = construir_notificacion_sancion(data.tipo, data.motivo)

    db.add(models.Notificacion(
        usuario_id=reporte.vendedor_id,
        titulo=notificacion_sancion["titulo"],
        mensaje=notificacion_sancion["mensaje"],
        tipo="sancion",
        reporte_id=reporte.id
    ))

    crear_notificacion_comprador(db, reporte, reporte.vendedor.nombre if reporte.vendedor else "el vendedor")

    db.commit()
    db.refresh(sancion)

    return {
        "id": sancion.id,
        "usuario_id": sancion.usuario_id,
        "admin_id": sancion.admin_id,
        "reporte_id": sancion.reporte_id,
        "motivo": data.motivo.strip(),
        "tipo": sancion.tipo,
        "activa": sancion.activa,
        "fecha_creacion": sancion.fecha_creacion
    }


@router.put("/sanciones/{sancion_id}/levantar")
def levantar_sancion(
    sancion_id: int,
    data: LevantarSancionData,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Aqui el admin puede dejar inactiva una sancion para soltar de nuevo al usuario
    if current_user.relacion.rol != "administrador":
        raise HTTPException(status_code=403, detail="No autorizado")

    sancion = db.query(models.SancionUsuario).filter(
        models.SancionUsuario.id == sancion_id
    ).first()

    if not sancion:
        raise HTTPException(status_code=404, detail="Sancion no encontrada")

    if not sancion.activa:
        raise HTTPException(status_code=400, detail="La sancion ya fue levantada")

    sancion.activa = False

    #:> Si ya no quedan bloqueos activos, el usuario puede volver a entrar
    sanciones_fuertes_activas = db.query(models.SancionUsuario).filter(
        models.SancionUsuario.usuario_id == sancion.usuario_id,
        models.SancionUsuario.activa == True,
        models.SancionUsuario.tipo == "bloqueo",
        models.SancionUsuario.id != sancion.id
    ).count()

    usuario = db.query(models.Usuario).filter(
        models.Usuario.id == sancion.usuario_id
    ).first()

    if usuario and usuario.relacion and sanciones_fuertes_activas == 0:
        usuario.relacion.estado = 1

    db.add(models.Notificacion(
        usuario_id=sancion.usuario_id,
        titulo="Sancion levantada",
        mensaje=data.motivo.strip() if data.motivo and data.motivo.strip() else "Un administrador retiro tu sancion",
        tipo="sancion",
        reporte_id=sancion.reporte_id
    ))

    db.commit()
    db.refresh(sancion)

    return {
        "id": sancion.id,
        "usuario_id": sancion.usuario_id,
        "reporte_id": sancion.reporte_id,
        "tipo": sancion.tipo,
        "activa": sancion.activa,
        "mensaje": "Sancion levantada correctamente"
    }


@router.get("/vendedor/{vendedor_id}/contar")
def contar_reportes_vendedor(
    vendedor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    #:> Este endpoint devuelve totales rapidos de reportes y sanciones de un vendedor
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

    sanciones = db.query(models.SancionUsuario).filter(
        models.SancionUsuario.usuario_id == vendedor_id
    ).count()

    return {
        "vendedor_id": vendedor_id,
        "total": total,
        "pendientes": pendientes,
        "resueltos": resueltos,
        "sanciones": sanciones
    }
