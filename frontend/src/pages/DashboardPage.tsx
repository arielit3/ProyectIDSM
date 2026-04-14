import React, { useEffect, useState, useCallback } from "react";
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

// INTERFAZ DE DATOS PARA ACTUALIZACIÓN DE PERFIL
interface UpdateUserData {
  nombre?: string; //nombre completo del usuario, se muestra en el perfil y en el dashboard
  correo?: string; //correo electrónico del usuario
  apodo?: string; //apodo o nombre de usuario
  telefono?: string; //telefono
  password?: string; //contraseña, se cifra antes de enviar al backend
}

// COMPONENTE PRINCIPAL
// Este componente es el contenedor principal que decide que dashboard mostrar
// según el rol del usuario autenticado administrador, cliente o vendedor
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  //ESTADOS DEL COMPONENTE
  const [user, setUser] = useState<Usuario | null>(null); //usuario autenticado
  const [usuarios, setUsuarios] = useState<Usuario[]>([]); //lista de usuarios
  const [loading, setLoading] = useState(true); //estado de carga
  const [terminoBusqueda, setTerminoBusqueda] = useState<string>(""); //termino de busqueda para compradores

  //FUNCIONES DE AUTENTICACION Y GESTIÓN DE USUARIOS
  //cierra la sesion del usuario eliminando el token del localStorage y redirigiendo al login
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };
  //obtiene la lista de todos los usuarios del sistema,
  //se usa en el dashboard de administrador para mostrar las estadísticas y la tabla de usuarios
  const handleListarUsuarios = useCallback(async () => {
    try {
      const data = await listarUsuarios();
      setUsuarios(data);
    } catch (error) {
      console.error("Error al listar usuarios", error);
    }
  }, []);

    //actualiza los datos del usuario autenticado, se usa en el dashboard de administrador para actualizar el perfil
  const handleUpdateUser = async (updatedData: UpdateUserData) => {
    try {
      const result = await actualizarUsuario(updatedData); //Recarga los datos del usuario para reflejar los cambios
      const usuarioActualizado = await obtenerUsuarioActual();
      setUser(usuarioActualizado);
      return result;
    } catch (error) {
      console.error("Error al actualizar usuario", error);
      throw error;
    }
  };

  // :> Esto deja viva la helper de perfil sin ensuciar el panel mientras no la usamos directo aqui
  void handleUpdateUser;

  //EFECTO DE CARGA INICIAL
  //Al montar el componente, se intenta obtener los datos del usuario
  // autenticado para mostrar su dashboard correspondiente
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

  //FUNCIONES AUXILIARES PARA RENDERIZADO
  //Obtiene el nombre a mostrar del usuario, si tiene apodo se muestra ese
  //sino se muestra el nombre completo, si no tiene ninguno se muestra una cadena vacía
  const getDisplayName = () => {
    if (!user) return "";
    return user.apodo || user.nombre;
  };
  //Renderiza una etiqueta con el nombre del rol del usuario con estilos diferentes para cada rol
  const getRoleBadge = (rol?: string) => {
    switch (rol) {
      case "administrador": return <span className="role-badge administrador">Administrador</span>;
      case "cliente":       return <span className="role-badge cliente">Comprador</span>;
      case "vendedor":      return <span className="role-badge vendedor">Vendedor</span>;
      default:              return <span className="role-badge">Usuario</span>;
    }
  };

  //Obtiene la inicial del usuario para mostrar en el avatar del navbar, si no hay usuario o nombre se muestra U por defecto
  const getUserInitial = () => {
    if (!user) return "U";
    const nameToUse = user.apodo || user.nombre;
    return nameToUse ? nameToUse.charAt(0).toUpperCase() : "U";
  };

  //RENDERIZADO CONDICIONAL SEGÚN ESTADO
  //muestra pantalla de carga mientras se obtienen los datos del usuario
  // si no se pudo cargar el usuario muestra un mensaje de error, sino muestra el dashboard correspondiente al rol del usuario
  if (loading) {
    return (
      <div className="loading-container">
        <p>Cargando dashboard...</p>
      </div>
    );
  }
  //sino hay usuarios despues de cragar muestra un mensaje de error
  if (!user) {
    return (
      <div className="loading-container">
        <p>No se pudo cargar el usuario</p>
      </div>
    );
  }

  //RENDERIZADO PRINCIPAL
  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="nav-left">
          <span className="logo">ToroEats</span>
        </div>

        {/* Barra de busqueda solo para compradores */}
        {user.relacion?.rol === "cliente" && (
          <div className="nav-search">
            <input
              type="text"
              placeholder="Buscar productos o vendedores..."
              className="search-input"
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
            />
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
            title="Cerrar sesion"
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
          <CompradorDashboard 
            user={user} 
            terminoBusqueda={terminoBusqueda}
          />
        )}

        {user.relacion?.rol === "vendedor" && (
          <VendedorDashboard user={user} />
        )}
      </div>
    </div>
  );
};



export default DashboardPage;
