import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerUsuarioActual, actualizarUsuario } from "../services/users";
import ReCAPTCHA from "react-google-recaptcha";
import "./UserProfilePage.css";

/**
  Componente UserProfilePage - Página de perfil de usuario
  Este componente muestra la información del perfil del usuario actual y permite
  editarla usando los endpoints del backend con verificación reCAPTCHA

 */
const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const recaptchaRef = useRef<ReCAPTCHA>(null); // Referencia para el componente reCAPTCHA
  
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
   * Estados para reCAPTCHA
   */
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaError, setRecaptchaError] = useState("");
  
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
        console.log("Datos del usuario recibidos:", data);
        
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
    
    // Limpiar errores específicos cuando el usuario empieza a escribir
    if (name === 'password' || name === 'confirmPassword') {
      setUpdateError("");
    }
  };

  /**
    Activa el modo edición
   */
  const handleEditClick = () => {
    setIsEditing(true);
    setRecaptchaToken(null);
    setRecaptchaError("");
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
        correo: user.correo || "",
        password: "",
        confirmPassword: "",
      });
    }
    // Resetear reCAPTCHA
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
    setRecaptchaToken(null);
  };

  /**
   * Función para cuando se completa el reCAPTCHA
   */
  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
    setRecaptchaError("");
  };

  /**
   * Envío del formulario de edición con verificación reCAPTCHA
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Validar reCAPTCHA
    if (!recaptchaToken) {
      setRecaptchaError("Por favor, verifica que no eres un robot");
      return;
    }

    // Validar contraseñas si se intenta cambiar
    if (editedUser.password || editedUser.confirmPassword) {
      if (!editedUser.password || !editedUser.confirmPassword) {
        setUpdateError("Ambos campos de contraseña son requeridos");
        return;
      }
      if (editedUser.password !== editedUser.confirmPassword) {
        setUpdateError("Las contraseñas no coinciden");
        return;
      }
      if (editedUser.password.length < 6) {
        setUpdateError("La contraseña debe tener al menos 6 caracteres");
        return;
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {};
    
    // Solo se actualizan apodo, matrícula, teléfono y contraseña
    if (editedUser.apodo !== (user.apodo || "")) {
      updateData.apodo = editedUser.apodo || "";
    }
    
    if (editedUser.matricula && editedUser.matricula !== String(user.matricula || "")) {
      const matriculaNum = parseInt(editedUser.matricula);
      if (!isNaN(matriculaNum)) {
        updateData.matricula = matriculaNum;
      }
    }
    
    if (editedUser.telefono && editedUser.telefono !== String(user.telefono || "")) {
      updateData.telefono = editedUser.telefono;
    }
    
    if (editedUser.password) {
      updateData.password = editedUser.password;
    }

    if (Object.keys(updateData).length === 0) {
      setUpdateError("No hay cambios para guardar");
      return;
    }

    // Añadir el token de reCAPTCHA a los datos
    updateData.recaptcha_token = recaptchaToken;

    setIsLoading(true);
    setUpdateError("");
    
    try {
      const result = await actualizarUsuario(user.id!, updateData);
      
      console.log("Resultado de la actualización:", result);
      
      // Actualizar el estado local con los nuevos datos
      setUser(prev => {
        if (!prev) return prev;
        const updatedUser = { ...prev };
        
        if (updateData.apodo !== undefined) {
          updatedUser.apodo = updateData.apodo;
        }
        if (updateData.matricula !== undefined) {
          updatedUser.matricula = updateData.matricula;
        }
        if (updateData.telefono !== undefined) {
          updatedUser.telefono = updateData.telefono;
        }
        
        return updatedUser;
      });
      
      setUpdateSuccess(true);
      
      // Resetear reCAPTCHA
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setRecaptchaToken(null);
      
      setTimeout(() => {
        setIsEditing(false);
        setUpdateSuccess(false);
      }, 2000);
      
    } catch (error: any) {
      console.error("Error al actualizar:", error);
      
      const errorMsg = error.response?.data?.detail || 
                       error.message || 
                       "Error al actualizar los datos";
      setUpdateError(errorMsg);
      
      // Resetear reCAPTCHA en caso de error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setRecaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Navega de regreso al dashboard
   */
  const handleGoBack = () => {
    navigate("/dashboard");
  };

  /**
   * Función para mostrar valores de forma segura
   */
  const displayValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) {
      return <span className="no-value">No especificado</span>;
    }
    
    const stringValue = String(value);
    
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
            // MODO VISUALIZACIÓN
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
                  <span className="info-value">{displayValue(user.correo)}</span>
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
            // MODO EDICIÓN
            <div className="profile-edit-card">
              <h3>Editar Perfil</h3>
              
              <form onSubmit={handleSubmit} className="edit-form">
                {/* Campo nombre - DESHABILITADO */}
                <div className="form-group">
                  <label>Nombre:</label>
                  <input
                    type="text"
                    name="nombre"
                    value={editedUser.nombre}
                    onChange={handleInputChange}
                    placeholder="Tu nombre"
                    disabled
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>El nombre no se puede modificar</small>
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

                {/* Campo correo - DESHABILITADO */}
                <div className="form-group">
                  <label>Correo electrónico:</label>
                  <input
                    type="email"
                    name="correo" 
                    value={editedUser.correo}
                    onChange={handleInputChange}
                    placeholder="Tu correo electrónico"
                    disabled
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>El correo no se puede modificar</small>
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

                {/* Sección reCAPTCHA */}
                <div className="recaptcha-section">
                  <label>Verificación de seguridad:</label>
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                    onChange={handleRecaptchaChange}
                    theme="light"
                  />
                  {recaptchaError && <div className="error-message">{recaptchaError}</div>}
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