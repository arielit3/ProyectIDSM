// VendedorDashboard.tsx
import React, { useState } from "react";
import "./Dashboard.css";

interface VendedorDashboardProps {
  user: { nombre: string; rol_id: number };
}

const VendedorDashboard: React.FC<VendedorDashboardProps> = ({ user }) => {
  const [showNewProductForm, setShowNewProductForm] = useState(false);

  
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
            <span className="stat-icon"></span>
            <div className="stat-info">
              <p>Ventas totales</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon"></span>
            <div className="stat-info">
              <p>Productos vendidos</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon"></span>
            <div className="stat-info">
              <p>Stock</p>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="acciones-rapidas">
        <button 
          className="btn-publicar"
          onClick={() => setShowNewProductForm(!showNewProductForm)}
        >
        Nueva Publicación
        </button>
        <button className="btn-gestionar">Gestionar Productos</button>
        <button className="btn-ventas">Ver Ventas</button>
      </div>

      {/* Formulario de nueva publicación */}
      {showNewProductForm && (
        <div className="nuevo-producto-form">
          <h2>Crear nueva publicación</h2>
          <form>
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre del producto</label>
                <input type="text" placeholder="" />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select>
                  <option>Selecciona una categoría</option>
                  <option>Pasteles</option>
                  <option>Galletas</option>
                  <option>Postres</option>
                  <option>Bebidas</option>
                </select>
              </div>
              <div className="form-group">
                <label>Precio</label>
                <input type="number" placeholder="$" />
              </div>
              <div className="form-group">
                <label>Stock</label>
                <input type="number" placeholder="Cantidad disponible" />
              </div>
              <div className="form-group full-width">
                <label>Descripción</label>
                <textarea placeholder="Describe tu producto..."></textarea>
              </div>
              <div className="form-group full-width">
                <label>Imágenes del producto</label>
                <div className="upload-area">
                  <span>📸</span>
                  <p>Arrastra tus imágenes aquí o haz clic para subir</p>
                  <button type="button" className="btn-subir">Subir imágenes</button>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancelar" onClick={() => setShowNewProductForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-guardar">
                Publicar producto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contenido principal del vendedor */}
      <div className="vendedor-contenido">
        {/* Productos recientes */}
        <div className="seccion-productos">
          <div className="seccion-header">
            <h2>Mis productos</h2>
            
          </div>
        </div>

        {/* Ventas recientes */}
        <div className="seccion-ventas">
          <div className="seccion-header">
            <h2>Ventas recientes</h2>
            
          </div>
          <div className="ventas-lista">
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendedorDashboard;