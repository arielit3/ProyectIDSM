from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
from deps import get_db, get_current_user

router = APIRouter(prefix="/productos", tags=["Productos"])
#la clase de producto 
class ProductoCreate(BaseModel):
    vendedor_id: int
    nombre: str
    descripcion: str
    precio: float
    stock: int

@router.post("/")
def crear_producto(
    producto: ProductoCreate,
    db: Session = Depends(get_db),
):

    nuevo_producto = models.Productos(
        vendedor_id=producto.vendedor_id,
        nombre=producto.nombre,
        descripcion=producto.descripcion,
        precio=producto.precio,
        stock=producto.stock
    )

    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)

    return nuevo_producto



@router.post("/{producto_id}/favorito")
def agregar_favorito(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):

    # verificar si ya existe en favoritos
    existente = db.query(models.Favorito).filter(
        models.Favorito.usuario_id == current_user.id,
        models.Favorito.producto_id == producto_id
    ).first()

    if existente:
        raise HTTPException(status_code=400, detail="Ya está en favoritos")

    # crear favorito
    favorito = models.Favorito(
        usuario_id=current_user.id,
        producto_id=producto_id
    )

    db.add(favorito)
    db.commit()

    return {"mensaje": "Producto agregado a favoritos"}

@router.get("/favoritos")
def ver_favoritos(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):

    favoritos = db.query(models.Favorito).filter(
        models.Favorito.usuario_id == current_user.id
    ).all()

    return favoritos

@router.delete("/{producto_id}/favorito")
def quitar_favorito(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):

    favorito = db.query(models.Favorito).filter(
        models.Favorito.usuario_id == current_user.id,
        models.Favorito.producto_id == producto_id
    ).first()

    if not favorito:
        raise HTTPException(status_code=404, detail="Favorito no encontrado")

    db.delete(favorito)
    db.commit()

    return {"mensaje": "Producto eliminado de favoritos"}


