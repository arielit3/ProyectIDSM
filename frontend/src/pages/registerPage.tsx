import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import "./pages.css";
import { crearUsuario, enviarOTP, verificarOTP } from "../services/users";

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

  // Estados para manejo del OTP y modal de verificacion
  // mostrarModalOTP: controla si se muestra el modal de verificacion de codigo
  const [mostrarModalOTP, setMostrarModalOTP] = useState(false);
  
  // correoEnVerificacion: almacena el email al que se le envio el OTP
  // se usa para poder verificar el codigo despues
  const [correoEnVerificacion, setCorreoEnVerificacion] = useState("");
  
  // codigoOTP: almacena el codigo de 6 digitos que ingresa el usuario
  const [codigoOTP, setCodigoOTP] = useState("");
  
  // intentosRestantes: contador de intentos para ingresar el codigo correcto
  // inicia en 4 y se decrementa con cada intento fallido
  const [intentosRestantes, setIntentosRestantes] = useState(4);
  
  // tiempoExpiracion: tiempo en segundos que falta para que expire el OTP
  // inicia en 300 segundos (5 minutos)
  const [tiempoExpiracion, setTiempoExpiracion] = useState(300);
  
  // tiempoReenvio: tiempo que falta para poder reenviar un nuevo codigo
  // se resetea a 30 o 40 segundos cada vez que se reenvía
  const [tiempoReenvio, setTiempoReenvio] = useState(0);
  
  // mensajeOTP: mensaje de error o información en el modal de OTP
  const [mensajeOTP, setMensajeOTP] = useState("");
  
  // cargandoOTP: indica si se esta procesando la solicitud de verificacion
  const [cargandoOTP, setCargandoOTP] = useState(false);

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

  // Timer para contar el tiempo de expiracion del OTP (5 minutos = 300 segundos)
  // Cada segundo decrementa el contador y si llega a 0, se cierra el modal automáticamente
  useEffect(() => {
    if (!mostrarModalOTP || tiempoExpiracion <= 0) return;

    const intervalo = setInterval(() => {
      setTiempoExpiracion((prev) => {
        const nuevoTiempo = prev - 1;
        // Si el tiempo llega a 0, cerramos el modal porque expiro el OTP
        if (nuevoTiempo <= 0) {
          setMostrarModalOTP(false);
          setMensaje("El codigo OTP expiro, solicita uno nuevo");
          setMensajeColor("red");
          return 0;
        }
        return nuevoTiempo;
      });
    }, 1000);

    // Limpieza del intervalo cuando el componente se desmonta o cambia mostrarModalOTP
    return () => clearInterval(intervalo);
  }, [mostrarModalOTP, tiempoExpiracion]);

  // Timer para el cooldown de reenvio (30-40 segundos)
  // Mientras cuente, el boton de reenvío esta deshabilitado
  useEffect(() => {
    if (tiempoReenvio <= 0) return;

    const intervalo = setInterval(() => {
      setTiempoReenvio((prev) => {
        const nuevoTiempo = prev - 1;
        return nuevoTiempo <= 0 ? 0 : nuevoTiempo;
      });
    }, 1000);

    return () => clearInterval(intervalo);
  }, [tiempoReenvio]);

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
    console.log("Boton presionado - iniciando validaciones del formulario");

    // Validaciones del formulario - todos los datos deben ser correctos ANTES de enviar OTP
    if (!formData.apodo.trim()) {
      setMensaje("El apodo es obligatorio");
      setMensajeColor("red");
      console.log("Error: apodo vacio");
      return;
    }
    console.log("Validacion apodo: OK");
    
    if (!formData.nombre.trim()) {
      setMensaje("El nombre es obligatorio");
      setMensajeColor("red");
      console.log("Error: nombre vacio");
      return;
    }
    console.log("Validacion nombre: OK");
    
    // Validar que la matricula tenga contenido (el correo se genera automaticamente)
    if (!formData.matricula.trim()) {
      setMensaje("La matricula es obligatoria");
      setMensajeColor("red");
      console.log("Error: matricula vacia");
      return;
    }
    console.log("Validacion matricula: OK");
    
    if (isNaN(parseInt(formData.matricula))) {
      setMensaje("La matricula debe ser un numero");
      setMensajeColor("red");
      console.log("Error: matricula no es numero");
      return;
    }
    console.log("Matricula es numerica: OK");
    
    if (!formData.telefono.trim()) {
      setMensaje("El telefono es obligatorio");
      setMensajeColor("red");
      console.log("Error: telefono vacio");
      return;
    }
    console.log("Validacion telefono: OK");

    // Validar contraseña - debe ser fuerte
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valida) {
      setMensaje(passwordValidation.mensaje);
      setMensajeColor("red");
      console.log("Error: contrasena debil -", passwordValidation.mensaje);
      return;
    }
    console.log("Validacion contrasena: OK");

    // Validar que las contraseñas coincidan
    if (formData.password !== formData.confirmPassword) {
      setMensaje("Las contrasenas no coinciden");
      setMensajeColor("red");
      console.log("Error: contrasenas no coinciden");
      return;
    }
    console.log("Contrasenas coinciden: OK");

    // Validar que acepte los terminos
    if (!formData.aceptarTerminos) {
      setMensaje("Debes aceptar los terminos y condiciones");
      setMensajeColor("red");
      console.log("Error: terminos no aceptados");
      return;
    }
    console.log("Terminos aceptados: OK");

    console.log("TODAS LAS VALIDACIONES DEL FORMULARIO PASARON - Procediendo a enviar OTP");

    try {
      // Generar el correo electronico automaticamente a partir de la matricula
      console.log("Antes de generar correo - matricula:", formData.matricula);
      const correoGenerado = generarCorreoAutomatico(formData.matricula);
      console.log("Correo generado:", correoGenerado);
      
      // Llamar al endpoint para enviar el OTP al correo
      console.log("Llamando a enviarOTP para email:", correoGenerado);
      await enviarOTP(correoGenerado);

      console.log("OTP enviado correctamente, mostrando modal de verificacion");
      
      // Si todo fue bien, almacenamos el email y mostramos el modal
      setCorreoEnVerificacion(correoGenerado);
      setMostrarModalOTP(true);
      setCodigoOTP(""); // Limpiar codigo anterior
      setIntentosRestantes(4); // Resetear intentos
      setTiempoExpiracion(300); // 5 minutos
      setTiempoReenvio(0); // Sin cooldown al inicio
      setMensajeOTP(""); // Sin mensajes de error
      
      // Limpiar mensaje anterior
      setMensaje("");
      
    } catch (error: any) {
      console.error("Error al enviar OTP:", error);
      console.error("Detalle del error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      
      // Manejar errores especificos del backend
      if (error.response?.status === 400) {
        // Email ya registrado u otro error 400
        const detalleError = error.response.data.detail || error.response.data;
        console.log("Error 400 del backend:", detalleError);
        setMensaje(detalleError);
      } else if (error.response?.status === 403) {
        // Email bloqueado por intentos fallidos
        const detalleError = error.response.data.detail || "Email bloqueado";
        console.log("Error 403 del backend:", detalleError);
        setMensaje(detalleError);
      } else {
        setMensaje("Error al enviar el codigo, intenta de nuevo");
      }
      setMensajeColor("red");
    }
  }

  // Nueva funcion para manejar la verificacion del OTP
  // Se llama cuando el usuario presiona el boton de verificar en el modal
  async function handleVerificarOTP(e: React.FormEvent) {
    e.preventDefault();
    console.log("Verificando OTP - email:", correoEnVerificacion, "codigo:", codigoOTP);

    // Validar que el codigo tenga 6 caracteres
    if (codigoOTP.length !== 6 || isNaN(parseInt(codigoOTP))) {
      setMensajeOTP("El codigo debe ser de 6 digitos");
      return;
    }

    setCargandoOTP(true);
    setMensajeOTP("");

    try {
      // Llamar al endpoint para verificar el codigo OTP
      console.log("Llamando a verificarOTP...");
      await verificarOTP(correoEnVerificacion, codigoOTP);

      console.log("OTP verificado correctamente, creando usuario...");
      setMensajeOTP("Codigo verificado correctamente, creando tu cuenta...");

      // Si el OTP es correcto, proceder a crear el usuario con todos los datos
      const correoGenerado = generarCorreoAutomatico(formData.matricula);
      console.log("Creando usuario con datos completos...");
      
      const nuevo = await crearUsuario({
        apodo: formData.apodo,
        nombre: formData.nombre,
        correo: correoGenerado,
        telefono: formData.telefono,
        matricula: parseInt(formData.matricula),
        password: formData.password,
        rol: "cliente", // Por defecto, todos los registros son clientes
        recaptcha_token: "", // No usamos recaptcha, pero el backend lo permite opcional
      });

      console.log("Usuario creado exitosamente:", nuevo);
      
      // Mostrar mensaje de exito en el modal
      setMensajeOTP("Cuenta creada correctamente, redirigiendo a login...");
      
      // Cerrar el modal despues de 2 segundos y redirigir a login
      setTimeout(() => {
        setMostrarModalOTP(false);
        setMensaje(`Bienvenido ${nuevo.nombre}, iniciando sesion...`);
        setMensajeColor("green");
        
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      }, 2000);
      
    } catch (error: any) {
      console.error("Error al verificar/crear usuario:", error);
      console.error("Detalle del error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      
      // asiel: Manejar error 500 del endpoint de creación de usuario
      if (error.response?.status === 500) {
        const detalleError = error.response.data.detail || "Error interno del servidor";
        console.log("Error 500 - Server Error:", detalleError);
        setMensajeOTP("Error al crear tu cuenta: " + detalleError);
      }
      // Manejar errores especificos del OTP
      else if (error.response?.status === 401) {
        // Codigo incorrecto
        const detalleError = error.response.data.detail || "Codigo incorrecto";
        console.log("Error 401 - Codigo incorrecto:", detalleError);
        setMensajeOTP(detalleError);
        setIntentosRestantes(Math.max(0, intentosRestantes - 1));
      } else if (error.response?.status === 429) {
        // Cuenta bloqueada por demasiados intentos
        const detalleError = error.response.data.detail || "Cuenta bloqueada";
        console.log("Error 429 - Bloqueado:", detalleError);
        setMensajeOTP(detalleError);
        setMostrarModalOTP(false);
      } else if (error.response?.status === 400) {
        // OTP expirado u otro error
        const detalleError = error.response.data.detail || "Error de verificacion";
        console.log("Error 400:", detalleError);
        setMensajeOTP(detalleError);
      } else if (error.response?.status === 404) {
        // No hay OTP para este email
        setMensajeOTP("No hay codigo OTP vigente, solicita uno nuevo");
      } else {
        setMensajeOTP("Error al procesar tu solicitud, intenta de nuevo: " + (error.message || "Error desconocido"));
      }
    } finally {
      setCargandoOTP(false);
    }
  }

  // Funcion para reenviar el codigo OTP (con cooldown de 30-40 segundos)
  async function handleReenviarOTP() {
    console.log("Reenviar OTP solicitado para:", correoEnVerificacion);
    
    try {
      setCargandoOTP(true);
      setMensajeOTP("Enviando nuevo codigo...");
      
      // Llamar nuevamente al endpoint de enviar OTP
      await enviarOTP(correoEnVerificacion);

      console.log("OTP reenviado correctamente");
      setMensajeOTP("Nuevo codigo enviado a tu correo");
      setCodigoOTP(""); // Limpiar el input del codigo anterior
      setIntentosRestantes(4); // Resetear intentos
      setTiempoExpiracion(300); // Resetear timer a 5 minutos
      setTiempoReenvio(35); // Bloquear boton durante 35 segundos
      
    } catch (error: any) {
      console.error("Error al reenviar OTP:", error);
      const detalleError = error.response?.data?.detail || "Error al reenviar el codigo";
      setMensajeOTP(detalleError);
    } finally {
      setCargandoOTP(false);
    }
  }

  return (
    <div className="containerRegister">
      <div className="registerBox">
        {/* asiel: Logo de ToroEats con contenedor centrado */}
        <div className="registerLogoContainer">
          <img src="/ToroEatsLogo.png" alt="Toro Eats Logo" className="registerLogo" />
        </div>
        <div className="registerHeader">
          <h1>Crear Cuenta</h1>
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

          {/* Sección reCAPTCHA - REMOVIDA */}
          {/* reCAPTCHA se valida durante la verificacion del OTP en el modal si es necesario */}

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

        {/* MODAL OTP - Verificacion de correo */}
        {mostrarModalOTP && (
          <div className="modalOverlay">
            <div className="modalOTP">
              <div className="modalHeader">
                <h2>Verifica tu correo</h2>
              </div>

              {/* Informacion del correo y timer */}
              <div className="modalContent">
                <p className="correoInfo">Se envio un codigo de 6 digitos a:</p>
                <p className="correoDestino">{correoEnVerificacion}</p>

                {/* Contador de tiempo de expiracion */}
                <div className="timerContainer">
                  <p className="timerLabel">Expira en:</p>
                  <p className="timerValue">
                    {Math.floor(tiempoExpiracion / 60)}:{(tiempoExpiracion % 60)
                      .toString()
                      .padStart(2, "0")}
                  </p>
                </div>

                {/* Contador de intentos */}
                <div className="intentosContainer">
                  <p className="intentosLabel">Intentos restantes: {intentosRestantes}/4</p>
                </div>

                {/* Mensaje de error o informacion */}
                {mensajeOTP && (
                  <div
                    className="mensajeOTP"
                    style={{
                      color: mensajeOTP.includes("correctamente") ? "green" : "red",
                    }}
                  >
                    {mensajeOTP}
                  </div>
                )}

                {/* Input para ingresar el codigo */}
                <form onSubmit={handleVerificarOTP} className="formOTP">
                  <label htmlFor="codigoOTP">Ingresa el codigo:</label>
                  <input
                    type="text"
                    id="codigoOTP"
                    value={codigoOTP}
                    onChange={(e) => {
                      // Solo permitir numeros, maximo 6 digitos
                      const valor = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                      setCodigoOTP(valor);
                    }}
                    placeholder="000000"
                    maxLength={6}
                    disabled={cargandoOTP}
                    className="inputCodigoOTP"
                  />

                  {/* Botones de accion */}
                  <div className="botonesOTP">
                    <button
                      type="submit"
                      disabled={cargandoOTP || codigoOTP.length !== 6}
                      className="botonVerificar"
                    >
                      {cargandoOTP ? "Verificando..." : "Verificar"}
                    </button>

                    <button
                      type="button"
                      onClick={handleReenviarOTP}
                      disabled={cargandoOTP || tiempoReenvio > 0}
                      className="botonReenviar"
                    >
                      {tiempoReenvio > 0
                        ? `Reenviar en ${tiempoReenvio}s`
                        : "Reenviar codigo"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Footer con enlace para cerrar modal */}
              <div className="modalFooter">
                <button
                  type="button"
                  onClick={() => setMostrarModalOTP(false)}
                  className="botonCancelar"
                >
                  Cancelar
                </button>
                <p className="footerText">
                  Revisa tu correo (incluida la carpeta de spam)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;