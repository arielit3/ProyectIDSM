from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
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

class ProductoCreate(BaseModel):
    nombre: str
    descripcion: str
    precio: float
    stock: int
    categoria: str
    imagen_nombre: Optional[str] = None

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
        
        # Guardar imagen si se proporcionó
        if imagen:
            # Generar nombre único para la imagen
            extension = os.path.splitext(imagen.filename)[1]
            imagen_nombre = f"{uuid.uuid4().hex}{extension}"
            imagen_path = os.path.join(UPLOAD_DIR, imagen_nombre)
            
            # Guardar imagen en disco
            with open(imagen_path, "wb") as buffer:
                shutil.copyfileobj(imagen.file, buffer)
        
        # Crear producto en BD
        nuevo_producto = models.Productos(
            vendedor_id=current_user.id,
            nombre=nombre,
            descripcion=descripcion,
            precio=precio,
            stock=stock,
            categoria=categoria,
            imagen_nombre=imagen_nombre
        )
        
        db.add(nuevo_producto)
        db.commit()
        db.refresh(nuevo_producto)
        
        return nuevo_producto
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear producto: {str(e)}")


@router.get("/vendedor/{vendedor_id}")
def listar_productos_vendedor(
    vendedor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Obtiene productos de un vendedor específico"""
    productos = db.query(models.Productos).filter(
        models.Productos.vendedor_id == vendedor_id
    ).all()
    return productos


@router.get("/")
def listar_todos_productos(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Obtiene todos los productos disponibles"""
    productos = db.query(models.Productos).all()
    return productos


@router.get("/categoria/{categoria}")
def listar_productos_por_categoria(
    categoria: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """Obtiene productos por categoría"""
    productos = db.query(models.Productos).filter(
        models.Productos.categoria == categoria
    ).all()
    return productos


@router.get("/{producto_id}")
def obtener_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    producto = db.query(models.Productos).filter(
        models.Productos.id == producto_id
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


# ============ FAVORITOS ============

@router.post("/{producto_id}/favorito")
def agregar_favorito(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    existente = db.query(models.Favorito).filter(
        models.Favorito.usuario_id == current_user.id,
        models.Favorito.producto_id == producto_id
    ).first()
    
    if existente:
        raise HTTPException(status_code=400, detail="Ya está en favoritos")
    
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