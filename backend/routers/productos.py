from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
from deps import get_db, get_current_user

router = APIRouter(prefix="/productos", tags=["Productos"])
#la clase de producto 
class ProductoCreate(BaseModel):
    nombre: str
    descripcion: str
    precio: float

@router.post("/")
def crear_producto(
    producto: ProductoCreate,
    db: Session = Depends(get_db),
):
    # creamos un nuevo producto
    nuevo_producto = models.Producto(
        nombre=producto.nombre,
        descripcion=producto.descripcion,
        precio=producto.precio,
    )

    db.add(nuevo_producto)
    #agregamos a el nuevo producto, para esto usamos la conexion con la bd y enviamos los datos que tenemos#
    db.commit()
    #confirmamos envio
    db.refresh(nuevo_producto)
    #refrescamos a el objeto temporal para que se vacie
    return nuevo_producto
    #regresamos a el nuevo producto