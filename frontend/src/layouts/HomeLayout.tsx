import React from "react";
import  './HomeLayout.css';
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
            console.log("Empezando..."); //Si no se pasa ninguna función, se muestra este mensaje 
        }
    };
    return ( //Se retorna el JSX
        //Clase principal del layout
        <div className="homeLayout"> 

            {/* Encabezado */}
    <header className="header">
        <h1 className="title">{pageTitle}</h1> {/* Toma el valor de pageTitle */}  
    </header>

      {/* Contenido principal */}
    <main className="homeMain">
        {/* Imagen centrada */}
        <div className="homeImageContainer">
        <img 
            src={imageSrc} 
            alt="ToroEats Logo" 
            onError={(e) => { {/* Manejo de error si la imagen no carga */}
            e.currentTarget.src = "/ToroEats.jpeg";
            }}
        />
        </div>

        {/* Botón */}
        <div className="homeButtonContainer">
        <button 
            className="homeStartButton"
            onClick={() => navigate("/login")}
        >
            {buttonText}
        </button>
        </div>
    </main>
    </div>
);
};

export default HomeLayout; //Se exporta el componente HomeLayout
    