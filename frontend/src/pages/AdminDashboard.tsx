// AdminDashboard.tsx
import React, { useState } from "react";
import "./Dashboard.css";

interface AdminDashboardProps {
  user: { nombre: string; rol_id: number };
  usuarios: any[];
  onListarUsuarios: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  user, 
  usuarios, 
  onListarUsuarios 
}) => {
  const [activeTab, setActiveTab] = useState("usuarios"); // usuarios, quejas, vendedores

  // Estadísticas
  const totalUsuarios = usuarios.length;
  const totalVendedores = usuarios.filter(u => u.rol_id === 3).length;
  const totalAdmins = usuarios.filter(u => u.rol_id === 1).length;

  return (
    <div className="admin-dashboard">
      {/* Header del Admin */}
      <div className="admin-header">
        <div className="admin-welcome">
          <h1>Panel de Administración</h1>
          <p className="admin-subtitle">Bienvenido, {user.nombre} · Gestión completa del sistema</p>
        </div>
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-info">
              <h3>{totalUsuarios}</h3>
              <p>Usuarios totales</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{totalVendedores}</h3>
              <p>Vendedores</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>0</h3>
              <p>Quejas pendientes</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>0</h3>
              <p>Solicitudes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === "usuarios" ? "active" : ""}`}
          onClick={() => setActiveTab("usuarios")}
        >
          Gestión de Usuarios
        </button>
        <button 
          className={`tab-btn ${activeTab === "vendedores" ? "active" : ""}`}
          onClick={() => setActiveTab("vendedores")}
        >
          Solicitudes de Vendedores
        </button>
        <button 
          className={`tab-btn ${activeTab === "quejas" ? "active" : ""}`}
          onClick={() => setActiveTab("quejas")}
        >
          Quejas y Reportes
        </button>
      </div>

      {/* CONTENIDO SEGÚN TAB */}

      {/* TAB 1: GESTIÓN DE USUARIOS */}
      {activeTab === "usuarios" && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Gestión de Usuarios</h2>
            <button onClick={onListarUsuarios} className="btn-refresh">
              Actualizar lista
            </button>
          </div>

          <div className="stats-grid">
            <div className="stats-item">
              <span className="stats-label">Total de usuarios:</span>
              <span className="stats-number">{totalUsuarios}</span>
            </div>
            <div className="stats-item">
              <span className="stats-label">Administradores:</span>
              <span className="stats-number">{totalAdmins}</span>
            </div>
            <div className="stats-item">
              <span className="stats-label">Vendedores:</span>
              <span className="stats-number">{totalVendedores}</span>
            </div>
            <div className="stats-item">
              <span className="stats-label">Compradores:</span>
              <span className="stats-number">{totalUsuarios - totalAdmins - totalVendedores}</span>
            </div>
          </div>

          <div className="users-table-container">
            <h3>Lista de Usuarios Registrados</h3>
            <table className="users-table">
              <thead>
                <tr>
                  <th>USUARIO</th>
                  <th>EMAIL</th>
                  <th>ROL</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nombre}</td>
                    <td>{u.correo}</td>
                    <td>
                      <span className={`role-badge ${getRoleClass(u.rol_id)}`}>
                        {getRoleName(u.rol_id)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SOLICITUDES DE VENDEDORES */}
      {activeTab === "vendedores" && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Solicitudes de Vendedores</h2>
            <span className="pending-badge">0 pendientes</span>
          </div>
          <div className="empty-state">
            <p>No hay solicitudes de vendedores pendientes</p>
          </div>
        </div>
      )}

      {/* TAB 3: QUEJAS Y REPORTES */}
      {activeTab === "quejas" && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Quejas y Reportes</h2>
            <span className="pending-badge">0 pendientes</span>
          </div>
          <div className="empty-state">
            <p>No hay quejas o reportes</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Funciones auxiliares
const getRoleClass = (rol_id: number) => {
  switch(rol_id) {
    case 1: return "admin";
    case 2: return "comprador";
    case 3: return "vendedor";
    default: return "";
  }
};

const getRoleName = (rol_id: number) => {
  switch(rol_id) {
    case 1: return "Administrador";
    case 2: return "Comprador";
    case 3: return "Vendedor";
    default: return "Usuario";
  }
};

export default AdminDashboard;