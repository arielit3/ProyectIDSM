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
  type SolicitudProducto,
  type Notificacion
} from "../services/products";
import { type Usuario } from "../services/users";
import { IconoCampanaConPunto, IconoCampana, IconoCheck, IconoX } from "../components/Iconos";
import "./Dashboard.css";

const API_URL = import.meta.env.VITE_API_URL;

interface CompradorDashboardProps {
  user: Usuario;
  terminoBusqueda?: string;
}

const CompradorDashboard: React.FC<CompradorDashboardProps> = ({ user, terminoBusqueda = "" }) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [favoritos, setFavoritos] = useState<Set<number>>(new Set());
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("todos");
  const [categorias, setCategorias] = useState<string[]>(["todos"]);
  const [busquedaLocal, setBusquedaLocal] = useState<string>(terminoBusqueda);
  const [solicitando, setSolicitando] = useState<number | null>(null);
  const [mensajeExito, setMensajeExito] = useState<{ [key: number]: string }>({});
  
  const [showNotificaciones, setShowNotificaciones] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);
  const [solicitudesEnviadas, setSolicitudesEnviadas] = useState<SolicitudProducto[]>([]);
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidadSolicitud, setCantidadSolicitud] = useState(1);
  const [mensajeSolicitud, setMensajeSolicitud] = useState("");
  
  const [modalEntregaAbierto, setModalEntregaAbierto] = useState(false);
  const [solicitudEntregando, setSolicitudEntregando] = useState<SolicitudProducto | null>(null);

  useEffect(() => {
    setBusquedaLocal(terminoBusqueda);
  }, [terminoBusqueda]);

  const cargarProductos = async () => {
    try {
      setCargando(true);
      const data = await listarTodosProductos();
      setProductos(data);
      const categoriasUnicas = ["todos", ...new Set(data.map(p => p.categoria).filter(Boolean))];
      setCategorias(categoriasUnicas);
    } catch (error) {
      console.error("Error al cargar productos:", error);
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

  useEffect(() => {
    cargarProductos();
    cargarFavoritos();
    cargarNotificaciones();
    cargarSolicitudesEnviadas();
  }, []);

  const handleFavorito = async (productoId: number) => {
    try {
      if (favoritos.has(productoId)) {
        await quitarFavorito(productoId);
        setFavoritos(prev => {
          const nuevo = new Set(prev);
          nuevo.delete(productoId);
          return nuevo;
        });
        setMensajeExito(prev => ({ ...prev, [productoId]: "❤️ Eliminado de favoritos" }));
      } else {
        await agregarFavorito(productoId);
        setFavoritos(prev => new Set(prev).add(productoId));
        setMensajeExito(prev => ({ ...prev, [productoId]: "💖 Agregado a favoritos" }));
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
      alert("La cantidad debe ser mayor a 0");
      return;
    }
    
    setSolicitando(productoSeleccionado.id);
    
    try {
      await crearSolicitudProducto({
        producto_id: productoSeleccionado.id,
        vendedor_id: productoSeleccionado.vendedor_id,
        cantidad: cantidadSolicitud,
        mensaje: mensajeSolicitud
      });
      
      setMensajeExito(prev => ({ ...prev, [productoSeleccionado.id]: "✅ Solicitud enviada" }));
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
      setMensajeExito(prev => ({ ...prev, [productoSeleccionado.id]: "❌ Error al enviar" }));
      setTimeout(() => {
        setMensajeExito(prev => {
          const nuevo = { ...prev };
          delete nuevo[productoSeleccionado.id];
          return nuevo;
        });
      }, 3000);
    } finally {
      setSolicitando(null);
    }
  };

  const handleMarcarEntregado = async (solicitudId: number) => {
    try {
      await marcarSolicitudComoEntregada(solicitudId);
      alert("✅ Producto marcado como entregado");
      cargarSolicitudesEnviadas();
      cargarNotificaciones();
      setModalEntregaAbierto(false);
    } catch (error: any) {
      alert(error.response?.data?.detail || "Error al marcar como entregado");
    }
  };

  const abrirModalEntrega = (solicitud: SolicitudProducto) => {
    setSolicitudEntregando(solicitud);
    setModalEntregaAbierto(true);
  };

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

  return (
    <div className="comprador-dashboard">
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">¡Bienvenido, {displayName}!</h1>
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

      {/* Notificaciones del Comprador */}
      <div className="notificaciones-container">
        <button 
          className="campana-btn"
          onClick={() => setShowNotificaciones(!showNotificaciones)}
        >
          {notificacionesNoLeidas > 0 ? (
            <IconoCampanaConPunto className="icono-campana" />
          ) : (
            <IconoCampana className="icono-campana" />
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

      {/* Mis Solicitudes */}
      <div className="solicitudes-section">
        <h2 className="section-title">Mis Solicitudes</h2>
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
      </div>

      {/* Categorias */}
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

      {/* Productos */}
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

      <div className="sellers-section">
        <h2 className="section-title">Vendedores Destacados</h2>
        <div className="empty-state">
          <p>Proximamente</p>
        </div>
      </div>

      {/* Modal de Solicitud */}
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

      {/* Modal de Confirmar Entrega */}
      {modalEntregaAbierto && solicitudEntregando && (
        <div className="modal-overlay" onClick={() => setModalEntregaAbierto(false)}>
          <div className="modal-calificacion" onClick={(e) => e.stopPropagation()}>
            <div className="modal-calificacion-header">
              <h3>Confirmar entrega</h3>
              <button className="modal-close" onClick={() => setModalEntregaAbierto(false)}>×</button>
            </div>
            <div className="modal-calificacion-body">
              <p className="producto-nombre">{solicitudEntregando.producto?.nombre}</p>
              <p>¿Confirmas que recibiste este producto?</p>
            </div>
            <div className="modal-calificacion-footer">
              <button className="btn-cancelar-modal" onClick={() => setModalEntregaAbierto(false)}>Cancelar</button>
              <button className="btn-enviar-modal" onClick={() => handleMarcarEntregado(solicitudEntregando.id)}>Confirmar entrega</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompradorDashboard;