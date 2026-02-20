import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerUsuarioActual } from "../services/users";
import "./UserProfilePage.css";

/**
  Componente UserProfilePage - Página de perfil de usuario
  Este componente muestra la información del perfil del usuario actual y permite
  editarla, ahorita solo es simulación porque falta que esté listo el endpoint de actualización

 */
const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  
  /**
    Estado del usuario - almacena los datos actuales del perfil
    Se obtienen del backend mediante obtenerUsuarioActual()
    
   */
  const [user, setUser] = useState<{
    id?: number;
    nombre: string;
    rol_id: number;
    correo?: string | null;  
    matricula?: string | number | null;
    telefono?: string | number | null;
    apodo?: string | null;
  } | null>(null);
  
  /**
    Estado de carga - indica si se están obteniendo los datos del backend
   */
  const [loading, setLoading] = useState(true);
  
  /**
    Estado para el formulario de edición
    Almacena los valores temporales mientras el usuario edita
    Se inicializa con los datos actuales del usuario
   */
  const [editedUser, setEditedUser] = useState({
    nombre: "",
    apodo: "",
    matricula: "",
    telefono: "",
    correo: "", 
    password: "",
    confirmPassword: "",
  });
  
  /**
   * Estados para el CAPTCHA
   * Simula una verificación de seguridad simple
   */
  const [captchaData, setCaptchaData] = useState({ num1: 0, num2: 0, operator: '+', answer: 0 });
  const [captchaUserAnswer, setCaptchaUserAnswer] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  
  /**
   * Estados para manejar la actualización
   */
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  /**
    useEffect - Se ejecuta al montar el componente
    Obtiene los datos del usuario actual desde el backend
    Si hay error, redirige al login
   */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await obtenerUsuarioActual();
        console.log("Datos del usuario recibidos:", data); // Para debug
        
        // Verificar qué campos vienen del backend
        console.log("Campo correo:", data.correo);
        console.log("Campo email (si existe):", data.email);
        
        setUser(data);
        // Inicializar el formulario de edición con los datos actuales
        setEditedUser({
          nombre: data.nombre || "",
          apodo: data.apodo || "",
          matricula: data.matricula ? String(data.matricula) : "",
          telefono: data.telefono ? String(data.telefono) : "",
          correo: data.correo || "", 
          password: "",
          confirmPassword: "",
        });
      } catch (error) {
        console.error("Error al obtener usuario actual", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [navigate]);

  /**
    Genera un nuevo CAPTCHA con operación aleatoria
    Se usa para simular verificación de seguridad
   */
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    
    let answer;
    switch(operator) {
      case '+': answer = num1 + num2; break;
      case '-': answer = num1 - num2; break;
      case '*': answer = num1 * num2; break;
      default: answer = num1 + num2;
    }
    
    setCaptchaData({ num1, num2, operator, answer });
  };

  /**
    Obtiene la inicial del nombre para el avatar
   */
  const getInitial = () => {
    return user?.nombre ? user.nombre.charAt(0).toUpperCase() : "U";
  };

  /**
    Maneja los cambios en los inputs del formulario
    Actualiza el estado editedUser con los nuevos valores
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedUser(prev => ({ ...prev, [name]: value }));
  };

  /**
    Activa el modo edición y genera un nuevo CAPTCHA
   */
  const handleEditClick = () => {
    setIsEditing(true);
    generateCaptcha();
    setCaptchaUserAnswer("");
    setCaptchaError("");
    setUpdateError("");
    setUpdateSuccess(false);
  };

  /**
    Cancela el modo edición y restaura los valores originales
   */
  const handleCancelEdit = () => {
    setIsEditing(false);
    if (user) {
      setEditedUser({
        nombre: user.nombre || "",
        apodo: user.apodo || "",
        matricula: user.matricula ? String(user.matricula) : "",
        telefono: user.telefono ? String(user.telefono) : "",
        correo: user.correo || "", // Usando 'correo'
        password: "",
        confirmPassword: "",
      });
    }
  };

  /**
   * SIMULACIÓN de envío del formulario de edición
    
    NOTA: Esta es una versión simula en lo que está listo el endpoint
    de actualización. Solo actualiza visualmente los datos en el frontend aún sin hacer peticiones al back 

   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Simular éxito sin validaciones
    console.log("Datos que se enviarían:", {
      ...editedUser,
      password: editedUser.password ? "***" : "",
    });
    
    setUpdateSuccess(true);
    
    // Crear objeto con los datos actualizados SOLO si realmente cambiaron
    const updatedData: any = {};
    
    // Verificar cada campo individualmente antes de actualizar
    // Esto evita sobrescribir con valores vacíos o sin cambios
    
    // Campo nombre
    if (editedUser.nombre && editedUser.nombre !== user.nombre) {
      updatedData.nombre = editedUser.nombre;
    }
    
    // Campo apodo
    if (editedUser.apodo !== (user.apodo || "")) {
      updatedData.apodo = editedUser.apodo || null;
    }
    
    // Campo correo 
    if (editedUser.correo && editedUser.correo !== (user.correo || "")) {
      updatedData.correo = editedUser.correo;
    }
    
    // Campo matrícula
    if (editedUser.matricula && editedUser.matricula !== String(user.matricula || "")) {
      updatedData.matricula = editedUser.matricula;
    }
    
    // Campo teléfono
    if (editedUser.telefono && editedUser.telefono !== String(user.telefono || "")) {
      updatedData.telefono = editedUser.telefono;
    }
    
    // Actualizar el usuario solo con los campos que cambiaron
    if (Object.keys(updatedData).length > 0) {
      setUser(prev => {
        if (!prev) return prev;
        return { ...prev, ...updatedData };
      });
      console.log("Campos actualizados:", updatedData);
    } else {
      console.log("No hubo cambios en los campos");
    }
    
    
    setTimeout(() => {
      setIsEditing(false);
      setUpdateSuccess(false);
      setCaptchaUserAnswer("");
      setCaptchaError("");
    }, 1500);
  };

  /**
   * Navega de regreso al dashboard
   */
  const handleGoBack = () => {
    navigate("/dashboard");
  };

  /**
   * Función para mostrar valores de forma segura
   * Si el valor es null, undefined o vacío, muestra "No especificado"
   */
  const displayValue = (value: string | number | null | undefined) => {
    // Si es null o undefined
    if (value === null || value === undefined) {
      return <span className="no-value">No especificado</span>;
    }
    
    const stringValue = String(value);
    
    // Si está vacío después de convertir a string
    if (stringValue.trim() === "") {
      return <span className="no-value">No especificado</span>;
    }
    
    return stringValue;
  };

  /**
    Convierte el ID del rol a su nombre legible
   */
  const getRoleName = (rol_id: number) => {
    switch(rol_id) {
      case 1: return "Administrador";
      case 2: return "Comprador";
      case 3: return "Vendedor";
      default: return "Usuario";
    }
  };

  // Mostrar loading mientras se obtienen los datos
  if (loading) {
    return (
      <div className="loading-container">
        <p>Cargando perfil...</p>
      </div>
    );
  }

  // Si no hay usuario después de cargar, redirigir al login
  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="profile-page-container">
      {/* Encabezado con botón de regreso */}
      <div className="profile-page-header">
        <button className="back-button" onClick={handleGoBack}>
           Volver
        </button>
        <h1>Mi Perfil</h1>
      </div>

      <div className="profile-page-content">
        {/* Barra lateral con avatar y rol */}
        <div className="profile-sidebar">
          <div className="profile-avatar-large">
            {getInitial()}
          </div>
          <h2>{user.nombre}</h2>
          {user.apodo && <p className="user-nickname">"{user.apodo}"</p>}
          <div className="user-role-badge">
            {getRoleName(user.rol_id)}
          </div>
        </div>

        <div className="profile-main">
          {!isEditing ? (
            
            <div className="profile-info-card">
              <div className="card-header">
                <h3>Información Personal</h3>
                <button className="edit-button" onClick={handleEditClick}>
                  Editar Perfil
                </button>
              </div>
              
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Nombre completo:</span>
                  <span className="info-value">{user.nombre}</span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">Correo electrónico:</span>
                  <span className="info-value">{displayValue(user.correo)}</span> {/* Usamos user.correo */}
                </div>
                
                <div className="info-item">
                  <span className="info-label">Matrícula:</span>
                  <span className="info-value">{displayValue(user.matricula)}</span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">Teléfono:</span>
                  <span className="info-value">{displayValue(user.telefono)}</span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">Rol:</span>
                  <span className="info-value">{getRoleName(user.rol_id)}</span>
                </div>
              </div>
            </div>
          ) : (
            /**
             
              Formulario para editar los datos del usuario
              
              Por ahora es solo visual, no hace peticiones reales
            
             */
            <div className="profile-edit-card">
              <h3>Editar Perfil</h3>
              
              <form onSubmit={handleSubmit} className="edit-form">
                {/* Campo nombre */}
                <div className="form-group">
                  <label>Nombre:</label>
                  <input
                    type="text"
                    name="nombre"
                    value={editedUser.nombre}
                    onChange={handleInputChange}
                    placeholder="Tu nombre"
                  />
                </div>

                {/* Campo apodo */}
                <div className="form-group">
                  <label>Apodo:</label>
                  <input
                    type="text"
                    name="apodo"
                    value={editedUser.apodo}
                    onChange={handleInputChange}
                    placeholder="Tu apodo (opcional)"
                  />
                </div>

                {/* Campo correo  */}
                <div className="form-group">
                  <label>Correo electrónico:</label>
                  <input
                    type="email"
                    name="correo" 
                    value={editedUser.correo}
                    onChange={handleInputChange}
                    placeholder="Tu correo electrónico"
                  />
                </div>

                {/* Fila con matrícula y teléfono */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Matrícula:</label>
                    <input
                      type="text"
                      name="matricula"
                      value={editedUser.matricula}
                      onChange={handleInputChange}
                      placeholder="Tu matrícula"
                    />
                  </div>

                  <div className="form-group">
                    <label>Teléfono:</label>
                    <input
                      type="tel"
                      name="telefono"
                      value={editedUser.telefono}
                      onChange={handleInputChange}
                      placeholder="Tu teléfono"
                    />
                  </div>
                </div>

                {/* Fila con campos de contraseña */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Nueva Contraseña:</label>
                    <input
                      type="password"
                      name="password"
                      value={editedUser.password}
                      onChange={handleInputChange}
                      placeholder="Dejar en blanco si no deseas cambiarla"
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirmar Contraseña:</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={editedUser.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirmar nueva contraseña"
                    />
                  </div>
                </div>

                {/* Sección CAPTCHA - Simulación de seguridad */}
                <div className="captcha-section">
                  <label>Verificación de seguridad:</label>
                  <div className="captcha-question">
                    ¿Cuánto es {captchaData.num1} {captchaData.operator} {captchaData.num2}?
                  </div>
                  <input
                    type="number"
                    value={captchaUserAnswer}
                    onChange={(e) => setCaptchaUserAnswer(e.target.value)}
                    placeholder="Tu respuesta"
                    className="captcha-input"
                    disabled={isLoading}
                  />
                  {captchaError && <div className="error-message">{captchaError}</div>}
                </div>

                {/* Mensajes de error/éxito */}
                {updateError && <div className="error-message">{updateError}</div>}
                {updateSuccess && <div className="success-message">¡Datos actualizados correctamente!</div>}

                {/* Botones de acción */}
                <div className="form-actions">
                  <button type="submit" className="save-btn" disabled={isLoading}>
                    {isLoading ? "Guardando..." : "Guardar Cambios"}
                  </button>
                  <button type="button" className="cancel-btn" onClick={handleCancelEdit} disabled={isLoading}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;