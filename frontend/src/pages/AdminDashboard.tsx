import React from "react";
import { type Usuario } from "../services/users";
import "./Dashboard.css";

interface AdminDashboardProps {
  user: Usuario;
  usuarios: Usuario[];
  onListarUsuarios: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, usuarios, onListarUsuarios }) => {
  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-welcome">
          <h1>Panel de Administrador</h1>
          <p className="admin-subtitle">Bienvenido, {user.nombre}</p>
        </div>
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-info">
              <h3>{usuarios.length}</h3>
              <p>Usuarios totales</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{usuarios.filter(u => u.relacion?.rol === "vendedor").length}</h3>
              <p>Vendedores</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{usuarios.filter(u => u.relacion?.rol === "cliente").length}</h3>
              <p>Clientes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <button className="tab-btn active" onClick={onListarUsuarios}>
          Listar Usuarios
        </button>
      </div>

      {usuarios.length > 0 && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Usuarios Registrados</h2>
          </div>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Apodo</th>
                  <th>Correo</th>
                  <th>Teléfono</th>
                  <th>Matrícula</th>
                  <th>Rol</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.nombre}</td>
                    <td>{u.apodo || "-"}</td>
                    <td>{u.correo}</td>
                    <td>{u.telefono || "-"}</td>
                    {/* asiel: Añadir clase matricula-col para asegurar color correcto */}
                    <td className="matricula-col">{u.relacion?.matricula}</td>
                    <td>
                      <span className={`role-badge ${u.relacion?.rol}`}>
                        {u.relacion?.rol}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;