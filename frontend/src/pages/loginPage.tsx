//Hacer el css del login
import React from "react";
import { useNavigate } from "react-router-dom";
import './loginPage.css';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();

    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [mensaje, setMensaje] = React.useState("");
    const [mensajeColor, setMensajeColor] = React.useState("red");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.includes("@")) {
            setMensaje("Por favor, ingresa un correo electrónico válido.");
            setMensajeColor("red");
            return;
        }

        setMensaje("Inicio de sesión correcto");
        setMensajeColor("green");
        // navigate("/home");
    };

    return (
        <div className="containerLogin">
            <div className="loginBox">

                <div className="loginHeader">
                    <h1>Iniciar Sesión</h1>
                </div>

                <form onSubmit={handleSubmit} className="loginForm">

                    <div className="inputsLogin">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="inputsLogin">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="loginButton">
                        Iniciar Sesión
                    </button>

                    {/* Link para llevar a registro */}
                    <div className="registerSection">
                        <p className="registerText">
                            ¿No tienes cuenta?
                            {/*Luego pongo la ruta de registro*/}
                        </p>
                    </div>

                    {mensaje && (
                        <p style={{ color: mensajeColor }}>
                            {mensaje}
                        </p>
                    )}
                </form>

            </div>
        </div>
    );
};

export default LoginPage;
