from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel
import os
import shutil
import uuid
import json
from typing import Optional
import models
from deps import get_db, get_current_user

router = APIRouter(prefix="/productos", tags=["Productos"])

# Configuración de la carpeta de imágenes
UPLOAD_DIR = "uploads/productos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# MODELOS PYDANTIC
class ProductoCreate(BaseModel):
    """Modelo para la creación de un producto"""
    nombre: str
    descripcion: str
    precio: float
    stock: int
    categoria: str
    imagen_nombre: Optional[str] = None


class ProductoUpdate(BaseModel):
    """Modelo para la actualización parcial de un producto"""
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    stock: Optional[int] = None
    categoria: Optional[str] = None
    activo: Optional[int] = None


# CREAR PRODUCTO 
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
    """
    Crea un nuevo producto con imagen opcional.
    
    Lógica:
    - Recibe los datos del producto mediante FormData
    - Si se proporciona una imagen, genera un nombre único con UUID y la guarda en el servidor
    - Asocia automáticamente el producto al vendedor actual (usuario autenticado)
    - El producto se crea con estado activo=1 por defecto
    
    Retorna el objeto del producto creado con sus datos incluyendo el ID generado.
    """
    try:
        imagen_nombre = None
        
        # Procesar la imagen si fue enviada
        if imagen:
            extension = os.path.splitext(imagen.filename)[1]
            imagen_nombre = f"{uuid.uuid4().hex}{extension}"
            imagen_path = os.path.join(UPLOAD_DIR, imagen_nombre)
            
            with open(imagen_path, "wb") as buffer:
                shutil.copyfileobj(imagen.file, buffer)
        
        # Crear el registro del producto en la base de datos
        nuevo_producto = models.Productos(
            vendedor_id=current_user.id,
            nombre=nombre,
            descripcion=descripcion,
            precio=precio,
            stock=stock,
            categoria=categoria,
            imagen_nombre=imagen_nombre,
            activo=1
        )
        
        db.add(nuevo_producto)
        db.commit()
        db.refresh(nuevo_producto)
        
        return nuevo_producto
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear producto: {str(e)}")


