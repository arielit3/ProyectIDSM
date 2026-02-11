import React, { useEffect, useState } from "react";
import { listarUsuarios, obtenerUsuarioActual } from "../services/users"; 
// listarUsuarios ya lo tienes para consumir el endpoint de listar
// obtenerUsuarioActual es un servicio que deberias crear para llamar al endpoint /usuarios/me
// este endpoint devuelve el usuario actual segun el token

import { useNavigate } from "react-router-dom";

/* Esta pagina es el dashboard, se muestra solo si el usuario esta logeado
   aqui se muestra el nombre y rol del usuario, si el rol es 1 se muestra un boton
   para listar usuarios usando el endpoint protegido */
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // estado para guardar el usuario actual
  const [user, setUser] = useState<{ nombre: string; rol_id: number } | null>(null);

  // estado para guardar la lista de usuarios cuando se pidan
  const [usuarios, setUsuarios] = useState<any[]>([]);

  // funcion para cerrar sesion, elimina el token y redirige al login
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // funcion para listar usuarios, solo se usa si el rol es 1
  const handleListarUsuarios = async () => {
    try {
      const data = await listarUsuarios();
      setUsuarios(data);
    } catch (error) {
      console.error("Error al listar usuarios", error);
    }
  };

  // useEffect se ejecuta al cargar la pagina, aqui pedimos al backend el usuario actual
  // si no hay token o falla la peticion se redirige al login
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

  // si aun no se cargan datos del usuario mostramos mensaje de carga
  if (!user) return <p>Cargando...</p>;

  return (
    <div>
      <h1>Bienvenido {user.nombre}</h1>
      <p>Tu rol es: {user.rol_id}</p>

      {/* boton para cerrar sesion */}
      <button onClick={handleLogout}>Cerrar sesion</button>

      {/* si el rol es 1 se muestra el boton para listar usuarios */}
      {user.rol_id === 1 && (
        <div>
          <button onClick={handleListarUsuarios}>Listar usuarios</button>
          <ul>
            {usuarios.map((u) => (
              <li key={u.id}>{u.nombre} - {u.correo}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
