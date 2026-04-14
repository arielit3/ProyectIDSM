import React, { useState, useEffect, useCallback } from "react";
import { 
  crearProductoConImagen,
  listarMisProductos, 
  actualizarProducto, 
  eliminarProducto, 
  toggleProductoVisibilidad,
  obtenerSolicitudesRecibidas,
  actualizarEstadoSolicitud,
  obtenerNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  obtenerMisVentas,
  obtenerMensajesSolicitud,
  enviarMensajeSolicitud,
  type Producto,
  type SolicitudProducto,
  type Notificacion,
  type Venta,
  type MensajeSolicitud
} from "../services/products";
import { type Usuario } from "../services/users";
import { IconoCampanaConPunto, IconoCampana, IconoCheck, IconoX } from "../components/Iconos";
import "./Dashboard.css";

// CONSTANTES
// URL base de la API (se carga desde el archivo .env)
const API_URL = import.meta.env.VITE_API_URL;

// Lista de categorías predefinidas para los productos
const CATEGORIAS_PRODUCTOS = [
  "Postres", "Snacks", "Bebidas", "Lonches", 
  "Comida Corrida", "Saludable", "Desayunos", "Otros"
];

// INTERFAZ DE PROPS
interface VendedorDashboardProps {
  user: Usuario;  // Datos del vendedor autenticado
}

