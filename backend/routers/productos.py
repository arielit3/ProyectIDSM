from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel
import os
import shutil
import uuid
from typing import Optional
import models
from deps import get_db, get_current_user

router = APIRouter(prefix="/productos", tags=["Productos"])

# Configuración de la carpeta de imágenes
UPLOAD_DIR = "uploads/productos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ============ MODELOS PYDANTIC ============
class ProductoCreate(BaseModel):
    nombre: str
    descripcion: str
    precio: float
    stock: int
    categoria: str
    imagen_nombre: Optional[str] = None


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    stock: Optional[int] = None
    categoria: Optional[str] = None
    activo: Optional[int] = None


# ============ CREAR PRODUCTO ============
@router.post("/")
async def crear_producto(
    nombre: str = Form(...),
    descripcion: str = Form(...),
    precio: float = Form(...),
    stock: int = Form(...),
    categoria: str = Form(...),
    imagen: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Crea un nuevo producto con imagen opcional"""
    try:
        imagen_nombre = None
        
        if imagen:
            extension = os.path.splitext(imagen.filename)[1]
            imagen_nombre = f"{uuid.uuid4().hex}{extension}"
            imagen_path = os.path.join(UPLOAD_DIR, imagen_nombre)
            
            with open(imagen_path, "wb") as buffer:
                shutil.copyfileobj(imagen.file, buffer)
        
        nuevo_producto = models.Productos(
            vendedor_id=current_user.id,
            nombre=nombre,
            descripcion=descripcion,
            precio=precio,
            stock=stock,
            categoria=categoria,
            imagen_nombre=imagen_nombre,
            activo=1  # Por defecto visible
        )
        
        db.add(nuevo_producto)
        db.commit()
        db.refresh(nuevo_producto)
        
        return nuevo_producto
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear producto: {str(e)}")


# ============ OBTENER PRODUCTOS DEL VENDEDOR ACTUAL (incluye ocultos) ============
@router.get("/mis-productos")
def listar_mis_productos(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Obtiene todos los productos del vendedor actual (incluye ocultos)"""
    productos = db.query(models.Productos).filter(
        models.Productos.vendedor_id == current_user.id
    ).all()
    return productos


# ============ OBTENER PRODUCTOS DE UN VENDEDOR (solo visibles para compradores) ============
@router.get("/vendedor/{vendedor_id}")
def listar_productos_vendedor(
    vendedor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Obtiene productos VISIBLES de un vendedor específico"""
    productos = db.query(models.Productos).filter(
        models.Productos.vendedor_id == vendedor_id,
        models.Productos.activo == 1  # Solo visibles
    ).all()
    return productos


# ============ OBTENER TODOS LOS PRODUCTOS VISIBLES ============
@router.get("/")
def listar_todos_productos(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Obtiene todos los productos visibles con información del vendedor"""
    productos = db.query(models.Productos).options(
        selectinload(models.Productos.vendedor)
    ).filter(
        models.Productos.activo == 1  # Solo visibles
    ).all()
    
    resultado = []
    for p in productos:
        producto_dict = {
            "id": p.id,
            "vendedor_id": p.vendedor_id,
            "nombre": p.nombre,
            "descripcion": p.descripcion,
            "precio": p.precio,
            "stock": p.stock,
            "categoria": p.categoria,
            "imagen_nombre": p.imagen_nombre,
            "activo": p.activo,
            "vendedor": {
                "id": p.vendedor.id,
                "nombre": p.vendedor.nombre,
                "apodo": p.vendedor.apodo
            } if p.vendedor else None
        }
        resultado.append(producto_dict)
    
    return resultado


# ============ ACTUALIZAR PRODUCTO ============
@router.put("/{producto_id}")
def actualizar_producto(
    producto_id: int,
    producto_data: ProductoUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Actualiza un producto (solo el dueño puede hacerlo)"""
    producto = db.query(models.Productos).filter(
        models.Productos.id == producto_id
    ).first()
    
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if producto.vendedor_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este producto")
    
    # Actualizar solo los campos que vienen en la petición
    if producto_data.nombre is not None:
        producto.nombre = producto_data.nombre
    if producto_data.descripcion is not None:
        producto.descripcion = producto_data.descripcion
    if producto_data.precio is not None:
        producto.precio = producto_data.precio
    if producto_data.stock is not None:
        producto.stock = producto_data.stock
    if producto_data.categoria is not None:
        producto.categoria = producto_data.categoria
    if producto_data.activo is not None:
        producto.activo = producto_data.activo
    
    db.commit()
    db.refresh(producto)
    
    return producto


# ============ ELIMINAR PRODUCTO (físicamente) ============
@router.delete("/{producto_id}")
def eliminar_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Elimina un producto permanentemente (solo el dueño puede hacerlo)"""
    producto = db.query(models.Productos).filter(
        models.Productos.id == producto_id
    ).first()
    
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if producto.vendedor_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este producto")
    
    try:
        # Eliminar imagen asociada si existe
        if producto.imagen_nombre:
            imagen_path = os.path.join(UPLOAD_DIR, producto.imagen_nombre)
            if os.path.exists(imagen_path):
                os.remove(imagen_path)
        
        db.delete(producto)
        db.commit()
        return {"mensaje": "Producto eliminado correctamente"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar producto: {str(e)}")


# ============ OCULTAR/PUBLICAR PRODUCTO ============
@router.patch("/{producto_id}/toggle")
def toggle_producto_visibilidad(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Alterna la visibilidad del producto (ocultar/publicar)"""
    producto = db.query(models.Productos).filter(
        models.Productos.id == producto_id
    ).first()
    
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if producto.vendedor_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar este producto")
    
    producto.activo = 0 if producto.activo == 1 else 1
    db.commit()
    
    estado = "visible" if producto.activo == 1 else "oculto"
    return {"mensaje": f"Producto ahora está {estado}", "activo": producto.activo}