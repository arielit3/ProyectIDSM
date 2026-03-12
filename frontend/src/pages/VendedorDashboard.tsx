import React, { useState, useEffect } from "react";
import { crearProducto, type ProductoCreate, listarProductos, type Producto } from "../services/products";
import "./Dashboard.css";

interface VendedorDashboardProps {
  user: { 
    id: number;           // 👈 Asegúrate de que el user tiene id
    nombre: string; 
    rol_id: number;
  };
}

const VendedorDashboard: React.FC<VendedorDashboardProps> = ({ user }) => {
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [misProductos, setMisProductos] = useState<Producto[]>([]);
  
  // Estado para el formulario de nuevo producto (ACTUALIZADO)
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "", // 👈 NUEVO campo
  });

  // Cargar productos del vendedor al montar el componente
  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const productos = await listarProductos();
      // Filtrar solo los productos del vendedor actual
      const misProductos = productos.filter(p => p.vendedor_id === user.id);
      setMisProductos(misProductos);
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  // Manejar envío del formulario
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
    
    setIsLoading(true);
    setError("");
    
    try {
      // Crear el producto con TODOS los campos que requiere el backend
      const nuevoProducto: ProductoCreate = {
        vendedor_id: user.id,              // 👈 ID del vendedor actual
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        precio: precio,
        stock: stock,                       // 👈 Stock del producto
      };
      
      console.log("Enviando producto:", nuevoProducto);
      
      const resultado = await crearProducto(nuevoProducto);
      console.log("Producto creado:", resultado);
      
      setSuccess(true);
      
      // Limpiar formulario
      setFormData({
        nombre: "",
        descripcion: "",
        precio: "",
        stock: "",
      });
      
      // Recargar lista de productos
      await cargarProductos();
      
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

  return (
    <div className="vendedor-dashboard">
      {/* Header del Vendedor */}
      <div className="vendedor-header">
        <div className="vendedor-welcome">
          <h1>¡Hola, {user.nombre}!</h1>
          <p className="vendedor-subtitle">Panel de control de ventas y productos</p>
        </div>
        <div className="vendedor-stats">
          <div className="stat-card">
            <div className="stat-info">
              <h3>{misProductos.reduce((acc, p) => acc + p.stock, 0)}</h3>
              <p>Stock total</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{misProductos.length}</h3>
              <p>Productos publicados</p>
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

      {/* Acciones rápidas */}
      <div className="acciones-rapidas">
        <button 
          className="btn-publicar"
          onClick={() => {
            setShowNewProductForm(!showNewProductForm);
            setError("");
            setSuccess(false);
          }}
        >
          {showNewProductForm ? "Cancelar" : "Nueva Publicación"}
        </button>
        <button className="btn-gestionar">Gestionar Productos</button>
        <button className="btn-ventas">Ver Ventas</button>
      </div>

      {/* Formulario de nueva publicación - ACTUALIZADO */}
      {showNewProductForm && (
        <div className="nuevo-producto-form">
          <h2>Crear nueva publicación</h2>
          
          {error && <div className="error-message" style={{ marginBottom: '15px' }}>{error}</div>}
          {success && <div className="success-message" style={{ marginBottom: '15px' }}>¡Producto creado exitosamente!</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* Nombre */}
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
              
              {/* Precio */}
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
              
              {/* Stock - NUEVO */}
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
              
              {/* Descripción */}
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
                ></textarea>
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

      {/* Lista de productos del vendedor */}
      <div className="vendedor-contenido" style={{ marginTop: '30px' }}>
        <div className="seccion-productos">
          <div className="seccion-header">
            <h2>Mis productos ({misProductos.length})</h2>
          </div>
          
          {misProductos.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No has publicado productos aún
            </div>
          ) : (
            <div className="productos-grid">
              {misProductos.map(producto => (
                <div key={producto.id} className="producto-card">
                  <div className="producto-info">
                    <h3>{producto.nombre}</h3>
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

        <div className="seccion-ventas" style={{ marginTop: '20px' }}>
          <div className="seccion-header">
            <h2>Ventas recientes</h2>
          </div>
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            No hay ventas recientes
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendedorDashboard;