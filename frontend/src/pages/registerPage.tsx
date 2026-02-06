import React from "react";
import { useNavigate } from "react-router-dom";
import './pages.css';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = React.useState({
        nombre: "",
        email: "",
        password: "",
        aceptarTerminos: false,
    });

    const [mensaje, setMensaje] = React.useState("");
    const [mensajeColor, setMensajeColor] = React.useState("red");

    // Manejo de cambios en los inputs
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        
        // Limpiar mensaje cuando el usuario escribe
        if (mensaje) setMensaje("");
    };

    // Función para manejar el envío del formulario
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validaciones
        if (!formData.nombre.trim()) {
            setMensaje("El nombre es obligatorio");
            setMensajeColor("red");
            return;
        }

        if (!formData.email.includes("@")) {
            setMensaje("Por favor, ingresa un correo electrónico válido.");
            setMensajeColor("red");
            return;
        }

        if (!formData.aceptarTerminos) {
            setMensaje("Debes aceptar los términos y condiciones");
            setMensajeColor("red");
            return;
        }


        
        
    };

    return (
        <div className="containerRegister">
            <div className="registerBox">
            

                <div className="registerHeader">
                    <h1>Registro</h1>
                </div>

                <form onSubmit={handleSubmit} className="registerForm">
                    {/* Campo Nombre */}
                    <div className="inputsRegister">
                        <label htmlFor="nombre">Nombre *</label>
                        <input
                            type="text"
                            id="nombre"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            placeholder="Tu nombre completo"
                            required
                        />
                    </div>

                    {/* Campo Email */}
                    <div className="inputsRegister">
                        <label htmlFor="email">Email *</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="tucorreo@ejemplo.com"
                            required
                        />
                    </div>

                    {/* Campo Contraseña */}
                    <div className="inputsRegister">
                        <label htmlFor="password">Contraseña *</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Crea una contraseña"
                            required
                        />
                    </div>

                    {/* Términos y condiciones */}
                    <div className="termsContainer">
                        <label className="termsLabel">
                            <input
                                type="checkbox"
                                name="aceptarTerminos"
                                checked={formData.aceptarTerminos}
                                onChange={handleChange}
                            />
                            <span>
                                Acepto los términos y condiciones *
                            </span>
                        </label>
                    </div>

                    {/* Botón de registro */}
                    <button type="submit" className="registerButton">
                        Registrarse
                    </button>

                    {/* Mensaje de estado */}
                    {mensaje && (
                        <div className="messageContainer" style={{ color: mensajeColor }}>
                            {mensaje}
                        </div>
                    )}

                    {/* Ya tienes cuenta */}
                    <div className="loginSection">
                        <p className="loginText">
                            ¿Ya tienes cuenta?{" "}
                            <button 
                                type="button"
                                className="linkButton"
                                onClick={() => navigate("/login")}
                            >
                                Inicia sesión aquí
                            </button>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterPage;