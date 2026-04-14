import React from "react";
import { useNavigate } from "react-router-dom";
import "./pages.css";
import { login } from "../services/auth";

//COMPONENTE DE LOGIN
//permite a los usuarios ingresar sus credenciales para autenticarse y acceder a su dashboard correspondiente
const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  //ESTADOS DEL COMPONENTE
  const [email, setEmail] = React.useState(""); //correo electronico ingresado por el usuario
  const [password, setPassword] = React.useState("");//contrasena ingresada por el usuario
  const [mensaje, setMensaje] = React.useState(""); //mensaje de error o exito para mostrar al usuario despues de intentar iniciar sesion
  const [mensajeColor, setMensajeColor] = React.useState("red");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // esto se modifico debido a que no debe enviar si falta algun campo obligatorio
  const emailLimpio = email.trim();
  const passwordLimpio = password.trim();
  const formValido = emailLimpio.length > 0 && passwordLimpio.length > 0;

  //FUNCIONE DE ENVIO
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // esto se modifico debido a que se debe bloquear el submit cuando faltan datos
    if (!formValido) {
      setMensaje("Debes llenar correo y contrasena antes de iniciar sesion");
      setMensajeColor("red");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await login(emailLimpio, passwordLimpio);
      setMensaje("Login exitoso");
      setMensajeColor("green");

      // Guardar token en localStorage
      localStorage.setItem("token", data.access_token);

      // Redirigir a dashboard
      navigate("/dashboard");
    } catch (error: any) {
      const detalleError = error.response?.data?.detail || "Credenciales invalidas";
      setMensaje(detalleError);
      setMensajeColor("red");
      console.error("Error en login:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="containerLogin">
      <div className="loginBox">
        {/* asiel: Logo de ToroEats */}
        <div className="logoContainer">
          <img src="/ToroEatsLogo.png" alt="Toro Eats Logo" className="loginLogo" />
        </div>
        <div className="loginHeader">
          <h1>Iniciar Sesion</h1>
        </div>

        <form onSubmit={handleSubmit} className="loginForm">
          <div className="inputsLogin">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setMensaje("");
              }}
              required
            />
          </div>

          <div className="inputsLogin">
            <label htmlFor="password">Contrasena</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setMensaje("");
              }}
              required
            />
          </div>

          <button type="submit" className="loginButton" disabled={!formValido || isSubmitting}>
            {isSubmitting ? "Iniciando..." : "Iniciar Sesion"}
          </button>

          <div className="registerSection">
            <p className="registerText">No tienes cuenta?</p>
            <button
              className="registerButton"
              type="button"
              onClick={() => navigate("/register")}
            >
              Registrate
            </button>
          </div>

          {mensaje && <p style={{ color: mensajeColor }}>{mensaje}</p>}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