# OBTENER PRODUCTOS
@router.get("/mis-productos")
def listar_mis_productos(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Obtiene todos los productos del vendedor actual.
    
    Lógica:
    - Filtra productos por vendedor_id igual al ID del usuario autenticado
    - Incluye TODOS los productos (tanto visibles como ocultos)
    
    Retorna lista de productos del vendedor.
    """
    productos = db.query(models.Productos).filter(
        models.Productos.vendedor_id == current_user.id
    ).all()
    return productos


@router.get("/vendedor/{vendedor_id}")
def listar_productos_vendedor(
    vendedor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Obtiene productos VISIBLES de un vendedor específico.
    
    Lógica:
    - Filtra por vendedor_id
    - Solo retorna productos con activo == 1 (visibles)
    
    Retorna lista de productos visibles del vendedor especificado.
    """
    productos = db.query(models.Productos).filter(
        models.Productos.vendedor_id == vendedor_id,
        models.Productos.activo == 1
    ).all()
    return productos


@router.get("/")
def listar_todos_productos(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Obtiene todos los productos visibles con información del vendedor.
    
    Lógica:
    - Filtra productos con activo == 1
    - Usa selectinload para cargar eager la relación con el vendedor (evita N+1 queries)
    - Construye manualmente el resultado incluyendo datos del vendedor (id, nombre, apodo, teléfono)
    
    Retorna lista de productos visibles con datos del vendedor anidados.
    """
    productos = db.query(models.Productos).options(
        selectinload(models.Productos.vendedor)
    ).filter(
        models.Productos.activo == 1
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
                "apodo": p.vendedor.apodo,
                "telefono": p.vendedor.telefono
            } if p.vendedor else None
        }
        resultado.append(producto_dict)
    
    return resultado


# ACTUALIZAR Y ELIMINAR PRODUCTO
@router.put("/{producto_id}")
def actualizar_producto(
    producto_id: int,
    producto_data: ProductoUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Actualiza un producto (solo el dueño puede hacerlo).
    
    Lógica de permisos:
    - Verifica que el producto existe
    - Verifica que el vendedor_id del producto coincide con current_user.id
    - Si no coincide, retorna 403 Forbidden
    - Solo actualiza los campos que vienen en producto_data (no nulos)
    
    Retorna el producto actualizado.
    """
    producto = db.query(models.Productos).filter(
        models.Productos.id == producto_id
    ).first()
    
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if producto.vendedor_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este producto")
    
    # Actualizar solo los campos proporcionados
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


@router.delete("/{producto_id}")
def eliminar_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Elimina un producto permanentemente (solo el dueño puede hacerlo).
    
    Lógica:
    - Verifica existencia del producto
    - Verifica permisos (solo el dueño)
    - Si el producto tiene imagen asociada, elimina el archivo físico del servidor
    - Elimina el registro de la base de datos
    
    Retorna mensaje de confirmación.
    """
    producto = db.query(models.Productos).filter(
        models.Productos.id == producto_id
    ).first()
    
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if producto.vendedor_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este producto")
    
    try:
        # Eliminar la imagen física si existe
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


@router.patch("/{producto_id}/toggle")
def toggle_producto_visibilidad(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Alterna la visibilidad del producto (ocultar/publicar).
    
    Lógica:
    - Verifica existencia y permisos del producto
    - Cambia activo: si era 1 pasa a 0, si era 0 pasa a 1
    - Permite a los vendedores ocultar temporalmente sus productos sin eliminarlos
    
    Retorna mensaje con el nuevo estado del producto.
    """
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


# FAVORITOS 

@router.post("/{producto_id}/favorito")
def agregar_favorito(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Agrega un producto a favoritos del usuario actual y notifica al vendedor.
    
    Lógica:
    - Verifica que el producto existe
    - Verifica que no esté ya en favoritos (evita duplicados)
    - Crea un registro en la tabla Favorito
    - Crea una notificación automática para el vendedor del producto
    - La notificación incluye: título, mensaje, tipo="favorito" y datos JSON con producto_id y comprador_id
    
    Retorna mensaje de confirmación.
    """
    try:
        producto = db.query(models.Productos).filter(
            models.Productos.id == producto_id
        ).first()
        
        if not producto:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        # Verificar si ya existe el favorito
        existente = db.query(models.Favorito).filter(
            models.Favorito.usuario_id == current_user.id,
            models.Favorito.producto_id == producto_id
        ).first()
        
        if existente:
            raise HTTPException(status_code=400, detail="Este producto ya está en tus favoritos")
        
        # Crear el favorito
        favorito = models.Favorito(
            usuario_id=current_user.id,
            producto_id=producto_id
        )
        
        db.add(favorito)
        
        #NOTIFICAR AL VENDEDOR
        # Crear notificación para que el vendedor sepa que alguien marcó su producto como favorito
        notificacion = models.Notificacion(
            usuario_id=producto.vendedor_id,
            titulo="Nuevo favorito",
            mensaje=f"{current_user.apodo or current_user.nombre} marcó tu producto '{producto.nombre}' como favorito",
            tipo="favorito",
            data=json.dumps({"producto_id": producto_id, "comprador_id": current_user.id})
        )
        db.add(notificacion)
        
        db.commit()
        
        return {"mensaje": "Producto agregado a favoritos", "producto_id": producto_id}
        
    except Exception as e:
        db.rollback()
        print(f"Error al agregar favorito: {e}")
        raise HTTPException(status_code=500, detail=f"Error al agregar favorito: {str(e)}")


@router.get("/favoritos")
def obtener_favoritos(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Obtiene todos los favoritos del usuario actual con detalles completos del producto.
    
    Lógica:
    - Filtra favoritos por usuario_id = current_user.id
    - Usa selectinload anidado para cargar producto y vendedor (evita N+1 queries)
    - Construye resultado con estructura anidada que incluye:
      - Datos del favorito (id, usuario_id, producto_id)
      - Datos completos del producto (nombre, precio, stock, etc.)
      - Datos del vendedor (nombre, apodo, teléfono)
    
    Retorna lista de favoritos con detalles del producto y vendedor.
    """
    try:
        favoritos = db.query(models.Favorito).options(
            selectinload(models.Favorito.producto).selectinload(models.Productos.vendedor)
        ).filter(
            models.Favorito.usuario_id == current_user.id
        ).all()
        
        resultado = []
        for f in favoritos:
            if f.producto:
                resultado.append({
                    "id": f.producto_id,
                    "usuario_id": f.usuario_id,
                    "producto_id": f.producto_id,
                    "producto": {
                        "id": f.producto.id,
                        "nombre": f.producto.nombre,
                        "descripcion": f.producto.descripcion,
                        "precio": f.producto.precio,
                        "stock": f.producto.stock,
                        "categoria": f.producto.categoria,
                        "imagen_nombre": f.producto.imagen_nombre,
                        "vendedor": {
                            "id": f.producto.vendedor.id,
                            "nombre": f.producto.vendedor.nombre,
                            "apodo": f.producto.vendedor.apodo,
                            "telefono": f.producto.vendedor.telefono
                        } if f.producto.vendedor else None
                    }
                })
        
        return resultado
        
    except Exception as e:
        print(f"Error al obtener favoritos: {e}")
        return []


@router.delete("/{producto_id}/favorito")
def quitar_favorito(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Elimina un producto de favoritos del usuario actual.
    
    Lógica:
    - Busca el favorito por usuario_id y producto_id
    - Si no existe, retorna 404
    - Elimina el registro de la tabla Favorito
    
    Nota: Esta operación NO elimina notificaciones previas asociadas.
    
    Retorna mensaje de confirmación.
    """
    try:
        favorito = db.query(models.Favorito).filter(
            models.Favorito.usuario_id == current_user.id,
            models.Favorito.producto_id == producto_id
        ).first()
        
        if not favorito:
            raise HTTPException(status_code=404, detail="Favorito no encontrado")
        
        db.delete(favorito)
        db.commit()
        
        return {"mensaje": "Producto eliminado de favoritos", "producto_id": producto_id}
        
    except Exception as e:
        db.rollback()
        print(f"Error al quitar favorito: {e}")
        raise HTTPException(status_code=500, detail=f"Error al quitar favorito: {str(e)}")