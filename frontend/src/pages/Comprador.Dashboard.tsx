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
  prepararMensajeCifrado,
  crearReporteVendedor,
  type SolicitudProducto,
  type Notificacion,
  type SolicitudVendedor
} from "../services/products";
import { type Usuario } from "../services/users";
import { IconoCampanaConPunto, IconoCampana, IconoCheck, IconoX } from "../components/Iconos";
import "./Dashboard.css";

const API_URL = import.meta.env.VITE_API_URL;

// ============================================================================
// INTERFAZ DE PROPS
// ============================================================================

interface CompradorDashboardProps {
  user: Usuario;
  terminoBusqueda?: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const CompradorDashboard: React.FC<CompradorDashboardProps> = ({ user, terminoBusqueda = "" }) => {
  
  // ==========================================================================
  // ESTADOS DE PRODUCTOS Y BUSQUEDA
  // ==========================================================================
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [favoritos, setFavoritos] = useState<Set<number>>(new Set());
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("todos");
  const [categorias, setCategorias] = useState<string[]>(["todos"]);
  const [busquedaLocal, setBusquedaLocal] = useState<string>(terminoBusqueda);
  const [solicitando, setSolicitando] = useState<number | null>(null);
  const [mensajeExito, setMensajeExito] = useState<{ [key: number]: string }>({});
  
  // ==========================================================================
  // ESTADOS DE NOTIFICACIONES Y SOLICITUDES
  // ==========================================================================
  const [showNotificaciones, setShowNotificaciones] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);
  const [solicitudesEnviadas, setSolicitudesEnviadas] = useState<SolicitudProducto[]>([]);
  const [miSolicitudVendedor, setMiSolicitudVendedor] = useState<SolicitudVendedor | null>(null);
  
