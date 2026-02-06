import React from "react";
import { useNavigate } from "react-router-dom";
import "./pages.css";
import { crearUsuario } from "../services/users"; // Servicio que conecta con el backend

const RegisterPage: React.FC = () => {
  const navigate = useNavigate(); // nos permite reedirigir

  // Con esto podemos guardar los valores que el usuario escriba/ingrese
  const [formData, setFormData] = React.useState({
    nombre: "",
    email: "",
    telefono: "",
    matricula: "",
    password: "",
    aceptarTerminos: false,
  });

  // mensajes de validacion/exito en el registro
  const [mensaje, setMensaje] = React.useState("");
  const [mensajeColor, setMensajeColor] = React.useState("red");

  /*Esto se ejecuta cuando el usuario escribe en el input, cada cambio actualiza 
  incluso el estado de el formData con el nuevo valor, guardando los datos automaticamente*/
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (mensaje) setMensaje(""); //se limpia mensajes anteriores en tbox
  };

  /*Esta funcion la usamos para enviar datos de el formulario, lo primero que hace es validar que los campos
  que son obligatorios esten completos, luego de esto si todo esta bien, llama a el servicio de crearUsuario esto
  para usar el endpoint de el backend y enviarle los datos en el formato requerido*/
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); 

    //validaciones antes de enviar
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

    try {
      // Llamada al backend: POST /usuarios/
      const nuevo = await crearUsuario({
        //creamos un nuevo objeto temporal que se usa para almacenar los datos
        nombre: formData.nombre,
        correo: formData.email, 
        telefono: formData.telefono,
        matricula: parseInt(formData.matricula), //convertimos de string a numero
        password: formData.password,
        rol_id: 3, // al registrarse, por automatico el rol base es 3, que es comprador
      });

      // Si la peticion fue exitosa
      setMensaje(`Usuario ${nuevo.nombre} creado correctamente`);
      setMensajeColor("green");

      // te reedirige a el login despues de el registro
      navigate("/login");
    } catch (error: any) {
      // si hubo un error en la peticion como el rechazo de datos, el formato esta mal o algo
      // nuevo: si el backend devuelve un error controlado (ejemplo correo duplicado), se muestra el mensaje que viene en error.response.data.detail
      if (error.response?.status === 400) {
        setMensaje(error.response.data.detail); // muestra "El correo ya esta registrado"
      } else {
        setMensaje("Error al crear usuario");
      }
      setMensajeColor("red");
      console.error(error);
    }
  }

  return (
    //en el return creamos la estructura html de el registro
    <div className="containerRegister">
      <div className="registerBox">
        <div className="registerHeader">
          <h1>Registro</h1>
        </div>

        {/* Formulario de registro */}
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
              required
            />
          </div>

          {/* Campo Telefono */}
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

          {/* Campo Matricula */}
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

          {/* Campo Contrasenia */}
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

          {/* Checkbox de terminos */}
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

          {/* Boton de registro */}
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