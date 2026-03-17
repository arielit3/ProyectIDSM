import React from "react";
import { type Usuario } from "../services/users";
import "./Dashboard.css";

interface CompradorDashboardProps {
  user: Usuario;
}

const CompradorDashboard: React.FC<CompradorDashboardProps> = ({ user }) => {
  return (
    <div className="comprador-dashboard">
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">¡Bienvenido, {user.nombre}!</h1>
            <p className="hero-description">
              Explora los mejores productos de ToroEats
            </p>
          </div>
          <div className="hero-image">
            <span className="main-logo-image">🍽️</span>
          </div>
        </div>
      </div>

      <div className="featured-section">
        <h2 className="section-title">Productos Destacados</h2>
        <div className="empty-state">
          <p>Próximamente encontrarás aquí los productos destacados</p>
        </div>
      </div>

      <div className="offers-section">
        <h2 className="section-title">Ofertas Especiales</h2>
        <div className="empty-state">
          <p>Próximamente encontrarás aquí las mejores ofertas</p>
        </div>
      </div>

      <div className="sellers-section">
        <h2 className="section-title">Vendedores Destacados</h2>
        <div className="empty-state">
          <p>Próximamente conocerás a nuestros mejores vendedores</p>
        </div>
      </div>
    </div>
  );
};

export default CompradorDashboard;