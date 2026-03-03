import React, { useState } from "react";
import { crearProducto, type ProductoCreate } from "../services/products";
import "./Dashboard.css";

interface VendedorDashboardProps {
  user: { nombre: string; rol_id: number };
}

const VendedorDashboard: React.FC<VendedorDashboardProps> = ({ user }) => {
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  // Estado para el formulario de nuevo producto
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
  });

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
    
    if (!formData.descripcion.trim()) {
      setError("La descripción del producto es requerida");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const nuevoProducto: ProductoCreate = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        precio: precio,
      };
      
      console.log("Enviando producto:", nuevoProducto);
      
      const resultado = await crearProducto(nuevoProducto);
      console.log("Producto creado:", resultado);
      
      setSuccess(true);
      
      setFormData({
        nombre: "",
        descripcion: "",
        precio: "",
      });
      
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
              <h3>0</h3>
              <p>Ventas totales</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>0</h3>
              <p>Productos vendidos</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>0</h3>
              <p>Stock</p>
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

      {/* Formulario de nueva publicación */}
      {showNewProductForm && (
        <div className="nuevo-producto-form">
          <h2>Crear nueva publicación</h2>
          
          {error && <div className="error-message" style={{ marginBottom: '15px' }}>{error}</div>}
          {success && <div className="success-message" style={{ marginBottom: '15px' }}>¡Producto creado exitosamente!</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
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

      {/* Contenido principal */}
      <div className="vendedor-contenido" style={{ marginTop: '30px' }}>
        <div className="seccion-productos">
          <div className="seccion-header">
            <h2>Mis productos</h2>
          </div>
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            No hay productos publicados aún
          </div>
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