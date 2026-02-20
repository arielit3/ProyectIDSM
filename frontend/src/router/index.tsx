import { createBrowserRouter } from "react-router-dom";
import HomeLayout from "../layouts/HomeLayout";
import LoginPage from "../pages/loginPage";
import RegisterPage from "../pages/registerPage";
import DashboardPage from "../pages/DashboardPage";
import UserProfilePage from "../pages/UserProfilePage";
import PrivateRoute from "../components/PrivateRoute";

/* Aqui defines las rutas de tu aplicacion.
   La ruta /dashboard y /perfil estan protegidas y solo se puede acceder si hay token. */
export const router = createBrowserRouter([
  { path: "/", element: <HomeLayout /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  
  {
    path: "/dashboard",
    element: (
      <PrivateRoute>
        <DashboardPage />
      </PrivateRoute>
    ),
  },
  
  // Nueva ruta protegida para el perfil de usuario
  {
    path: "/perfil",
    element: (
      <PrivateRoute>
        <UserProfilePage />
      </PrivateRoute>
    ),
  },
]);