import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import "./pages.css";
import { crearUsuario } from "../services/users";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  
  const [formData, setFormData] = React.useState({
    nombre: "",
    email: "",
    telefono: "",
    matricula: "",
    password: "",
    aceptarTerminos: false,
  });

  const [mensaje, setMensaje] = React.useState("");
  const [mensajeColor, setMensajeColor] = React.useState("red");
  const [recaptchaToken, setRecaptchaToken] = React.useState<string | null>(null);
  const [recaptchaError, setRecaptchaError] = React.useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (mensaje) setMensaje("");
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
    setRecaptchaError("");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validaciones del formulario
    if (!formData.nombre.trim()) {
      setMensaje("El nombre es obligatorio");
      setMensajeColor("red");
      return;
    }
    if (!formData.email.includes("@")) {
      setMensaje("Correo invalido");
      setMensajeColor("red");
      return;
    }
    if (!formData.telefono.trim()) {
      setMensaje("El telefono es obligatorio");
      setMensajeColor("red");
      return;
    }
    if (!formData.matricula.trim()) {
      setMensaje("La matricula es obligatoria");
      setMensajeColor("red");
      return;
    }
    if (!formData.aceptarTerminos) {
      setMensaje("Debes aceptar los terminos");
      setMensajeColor("red");
      return;
    }

    // Validar reCAPTCHA
    if (!recaptchaToken) {
      setRecaptchaError("Por favor, verifica que no eres un robot");
      return;
    }

    try {
      const nuevo = await crearUsuario({
        nombre: formData.nombre,
        correo: formData.email,
        telefono: formData.telefono,
        matricula: parseInt(formData.matricula),
        password: formData.password,
        rol_id: 3,
        recaptcha_token: recaptchaToken, //Aquí sale error porque aún no lo integro al back
      });

      setMensaje(`Usuario ${nuevo.nombre} creado correctamente`);
      setMensajeColor("green");
      
      // Resetear reCAPTCHA
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setRecaptchaToken(null);
      
      setTimeout(() => {
        navigate("/login");
      }, 1500);
      
    } catch (error: any) {
      if (error.response?.status === 400) {
        setMensaje(error.response.data.detail);
      } else {
        setMensaje("Error al crear usuario");
      }
      setMensajeColor("red");
      console.error(error);
      
      // Resetear reCAPTCHA en caso de error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setRecaptchaToken(null);
    }
  }

  return (
    <div className="containerRegister">
      <div className="registerBox">
        <div className="registerHeader">
          <h1>Registro</h1>
        </div>

        <form onSubmit={handleSubmit} className="registerForm">
          {/* Todos tus campos existentes se mantienen igual */}
          <div className="inputsRegister">
            <label htmlFor="nombre">Nombre *</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className="inputsRegister">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="inputsRegister">
            <label htmlFor="telefono">Telefono *</label>
            <input
              type="text"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              required
            />
          </div>

          <div className="inputsRegister">
            <label htmlFor="matricula">Matricula *</label>
            <input
              type="text"
              id="matricula"
              name="matricula"
              value={formData.matricula}
              onChange={handleChange}
              required
            />
          </div>

          <div className="inputsRegister">
            <label htmlFor="password">Contrasena *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {/* Sección reCAPTCHA - NUEVO */}
          <div className="recaptcha-section" style={{ margin: '20px 0' }}>
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
              onChange={handleRecaptchaChange}
              theme="light"
            />
            {recaptchaError && (
              <div className="error-message" style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>
                {recaptchaError}
              </div>
            )}
          </div>

          <div className="termsContainer">
            <label className="termsLabel">
              <input
                type="checkbox"
                name="aceptarTerminos"
                checked={formData.aceptarTerminos}
                onChange={handleChange}
              />
              <span>Acepto los terminos y condiciones *</span>
            </label>
          </div>

          <button type="submit" className="registerButton">
            Registrarse
          </button>

          {mensaje && (
            <div className="messageContainer" style={{ color: mensajeColor }}>
              {mensaje}
            </div>
          )}

          <div className="loginSection">
            <p className="loginText">
              ¿Ya tienes cuenta?{" "}
              <button
                type="button"
                className="linkButton"
                onClick={() => navigate("/login")}
              >
                Inicia sesion
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;