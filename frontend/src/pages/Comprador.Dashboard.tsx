import React, { useState, useEffect } from "react";
import { 
  listarTodosProductos, 
  type Producto, 
  agregarFavorito, 
  quitarFavorito, 
  obtenerFavoritos, 
  crearSolicitudProducto,
  obtenerSolicitudesEnviadas,
  marcarSolicitudComoEntregada,
  obtenerNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  crearSolicitudVendedor,
  obtenerMiSolicitudVendedor,
  crearReporteVendedor,
  obtenerMensajesSolicitud,
  enviarMensajeSolicitud,
  type SolicitudProducto,
  type Notificacion,
  type SolicitudVendedor,
  type MensajeSolicitud
} from "../services/products";
import { type Usuario } from "../services/users";
import { IconoCampanaConPunto, IconoCampana } from "../components/Iconos";
import "./Dashboard.css";

//URL base de la API, se carga desde el .env
const API_URL = import.meta.env.VITE_API_URL;

// INTERFAZ DE PROPS
interface CompradorDashboardProps {
  user: Usuario; //Datos del usuario cliente autenticado
  terminoBusqueda?: string; //Termino de busqueda que se recibe desde el navbar para hacer el filtrado
}

// COMPONENTE PRINCIPAL
const CompradorDashboard: React.FC<CompradorDashboardProps> = ({ user, terminoBusqueda = "" }) => {
  
  // ESTADOS DE PRODUCTOS Y BUSQUEDA
  const [productos, setProductos] = useState<Producto[]>([]); //Lista de productos disponibles
  const [cargando, setCargando] = useState(true); //Indica si los productos están cargando
  const [favoritos, setFavoritos] = useState<Set<number>>(new Set()); //IDS de productos favoritos del usuario
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("todos"); //Categoría seleccioada para filtrar productos con "todos se muestran todas las categorías"
  const [categorias, setCategorias] = useState<string[]>(["todos"]); //Lista de categorías disponibles para el filtro, se carga dinámicamente de los productos
  const [busquedaLocal, setBusquedaLocal] = useState<string>(terminoBusqueda); //Termino de busqueda local
  const [solicitando, setSolicitando] = useState<number | null>(null); //ID del producto que está siendo solicitado para mostrar un indicador de carga en el botón de solicitud
  const [mensajeExito, setMensajeExito] = useState<{ [key: number]: string }>({}); //Mensaje temporal de éxito que aparece em ña tarjeta del producto
  
  // ESTADOS DE NOTIFICACIONES Y SOLICITUDES
  const [showNotificaciones, setShowNotificaciones] = useState(false); //Controla si el dropdown de notificaciones está visible
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]); //Lista de notificaciones de usuario
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0); //Cantidad de notificaciones no leídas para mostrar en la campana
  const [solicitudesEnviadas, setSolicitudesEnviadas] = useState<SolicitudProducto[]>([]); //Lista de solicitudes de producto enviadas por el cliente
  const [miSolicitudVendedor, setMiSolicitudVendedor] = useState<SolicitudVendedor | null>(null); //Estdo de la solicitud del cliente para convertirse en vendedor
  
  // ESTADOS DE MODALES
  //Modal para solicitar un producto
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidadSolicitud, setCantidadSolicitud] = useState(1);
  const [mensajeSolicitud, setMensajeSolicitud] = useState("");
  
  //Modal para confirmar entrega de producto
  const [modalEntregaAbierto, setModalEntregaAbierto] = useState(false);
  const [solicitudEntregando, setSolicitudEntregando] = useState<SolicitudProducto | null>(null);
  const [confirmandoEntrega, setConfirmandoEntrega] = useState(false);
  
  //Modal para solicitar ser vendedor
  const [modalSolicitudVendedorAbierto, setModalSolicitudVendedorAbierto] = useState(false);
  const [motivoSolicitudVendedor, setMotivoSolicitudVendedor] = useState("");
  const [enviandoSolicitudVendedor, setEnviandoSolicitudVendedor] = useState(false);
  
  // Modal para reportar vendedor
  const [modalReporteAbierto, setModalReporteAbierto] = useState(false);
  const [vendedorReportado, setVendedorReportado] = useState<{ id: number; nombre: string } | null>(null);
  const [motivoReporte, setMotivoReporte] = useState("");
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const [chatAbiertoId, setChatAbiertoId] = useState<number | null>(null);
  const [mensajesSolicitud, setMensajesSolicitud] = useState<Record<number, MensajeSolicitud[]>>({});
  const [nuevoMensajeSolicitud, setNuevoMensajeSolicitud] = useState<Record<number, string>>({});
  const [cargandoChatId, setCargandoChatId] = useState<number | null>(null);

  //Estados interfaz 
  const [solicitudesDesplegado, setSolicitudesDesplegado] = useState(true); //Controla si la sección  de mis solicitudes esta desplegada 
  
  // ESTADO PARA MODAL DE MENSAJES
  const [modalMensaje, setModalMensaje] = useState<{
    isOpen: boolean;
    titulo: string;
    mensaje: string;
    tipo: "info" | "success" | "error" | "warning";
  }>({
    isOpen: false,
    titulo: "",
    mensaje: "",
    tipo: "info"
  });

  // Función para mostrar mensajes en un modal
  const mostrarMensaje = (titulo: string, mensaje: string, tipo: "info" | "success" | "error" | "warning" = "info") => {
    setModalMensaje({ isOpen: true, titulo, mensaje, tipo });
  };

  // EFECTOS INICIALES
  //Sincroniza el termino de busqueda local con el que se recibe desde el navbar para que el filtro se aplique correctamente
  useEffect(() => {
    setBusquedaLocal(terminoBusqueda);
  }, [terminoBusqueda]);

  // FUNCIONES DE CARGA DE DATOS
  //Cargar productos, favoritos, notificaciones y solicitudes del cliente
  // al cargar el componente para mostrar la información actualizada en el dashboard
  const cargarProductos = async () => {
    try {
      setCargando(true);
      const data = await listarTodosProductos(); //Llamada a la API
      setProductos(data); //Extrae categorias unicas de los productos para el filtro
      const categoriasUnicas = ["todos", ...new Set(data.map(p => p.categoria).filter(Boolean))];
      setCategorias(categoriasUnicas);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      mostrarMensaje("Error", "No se pudieron cargar los productos", "error");
    } finally {
      setCargando(false);
    }
  };

  //Cragar los IDs de los productos favoritos del cliente para mostrar el estado de favorito en las tarjetas
  // de producto y permitir gestionar favoritos
  const cargarFavoritos = async () => {
    try {
      const favoritosData = await obtenerFavoritos(); //Llamada a la API
      const favoritosSet = new Set(favoritosData.map((f: any) => f.producto_id)); //Extrae solo los IDs de los productos favoritos y los guarda en un Set para acceso rápido
      setFavoritos(favoritosSet); //Actualiza el estado con los IDs de productos favoritos
    } catch (error) {
      console.error("Error al cargar favoritos:", error);
    }
  };

  //Cargar las notificaciones del cliente para mostrarlas en el dropdown de notificaciones y gestionar su estado de leídas o no leídas
  const cargarNotificaciones = async () => {
    try {
      const data = await obtenerNotificaciones();
      setNotificaciones(data);
      const noLeidas = data.filter(n => !n.leida).length;
      setNotificacionesNoLeidas(noLeidas); //Actualiza el contador de la campanita de notificacion
    } catch (error) {
      console.error("Error al cargar notificaciones:", error);
    }
  };

  //Cargar las solicitudes de producto enviadas por el cliente para mostrarlas en la sección de 
  // Mis Solicitudes y permitir gestionar su estado
  const cargarSolicitudesEnviadas = async () => {
    try {
      const data = await obtenerSolicitudesEnviadas();
      setSolicitudesEnviadas(data);
    } catch (error) {
      console.error("Error al cargar solicitudes:", error);
    }
  };

  //Cargar el estado de la solicitud para ser vendedor
  const cargarMiSolicitudVendedor = async () => {
    try {
      const data = await obtenerMiSolicitudVendedor();
      setMiSolicitudVendedor(data);
    } catch (error) {
      console.error("Error al cargar solicitud de vendedor:", error);
    }
  };

  // Carga inicial de datos
  useEffect(() => {
    cargarProductos();
    cargarFavoritos();
    cargarNotificaciones();
    cargarSolicitudesEnviadas();
    cargarMiSolicitudVendedor();
  }, []); //El array vacío asegura que se ejecute solo una vez al montar el componente

  // FUNCIONES DE FAVORITOS
  //Agrega o elimina un producto de favoritos dependiendo de su estado actual
  //actualiza el estado local para reflejar el cambio en la interfaz y muestra un mensaje temporal de éxito
  const handleFavorito = async (productoId: number) => {
    try {
      if (favoritos.has(productoId)) {
        //si ya esta en favoritos, se elimina
        await quitarFavorito(productoId);
        setFavoritos(prev => {
          const nuevo = new Set(prev);
          nuevo.delete(productoId);
          return nuevo;
        });
        setMensajeExito(prev => ({ ...prev, [productoId]: "Eliminado de favoritos" }));
      } else {
        //sino esta en favoritos se agrega
        await agregarFavorito(productoId);
        setFavoritos(prev => new Set(prev).add(productoId));
        setMensajeExito(prev => ({ ...prev, [productoId]: "Agregado a favoritos" }));
      }
      //El mensaje desaparece después de 2 segundos
      setTimeout(() => {
        setMensajeExito(prev => {
          const nuevo = { ...prev };
          delete nuevo[productoId];
          return nuevo;
        });
      }, 2000);
    } catch (error) {
      console.error("Error al gestionar favorito:", error);
      setMensajeExito(prev => ({ ...prev, [productoId]: "Error al marcar favorito" }));
      setTimeout(() => {
        setMensajeExito(prev => {
          const nuevo = { ...prev };
          delete nuevo[productoId];
          return nuevo;
        });
      }, 2000);
    }
  };

  // FUNCIONES DE NOTIFICACIONES
 //Marca una notificación como leída al hacer clic en ella, actualiza el estado local para reflejar el cambio
 //en la interfaz y disminuye el contador de notificaciones no leídas
  const marcarNotificacionLeidaHandler = async (notificacionId: number) => {
    try {
      await marcarNotificacionLeida(notificacionId);
      setNotificaciones(prev => prev.map(n => 
        n.id === notificacionId ? { ...n, leida: true } : n
      ));
      setNotificacionesNoLeidas(prev => prev - 1); //Decrementa el contador de notificaciones no leídas
    } catch (error) {
      console.error("Error al marcar notificacion:", error);
    }
  };

  //Marcar las notificaciones como leídas al hacer clic en el botón de marcar todas como leídas
  //actualiza el estado local para reflejar el cambio en la interfaz y pone el contador de notificaciones no leídas en 0
  const marcarTodasLeidas = async () => {
    try {
      await marcarTodasNotificacionesLeidas();
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
      setNotificacionesNoLeidas(0); //Resetea el contador a 0
    } catch (error) {
      console.error("Error al marcar todas:", error);
    }
  };

  // FUNCIONES DE SOLICITUD DE PRODUCTO
  //Abre el modal de solicitud de producto y establece el producto seleccionado 
  //para mostrar su información en el modal y gestionar la solicitud correctamente
  const abrirModalSolicitud = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setCantidadSolicitud(1);
    setMensajeSolicitud("");
    setModalAbierto(true);
  };

  //Cierra el modal de solictud y se limpian los datos
  const cerrarModal = () => {
    setModalAbierto(false);
    setProductoSeleccionado(null);
    setCantidadSolicitud(1);
    setMensajeSolicitud("");
  };

  //Envía la solicitud de producto al vendedor con cifrado SHA-256
  const enviarSolicitud = async () => {
    if (!productoSeleccionado) return;
    
    if (cantidadSolicitud <= 0) {
      mostrarMensaje("Error", "La cantidad debe ser mayor a 0", "error");
      return;
    }
    
    setSolicitando(productoSeleccionado.id); //Desabilita el botón mientras se envia
    
    try {
      await crearSolicitudProducto({
        producto_id: productoSeleccionado.id,
        vendedor_id: productoSeleccionado.vendedor_id,
        cantidad: cantidadSolicitud,
        mensaje: mensajeSolicitud.trim(),
      });
      
      setMensajeExito(prev => ({ ...prev, [productoSeleccionado.id]: "Solicitud enviada" }));
      setTimeout(() => {
        setMensajeExito(prev => {
          const nuevo = { ...prev };
          delete nuevo[productoSeleccionado.id];
          return nuevo;
        });
      }, 3000);
      
      cerrarModal();
      await Promise.all([
        cargarSolicitudesEnviadas(), //Recarga la lista de solicitudes
        cargarNotificaciones(), //Recarga de notificaciones
      ]);
      
    } catch (error: any) {
      console.error("Error al enviar solicitud:", error);
      mostrarMensaje("Error", error.response?.data?.detail || "Error al enviar la solicitud", "error");
    } finally {
      setSolicitando(null);
    }
  };

  // FUNCIONES DE ENTREGA DE PRODUCTO
  //Marcar una solicitud como entregada, actualiza el estado de la solicitud y muestra un mensaje de éxito
  const handleMarcarEntregado = async (solicitudId: number) => {
    setConfirmandoEntrega(true);
    try {
      await marcarSolicitudComoEntregada(solicitudId);
      await Promise.all([
        cargarSolicitudesEnviadas(), //Recarga la lista
        cargarNotificaciones(), //Recarga notificaciones
      ]);
      mostrarMensaje("Exito", "Producto marcado como recibido", "success");
      setModalEntregaAbierto(false);
      setSolicitudEntregando(null);
    } catch (error: any) {
      mostrarMensaje("Error", error.response?.data?.detail || "Error al marcar como recibido", "error");
    } finally {
      setConfirmandoEntrega(false);
    }
  };

  //Abre el modal para confirmar la entrega
  const abrirModalEntrega = (solicitud: SolicitudProducto) => {
    setSolicitudEntregando(solicitud);
    setModalEntregaAbierto(true);
  };

  const cerrarModalEntrega = () => {
    if (confirmandoEntrega) return;
    setModalEntregaAbierto(false);
    setSolicitudEntregando(null);
  };

  // FUNCIONES DE SOLICITUD PARA SER VENDEDOR
  //Abre el modal para solicitar ser vendedor, verifica si ya existe una solicitud pendiente 
  // o si el cliente ya es vendedor para mostrar un mensaje informativo
  const abrirModalSolicitudVendedor = () => {
    //Verifica si hay una solicitud pendiente 
    if (miSolicitudVendedor?.estado === "pendiente") {
      mostrarMensaje("Info", "Ya tienes una solicitud pendiente. Espera la respuesta del administrador.", "info");
      return;
    }
    //Verifica si el cliente ya es vendedor
    if (user.relacion?.rol === "vendedor") {
      mostrarMensaje("Info", "Ya eres vendedor", "info");
      return;
    }
    setMotivoSolicitudVendedor("");
    setModalSolicitudVendedorAbierto(true);
  };

  //Envía la solicitud para ser vendedor con cifrado SHA-256, muestra un mensaje de éxito y recarga
  // el estado de la solicitud para reflejar el cambio en la interfaz
  const enviarSolicitudVendedor = async () => {
    if (!motivoSolicitudVendedor.trim()) {
      mostrarMensaje("Error", "Por favor, escribe un motivo para tu solicitud", "error");
      return;
    }
    
    setEnviandoSolicitudVendedor(true);
    
    try {
      await crearSolicitudVendedor({ 
        motivo: motivoSolicitudVendedor.trim(),
      });
      
      mostrarMensaje("Exito", "Solicitud enviada correctamente. Recibirás una notificacion cuando sea procesada.", "success");
      setModalSolicitudVendedorAbierto(false);
      cargarMiSolicitudVendedor(); //Actualiza el estado de la solicitud
      cargarNotificaciones(); //Recarga de notificaciones
    } catch (error: any) {
      mostrarMensaje("Error", error.response?.data?.detail || "Error al enviar solicitud", "error");
    } finally {
      setEnviandoSolicitudVendedor(false);
    }
  };

  // FUNCIONES DE REPORTE DE VENDEDOR
  //Abre el modal para reportar un vendedor, se establece el vendedor 
  //reportado para mostrar su información en el modal y gestionar el reporte correctamente
  const abrirModalReporte = (vendedorId: number, vendedorNombre: string) => {
    setVendedorReportado({ id: vendedorId, nombre: vendedorNombre });
    setMotivoReporte("");
    setModalReporteAbierto(true);
  };

    //Envía el reporte contra un vendedor al administrador con cifrado SHA-256 
    //muestra un mensaje de éxito y cierra el modal
  const enviarReporte = async () => {
    if (!vendedorReportado) return;
    
    if (!motivoReporte.trim()) {
      mostrarMensaje("Error", "Por favor, describe el motivo del reporte", "error");
      return;
    }
    //El motivo debe tener al menos 10 caracteres para que el reporte sea válido
    if (motivoReporte.length < 10) {
      mostrarMensaje("Error", "El motivo debe tener al menos 10 caracteres", "error");
      return;
    }
    
    setEnviandoReporte(true);
    
    try {
      await crearReporteVendedor({
        vendedor_id: vendedorReportado.id,
        motivo: motivoReporte
      });
      
      mostrarMensaje(
        "Reporte enviado", 
        "Tu reporte ha sido enviado al administrador. Gracias por ayudarnos a mantener la comunidad segura.",
        "success"
      );
      setModalReporteAbierto(false);
      setMotivoReporte("");
      setVendedorReportado(null);
      
    } catch (error: any) {
      console.error("Error al enviar reporte:", error);
      let mensajeError = "No se pudo enviar el reporte";
      //Manejo de errores detallado para mostrar mensajes específicos dependiendo de la respuesta del backend
      if (error.response?.data) {
        const data = error.response.data;
        if (Array.isArray(data) && data.length > 0 && data[0].msg) {
          mensajeError = data.map((err: any) => err.msg).join(", ");
        } else if (data.detail) {
          mensajeError = data.detail;
        }
      }
      
      mostrarMensaje("Error", mensajeError, "error");
    } finally {
      setEnviandoReporte(false);
    }
  };

  const toggleChatSolicitud = async (solicitudId: number) => {
    // :> Aqui abrimos el chat en modal para que la lista no se haga eterna
    setChatAbiertoId(solicitudId);
    setCargandoChatId(solicitudId);

    try {
      const data = await obtenerMensajesSolicitud(solicitudId);
      setMensajesSolicitud(prev => ({ ...prev, [solicitudId]: data }));
    } catch (error) {
      console.error("Error al cargar mensajes:", error);
      mostrarMensaje("Error", "No se pudo cargar la conversacion", "error");
    } finally {
      setCargandoChatId(null);
    }
  };

  const cerrarChatSolicitud = () => {
    // :> Esto solo cierra el modal y deja cacheada la charla ya cargada
    setChatAbiertoId(null);
    setCargandoChatId(null);
  };

  const enviarMensajeDeSolicitud = async (solicitudId: number) => {
    // :> Esto ya deja hablar con el vendedor dentro de la solicitud
    const texto = (nuevoMensajeSolicitud[solicitudId] || "").trim();
    if (!texto) return;

    try {
      const mensaje = await enviarMensajeSolicitud(solicitudId, texto);
      setMensajesSolicitud(prev => ({
        ...prev,
        [solicitudId]: [...(prev[solicitudId] || []), mensaje]
      }));
      setNuevoMensajeSolicitud(prev => ({ ...prev, [solicitudId]: "" }));
      cargarNotificaciones();
    } catch (error: any) {
      mostrarMensaje("Error", error.response?.data?.detail || "No se pudo enviar el mensaje", "error");
    }
  };

  // FUNCIONES AUXILIARES
  //Construye la URL completa para acceder a una imagen guardada
  const getImagenUrl = (imagenNombre: string | null): string | null => {
    if (!imagenNombre) return null;
    console.log("Generando URL para imagen:", imagenNombre);
    // limpiamos bien la url para que no salgan diagonales dobles
    const base = API_URL.replace(/\/+$/, "");
    const finalUrl = `${base}/uploads/productos/${imagenNombre}`;
    console.log("URL Final construida:", finalUrl);
    return finalUrl;
  };

  //Obtiene el nombre del vendedor de un producto, se utiliza para mostrarlo en
  // las tarjetas de producto y para el filtro de búsqueda
  const getVendedorNombre = (producto: Producto): string => {
    if (producto.vendedor) {
      return producto.vendedor.apodo || producto.vendedor.nombre;
    }
    return "Vendedor"; 
  };

  // Filtrar productos
  const productosFiltrados = productos.filter(producto => {
    //Filtro por categoria
    if (categoriaSeleccionada !== "todos" && producto.categoria !== categoriaSeleccionada) {
      return false;
    }
    //Filtro por busqueda, se busca en el nombre del producto y en el nombre del vendedor para mayor usabilidad
    if (busquedaLocal.trim() !== "") {
      const busqueda = busquedaLocal.toLowerCase().trim();
      const coincideNombre = producto.nombre.toLowerCase().includes(busqueda);
      const coincideVendedor = getVendedorNombre(producto).toLowerCase().includes(busqueda);
      return coincideNombre || coincideVendedor;
    }
    return true;
  });
  //Nombre para mostrar del usuario, se utiliza el apodo si existe o el nombre real 
  //si no hay apodo, esto para una experiencia más personalizada en el dashboard
  const displayName = user.apodo || user.nombre;
  const solicitudChatActual = solicitudesEnviadas.find(solicitud => solicitud.id === chatAbiertoId) || null;

  // RENDERIZADO DEL COMPONENTE
  return (
    <div className="comprador-dashboard">
      
      {/* HERO SECTION muestra mensaje de bienvenida y logo de aplicacion*/}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Bienvenido, {displayName}!
            </h1>
            <p className="hero-description">
              Explora los mejores productos de ToroEats
            </p>
          </div>
          <div className="hero-image">
            <img
              src="/ToroEats-removebg-preview.png"
              alt="ToroEats Logo"
              className="main-logo-image"
              onError={(e) => {
                e.currentTarget.src = "/ToroEats-removebg-preview.png"; 
              }}
            />
          </div>
        </div>
      </div>

      {/* NOTIFICACIONES Y SOLICITUD DE VENDEDOR
      la campana muestra el dropdown de notificaciones
      se indican las notificaciones no leidas
      el boton permite al comprador solicitar ser vendedor */}
      <div className="top-actions">
  <div className="notificaciones-container">
    <button 
      className="campana-btn"
      onClick={() => setShowNotificaciones(!showNotificaciones)}
    >
      {notificacionesNoLeidas > 0 ? (
        <IconoCampanaConPunto className="icono-campana icono-campana-comprador" />
      ) : (
        <IconoCampana className="icono-campana icono-campana-comprador" />
      )}
      {notificacionesNoLeidas > 0 && (
        <span className="campana-badge">{notificacionesNoLeidas}</span>
      )}
    </button>
          
          {showNotificaciones && (
            <div className="notificaciones-dropdown">
              <div className="notificaciones-header">
                <h4>Notificaciones</h4>
                {notificacionesNoLeidas > 0 && (
                  <button className="marcar-todas" onClick={marcarTodasLeidas}>
                    Marcar todas como leidas
                  </button>
                )}
              </div>
              {notificaciones.length === 0 ? (
                <div className="sin-notificaciones">No hay notificaciones</div>
              ) : (
                notificaciones.map(notif => (
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
          )}
        </div>

        <button 
          className="btn-solicitar-vendedor"
          onClick={abrirModalSolicitudVendedor}
          disabled={user.relacion?.rol === "vendedor" || miSolicitudVendedor?.estado === "pendiente"}
        >
          {user.relacion?.rol === "vendedor" ? "Eres vendedor" : 
           miSolicitudVendedor?.estado === "pendiente" ? "Solicitud enviada" : 
           "Quiero ser vendedor"}
        </button>
      </div>

      {/* MIS SOLICITUDES 
      muestra las solicitudes de productos enviadas por el comprador
      se puede colapsar haciendo clic en el encabezado*/}
      <div className="solicitudes-section">
  <div 
    className="section-header clickable" 
    onClick={() => setSolicitudesDesplegado(!solicitudesDesplegado)}
  >
    <h2 className="section-title">Mis Solicitudes</h2>
    <span className={`desplegable-icon ${solicitudesDesplegado ? 'abierto' : ''}`}>
      ▼
    </span>
  </div>
  
  {solicitudesDesplegado && (
    <>
      {solicitudesEnviadas.length === 0 ? (
        <div className="empty-state">No has realizado solicitudes</div>
      ) : (
        <div className="solicitudes-grid">
          {solicitudesEnviadas.map(solicitud => (
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
                <p>Cantidad: {solicitud.cantidad}</p>
                <p>Vendedor: {solicitud.vendedor?.apodo || solicitud.vendedor?.nombre}</p>
                {solicitud.mensaje && <p>Mensaje: "{solicitud.mensaje}"</p>}
              </div>
              <div className="solicitud-actions">
                {solicitud.estado === "aceptado" && (
                  <button 
                    className="btn-entregar"
                    onClick={() => abrirModalEntrega(solicitud)}
                  >
                    Marcar como recibido
                  </button>
                )}
                <button 
                  className="btn-reportar"
                  onClick={() => toggleChatSolicitud(solicitud.id)}
                >
                  Ver mensajes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )}
</div>

      {/* CATEGORIAS 
      solo es visible si hay al menos un producto */}
      {productos.length > 0 && (
        <div className="categorias-section">
          <h2 className="section-title">Categorias</h2>
          <div className="categorias-grid">
            {categorias.map(cat => (
              <button
                key={cat}
                className={`categoria-btn ${categoriaSeleccionada === cat ? "active" : ""}`}
                onClick={() => setCategoriaSeleccionada(cat)}
              >
                {cat === "todos" ? "Todos" : cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PRODUCTOS
      cada tarjeta muestra información de un producto disponible */}
      <div className="productos-section">
        <h2 className="section-title">
          {busquedaLocal 
            ? `Resultados para "${busquedaLocal}"` 
            : (categoriaSeleccionada === "todos" ? "Productos Disponibles" : categoriaSeleccionada)}
        </h2>
        
        {cargando ? (
          <div className="empty-state">Cargando productos...</div>
        ) : productosFiltrados.length === 0 ? (
          <div className="empty-state">
            {busquedaLocal 
              ? `No se encontraron productos que coincidan con "${busquedaLocal}"` 
              : (categoriaSeleccionada === "todos" 
                ? "No hay productos disponibles aun" 
                : `No hay productos en la categoria "${categoriaSeleccionada}"`)}
          </div>
        ) : (
          <div className="productos-grid">
            {productosFiltrados.map(producto => (
              <div key={producto.id} className="producto-card">
                <div className="producto-imagen">
                  {producto.imagen_nombre ? (
                    <img 
                      src={getImagenUrl(producto.imagen_nombre) || ''} 
                      alt={producto.nombre}
                      onError={(e) => {
                        console.error(`Error cargando imagen para el producto: ${producto.nombre}`);
                        console.error(`Path fallido: ${e.currentTarget.src}`);
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="no-image-icon">📷</span>
                  )}
                  <button
                    className={`favorito-btn ${favoritos.has(producto.id) ? "active" : ""}`}
                    onClick={() => handleFavorito(producto.id)}
                    title={favoritos.has(producto.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                  >
                    {favoritos.has(producto.id) ? "❤️" : "🤍"}
                  </button>
                </div>
                <div className="producto-info">
                  <h3>{producto.nombre}</h3>
                  
                  <div className="producto-detalle-linea">
                    <span className="detalle-etiqueta">Contacto:</span>
                    <span className="detalle-valor">{producto.vendedor?.telefono || "No disponible"}</span>
                  </div>
                  
                  <div className="producto-detalle-linea">
                    <span className="detalle-etiqueta">Categoria:</span>
                    <span className="detalle-valor">{producto.categoria}</span>
                  </div>
                  
                  <div className="producto-detalle-linea">
                    <span className="detalle-etiqueta">Vendedor:</span>
                    <span className="detalle-valor vendedor-nombre">{getVendedorNombre(producto)}</span>
                  </div>
                  
                  <div className="producto-descripcion-container">
                    <span className="detalle-etiqueta">Descripcion:</span>
                    <p className="producto-descripcion">{producto.descripcion}</p>
                  </div>
                  
                  <div className="producto-detalles">
                    <div className="producto-precio">
                      <span className="detalle-etiqueta">Precio:</span>
                      <span className="precio-valor">${producto.precio}</span>
                    </div>
                    <div className="producto-stock">
                      <span className="detalle-etiqueta">Stock:</span>
                      <span className="stock-valor">{producto.stock} unidades</span>
                    </div>
                  </div>
                  
                  <div className="producto-acciones-comprador">
                    <button 
                      className="btn-solicitar"
                      onClick={() => abrirModalSolicitud(producto)}
                      disabled={solicitando === producto.id}
                    >
                      {solicitando === producto.id ? "Enviando..." : "Solicitar producto"}
                    </button>
                    
                    <button 
                      className="btn-reportar"
                      onClick={() => abrirModalReporte(producto.vendedor_id, getVendedorNombre(producto))}
                      title="Levantar reporte"
                    >
                      Levantar reporte
                    </button>
                    
                    {mensajeExito[producto.id] && (
                      <span className={`mensaje-tooltip ${mensajeExito[producto.id].includes("Error") ? "error" : "exito"}`}>
                        {mensajeExito[producto.id]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {solicitudChatActual && (
        <div className="modal-overlay" onClick={cerrarChatSolicitud}>
          <div className="modal-content modal-chat-solicitud" onClick={(e) => e.stopPropagation()}>
            <h3>Mensajes de solicitud</h3>
            <div className="chat-solicitud-resumen">
              <p><strong>Producto:</strong> {solicitudChatActual.producto?.nombre}</p>
              <p><strong>Vendedor:</strong> {solicitudChatActual.vendedor?.apodo || solicitudChatActual.vendedor?.nombre}</p>
              <p><strong>Estado:</strong> {solicitudChatActual.estado}</p>
            </div>
            <div className="chat-solicitud-box chat-solicitud-box-modal">
              {/* :> Aqui el comprador sigue la charla en modal y la lista ya no se estira */}
              {cargandoChatId === solicitudChatActual.id ? (
                <p>Cargando mensajes...</p>
              ) : (
                <>
                  <div className="chat-solicitud-lista">
                    {(mensajesSolicitud[solicitudChatActual.id] || []).length === 0 ? (
                      <p>Arranca la charla si ocupas algo del vendedor</p>
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
                      placeholder="Escribe algo para el vendedor"
                      rows={3}
                    />
                    <button className="btn-enviar-modal" onClick={() => enviarMensajeDeSolicitud(solicitudChatActual.id)}>
                      Enviar mensaje
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-cancelar" onClick={cerrarChatSolicitud}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SOLICITUD DE PRODUCTO */}
      {modalAbierto && productoSeleccionado && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-solicitud" onClick={(e) => e.stopPropagation()}>
            <div className="modal-solicitud-header">
              <h3>Solicitar producto</h3>
              <button className="modal-close" onClick={cerrarModal}>×</button>
            </div>
            <div className="modal-solicitud-body">
              <p className="producto-nombre">{productoSeleccionado.nombre}</p>
              <p className="producto-vendedor">Vendedor: {getVendedorNombre(productoSeleccionado)}</p>
              
              <div className="form-group">
                <label>Cantidad</label>
                <input 
                  type="number" 
                  min="1" 
                  value={cantidadSolicitud}
                  onChange={(e) => setCantidadSolicitud(parseInt(e.target.value) || 1)}
                  className="cantidad-input"
                />
              </div>
              
              <div className="form-group">
                <label>Mensaje (opcional)</label>
                <textarea 
                  value={mensajeSolicitud}
                  onChange={(e) => setMensajeSolicitud(e.target.value)}
                  placeholder="Escribe un mensaje para el vendedor..."
                  className="mensaje-input"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-solicitud-footer">
              <button className="btn-cancelar-modal" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-enviar-modal" onClick={enviarSolicitud}>Enviar solicitud</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACION DE ENTREGA */}
      {modalEntregaAbierto && solicitudEntregando && (
        <div className="modal-overlay" onClick={cerrarModalEntrega}>
          <div className="modal-entrega" onClick={(e) => e.stopPropagation()}>
            <div className="modal-solicitud-header">
              <h3>Confirmar recepcion</h3>
              <button className="modal-close" onClick={cerrarModalEntrega} disabled={confirmandoEntrega}>×</button>
            </div>
            <div className="modal-solicitud-body modal-entrega-body">
              <p className="producto-nombre">{solicitudEntregando.producto?.nombre}</p>
              <p className="producto-vendedor">
                Vendedor: {solicitudEntregando.vendedor?.apodo || solicitudEntregando.vendedor?.nombre || "No disponible"}
              </p>
              <div className="modal-entrega-resumen">
                <p><strong>Cantidad:</strong> {solicitudEntregando.cantidad}</p>
                <p><strong>Estado actual:</strong> {solicitudEntregando.estado}</p>
              </div>
              <p className="modal-entrega-texto">
                Confirma esta accion solo si ya recibiste el producto. Esto registrara la entrega en tu solicitud.
              </p>
            </div>
            <div className="modal-solicitud-footer">
              <button className="btn-cancelar-modal" onClick={cerrarModalEntrega} disabled={confirmandoEntrega}>Cancelar</button>
              <button className="btn-enviar-modal" onClick={() => handleMarcarEntregado(solicitudEntregando.id)} disabled={confirmandoEntrega}>
                {confirmandoEntrega ? "Confirmando..." : "Confirmar que lo recibi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SOLICITUD PARA SER VENDEDOR */}
      {modalSolicitudVendedorAbierto && (
        <div className="modal-overlay" onClick={() => setModalSolicitudVendedorAbierto(false)}>
          <div className="modal-solicitud-vendedor" onClick={(e) => e.stopPropagation()}>
            <div className="modal-solicitud-header">
              <h3>Solicitar ser vendedor</h3>
              <button className="modal-close" onClick={() => setModalSolicitudVendedorAbierto(false)}>×</button>
            </div>
            <div className="modal-solicitud-body">
              <p>Cuentanos por que quieres convertirte en vendedor:</p>
              <textarea 
                value={motivoSolicitudVendedor}
                onChange={(e) => setMotivoSolicitudVendedor(e.target.value)}
                placeholder="Ej: Me gustaria vender mis productos caseros en la plataforma..."
                rows={5}
                className="motivo-input"
              />
            </div>
            <div className="modal-solicitud-footer">
              <button 
                className="btn-cancelar-modal" 
                onClick={() => setModalSolicitudVendedorAbierto(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn-enviar-modal" 
                onClick={enviarSolicitudVendedor}
                disabled={enviandoSolicitudVendedor}
              >
                {enviandoSolicitudVendedor ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REPORTE DE VENDEDOR */}
      {modalReporteAbierto && vendedorReportado && (
        <div className="modal-overlay" onClick={() => setModalReporteAbierto(false)}>
          <div className="modal-reporte" onClick={(e) => e.stopPropagation()}>
            <div className="modal-reporte-header">
              <h3>Reportar vendedor</h3>
              <button className="modal-close" onClick={() => setModalReporteAbierto(false)}>×</button>
            </div>
            <div className="modal-reporte-body">
              <p>Estás reportando a: <strong>{vendedorReportado.nombre}</strong></p>
              <p>Por favor, describe el motivo del reporte:</p>
              <textarea 
                value={motivoReporte}
                onChange={(e) => setMotivoReporte(e.target.value)}
                placeholder="Ej: Producto en mal estado, no entregó el producto, comportamiento inapropiado, etc."
                rows={5}
                className="reporte-input"
              />
              <small className="reporte-nota">
                * Tu reporte será revisado por un administrador.
              </small>
            </div>
            <div className="modal-reporte-footer">
              <button 
                className="btn-cancelar-modal" 
                onClick={() => setModalReporteAbierto(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn-enviar-modal" 
                onClick={enviarReporte}
                disabled={enviandoReporte}
              >
                {enviandoReporte ? "Enviando..." : "Enviar reporte"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE MENSAJES */}
      {modalMensaje.isOpen && (
        <div className="modal-mensaje-overlay" onClick={() => setModalMensaje({ ...modalMensaje, isOpen: false })}>
          <div className="modal-mensaje-content" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-mensaje-icon ${modalMensaje.tipo}`}>
              {modalMensaje.tipo === "success" ? "✓" : 
               modalMensaje.tipo === "error" ? "✗" : 
               modalMensaje.tipo === "warning" ? "⚠" : "ℹ"}
            </div>
            <h3>{modalMensaje.titulo}</h3>
            <p>{modalMensaje.mensaje}</p>
            <button className="modal-mensaje-btn" onClick={() => setModalMensaje({ ...modalMensaje, isOpen: false })}>
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompradorDashboard;
