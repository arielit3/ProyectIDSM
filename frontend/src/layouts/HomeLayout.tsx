import React, { useState } from "react";
import './HomeLayout.css';
import { useNavigate } from "react-router-dom";

// IMPORTACIONES PARA EL MAPA (LEAFLET API)
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { type LatLngExpression } from 'leaflet';

// Solución para iconos de marcadores en React/Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

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
    imageSrc = "/ToroEats-removebg-preview.png",
    buttonText = "Comenzar",
    onGetStartedClick,
}) => {

    const navigate = useNavigate(); //Hook para navegar entre rutas
    const [modalMapaAbierto, setModalMapaAbierto] = useState(false);
    
    const handleGetStartedClick = () => { //función para manejar el clic del botón
        if (onGetStartedClick) {
            onGetStartedClick();
        } else {
            navigate("/login");
        }
    };

    // Definimos la posición con el tipo correcto para TypeScript
    const posicion: LatLngExpression = [31.6200, -106.4000];
    
    return ( //Se retorna el JSX
        <div className="homeLayout"> 
            {/* Contenido principal - Todo centrado verticalmente */}
            <main className="homeMain">
                {/* Título */}
                <h1 className="title" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>
                    {pageTitle}
                </h1>
                
                {/* Imagen */}
                <div className="homeImageContainer">
                    <img 
                        src={imageSrc} 
                        alt="ToroEats Logo" 
                        className="logoImage"
                        onError={(e) => {
                            e.currentTarget.src = "/ToroEats-removebg-preview.png"; 
                        }}
                    />
                </div>

                {/* Botones */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                    <button 
                        className="homeStartButton"
                        onClick={handleGetStartedClick}
                    >
                        {buttonText}
                    </button>

                    <button 
                        className="btn-ubicacion-link"
                        onClick={() => setModalMapaAbierto(true)}
                        style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' }}
                    >
                        📍 Ver nuestra ubicación
                    </button>
                </div>
            </main>

            {/* MODAL DE MAPA (Leaflet) */}
            {modalMapaAbierto && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '25px', borderRadius: '15px', width: '90%', maxWidth: '500px', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <h3 style={{ fontFamily: "'IBM Plex Mono', monospace", margin: 0 }}>📍 Ubicación ToroEats</h3>
                            <button onClick={() => setModalMapaAbierto(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
                        </div>
                        
                        <div style={{ height: '300px', width: '100%', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px', border: '1px solid #ddd' }}>
                            <MapContainer 
                                center={posicion} 
                                zoom={16} 
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; OpenStreetMap'
                                />
                                <Marker position={posicion}>
                                    <Popup>¡Aquí cocinamos lo mejor!</Popup>
                                </Marker>
                            </MapContainer>
                        </div>

                        <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Dirección:</strong> Universidad Tecnológica de Ciudad Juárez</p>
                        <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#666' }}>Av. Universidad Tecnológica 3051, Lote Bravo.</p>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setModalMapaAbierto(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc', cursor: 'pointer' }}>Cerrar</button>
                            <button 
                                onClick={() => window.open("https://www.google.com/maps/search/?api=1&query=UTCJ", "_blank")}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#FEC868', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                            >Ver en Maps</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeLayout;