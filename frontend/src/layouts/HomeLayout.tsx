import React from "react";
import './HomeLayout.css';
import { useNavigate } from "react-router-dom";

//Definición de las props (objetos) para la interfaz principal
interface HomeLayoutProps {
    pageTitle?: string; //Título de la página
    imageSrc?: string; //Fuente de la imagen de ToroEats
    buttonText?: string; //Texto del botón de inicio
    onGetStartedClick?: () => void; //Función para hacer clic en el botón
}

//Se crea la constante de HomeLayout que usa las props ya definidas
const HomeLayout: React.FC<HomeLayoutProps> = ({ //Se extraen las props directamente
    pageTitle = "Bienvenido a ToroEats", //Valores de las props
    imageSrc = "/public/ToroEats-removebg-preview.png",
    buttonText = "Comenzar",
    onGetStartedClick,
}) => {

    const navigate = useNavigate(); //Hook para navegar entre rutas
    
    const handleGetStartedClick = () => { //función para manejar el clic del botón
        if (onGetStartedClick) {
            onGetStartedClick();
        } else {
            navigate("/login");
        }
    };
    
    return ( //Se retorna el JSX
        <div className="homeLayout"> 
            {/* Contenido principal - Todo centrado verticalmente */}
            <main className="homeMain">
                {/* Título */}
                <h1 className="title">{pageTitle}</h1>
                
                {/* Imagen */}
                <div className="homeImageContainer">
                    <img 
                        src={imageSrc} 
                        alt="ToroEats Logo" 
                        className="logoImage"
                        onError={(e) => {
                            e.currentTarget.src = "/ToroEats.jpeg";
                        }}
                    />
                </div>

                {/* Botón */}
                <button 
                    className="homeStartButton"
                    onClick={handleGetStartedClick}
                >
                    {buttonText}
                </button>
            </main>
        </div>
    );
};

export default HomeLayout;