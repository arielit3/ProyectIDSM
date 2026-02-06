import { createBrowserRouter } from "react-router-dom";
import HomeLayout from "../layouts/HomeLayout";
import LoginPage from "../pages/loginPage"; //Importar el login
import RegisterPage from "../pages/registerPage"; //Importar el registro

export const router= createBrowserRouter([
    {
        path: "/",
        element: <HomeLayout />,
    },
    {
        path: "/login",
        element: <LoginPage />, //Ruta del login
    },
    {
        path: "/register",
        element: <RegisterPage />, //Ruta del registro
    }
]);             