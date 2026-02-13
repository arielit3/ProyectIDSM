// DashboardPage.tsx
import React, { useEffect, useState } from "react";
import { listarUsuarios, obtenerUsuarioActual } from "../services/users";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

// Se importan los dashboards por rol
import AdminDashboard from "./AdminDashboard";
import CompradorDashboard from "./Comprador.Dashboard";
import VendedorDashboard from "./VendedorDashboard";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<{ nombre: string; rol_id: number } | null>(null);
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

  if (!user) return <p>Cargando...</p>;

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
            <button type="submit" className="search-btn">Buscar</button>
          </div>
        )}

        <div className="nav-right">
          <div className="user-info">
            <span className="user-name">{user.nombre}</span>
            {getRoleBadge(user.rol_id)}
          </div>          <button onClick={handleLogout} className="logout-btn">
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL - Se renderiza según el componente del rol */}
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