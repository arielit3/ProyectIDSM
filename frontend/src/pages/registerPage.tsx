import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import "./pages.css";
import { crearUsuario } from "../services/users";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  
  const [formData, setFormData] = useState({
    apodo: "",
    nombre: "",
    correo: "", // Cambiado de 'email' a 'correo'
    telefono: "",
    matricula: "",
    password: "",
    confirmPassword: "", // Nuevo campo para confirmar
    aceptarTerminos: false,
  });

  const [mensaje, setMensaje] = useState("");
  const [mensajeColor, setMensajeColor] = useState("red");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaError, setRecaptchaError] = useState("");

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

  // Validar fortaleza de la contraseña
  const validatePassword = (password: string): { valida: boolean; mensaje: string } => {
    if (password.length < 8) {
      return { valida: false, mensaje: "La contraseña debe tener al menos 8 caracteres" };
    }
    if (!/[A-Z]/.test(password)) {
      return { valida: false, mensaje: "La contraseña debe tener al menos una mayúscula" };
    }
    if (!/[0-9]/.test(password)) {
      return { valida: false, mensaje: "La contraseña debe tener al menos un número" };
    }
    return { valida: true, mensaje: "" };
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validaciones del formulario
    if (!formData.apodo.trim()) {
      setMensaje("El apodo es obligatorio");
      setMensajeColor("red");
      return;
    }
    if (!formData.nombre.trim()) {
      setMensaje("El nombre es obligatorio");
      setMensajeColor("red");
      return;
    }
    if (!formData.correo.includes("@")) {
      setMensaje("Correo inválido");
      setMensajeColor("red");
      return;
    }
    if (!formData.telefono.trim()) {
      setMensaje("El teléfono es obligatorio");
      setMensajeColor("red");
      return;
    }
    if (!formData.matricula.trim() || isNaN(parseInt(formData.matricula))) {
      setMensaje("La matrícula es obligatoria y debe ser un número");
      setMensajeColor("red");
      return;
    }

    // Validar contraseña
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valida) {
      setMensaje(passwordValidation.mensaje);
      setMensajeColor("red");
      return;
    }

    // Validar que las contraseñas coincidan
    if (formData.password !== formData.confirmPassword) {
      setMensaje("Las contraseñas no coinciden");
      setMensajeColor("red");
      return;
    }

    if (!formData.aceptarTerminos) {
      setMensaje("Debes aceptar los términos y condiciones");
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
        apodo: formData.apodo,
        nombre: formData.nombre,
        correo: formData.correo,
        telefono: formData.telefono,
        matricula: parseInt(formData.matricula),
        password: formData.password,
        rol: "cliente", // Por defecto, todos los registros son clientes
        recaptcha_token: recaptchaToken,
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
          {/* Campo Apodo (nuevo) */}
          <div className="inputsRegister">
            <label htmlFor="apodo">Apodo *</label>
            <input
              type="text"
              id="apodo"
              name="apodo"
              value={formData.apodo}
              onChange={handleChange}
              placeholder="Cómo quieres que te llamen"
              required
            />
          </div>

          {/* Campo Nombre */}
          <div className="inputsRegister">
            <label htmlFor="nombre">Nombre completo *</label>
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

          {/* Campo Correo (cambiado de email) */}
          <div className="inputsRegister">
            <label htmlFor="correo">Correo electrónico *</label>
            <input
              type="email"
              id="correo"
              name="correo"
              value={formData.correo}
              onChange={handleChange}
              placeholder="ejemplo@correo.com"
              required
            />
          </div>

          {/* Campo Teléfono */}
          <div className="inputsRegister">
            <label htmlFor="telefono">Teléfono *</label>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="10 dígitos"
              required
            />
          </div>

          {/* Campo Matrícula */}
          <div className="inputsRegister">
            <label htmlFor="matricula">Matrícula *</label>
            <input
              type="text"
              id="matricula"
              name="matricula"
              value={formData.matricula}
              onChange={handleChange}
              placeholder="Número de matrícula"
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
              placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
              required
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              Mínimo 8 caracteres, 1 mayúscula, 1 número
            </small>
          </div>

          {/* Campo Confirmar Contraseña (nuevo) */}
          <div className="inputsRegister">
            <label htmlFor="confirmPassword">Confirmar Contraseña *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repite tu contraseña"
              required
            />
          </div>

          {/* Sección reCAPTCHA */}
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

          {/* Términos y condiciones */}
          <div className="termsContainer">
            <label className="termsLabel">
              <input
                type="checkbox"
                name="aceptarTerminos"
                checked={formData.aceptarTerminos}
                onChange={handleChange}
              />
              <span>Acepto los términos y condiciones *</span>
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

          {/* Link para ir al login */}
          <div className="loginSection">
            <p className="loginText">
              ¿Ya tienes cuenta?{" "}
              <button
                type="button"
                className="linkButton"
                onClick={() => navigate("/login")}
              >
                Inicia sesión
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;