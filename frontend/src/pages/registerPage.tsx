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
    // CAMBIO: El correo ahora se genera automaticamente a partir de matricula, solo almacenamos matricula
    telefono: "",
    matricula: "",
    password: "",
    confirmPassword: "",
    aceptarTerminos: false,
  });

  const [mensaje, setMensaje] = useState("");
  const [mensajeColor, setMensajeColor] = useState("red");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaError, setRecaptchaError] = useState("");

  // AGREGADO: Funcion que genera automaticamente el correo electronico a partir de la matricula
  // Formato esperado: al[matricula]@utcj.edu.mx
  // Ejemplo: si matricula es 24110456, correo sera al24110456@utcj.edu.mx
  const generarCorreoAutomatico = (matricula: string): string => {
    if (!matricula.trim()) {
      return ""; // Si no hay matricula, retornamos string vacio
    }
    return `al${matricula}@utcj.edu.mx`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    // CAMBIO: Si el campo que se modifica es matricula, permitir solo numeros
    if (name === "matricula") {
      // Eliminamos cualquier caracter que no sea numero
      const soloNumeros = value.replace(/[^0-9]/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: soloNumeros,
      }));
    } else {
      // Para otros campos mantenemos el comportamiento original
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
    
    // Limpiar mensaje de error cuando el usuario empieza a escribir
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
    console.log("Botón presionado - iniciando validaciones");

    // Validaciones del formulario
    if (!formData.apodo.trim()) {
      setMensaje("El apodo es obligatorio");
      setMensajeColor("red");
      console.log("Error: apodo vacío");
      return;
    }
    console.log("Validación apodo: OK");
    
    if (!formData.nombre.trim()) {
      setMensaje("El nombre es obligatorio");
      setMensajeColor("red");
      console.log("Error: nombre vacío");
      return;
    }
    console.log("Validación nombre: OK");
    
    // CAMBIO: Validar que la matricula tenga contenido (el correo se genera automáticamente)
    if (!formData.matricula.trim()) {
      setMensaje("La matrícula es obligatoria");
      setMensajeColor("red");
      console.log("Error: matrícula vacía");
      return;
    }
    console.log("Validación matrícula: OK");
    
    if (isNaN(parseInt(formData.matricula))) {
      setMensaje("La matrícula debe ser un número");
      setMensajeColor("red");
      console.log("Error: matrícula no es número");
      return;
    }
    console.log("Matrícula es numérica: OK");
    
    if (!formData.telefono.trim()) {
      setMensaje("El teléfono es obligatorio");
      setMensajeColor("red");
      console.log("Error: teléfono vacío");
      return;
    }
    console.log("Validación teléfono: OK");

    // Validar contraseña
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valida) {
      setMensaje(passwordValidation.mensaje);
      setMensajeColor("red");
      console.log("Error: contraseña débil -", passwordValidation.mensaje);
      return;
    }
    console.log("Validación contraseña: OK");

    // Validar que las contraseñas coincidan
    if (formData.password !== formData.confirmPassword) {
      setMensaje("Las contraseñas no coinciden");
      setMensajeColor("red");
      console.log("Error: contraseñas no coinciden");
      return;
    }
    console.log("Contraseñas coinciden: OK");

    if (!formData.aceptarTerminos) {
      setMensaje("Debes aceptar los términos y condiciones");
      setMensajeColor("red");
      console.log("Error: términos no aceptados");
      return;
    }
    console.log("Términos aceptados: OK");

    // Validar reCAPTCHA
    if (!recaptchaToken) {
      setRecaptchaError("Por favor, verifica que no eres un robot");
      console.log("Error: reCAPTCHA no validado");
      return;
    }
    console.log("reCAPTCHA validado: OK");
    console.log("TODAS LAS VALIDACIONES PASARON - Procediendo a crear usuario");

    try {
      console.log("Entrando al bloque try");
      
      // CAMBIO: Generar el correo electronico automaticamente a partir de la matricula
      console.log("Antes de generar correo - matrícula:", formData.matricula);
      const correoGenerado = generarCorreoAutomatico(formData.matricula);
      console.log("Correo generado:", correoGenerado);
      
      // AGREGADO: Debuggeo - mostrar en consola qué se va a enviar
      console.log("Datos a enviar - apodo:", formData.apodo);
      console.log("Datos a enviar - nombre:", formData.nombre);
      console.log("Datos a enviar - correo:", correoGenerado);
      console.log("Datos a enviar - telefono:", formData.telefono);
      console.log("Datos a enviar - matricula parseada:", parseInt(formData.matricula));
      console.log("Datos a enviar - recaptcha:", recaptchaToken ? "presente" : "ausente");
      console.log("Llamando a crearUsuario...");
      
      const nuevo = await crearUsuario({
        apodo: formData.apodo,
        nombre: formData.nombre,
        // CAMBIO: Usar el correo generado automaticamente
        correo: correoGenerado,
        telefono: formData.telefono,
        matricula: parseInt(formData.matricula),
        password: formData.password,
        rol: "cliente", // Por defecto, todos los registros son clientes
        recaptcha_token: recaptchaToken,
      });

      console.log("Usuario creado exitosamente:", nuevo);
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
      console.error("Error al crear usuario:", error);
      console.error("Detalle del error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        fullError: error,
      });
      
      // CAMBIO: Mostrar el mensaje de error del backend si existe
      if (error.response?.status === 400) {
        // El backend retorna un objeto con "detail" o directamente un string
        const detalleError = error.response.data.detail || error.response.data;
        console.log("Mensaje detallado del backend:", detalleError);
        setMensaje(detalleError);
      } else {
        setMensaje("Error al crear usuario");
      }
      setMensajeColor("red");
      
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
          {/* Campo Apodo */}
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

          {/* CAMBIO: Campo de Correo donde el usuario ingresa SOLO la matrícula */}
          {/* El usuario verá: al [INPUT_MATRICULA] @utcj.edu.mx */}
          <div className="inputsRegister">
            <label htmlFor="correoMatricula">Correo electrónico *</label>
            {/* Contenedor visual para mostrar como se forma el correo automáticamente */}
            <div className="correoAutogenerado">
              <span className="prefijo">al</span>
              {/* Input EDITABLE donde el usuario ingresa solo la matrícula */}
              <input
                type="text"
                id="correoMatricula"
                name="matricula"
                value={formData.matricula}
                onChange={handleChange}
                className="inputMatriculaEnCorreo"
                placeholder="matricula"
                inputMode="numeric"
              />
              <span className="sufijo">@utcj.edu.mx</span>
            </div>
            {/* Mostrar el correo completo generado como informacion para el usuario */}
            {formData.matricula && (
              <p className="correoCompleto">
                Tu correo será: {generarCorreoAutomatico(formData.matricula)}
              </p>
            )}
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

          {/* Campo Confirmar Contraseña */}
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