  // ==========================================================================
  // ESTADOS DE MODALES
  // ==========================================================================
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidadSolicitud, setCantidadSolicitud] = useState(1);
  const [mensajeSolicitud, setMensajeSolicitud] = useState("");
  
  const [modalEntregaAbierto, setModalEntregaAbierto] = useState(false);
  const [solicitudEntregando, setSolicitudEntregando] = useState<SolicitudProducto | null>(null);
  
  const [modalSolicitudVendedorAbierto, setModalSolicitudVendedorAbierto] = useState(false);
  const [motivoSolicitudVendedor, setMotivoSolicitudVendedor] = useState("");
  const [enviandoSolicitudVendedor, setEnviandoSolicitudVendedor] = useState(false);
  
  // Estados para reportes
  const [modalReporteAbierto, setModalReporteAbierto] = useState(false);
  const [vendedorReportado, setVendedorReportado] = useState<{ id: number; nombre: string } | null>(null);
  const [motivoReporte, setMotivoReporte] = useState("");
  const [enviandoReporte, setEnviandoReporte] = useState(false);

  //Estados interfaz 
  const [solicitudesDesplegado, setSolicitudesDesplegado] = useState(true);
  
  // ==========================================================================
  // ESTADO PARA MODAL DE MENSAJES (reemplaza alert)
  // ==========================================================================
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

  // ==========================================================================
  // FUNCION PARA MOSTRAR MENSAJES (reemplaza alert)
  // ==========================================================================
  const mostrarMensaje = (titulo: string, mensaje: string, tipo: "info" | "success" | "error" | "warning" = "info") => {
    setModalMensaje({ isOpen: true, titulo, mensaje, tipo });
  };

  // ==========================================================================
  // EFECTOS INICIALES
  // ==========================================================================

  useEffect(() => {
    setBusquedaLocal(terminoBusqueda);
  }, [terminoBusqueda]);

  // ==========================================================================
  // FUNCIONES DE CARGA DE DATOS
  // ==========================================================================

  const cargarProductos = async () => {
    try {
      setCargando(true);
      const data = await listarTodosProductos();
      setProductos(data);
      const categoriasUnicas = ["todos", ...new Set(data.map(p => p.categoria).filter(Boolean))];
      setCategorias(categoriasUnicas);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      mostrarMensaje("Error", "No se pudieron cargar los productos", "error");
    } finally {
      setCargando(false);
    }
  };

  const cargarFavoritos = async () => {
    try {
      const favoritosData = await obtenerFavoritos();
      const favoritosSet = new Set(favoritosData.map((f: any) => f.producto_id));
      setFavoritos(favoritosSet);
    } catch (error) {
      console.error("Error al cargar favoritos:", error);
    }
  };

  const cargarNotificaciones = async () => {
    try {
      const data = await obtenerNotificaciones();
      setNotificaciones(data);
      const noLeidas = data.filter(n => !n.leida).length;
      setNotificacionesNoLeidas(noLeidas);
    } catch (error) {
      console.error("Error al cargar notificaciones:", error);
    }
  };

  const cargarSolicitudesEnviadas = async () => {
    try {
      const data = await obtenerSolicitudesEnviadas();
      setSolicitudesEnviadas(data);
    } catch (error) {
      console.error("Error al cargar solicitudes:", error);
    }
  };

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
  }, []);

  // ==========================================================================
  // FUNCIONES DE FAVORITOS
  // ==========================================================================

  const handleFavorito = async (productoId: number) => {
    try {
      if (favoritos.has(productoId)) {
        await quitarFavorito(productoId);
        setFavoritos(prev => {
          const nuevo = new Set(prev);
          nuevo.delete(productoId);
          return nuevo;
        });
        setMensajeExito(prev => ({ ...prev, [productoId]: "Eliminado de favoritos" }));
      } else {
        await agregarFavorito(productoId);
        setFavoritos(prev => new Set(prev).add(productoId));
        setMensajeExito(prev => ({ ...prev, [productoId]: "Agregado a favoritos" }));
      }
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

  // ==========================================================================
  // FUNCIONES DE NOTIFICACIONES
  // ==========================================================================

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

  const marcarTodasLeidas = async () => {
    try {
      await marcarTodasNotificacionesLeidas();
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
      setNotificacionesNoLeidas(0);
    } catch (error) {
      console.error("Error al marcar todas:", error);
    }
  };

  // ==========================================================================
  // FUNCIONES DE SOLICITUD DE PRODUCTO
  // ==========================================================================

  const abrirModalSolicitud = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setCantidadSolicitud(1);
    setMensajeSolicitud("");
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setProductoSeleccionado(null);
    setCantidadSolicitud(1);
    setMensajeSolicitud("");
  };

  const enviarSolicitud = async () => {
    if (!productoSeleccionado) return;
    
    if (cantidadSolicitud <= 0) {
      mostrarMensaje("Error", "La cantidad debe ser mayor a 0", "error");
      return;
    }
    
    setSolicitando(productoSeleccionado.id);
    
    try {
      const mensajeCifrado = mensajeSolicitud ? prepararMensajeCifrado(mensajeSolicitud) : null;
      
      await crearSolicitudProducto({
        producto_id: productoSeleccionado.id,
        vendedor_id: productoSeleccionado.vendedor_id,
        cantidad: cantidadSolicitud,
        mensaje: mensajeCifrado ? mensajeCifrado.textoOriginal : "",
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
      cargarSolicitudesEnviadas();
      cargarNotificaciones();
      
    } catch (error: any) {
      console.error("Error al enviar solicitud:", error);
      mostrarMensaje("Error", error.response?.data?.detail || "Error al enviar la solicitud", "error");
    } finally {
      setSolicitando(null);
    }
  };

  // ==========================================================================
  // FUNCIONES DE ENTREGA DE PRODUCTO
  // ==========================================================================

  const handleMarcarEntregado = async (solicitudId: number) => {
    try {
      await marcarSolicitudComoEntregada(solicitudId);
      mostrarMensaje("Exito", "Producto marcado como entregado", "success");
      cargarSolicitudesEnviadas();
      cargarNotificaciones();
      setModalEntregaAbierto(false);
    } catch (error: any) {
      mostrarMensaje("Error", error.response?.data?.detail || "Error al marcar como entregado", "error");
    }
  };

  const abrirModalEntrega = (solicitud: SolicitudProducto) => {
    setSolicitudEntregando(solicitud);
    setModalEntregaAbierto(true);
  };

  // ==========================================================================
  // FUNCIONES DE SOLICITUD PARA SER VENDEDOR
  // ==========================================================================

  const abrirModalSolicitudVendedor = () => {
    if (miSolicitudVendedor?.estado === "pendiente") {
      mostrarMensaje("Info", "Ya tienes una solicitud pendiente. Espera la respuesta del administrador.", "info");
      return;
    }
    if (user.relacion?.rol === "vendedor") {
      mostrarMensaje("Info", "Ya eres vendedor", "info");
      return;
    }
    setMotivoSolicitudVendedor("");
    setModalSolicitudVendedorAbierto(true);
  };

  const enviarSolicitudVendedor = async () => {
    if (!motivoSolicitudVendedor.trim()) {
      mostrarMensaje("Error", "Por favor, escribe un motivo para tu solicitud", "error");
      return;
    }
    
    setEnviandoSolicitudVendedor(true);
    
    try {
      const motivoCifrado = prepararMensajeCifrado(motivoSolicitudVendedor);
      
      await crearSolicitudVendedor({ 
        motivo: motivoCifrado.textoOriginal,
      });
      
      mostrarMensaje("Exito", "Solicitud enviada correctamente. Recibirás una notificacion cuando sea procesada.", "success");
      setModalSolicitudVendedorAbierto(false);
      cargarMiSolicitudVendedor();
      cargarNotificaciones();
    } catch (error: any) {
      mostrarMensaje("Error", error.response?.data?.detail || "Error al enviar solicitud", "error");
    } finally {
      setEnviandoSolicitudVendedor(false);
    }
  };

  // ==========================================================================
  // FUNCIONES DE REPORTE DE VENDEDOR
  // ==========================================================================

  const abrirModalReporte = (vendedorId: number, vendedorNombre: string) => {
    setVendedorReportado({ id: vendedorId, nombre: vendedorNombre });
    setMotivoReporte("");
    setModalReporteAbierto(true);
  };

  const enviarReporte = async () => {
    if (!vendedorReportado) return;
    
    if (!motivoReporte.trim()) {
      mostrarMensaje("Error", "Por favor, describe el motivo del reporte", "error");
      return;
    }
    
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

  // ==========================================================================
  // FUNCIONES AUXILIARES
  // ==========================================================================

  const getImagenUrl = (imagenNombre: string | null): string | null => {
    if (!imagenNombre) return null;
    return `${API_URL}/uploads/productos/${imagenNombre}`;
  };

  const getVendedorNombre = (producto: Producto): string => {
    if (producto.vendedor) {
      return producto.vendedor.apodo || producto.vendedor.nombre;
    }
    return "Vendedor";
  };

  // Filtrar productos
  const productosFiltrados = productos.filter(producto => {
    if (categoriaSeleccionada !== "todos" && producto.categoria !== categoriaSeleccionada) {
      return false;
    }
    if (busquedaLocal.trim() !== "") {
      const busqueda = busquedaLocal.toLowerCase().trim();
      const coincideNombre = producto.nombre.toLowerCase().includes(busqueda);
      const coincideVendedor = getVendedorNombre(producto).toLowerCase().includes(busqueda);
      return coincideNombre || coincideVendedor;
    }
    return true;
  });

  const displayName = user.apodo || user.nombre;

  // ==========================================================================
  // RENDERIZADO DEL COMPONENTE
  // ==========================================================================

  return (
    <div className="comprador-dashboard">
      
      {/* HERO SECTION */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">Bienvenido, {displayName}!</h1>
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

      {/* NOTIFICACIONES Y SOLICITUD DE VENDEDOR */}
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

      {/* MIS SOLICITUDES */}
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
                    Marcar como entregado
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )}
</div>

      {/* CATEGORIAS */}
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

      {/* PRODUCTOS */}
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
                      title="Reportar vendedor"
                    >
                      Reportar
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
        <div className="modal-overlay" onClick={() => setModalEntregaAbierto(false)}>
          <div className="modal-calificacion" onClick={(e) => e.stopPropagation()}>
            <div className="modal-calificacion-header">
              <h3>Confirmar entrega</h3>
              <button className="modal-close" onClick={() => setModalEntregaAbierto(false)}>×</button>
            </div>
            <div className="modal-calificacion-body">
              <p className="producto-nombre">{solicitudEntregando.producto?.nombre}</p>
              <p>Confirmas que recibiste este producto?</p>
            </div>
            <div className="modal-calificacion-footer">
              <button className="btn-cancelar-modal" onClick={() => setModalEntregaAbierto(false)}>Cancelar</button>
              <button className="btn-enviar-modal" onClick={() => handleMarcarEntregado(solicitudEntregando.id)}>Confirmar entrega</button>
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