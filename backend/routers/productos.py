from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
from deps import get_db, get_current_user

router = APIRouter(prefix="/productos", tags=["Productos"])

class ProductoCreate(BaseModel):
    vendedor_id: int
    nombre: str
    descripcion: str
    precio: float
    stock: int

# ============ RUTAS ESTÁTICAS PRIMERO (SIN PARÁMETROS) ============

@router.get("/favoritos")
def ver_favoritos(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Obtiene todos los favoritos del usuario actual"""
    favoritos = db.query(models.Favorito).filter(
        models.Favorito.usuario_id == current_user.id
    ).all()
    return favoritos

@router.get("/todos")
def listar_todos_productos(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Obtiene todos los productos (solo para administradores)"""
    # Verificar que sea administrador
    if current_user.relacion.rol != "administrador":
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para ver todos los productos"
        )
    productos = db.query(models.Productos).all()
    return productos

# ============ RUTAS CON PARÁMETROS ESPECÍFICOS ============

@router.get("/vendedor/{vendedor_id}")
def listar_productos_por_vendedor(
    vendedor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Obtiene todos los productos de un vendedor específico"""
    productos = db.query(models.Productos).filter(
        models.Productos.vendedor_id == vendedor_id
    ).all()
    return productos

# ============ RUTAS CON PARÁMETROS GENÉRICOS (AL FINAL) ============

@router.get("/{producto_id}")
def obtener_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Obtiene un producto por su ID"""
    producto = db.query(models.Productos).filter(
        models.Productos.id == producto_id
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

# ============ OPERACIONES DE PRODUCTOS ============

@router.post("/")
def crear_producto(
    producto: ProductoCreate,
    db: Session = Depends(get_db),
):
    """Crea un nuevo producto"""
    try:
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
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error al crear producto: {str(e)}"
        )

# ============ OPERACIONES DE FAVORITOS ============

@router.post("/{producto_id}/favorito")
def agregar_favorito(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Agrega un producto a favoritos"""
    # Verificar si ya existe en favoritos
    existente = db.query(models.Favorito).filter(
        models.Favorito.usuario_id == current_user.id,
        models.Favorito.producto_id == producto_id
    ).first()

    if existente:
        raise HTTPException(status_code=400, detail="Ya está en favoritos")

    # Crear favorito
    favorito = models.Favorito(
        usuario_id=current_user.id,
        producto_id=producto_id
    )

    db.add(favorito)
    db.commit()
    return {"mensaje": "Producto agregado a favoritos"}

@router.delete("/{producto_id}/favorito")
def quitar_favorito(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Elimina un producto de favoritos"""
    favorito = db.query(models.Favorito).filter(
        models.Favorito.usuario_id == current_user.id,
        models.Favorito.producto_id == producto_id
    ).first()

    if not favorito:
        raise HTTPException(status_code=404, detail="Favorito no encontrado")

    db.delete(favorito)
    db.commit()
    return {"mensaje": "Producto eliminado de favoritos"}