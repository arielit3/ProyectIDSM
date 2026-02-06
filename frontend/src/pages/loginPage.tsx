import React from "react";
import { useNavigate } from "react-router-dom";
import "./pages.css";
import { login } from "../services/auth";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [mensaje, setMensaje] = React.useState("");
  const [mensajeColor, setMensajeColor] = React.useState("red");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = await login(email, password);
      setMensaje("Login exitoso");
      setMensajeColor("green");

      // Guardar token en localStorage
      localStorage.setItem("token", data.access_token);

      // Redirigir a dashboard
      navigate("/dashboard");
    } catch (error: any) {
      setMensaje("Credenciales inválidas");
      setMensajeColor("red");
      console.error("Error en login:", error);
    }
  }

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

          <div className="registerSection">
            <p className="registerText">¿No tienes cuenta?</p>
            <button
              className="registerButton"
              onClick={() => navigate("/register")}
            >
              Regístrate
            </button>
          </div>

          {mensaje && <p style={{ color: mensajeColor }}>{mensaje}</p>}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;