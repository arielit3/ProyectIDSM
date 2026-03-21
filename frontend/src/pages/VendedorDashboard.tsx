import React, { useState, useEffect, useCallback } from "react";
import { crearProductoConImagen, listarProductosPorVendedor, type Producto } from "../services/products";
import { type Usuario } from "../services/users";
import "./Dashboard.css";

const API_URL = import.meta.env.VITE_API_URL;

interface VendedorDashboardProps {
  user: Usuario;
}

const VendedorDashboard: React.FC<VendedorDashboardProps> = ({ user }) => {
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  
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
      const data = await listarProductosPorVendedor(user.id);
      setProductos(data);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setError("No se pudieron cargar los productos");
    } finally {
      setCargandoProductos(false);
    }
  }, [user.id]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
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
      
      const productoCreado = await crearProductoConImagen(formDataToSend);
      
      setProductos(prev => [...prev, productoCreado]);
      setSuccess(true);
      
      setFormData({
        nombre: "",
        descripcion: "",
        precio: "",
        stock: "",
        categoria: "",
      });
      setImagenFile(null);
      setImagenPreview(null);
      
      setTimeout(() => {
        setShowNewProductForm(false);
        setSuccess(false);
      }, 2000);
      
    } catch (error: any) {
      console.error("Error al crear producto:", error);
      
      if (error.response) {
        setError(error.response.data?.detail || `Error ${error.response.status}`);
      } else if (error.request) {
        setError("No se pudo conectar con el servidor");
      } else {
        setError(error.message || "Error al crear el producto");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const totalProductos = productos.length;
  const totalStock = productos.reduce((sum, p) => sum + p.stock, 0);

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
              <h3>{totalStock}</h3>
              <p>Total de existencias</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>0</h3>
              <p>Ventas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="acciones-rapidas">
        <button 
          className="btn-publicar"
          onClick={() => {
            setShowNewProductForm(!showNewProductForm);
            setError("");
            setSuccess(false);
            setImagenPreview(null);
            setImagenFile(null);
          }}
        >
          {showNewProductForm ? "Cancelar" : "Nueva Publicación"}
        </button>
        <button className="btn-gestionar">Gestionar Productos</button>
        <button className="btn-ventas">Ver Ventas</button>
      </div>

      {showNewProductForm && (
        <div className="nuevo-producto-form">
          <h2>Crear nueva publicación</h2>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">¡Producto creado exitosamente!</div>}
          
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre del producto *</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Ej. Pastel de chocolate"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group">
                <label>Categoría *</label>
                <input
                  type="text"
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleInputChange}
                  placeholder="Ej. Pasteles, Galletas, Bebidas..."
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group">
                <label>Precio *</label>
                <input
                  type="number"
                  name="precio"
                  value={formData.precio}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group">
                <label>Stock *</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  placeholder="Cantidad disponible"
                  min="0"
                  step="1"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group full-width">
                <label>Descripción *</label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  placeholder="Describe tu producto..."
                  rows={4}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group full-width">
                <label>Imagen del producto</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImagenChange}
                  disabled={isLoading}
                />
                {imagenPreview && (
                  <div className="imagen-preview" style={{ marginTop: '10px' }}>
                    <img 
                      src={imagenPreview} 
                      alt="Preview" 
                      style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }}
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="btn-cancelar" 
                onClick={() => setShowNewProductForm(false)}
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-guardar"
                disabled={isLoading}
              >
                {isLoading ? "Publicando..." : "Publicar producto"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="vendedor-contenido">
        <div className="seccion-productos">
          <div className="seccion-header">
            <h2>Mis productos ({totalProductos})</h2>
          </div>
          
          {cargandoProductos ? (
            <div className="empty-state">Cargando productos...</div>
          ) : productos.length === 0 ? (
            <div className="empty-state">No has publicado productos aún</div>
          ) : (
            <div className="productos-grid">
              {productos.map(producto => (
                <div key={producto.id} className="producto-card">
                  <div className="producto-imagen">
                    {producto.imagen_nombre ? (
                      <img 
                        src={getImagenUrl(producto.imagen_nombre) || ''} 
                        alt={producto.nombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '3rem' }}>📷</span>
                    )}
                  </div>
                  <div className="producto-info">
                    <h3>{producto.nombre}</h3>
                    <span className="producto-categoria">{producto.categoria}</span>
                    <p className="producto-descripcion">{producto.descripcion}</p>
                    <div className="producto-detalles">
                      <span className="producto-precio">${producto.precio}</span>
                      <span className="producto-stock">Stock: {producto.stock}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendedorDashboard;