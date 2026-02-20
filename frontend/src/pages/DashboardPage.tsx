import React, { useEffect, useState } from "react";
import { listarUsuarios, obtenerUsuarioActual, actualizarUsuario } from "../services/users";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

// Se importan los dashboards por rol
import AdminDashboard from "./AdminDashboard";
import CompradorDashboard from "./Comprador.Dashboard";
import VendedorDashboard from "./VendedorDashboard";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<{ 
    id?: number;
    nombre: string; 
    rol_id: number;
    email?: string;
    matricula?: string;
    telefono?: string;
    apodo?: string;
  } | null>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);

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

  const handleUpdateUser = async (updatedData: any) => {
    if (!user?.id) throw new Error("Usuario no identificado");
    
    try {
      const updatedUser = await actualizarUsuario(user.id, updatedData);
      // Actualizar el estado local con los nuevos datos
      setUser(prev => prev ? { ...prev, ...updatedData } : null);
      return updatedUser;
    } catch (error) {
      console.error("Error al actualizar usuario", error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await obtenerUsuarioActual();
        setUser(data);
      } catch (error) {
        console.error("Error al obtener usuario actual", error);
        navigate("/login");
      }
    };
    fetchUser();
  }, [navigate]);

  const getRoleBadge = (rol_id: number) => {
    switch(rol_id) {
      case 1: return <span className="role-badge admin">Administrador</span>;
      case 2: return <span className="role-badge comprador">Comprador</span>;
      case 3: return <span className="role-badge vendedor">Vendedor</span>;
      default: return <span className="role-badge">Usuario</span>;
    }
  };

  const getUserInitial = () => {
    return user?.nombre ? user.nombre.charAt(0).toUpperCase() : "U";
  };

  if (!user) return (
    <div className="loading-container">
      <p>Cargando dashboard...</p>
    </div>
  );

  return (
    <div className="dashboard-container">
      {/* NAVBAR - ToroEats */}
      <nav className="navbar">
        <div className="nav-left">
          <span className="logo">ToroEats</span>
        </div>

        {/* Solo mostrar búsqueda si es comprador */}
        {user.rol_id === 2 && (
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
            <span className="user-name">{user.nombre}</span>
            {getRoleBadge(user.rol_id)}
          </div>
          
          {/* Botón de perfil - Navega a la página de perfil */}
          <button 
            onClick={() => navigate("/perfil")} 
            className="profile-btn"
            title="Ver perfil completo"
          >
            <div className="profile-avatar">
              {getUserInitial()}
            </div>
          </button>
          
          <button onClick={handleLogout} className="logout-btn">
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <div className="main-content">
        {user.rol_id === 1 && (
          <AdminDashboard 
            user={user} 
            usuarios={usuarios}
            onListarUsuarios={handleListarUsuarios}
          />
        )}
        
        {user.rol_id === 2 && (
          <CompradorDashboard user={user} />
        )}
        
        {user.rol_id === 3 && (
          <VendedorDashboard user={user} />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;