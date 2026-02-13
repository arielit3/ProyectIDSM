// CompradorDashboard.tsx
import React from "react";
import "./Dashboard.css";

interface CompradorDashboardProps {
  user: { nombre: string; rol_id: number };
}

const CompradorDashboard: React.FC<CompradorDashboardProps> = ({ user }) => {
  // Imagen de ToroEats como adorno principal
  const toroEatsImage = "/ToroEats-removebg-preview.png";

  return (
    <div className="comprador-dashboard">
      
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              ¡Bienvenido, {user.nombre}!
            </h1>
            <p className="hero-description">
              Encuentra los mejores productos dentro de la universidad
            </p>
          </div>
          <div className="hero-image">
            <img src={toroEatsImage} alt="ToroEats" className="main-logo-image" />
          </div>
        </div>
      </div>

      {/* Sección: Productos destacados */}
      <div className="featured-section">
        <h2 className="section-title">Productos destacados</h2>
        {/*<div className="empty-state">
          
        </div>*/}
      </div>

      {/* Sección: Ofertas del día */}
      <div className="offers-section">
        <h2 className="section-title">Ofertas del día</h2>
        {/*<div className="empty-state">
          
        </div>*/}
      </div>

      {/* Sección: Categorías populares */}
      <div className="categories-section">
        <h2 className="section-title">Categorías populares</h2>
        {/*<div className="empty-state">
          
        </div>*/}
      </div>

      {/* Sección: Vendedores recomendados */}
      <div className="sellers-section">
        <h2 className="section-title">Vendedores recomendados</h2>
        {/*<div className="empty-state">
          
        </div>*/}
      </div>
    </div>
  );
};

export default CompradorDashboard;