import React, { useState, useEffect, useCallback } from "react";
import { 
  crearProductoConImagen,  // 👈 IMPORTAR ESTA FUNCIÓN
  listarMisProductos, 
  actualizarProducto, 
  eliminarProducto, 
  toggleProductoVisibilidad,
  type Producto 
} from "../services/products";
import { type Usuario } from "../services/users";
import "./Dashboard.css";

const API_URL = import.meta.env.VITE_API_URL;

interface VendedorDashboardProps {
  user: Usuario;
}

const VendedorDashboard: React.FC<VendedorDashboardProps> = ({ user }) => {
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [showGestionProductos, setShowGestionProductos] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
    categoria: "", 
  });

  const cargarProductos = useCallback(async () => {
    try {
      setCargandoProductos(true);
      const data = await listarMisProductos();
      setProductos(data);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setError("No se pudieron cargar los productos");
    } finally {
      setCargandoProductos(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagenFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getImagenUrl = (imagenNombre: string | null): string | null => {
    if (!imagenNombre) return null;
    return `${API_URL}/uploads/productos/${imagenNombre}`;
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      precio: "",
      stock: "",
      categoria: "",
    });
    setImagenFile(null);
    setImagenPreview(null);
    setProductoEditando(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      setError("El nombre del producto es requerido");
      return;
    }
    
    const precio = parseFloat(formData.precio);
    if (isNaN(precio) || precio <= 0) {
      setError("El precio debe ser un número válido mayor a 0");
      return;
    }
    
    const stock = parseInt(formData.stock);
    if (isNaN(stock) || stock < 0) {
      setError("El stock debe ser un número válido mayor o igual a 0");
      return;
    }
    
    if (!formData.descripcion.trim()) {
      setError("La descripción del producto es requerida");
      return;
    }
    
    if (!formData.categoria.trim()) {
      setError("La categoría es requerida");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("nombre", formData.nombre.trim());
      formDataToSend.append("descripcion", formData.descripcion.trim());
      formDataToSend.append("precio", precio.toString());
      formDataToSend.append("stock", stock.toString());
      formDataToSend.append("categoria", formData.categoria.trim());
      
      if (imagenFile) {
        formDataToSend.append("imagen", imagenFile);
      }
      
      // 👈 DESCOMENTAR ESTA LÍNEA para crear el producto
      const productoCreado = await crearProductoConImagen(formDataToSend);
      console.log("Producto creado:", productoCreado);
      
      setSuccess("Producto creado exitosamente!");
      resetForm();
      
      await cargarProductos();
      
      setTimeout(() => {
        setShowNewProductForm(false);
        setSuccess("");
      }, 2000);
      
    } catch (error: any) {
      console.error("Error al crear producto:", error);
      setError(error.response?.data?.detail || "Error al crear el producto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditarProducto = (producto: Producto) => {
    setProductoEditando(producto);
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio.toString(),
      stock: producto.stock.toString(),
      categoria: producto.categoria,
    });
    setShowGestionProductos(true);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoEditando) return;
    
    const precio = parseFloat(formData.precio);
    const stock = parseInt(formData.stock);
    
    try {
      await actualizarProducto(productoEditando.id, {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        precio: precio,
        stock: stock,
        categoria: formData.categoria.trim(),
      });
      
      setSuccess("Producto actualizado exitosamente!");
      await cargarProductos();
      resetForm();
      setShowGestionProductos(false);
      
      setTimeout(() => setSuccess(""), 2000);
    } catch (error: any) {
      setError(error.response?.data?.detail || "Error al actualizar producto");
    }
  };

  const handleToggleVisibilidad = async (producto: Producto) => {
    try {
      const result = await toggleProductoVisibilidad(producto.id);
      setSuccess(result.mensaje);
      await cargarProductos();
      setTimeout(() => setSuccess(""), 2000);
    } catch (error: any) {
      setError(error.response?.data?.detail || "Error al cambiar visibilidad");
    }
  };

  const handleEliminarProducto = async (producto: Producto) => {
    if (confirm(`¿Estás seguro de eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`)) {
      try {
        await eliminarProducto(producto.id);
        setSuccess("Producto eliminado correctamente");
        await cargarProductos();
        setTimeout(() => setSuccess(""), 2000);
      } catch (error: any) {
        setError(error.response?.data?.detail || "Error al eliminar producto");
      }
    }
  };

  const totalProductos = productos.length;
  const totalStock = productos.reduce((sum, p) => sum + p.stock, 0);
  const productosVisibles = productos.filter(p => p.activo === 1).length;

  return (
    <div className="vendedor-dashboard">
      <div className="vendedor-header">
        <div className="vendedor-welcome">
          <h1>¡Hola, {user.apodo || user.nombre}!</h1>
          <p className="vendedor-subtitle">Panel de control de ventas y productos</p>
        </div>
        <div className="vendedor-stats">
          <div className="stat-card">
            <div className="stat-info">
              <h3>{totalProductos}</h3>
              <p>Productos</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{productosVisibles}</h3>
              <p>Visibles</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{totalStock}</h3>
              <p>Total de existencias</p>
            </div>
          </div>
        </div>
      </div>

      <div className="acciones-rapidas">
        <button 
          className="btn-publicar"
          onClick={() => {
            setShowNewProductForm(!showNewProductForm);
            setShowGestionProductos(false);
            resetForm();
            setError("");
            setSuccess("");
          }}
        >
          {showNewProductForm ? "Cancelar" : "+ Nueva Publicación"}
        </button>
        <button 
          className="btn-gestionar"
          onClick={() => {
            setShowGestionProductos(!showGestionProductos);
            setShowNewProductForm(false);
            resetForm();
            setError("");
            setSuccess("");
          }}
        >
          Gestionar Productos
        </button>
        <button className="btn-ventas">Ver Ventas</button>
      </div>

      {/* Formulario de nuevo producto */}
      {showNewProductForm && (
        <div className="nuevo-producto-form">
          <h2>Crear nueva publicación</h2>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre del producto *</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required disabled={isLoading} />
              </div>
              <div className="form-group">
                <label>Categoría *</label>
                <input type="text" name="categoria" value={formData.categoria} onChange={handleInputChange} placeholder="Ej. Pasteles, Galletas" required disabled={isLoading} />
              </div>
              <div className="form-group">
                <label>Precio *</label>
                <input type="number" name="precio" value={formData.precio} onChange={handleInputChange} step="0.01" min="0" required disabled={isLoading} />
              </div>
              <div className="form-group">
                <label>Stock *</label>
                <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} min="0" step="1" required disabled={isLoading} />
              </div>
              <div className="form-group full-width">
                <label>Descripción *</label>
                <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows={4} required disabled={isLoading} />
              </div>
              <div className="form-group full-width">
                <label>Imagen del producto</label>
                <input type="file" accept="image/*" onChange={handleImagenChange} disabled={isLoading} />
                {imagenPreview && <img src={imagenPreview} alt="Preview" style={{ maxWidth: '200px', marginTop: '10px' }} />}
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancelar" onClick={() => setShowNewProductForm(false)}>Cancelar</button>
              <button type="submit" className="btn-guardar" disabled={isLoading}>{isLoading ? "Publicando..." : "Publicar producto"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Gestión de productos */}
      {showGestionProductos && (
        <div className="gestion-productos">
          <h2>Gestionar Productos</h2>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          {cargandoProductos ? (
            <div className="empty-state">Cargando productos...</div>
          ) : productos.length === 0 ? (
            <div className="empty-state">No tienes productos aún</div>
          ) : (
            <div className="productos-gestion-grid">
              {productos.map(producto => (
                <div key={producto.id} className={`producto-gestion-card ${producto.activo === 0 ? 'oculto' : ''}`}>
                  <div className="producto-gestion-imagen">
                    {producto.imagen_nombre ? (
                      <img src={getImagenUrl(producto.imagen_nombre) || ''} alt={producto.nombre} />
                    ) : <span>📷</span>}
                  </div>
                  <div className="producto-gestion-info">
                    <h3>{producto.nombre}</h3>
                    <p>Categoría: {producto.categoria}</p>
                    <p>Precio: ${producto.precio}</p>
                    <p>Stock: {producto.stock}</p>
                    <p className={`estado ${producto.activo === 1 ? 'visible' : 'oculto'}`}>
                      {producto.activo === 1 ? '✓ Visible' : '⊙ Oculto'}
                    </p>
                  </div>
                  <div className="producto-gestion-acciones">
                    <button className="btn-editar" onClick={() => handleEditarProducto(producto)}>Editar</button>
                    <button className="btn-toggle" onClick={() => handleToggleVisibilidad(producto)}>
                      {producto.activo === 1 ? 'Ocultar' : 'Publicar'}
                    </button>
                    <button className="btn-eliminar" onClick={() => handleEliminarProducto(producto)}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de edición */}
      {productoEditando && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Editar Producto</h3>
            <form onSubmit={handleGuardarEdicion}>
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <input type="text" name="categoria" value={formData.categoria} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Precio</label>
                <input type="number" name="precio" value={formData.precio} onChange={handleInputChange} step="0.01" required />
              </div>
              <div className="form-group">
                <label>Stock</label>
                <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows={4} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={() => { setProductoEditando(null); resetForm(); }}>Cancelar</button>
                <button type="submit" className="btn-guardar">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendedorDashboard;