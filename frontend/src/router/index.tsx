import { createBrowserRouter } from "react-router-dom";
import HomeLayout from "../layouts/HomeLayout";
import LoginPage from "../pages/loginPage"; //Importar el login

export const router= createBrowserRouter([
    {
        path: "/",
        element: <HomeLayout />,
    },
    {
        path: "/login",
        element: <LoginPage />, //Ruta del login
    }
]);             