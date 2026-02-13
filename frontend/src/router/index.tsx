// src/router/index.tsx
import { createBrowserRouter } from "react-router-dom";
import HomeLayout from "../layouts/HomeLayout";
import LoginPage from "../pages/loginPage";
import RegisterPage from "../pages/registerPage";
import DashboardPage from "../pages/DashboardPage";
import PrivateRoute from "../components/PrivateRoute";

/* Aqui defines las rutas de tu aplicacion.
   La ruta /dashboard esta protegida y solo se puede acceder si hay token. */
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
]);