// COMPONENTE PRINCIPAL
const VendedorDashboard: React.FC<VendedorDashboardProps> = ({ user }) => {

  // ESTADOS DE LA INTERFAZ
  const [showNewProductForm, setShowNewProductForm] = useState(false);     // Muestra formulario de nuevo producto
  const [showGestionProductos, setShowGestionProductos] = useState(false); // Muestra panel de gestión de productos
  const [showSolicitudesPanel, setShowSolicitudesPanel] = useState(false); // Muestra panel de solicitudes y mensajes
  const [showVentas, setShowVentas] = useState(false);                     // Muestra panel de ventas
  const [showNotificaciones, setShowNotificaciones] = useState(false);     // Muestra dropdown de notificaciones
  const [isLoading, setIsLoading] = useState(false);                       // Indica si se está procesando una petición
  const [error, setError] = useState("");                                  // Mensaje de error
  const [success, setSuccess] = useState("");                              // Mensaje de éxito
  const [refrescando, setRefrescando] = useState(false);                   // Estado para el botón de refrescar

  // ESTADOS DE DATOS
  const [productos, setProductos] = useState<Producto[]>([]);              // Lista de productos del vendedor
  const [cargandoProductos, setCargandoProductos] = useState(true);        // Carga de productos
  const [imagenPreview, setImagenPreview] = useState<string | null>(null); // Vista previa de la imagen
  const [imagenFile, setImagenFile] = useState<File | null>(null);         // Archivo de imagen seleccionado
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null); // Producto en edición
  const [solicitudes, setSolicitudes] = useState<SolicitudProducto[]>([]); // Solicitudes recibidas
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);   // Contador de solicitudes pendientes
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]); // Lista de notificaciones
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0); // Contador de notificaciones no leídas
  const [ventas, setVentas] = useState<Venta[]>([]);                        // Lista de ventas realizadas
  const [cargandoVentas, setCargandoVentas] = useState(false);             // Carga de ventas
  const [chatAbiertoId, setChatAbiertoId] = useState<number | null>(null);
  const [cargandoChatId, setCargandoChatId] = useState<number | null>(null);
  const [mensajesSolicitud, setMensajesSolicitud] = useState<Record<number, MensajeSolicitud[]>>({});
  const [nuevoMensajeSolicitud, setNuevoMensajeSolicitud] = useState<Record<number, string>>({});

  // ESTADO DEL FORMULARIO
  const [formData, setFormData] = useState({
    nombre: "",      // Nombre del producto
    descripcion: "", // Descripción del producto
    precio: "",      // Precio (string para el input)
    stock: "",       // Stock disponible
    categoria: CATEGORIAS_PRODUCTOS[0], // Categoría seleccionada
  });

  // FUNCIONES DE CARGA DE DATOS
  //Carga todos los productos del vendedor desde el backend
  const cargarProductos = useCallback(async () => {
    try {
      setCargandoProductos(true);
      const data = await listarMisProductos();
      // Normaliza el stock para asegurar que sea número
      const productosNormalizados = data.map(p => ({
        ...p,
        stock: typeof p.stock === 'string' ? parseInt(p.stock) : p.stock
      }));
      setProductos(productosNormalizados);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setError("No se pudieron cargar los productos");
    } finally {
      setCargandoProductos(false);
    }
  }, []);

  //Carga las solicitudes de productos recibidas por el vendedor
  const cargarSolicitudes = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await obtenerSolicitudesRecibidas();
      setSolicitudes(data);
      const pendientes = data.filter(s => s.estado === "pendiente").length;
      setSolicitudesPendientes(pendientes);
    } catch (error) {
      console.error("Error al cargar solicitudes:", error);
    }
  }, [user?.id]);

  //Carga las notificaciones del vendedor
  const cargarNotificaciones = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await obtenerNotificaciones();
      setNotificaciones(data);
      const noLeidas = data.filter(n => !n.leida).length;
      setNotificacionesNoLeidas(noLeidas);
    } catch (error) {
      console.error("Error al cargar notificaciones:", error);
    }
  }, [user?.id]);

  //Carga las ventas realizadas por el vendedor
  const cargarVentas = useCallback(async () => {
    if (!user?.id) return;
    try {
      setCargandoVentas(true);
      const data = await obtenerMisVentas();
      setVentas(data);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
    } finally {
      setCargandoVentas(false);
    }
  }, [user?.id]);

  //Refresca todos los datos productos, solicitudes, notificaciones y ventas
  const handleRefrescar = useCallback(async () => {
    setRefrescando(true);
    await Promise.all([cargarProductos(), cargarSolicitudes(), cargarNotificaciones(), cargarVentas()]);
    setTimeout(() => {
      setRefrescando(false);
      setSuccess("Datos actualizados");
      setTimeout(() => setSuccess(""), 2000);
    }, 500);
  }, [cargarProductos, cargarSolicitudes, cargarNotificaciones, cargarVentas]);


  // EFECTOS INICIALES
  useEffect(() => {
    if (user?.id) {
      cargarProductos();
      cargarSolicitudes();
      cargarNotificaciones();
      cargarVentas();
    }
  }, [user?.id, cargarProductos, cargarSolicitudes, cargarNotificaciones, cargarVentas]);

  // FUNCIONES DE MANEJO DE FORMULARIOS
  //Maneja los cambios en los inputs del formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  // Maneja la selección de una imagen para el producto
  //crea una vista previa usando FileReader
  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagenFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  //Construye la URL para acceder a una imagen guardada
  const getImagenUrl = (imagenNombre: string | null): string | null => {
    if (!imagenNombre) return null;
    
    /* quitamos la diagonal del final si existe para que no se duplique */
    const urlLimpia = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    
    return `${urlLimpia}/uploads/productos/${imagenNombre}`;
  };

  //Resetea el formulario a sus valores iniciales
  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      precio: "",
      stock: "",
      categoria: CATEGORIAS_PRODUCTOS[0],
    });
    setImagenFile(null);
    setImagenPreview(null);
    setProductoEditando(null);
  };

  // CREACIÓN DE PRODUCTOS
  // Envía el formulario para crear un nuevo producto
  //Incluye validaciones y envío de imagen con formdata
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones de campos obligatorios
    if (!formData.nombre.trim()) {
      setError("El nombre del producto es requerido");
      return;
    }
    
    const precio = parseFloat(formData.precio);
    if (isNaN(precio) || precio <= 0) {
      setError("El precio debe ser un número válido mayor a 0");
      return;
    }
    
    const stock = parseInt(formData.stock);
    if (isNaN(stock) || stock < 0) {
      setError("El stock debe ser un número válido mayor o igual a 0");
      return;
    }
    
    if (!formData.descripcion.trim()) {
      setError("La descripción del producto es requerida");
      return;
    }
    
    if (!formData.categoria) {
      setError("La categoría es requerida");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      // Construir FormData para enviar la imagen como multipart/form-data
      const formDataToSend = new FormData();
      formDataToSend.append("nombre", formData.nombre.trim());
      formDataToSend.append("descripcion", formData.descripcion.trim());
      formDataToSend.append("precio", precio.toString());
      formDataToSend.append("stock", stock.toString());
      formDataToSend.append("categoria", formData.categoria);
      
      if (imagenFile) {
        formDataToSend.append("imagen", imagenFile);
      }
      
      await crearProductoConImagen(formDataToSend);
      
      setSuccess("Producto creado exitosamente!");
      resetForm();
      await cargarProductos();  // Recargar la lista de productos
      
      setTimeout(() => {
        setShowNewProductForm(false);
        setSuccess("");
      }, 2000);
      
    } catch (error: any) {
      console.error("Error al crear producto:", error);
      setError(error.response?.data?.detail || "Error al crear el producto");
    } finally {
      setIsLoading(false);
    }
  };

  // EDICIÓN DE PRODUCTOS

  /**
   * Prepara el formulario para editar un producto existente
   * @param producto - Producto a editar
   */
  const handleEditarProducto = (producto: Producto) => {
    // Valida que la categoría exista en la lista predefinida
    const getCategoriaValida = (cat: string | undefined): string => {
      if (cat && CATEGORIAS_PRODUCTOS.includes(cat)) {
        return cat;
      }
      return CATEGORIAS_PRODUCTOS[0];
    };
    
    setProductoEditando(producto);
    setFormData({
      nombre: producto.nombre || "",
      descripcion: producto.descripcion || "",
      precio: producto.precio?.toString() || "0",
      stock: producto.stock?.toString() || "0",
      categoria: getCategoriaValida(producto.categoria),
    });
    setShowGestionProductos(true);
  };

  //Guarda los cambios de un producto editado
  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoEditando) return;
    
    const precio = parseFloat(formData.precio);
    const stock = parseInt(formData.stock);
    
    if (isNaN(precio) || precio <= 0) {
      setError("El precio debe ser un número válido mayor a 0");
      return;
    }
    
    if (isNaN(stock) || stock < 0) {
      setError("El stock debe ser un número válido mayor o igual a 0");
      return;
    }
    
    try {
      await actualizarProducto(productoEditando.id, {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        precio: precio,
        stock: stock,
        categoria: formData.categoria,
      });
      
      setSuccess("Producto actualizado exitosamente!");
      await cargarProductos();
      resetForm();
      setShowGestionProductos(false);
      
      setTimeout(() => setSuccess(""), 2000);
    } catch (error: any) {
      setError(error.response?.data?.detail || "Error al actualizar producto");
    }
  };

  // GESTIÓN DE SOLICITUDES
  /**
   * Acepta una solicitud de producto de un comprador
   * @param solicitudId - ID de la solicitud
   */
  const handleAceptarSolicitud = async (solicitudId: number) => {
    try {
      await actualizarEstadoSolicitud(solicitudId, "aceptado");
      setSuccess("Solicitud aceptada");
      await Promise.all([cargarSolicitudes(), cargarNotificaciones()]);
      setTimeout(() => setSuccess(""), 2000);
    } catch (error: any) {
      setError(error.response?.data?.detail || "Error al aceptar solicitud");
    }
  };

  /**
   * Rechaza una solicitud de producto de un comprador
   * @param solicitudId - ID de la solicitud
   */
  const handleRechazarSolicitud = async (solicitudId: number) => {
    try {
      await actualizarEstadoSolicitud(solicitudId, "rechazado");
      setSuccess("Solicitud rechazada");
      await Promise.all([cargarSolicitudes(), cargarNotificaciones()]);
      setTimeout(() => setSuccess(""), 2000);
    } catch (error: any) {
      setError(error.response?.data?.detail || "Error al rechazar solicitud");
    }
  };

  const abrirChatSolicitud = async (solicitudId: number) => {
    // :> Esto abre una conversacion en modal para que no quede escondida en notificaciones
    setShowNotificaciones(false);
    setChatAbiertoId(solicitudId);
    setCargandoChatId(solicitudId);

    try {
      const data = await obtenerMensajesSolicitud(solicitudId);
      setMensajesSolicitud(prev => ({ ...prev, [solicitudId]: data }));
    } catch (error) {
      console.error("Error al abrir chat:", error);
      setError("No se pudo abrir la conversacion");
    } finally {
      setCargandoChatId(null);
    }
  };

  const cerrarChatSolicitud = () => {
    // :> Esto solo cierra el modal sin tirar mensajes ya cargados
    setChatAbiertoId(null);
    setCargandoChatId(null);
  };

  const enviarMensajeDeSolicitud = async (solicitudId: number) => {
    // :> Ahora el vendedor tambien puede contestarle al comprador por aqui
    const texto = (nuevoMensajeSolicitud[solicitudId] || "").trim();
    if (!texto) return;

    try {
      const mensaje = await enviarMensajeSolicitud(solicitudId, texto);
      setMensajesSolicitud(prev => ({
        ...prev,
        [solicitudId]: [...(prev[solicitudId] || []), mensaje]
      }));
      setNuevoMensajeSolicitud(prev => ({ ...prev, [solicitudId]: "" }));
      await cargarNotificaciones();
    } catch (error: any) {
      setError(error.response?.data?.detail || "No se pudo enviar el mensaje");
    }
  };

  // GESTIÓN DE NOTIFICACIONES
  /**
   * Marca una notificación como leída
   * @param notificacionId - ID de la notificación
   */
  const marcarNotificacionLeidaHandler = async (notificacionId: number) => {
    try {
      await marcarNotificacionLeida(notificacionId);
      setNotificaciones(prev => prev.map(n => 
        n.id === notificacionId ? { ...n, leida: true } : n
      ));
      setNotificacionesNoLeidas(prev => prev - 1);
    } catch (error) {
      console.error("Error al marcar notificacion:", error);
    }
  };

  //Marca todas las notificaciones como leídas
  const marcarTodasLeidas = async () => {
    try {
      await marcarTodasNotificacionesLeidas();
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
      setNotificacionesNoLeidas(0);
    } catch (error) {
      console.error("Error al marcar todas:", error);
    }
  };

  // GESTIÓN DE VISIBILIDAD Y ELIMINACIÓN
  // Alterna la visibilidad de un producto, publicado o oculto
  //los productos ocultos no son visibles para los compradores
  const handleToggleVisibilidad = async (producto: Producto) => {
    try {
      const result = await toggleProductoVisibilidad(producto.id);
      setSuccess(result.mensaje);
      await cargarProductos();
      setTimeout(() => setSuccess(""), 2000);
    } catch (error: any) {
      setError(error.response?.data?.detail || "Error al cambiar visibilidad");
    }
  };

  /**
   * Elimina un producto permanentemente (solo el dueño puede hacerlo)
   * @param producto - Producto a eliminar
   */
  const handleEliminarProducto = async (producto: Producto) => {
    if (confirm(`¿Estás seguro de eliminar "${producto.nombre}"?`)) {
      try {
        await eliminarProducto(producto.id);
        setSuccess("Producto eliminado correctamente");
        await cargarProductos();
        setTimeout(() => setSuccess(""), 2000);
      } catch (error: any) {
        setError(error.response?.data?.detail || "Error al eliminar producto");
      }
    }
  };

  // CÁLCULOS PARA ESTADÍSTICAS
  const totalProductos = productos.length;                              // Total de productos
  const productosVisibles = productos.filter(p => p.activo === 1).length; // Productos visibles
  const totalVentas = ventas.length;                                    // Total de ventas
  const ingresosTotales = ventas.reduce((sum, v) => sum + v.total, 0);  // Ingresos totales
  const solicitudChatActual = solicitudes.find(solicitud => solicitud.id === chatAbiertoId) || null;

  // RENDERIZADO DEL COMPONENTE
  return (
    <div className="vendedor-dashboard">
      
      {/*HEADER DEL VENDEDOR
        Muestra mensaje de bienvenida y estadísticas*/}
      <div className="vendedor-header">
        <div className="vendedor-welcome">
          <div className="vendedor-header-top">
            <div>
              <h1>¡Hola, {user.apodo || user.nombre}!</h1>
              <p className="vendedor-subtitle">Panel de control de ventas y productos</p>
            </div>
            
            {/* CAMPANA DE NOTIFICACIONES
                Muestra el dropdown con solicitudes y notificaciones*/}
            <div className="notificaciones-container">
              <button 
                className="campana-btn"
                onClick={() => setShowNotificaciones(!showNotificaciones)}
              >
                {/* Ícono de campana con punto rojo si hay notificaciones no leídas */}
                {notificacionesNoLeidas > 0 ? (
                  <IconoCampanaConPunto className="icono-campana" />
                ) : (
                  <IconoCampana className="icono-campana" />
                )}
                {/* Badge con número de solicitudes pendientes */}
                {solicitudesPendientes > 0 && (
                  <span className="campana-badge">{solicitudesPendientes}</span>
                )}
              </button>
              
              {/* Dropdown de notificaciones */}
              {showNotificaciones && (
                <div className="notificaciones-dropdown">
                  <div className="notificaciones-header">
                    <h4>Notificaciones y Solicitudes</h4>
                    {notificacionesNoLeidas > 0 && (
                      <button className="marcar-todas" onClick={marcarTodasLeidas}>
                        Marcar todas
                      </button>
                    )}
                  </div>
                  
                  {/* Solicitudes pendientes - sección principal */}
                  <div className="solicitudes-pendientes">
                    <h5>Solicitudes pendientes ({solicitudesPendientes})</h5>
                    {solicitudes.filter(s => s.estado === "pendiente").length === 0 ? (
                      <div className="sin-notificaciones">No hay solicitudes pendientes</div>
                    ) : (
                      solicitudes.filter(s => s.estado === "pendiente").map(solicitud => (
                        <div key={solicitud.id} className="notificacion-item">
                          <div className="notificacion-info">
                            <p>
                              <strong>{solicitud.comprador?.apodo || solicitud.comprador?.nombre}</strong> 
                              quiere {solicitud.cantidad} unidad(es) de 
                              <strong> {solicitud.producto?.nombre}</strong>
                            </p>
                            {solicitud.mensaje && (
                              <p className="solicitud-mensaje">"{solicitud.mensaje}"</p>
                            )}
                          </div>
                          <div className="solicitud-acciones">
                            <button 
                              className="btn-aceptar-solicitud"
                              onClick={() => handleAceptarSolicitud(solicitud.id)}
                            >
                              <IconoCheck className="icono-check" /> Aceptar
                            </button>
                            <button 
                              className="btn-rechazar-solicitud"
                              onClick={() => handleRechazarSolicitud(solicitud.id)}
                            >
                              <IconoX className="icono-x" /> Rechazar
                            </button>
                            <button 
                              className="btn-toggle"
                              onClick={() => abrirChatSolicitud(solicitud.id)}
                            >
                              Ver mensajes
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Otras notificaciones (sistema, ventas, etc.) */}
                  <div className="otras-notificaciones">
                    <h5>Notificaciones</h5>
                    {notificaciones.filter(n => n.tipo !== "solicitud").length === 0 ? (
                      <div className="sin-notificaciones">No hay notificaciones</div>
                    ) : (
                      notificaciones.filter(n => n.tipo !== "solicitud").map(notif => (
                        <div 
                          key={notif.id} 
                          className={`notificacion-item ${!notif.leida ? 'no-leida' : ''}`}
                          onClick={() => marcarNotificacionLeidaHandler(notif.id)}
                        >
                          <div className="notificacion-info">
                            <strong>{notif.titulo}</strong>
                            <p>{notif.mensaje}</p>
                            <small>{new Date(notif.fecha_creacion).toLocaleDateString()}</small>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Tarjetas de estadísticas */}
        <div className="vendedor-stats">
          <div className="stat-card">
            <div className="stat-info">
              <h3>{totalProductos}</h3>
              <p>Productos</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{productosVisibles}</h3>
              <p>Visibles</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{totalVentas}</h3>
              <p>Ventas</p>
            </div>
          </div>
        </div>
      </div>

      {/*ACCIONES RÁPIDAS
          Botones principales del panel de vendedor*/}
      <div className="acciones-rapidas">
        {/* Botón para crear nuevo producto */}
        <button 
          className="btn-publicar"
          onClick={() => {
            setShowNewProductForm(!showNewProductForm);
            setShowGestionProductos(false);
            setShowSolicitudesPanel(false);
            setShowVentas(false);
            resetForm();
            setError("");
            setSuccess("");
          }}
        >
          {showNewProductForm ? "Cancelar" : "+ Nueva Publicación"}
        </button>
        
        {/* Botón para gestionar productos */}
        <button 
          className="btn-gestionar"
          onClick={() => {
            setShowGestionProductos(!showGestionProductos);
            setShowNewProductForm(false);
            setShowSolicitudesPanel(false);
            setShowVentas(false);
            resetForm();
            setError("");
            setSuccess("");
          }}
        >
          Gestionar Productos
        </button>
        
        {/* Botón para ver ventas */}
        <button 
          className="btn-gestionar"
          onClick={() => {
            setShowSolicitudesPanel(!showSolicitudesPanel);
            setShowGestionProductos(false);
            setShowNewProductForm(false);
            setShowVentas(false);
            resetForm();
            setError("");
            setSuccess("");
            cargarSolicitudes();
          }}
        >
          Ver Solicitudes
        </button>

        <button 
          className="btn-ventas"
          onClick={() => {
            setShowVentas(!showVentas);
            setShowGestionProductos(false);
            setShowNewProductForm(false);
            setShowSolicitudesPanel(false);
            resetForm();
            setError("");
            setSuccess("");
            cargarVentas();
          }}
        >
          Ver Ventas
        </button>
        
        {/* Botón para refrescar todos los datos */}
        <button 
          className="btn-refrescar"
          onClick={handleRefrescar}
          disabled={refrescando}
        >
          {refrescando ? "Actualizando..." : "⟳ Actualizar"}
        </button>
      </div>

      {showSolicitudesPanel && (
        <div className="solicitudes-section vendedor-solicitudes-section">
          <div className="section-header">
            <h2 className="section-title">Solicitudes y conversaciones</h2>
          </div>

          {solicitudes.length === 0 ? (
            <div className="empty-state">No tienes solicitudes todavia</div>
          ) : (
            <div className="solicitudes-grid">
              {solicitudes.map(solicitud => (
                <div key={solicitud.id} className="solicitud-card">
                  <div className="solicitud-header">
                    <span className="producto-nombre">{solicitud.producto?.nombre}</span>
                    <span className={`estado-badge ${solicitud.estado}`}>
                      {solicitud.estado === "pendiente" ? "Pendiente" :
                       solicitud.estado === "aceptado" ? "Aceptado" :
                       solicitud.estado === "rechazado" ? "Rechazado" :
                       solicitud.estado === "entregado" ? "Entregado" : "Completado"}
                    </span>
                  </div>
                  <div className="solicitud-body">
                    <p>Comprador: {solicitud.comprador?.apodo || solicitud.comprador?.nombre}</p>
                    <p>Cantidad: {solicitud.cantidad}</p>
                    <p>Fecha: {new Date(solicitud.fecha_solicitud).toLocaleString()}</p>
                    {solicitud.mensaje && <p>Mensaje inicial: "{solicitud.mensaje}"</p>}
                  </div>
                  <div className="solicitud-actions">
                    {solicitud.estado === "pendiente" && (
                      <button 
                        className="btn-aceptar-solicitud"
                        onClick={() => handleAceptarSolicitud(solicitud.id)}
                      >
                        <IconoCheck className="icono-check" /> Aceptar
                      </button>
                    )}
                    {solicitud.estado === "pendiente" && (
                      <button 
                        className="btn-rechazar-solicitud"
                        onClick={() => handleRechazarSolicitud(solicitud.id)}
                      >
                        <IconoX className="icono-x" /> Rechazar
                      </button>
                    )}
                    <button 
                      className="btn-toggle"
                      onClick={() => abrirChatSolicitud(solicitud.id)}
                    >
                      Ver mensajes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/*FORMULARIO PARA CREAR NUEVO PRODUCTO
        Se muestra cuando showNewProductForm es true*/}
      {showNewProductForm && (
        <div className="nuevo-producto-form">
          <h2>Crear nueva publicación</h2>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="form-grid">
              {/* Nombre del producto */}
              <div className="form-group">
                <label>Nombre del producto *</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required disabled={isLoading} />
              </div>
              
              {/* Categoría (selector) */}
              <div className="form-group">
                <label>Categoría *</label>
                <select 
                  name="categoria" 
                  value={formData.categoria} 
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="categoria-select"
                >
                  {CATEGORIAS_PRODUCTOS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <small className="categoria-help">Selecciona la categoría que mejor describa tu producto</small>
              </div>
              
              {/* Precio */}
              <div className="form-group">
                <label>Precio *</label>
                <input type="number" name="precio" value={formData.precio} onChange={handleInputChange} step="0.01" min="0" required disabled={isLoading} />
              </div>
              
              {/* Stock */}
              <div className="form-group">
                <label>Stock *</label>
                <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} min="0" step="1" required disabled={isLoading} />
              </div>
              
              {/* Descripción */}
              <div className="form-group full-width">
                <label>Descripción *</label>
                <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows={4} required disabled={isLoading} />
              </div>
              
              {/* Imagen del producto */}
              <div className="form-group full-width">
                <label>Imagen del producto</label>
                <input type="file" accept="image/*" onChange={handleImagenChange} disabled={isLoading} />
                {imagenPreview && <img src={imagenPreview} alt="Preview" style={{ maxWidth: '200px', marginTop: '10px' }} />}
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn-cancelar" onClick={() => setShowNewProductForm(false)}>Cancelar</button>
              <button type="submit" className="btn-guardar" disabled={isLoading}>{isLoading ? "Publicando..." : "Publicar producto"}</button>
            </div>
          </form>
        </div>
      )}

      {/*PANEL DE GESTIÓN DE PRODUCTOS
          Muestra todos los productos con opciones de edición, ocultar y eliminar*/}
      {showGestionProductos && (
        <div className="gestion-productos">
          <h2>Gestionar Productos</h2>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          {cargandoProductos ? (
            <div className="empty-state">Cargando productos...</div>
          ) : productos.length === 0 ? (
            <div className="empty-state">No tienes productos aún</div>
          ) : (
            <div className="productos-gestion-grid">
              {productos.map(producto => (
                <div key={producto.id} className={`producto-gestion-card ${producto.activo === 0 ? 'oculto' : ''}`}>
                  {/* Imagen del producto */}
                  <div className="producto-gestion-imagen">
                    {producto.imagen_nombre ? (
                      <img src={getImagenUrl(producto.imagen_nombre) || ''} alt={producto.nombre} />
                    ) : <span>📷</span>}
                  </div>
                  
                  {/* Información del producto */}
                  <div className="producto-gestion-info">
                    <h3>{producto.nombre}</h3>
                    <p>Categoría: {producto.categoria || "Sin categoría"}</p>
                    <p>Precio: ${producto.precio}</p>
                    <p>Stock: {producto.stock}</p>
                    <p className={`estado ${producto.activo === 1 ? 'visible' : 'oculto'}`}>
                      {producto.activo === 1 ? 'Visible' : 'Oculto'}
                    </p>
                  </div>
                  
                  {/* Botones de acción */}
                  <div className="producto-gestion-acciones">
                    <button className="btn-editar" onClick={() => handleEditarProducto(producto)}>Editar</button>
                    <button className="btn-toggle" onClick={() => handleToggleVisibilidad(producto)}>
                      {producto.activo === 1 ? 'Ocultar' : 'Publicar'}
                    </button>
                    <button className="btn-eliminar" onClick={() => handleEliminarProducto(producto)}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PANEL DE VENTAS
          Muestra el historial de ventas y un resumen de ingresos*/}
      {showVentas && (
        <div className="ventas-panel">
          <div className="ventas-header">
            <h2>Mis Ventas</h2>
            <button className="btn-cerrar-ventas" onClick={() => setShowVentas(false)}>×</button>
          </div>
          
          {cargandoVentas ? (
            <div className="empty-state">Cargando ventas...</div>
          ) : ventas.length === 0 ? (
            <div className="empty-state">No tienes ventas aún</div>
          ) : (
            <>
              {/* Lista de ventas */}
              <div className="ventas-lista">
                {ventas.map(venta => (
                  <div key={venta.id} className="venta-card">
                    <div className="venta-info">
                      <h3>{venta.producto?.nombre}</h3>
                      <p>Comprador: {venta.comprador?.apodo || venta.comprador?.nombre}</p>
                      <p>Cantidad: {venta.cantidad}</p>
                      <p>Precio unitario: ${venta.precio_unitario}</p>
                      <p className="venta-total">Total: ${venta.total}</p>
                      <small>{new Date(venta.fecha_venta).toLocaleDateString()}</small>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Resumen de ventas */}
              <div className="ventas-resumen">
                <h3>Resumen</h3>
                <p>Total de ventas: {ventas.length}</p>
                <p>Ingresos totales: ${ingresosTotales}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL DE EDICIÓN DE PRODUCTO
          Ventana emergente para editar un producto*/}
      {solicitudChatActual && (
        <div className="modal-overlay" onClick={cerrarChatSolicitud}>
          <div className="modal-content modal-chat-solicitud" onClick={(e) => e.stopPropagation()}>
            <h3>Mensajes de solicitud</h3>
            <div className="chat-solicitud-resumen">
              <p><strong>Producto:</strong> {solicitudChatActual.producto?.nombre}</p>
              <p><strong>Comprador:</strong> {solicitudChatActual.comprador?.apodo || solicitudChatActual.comprador?.nombre}</p>
              <p><strong>Estado:</strong> {solicitudChatActual.estado}</p>
            </div>
            <div className="chat-solicitud-box chat-solicitud-box-modal">
              {/* :> Aqui el vendedor contesta desde un modal fijo y ya no depende del dropdown */}
              {cargandoChatId === solicitudChatActual.id ? (
                <p>Cargando mensajes...</p>
              ) : (
                <>
                  <div className="chat-solicitud-lista">
                    {(mensajesSolicitud[solicitudChatActual.id] || []).length === 0 ? (
                      <p>Todavia no hay mensajes en esta solicitud</p>
                    ) : (
                      (mensajesSolicitud[solicitudChatActual.id] || []).map(mensaje => (
                        <div key={mensaje.id} className={`chat-solicitud-item ${mensaje.emisor_id === user.id ? "mio" : "otro"}`}>
                          <strong>{mensaje.emisor?.apodo || mensaje.emisor?.nombre || "Usuario"}</strong>
                          <p>{mensaje.mensaje}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="chat-solicitud-form">
                    <textarea
                      value={nuevoMensajeSolicitud[solicitudChatActual.id] || ""}
                      onChange={(e) => setNuevoMensajeSolicitud(prev => ({ ...prev, [solicitudChatActual.id]: e.target.value }))}
                      placeholder="Escribe algo para el comprador"
                      rows={3}
                    />
                    <button className="btn-guardar" onClick={() => enviarMensajeDeSolicitud(solicitudChatActual.id)}>
                      Enviar mensaje
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-cancelar" onClick={cerrarChatSolicitud}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {productoEditando && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Editar Producto</h3>
            <form onSubmit={handleGuardarEdicion}>
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select name="categoria" value={formData.categoria} onChange={handleInputChange} required className="categoria-select">
                  {CATEGORIAS_PRODUCTOS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Precio</label>
                <input type="number" name="precio" value={formData.precio} onChange={handleInputChange} step="0.01" required />
              </div>
              <div className="form-group">
                <label>Stock</label>
                <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows={4} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={() => { setProductoEditando(null); resetForm(); }}>Cancelar</button>
                <button type="submit" className="btn-guardar">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendedorDashboard;
