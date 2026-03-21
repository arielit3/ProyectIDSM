import React, { useEffect, useState } from "react";
import {
  listarUsuarios,
  obtenerUsuarioActual,
  actualizarUsuario,
  type Usuario,
} from "../services/users";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

import AdminDashboard from "./AdminDashboard";
import CompradorDashboard from "./Comprador.Dashboard";
import VendedorDashboard from "./VendedorDashboard";

interface UpdateUserData {
  nombre?: string;
  correo?: string;
  apodo?: string;
  telefono?: string;
  password?: string;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<Usuario | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleListarUsuarios = async () => {
    try {
      const data = await listarUsuarios();
      setUsuarios(data);
    } catch (error) {
      console.error("Error al listar usuarios", error);
    }
  };

  const handleUpdateUser = async (updatedData: UpdateUserData) => {
    // Bug 1 corregido: actualizarUsuario ya NO recibe userId como primer argumento
    try {
      const result = await actualizarUsuario(updatedData);

      // Bug 2 corregido: en lugar de actualizar el estado manualmente
      // (que puede desincronizarse si algún campo falla en el backend),
      // refrescamos el usuario directamente desde el servidor.
      const usuarioActualizado = await obtenerUsuarioActual();
      setUser(usuarioActualizado);

      return result;
    } catch (error) {
      console.error("Error al actualizar usuario", error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await obtenerUsuarioActual();
        setUser(data);
      } catch (error) {
        console.error("Error al obtener usuario actual", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  const getDisplayName = () => {
    if (!user) return "";
    return user.apodo || user.nombre;
  };

  const getRoleBadge = (rol?: string) => {
    switch (rol) {
      case "administrador": return <span className="role-badge admin">Administrador</span>;
      case "cliente":       return <span className="role-badge comprador">Comprador</span>;
      case "vendedor":      return <span className="role-badge vendedor">Vendedor</span>;
      default:              return <span className="role-badge">Usuario</span>;
    }
  };

  const getUserInitial = () => {
    if (!user) return "U";
    const nameToUse = user.apodo || user.nombre;
    return nameToUse ? nameToUse.charAt(0).toUpperCase() : "U";
  };

  if (loading) {
    return (
      <div className="loading-container">
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="loading-container">
        <p>No se pudo cargar el usuario</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="nav-left">
          <span className="logo">ToroEats</span>
        </div>

        {user.relacion?.rol === "cliente" && (
          <div className="nav-search">
            <input
              type="text"
              placeholder="Buscar productos, categorías..."
              className="search-input"
            />
            <button type="button" className="search-btn">Buscar</button>
          </div>
        )}

        <div className="nav-right">
          <div className="user-info">
            <span className="user-name">{getDisplayName()}</span>
            {getRoleBadge(user.relacion?.rol)}
          </div>

          <button
            onClick={() => navigate("/perfil")}
            className="profile-btn"
            title="Ver perfil completo"
          >
            <div className="profile-avatar">{getUserInitial()}</div>
          </button>

          <button
            onClick={handleLogout}
            className="logout-icon-btn"
            title="Cerrar sesión"
          >
            <svg className="logout-icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M16 13v-2H7V8l-5 4 5 4v-3h7z"/>
              <path d="M20 3h-9c-1.1 0-2 .9-2 2v4h2V5h9v14h-9v-4H9v4c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
            </svg>
          </button>
        </div>
      </nav>

      <div className="main-content">
        {user.relacion?.rol === "administrador" && (
          <AdminDashboard
            user={user}
            usuarios={usuarios}
            onListarUsuarios={handleListarUsuarios}
          />
        )}

        {user.relacion?.rol === "cliente" && (
          <CompradorDashboard user={user} />
        )}

        {user.relacion?.rol === "vendedor" && (
          <VendedorDashboard user={user} />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
