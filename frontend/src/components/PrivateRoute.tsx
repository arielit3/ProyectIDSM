import React from "react";
import { Navigate } from "react-router-dom";

/* Este componente protege rutas, si no hay token en localStorage,
   te envia a el login, y si hay token, te lleva a la ruta. */
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default PrivateRoute;