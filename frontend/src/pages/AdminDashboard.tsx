import React, { useState, useEffect, useCallback } from "react";
import { type Usuario } from "../services/users";
import { 
  obtenerSolicitudesVendedor, 
  procesarSolicitudVendedor,
  obtenerTodosReportes,
  actualizarReporte,
  sancionarUsuarioDesdeReporte,
  obtenerSanciones,
  levantarSancion,
  type SolicitudVendedor,
  type ReporteVendedor,
  type SancionUsuario
} from "../services/products";
import { IconoCheck, IconoX } from "../components/Iconos";
import "./Dashboard.css";

// INTERFAZ DE PROPS
interface AdminDashboardProps {
  user: Usuario; //Datos del administrador autenticado
  usuarios: Usuario[]; //Lista de todos los usuarios del sistema
  onListarUsuarios: () => void; //funcion para recargar la lista de usuarios
}

// COMPONENTE PRINCIPAL
const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  user, 
  usuarios, 
  onListarUsuarios 
}) => {
  
  // ESTADOS DEL COMPONENTE
  const [solicitudesVendedor, setSolicitudesVendedor] = useState<SolicitudVendedor[]>([]); //lista de solicitudes de usuarios que quieren ser vendedores
  const [reportes, setReportes] = useState<ReporteVendedor[]>([]); //Lista de reportes contra vendedores
  const [sanciones, setSanciones] = useState<SancionUsuario[]>([]); //Lista de sanciones para gestionarlas desde el panel
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false); //EStados de carga para mostrar indicadores de carga
  const [cargandoReportes, setCargandoReportes] = useState(false);
  const [cargandoSanciones, setCargandoSanciones] = useState(false);
  const [solicitudesPendientesResumen, setSolicitudesPendientesResumen] = useState(0);
  const [reportesPendientesResumen, setReportesPendientesResumen] = useState(0);
  const [sancionesActivasResumen, setSancionesActivasResumen] = useState(0);
  const [tabActiva, setTabActiva] = useState<string>("usuarios"); //Pestaña activa del dashboard, puede ser usuarios, solicitudes o reportes
  const [filtroReporte, setFiltroReporte] = useState<string>("todos"); //Filtro de los reportes, puede ser todos, pendientes, resueltos o rechazados
  const [filtroSancion, setFiltroSancion] = useState<string>("activas");

  // ESTADOS PARA MODALES
  //Modal de respuesta a solicitudes de vendedor
  const [modalRespuestaAbierto, setModalRespuestaAbierto] = useState(false);
  const [solicitudActual, setSolicitudActual] = useState<{id: number, accion: string, nombre: string} | null>(null);
  const [respuestaAdmin, setRespuestaAdmin] = useState("");
  //Modal para revisar un reporte contra un vendedor
  const [modalReporteAbierto, setModalReporteAbierto] = useState(false);
  const [reporteActual, setReporteActual] = useState<ReporteVendedor | null>(null);
  const [respuestaReporte, setRespuestaReporte] = useState("");
  const [tipoSancion, setTipoSancion] = useState("advertencia");
  const [motivoSancion, setMotivoSancion] = useState("");
  const [modalLevantarSancionAbierto, setModalLevantarSancionAbierto] = useState(false);
  const [sancionActual, setSancionActual] = useState<SancionUsuario | null>(null);
  const [motivoLevantarSancion, setMotivoLevantarSancion] = useState("");
  
  // Modal de mensajes
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

  // FUNCIONES DE MODALES
  //Muestra un mensaje en un modal, se puede usar para mostrar errores o confirmaciones al admin
  const mostrarMensaje = (titulo: string, mensaje: string, tipo: "info" | "success" | "error" | "warning" = "info") => {
    setModalMensaje({ isOpen: true, titulo, mensaje, tipo });
  };

  const abrirModalRespuesta = (solicitudId: number, accion: string, nombreUsuario: string) => {
    setSolicitudActual({ id: solicitudId, accion, nombre: nombreUsuario });
    setRespuestaAdmin("");
    setModalRespuestaAbierto(true);
  };
  //Envia la respuesta del admin para aprobar o rechazar la solicitud de vendedor
  const enviarRespuesta = async () => {
    if (!solicitudActual) return;
    if (respuestaAdmin.trim() === "") {
      mostrarMensaje("Error", "Debes escribir una respuesta", "error");
      return;
    }
    
    try {
      await procesarSolicitudVendedor(
        solicitudActual.id, 
        solicitudActual.accion, 
        respuestaAdmin
      );
      
      mostrarMensaje("Exito", `Solicitud ${solicitudActual.accion === "aprobado" ? "aprobada" : "rechazada"} correctamente`, "success");
      await cargarSolicitudesVendedor(); //recargar la lista
      await cargarResumenPanel();
      onListarUsuarios(); //actualiza la lista de usuarios para reflejar los cambios de rol
      setModalRespuestaAbierto(false);
      setSolicitudActual(null);
    } catch (error: any) {
      mostrarMensaje("Error", error.response?.data?.detail || "Error al procesar solicitud", "error");
    }
  };

  // Funciones para reportes
  const abrirModalReporte = (reporte: ReporteVendedor) => {
    // :> Aqui dejamos listo el modal para revisar y sancionar sin estar limpiando mano cada rato
    setReporteActual(reporte);
    setRespuestaReporte("");
    setTipoSancion("advertencia");
    setMotivoSancion("");
    setModalReporteAbierto(true);
  };
  //Procesa un reporte marcandolo como resuelto o rechazado
  const procesarReporte = async (nuevoEstado: string) => {
    if (!reporteActual) return;
    
    try {
      await actualizarReporte(reporteActual.id, nuevoEstado, respuestaReporte || undefined);
      
      mostrarMensaje(
        "Reporte actualizado", 
        `El reporte ha sido marcado como ${nuevoEstado === "resuelto" ? "resuelto" : "rechazado"}`,
        "success"
      );
      
      await cargarReportes(); //Recarga la lista de reportes
      await cargarResumenPanel();
      setModalReporteAbierto(false);
      setReporteActual(null);
      setRespuestaReporte("");
    } catch (error: any) {
      mostrarMensaje("Error", error.message || "Error al procesar reporte", "error");
    }
  };

  const aplicarSancion = async () => {
    // :> Esto ya baja una sancion formal desde el mismo modal del reporte
    if (!reporteActual) return;
    if (!motivoSancion.trim()) {
      mostrarMensaje("Error", "Escribe el mensaje o motivo de la sancion", "error");
      return;
    }

    try {
      await sancionarUsuarioDesdeReporte(reporteActual.id, tipoSancion, motivoSancion);
      mostrarMensaje(
        "Sancion aplicada",
        tipoSancion === "advertencia"
          ? "La advertencia se guardo y el vendedor sigue pudiendo entrar"
          : "La cuenta quedo bloqueada y ya no podra iniciar sesion",
        "success"
      );
      setMotivoSancion("");
      onListarUsuarios();
      await cargarSanciones();
      await cargarReportes();
      await cargarResumenPanel();
    } catch (error: any) {
      mostrarMensaje("Error", error.response?.data?.detail || "No se pudo aplicar la sancion", "error");
    }
  };

  const abrirModalLevantarSancion = (sancion: SancionUsuario) => {
    // :> Aqui dejamos elegida la sancion para levantarla sin perder el contexto
    setSancionActual(sancion);
    setMotivoLevantarSancion("");
    setModalLevantarSancionAbierto(true);
  };

  const confirmarLevantarSancion = async () => {
    // :> Esto levanta la sancion y refresca panel y usuarios para que se vea el cambio luego luego
    if (!sancionActual) return;

    try {
      await levantarSancion(sancionActual.id, motivoLevantarSancion);
      mostrarMensaje("Sancion levantada", "El usuario ya puede volver a quedar habilitado", "success");
      setModalLevantarSancionAbierto(false);
      setSancionActual(null);
      setMotivoLevantarSancion("");
      onListarUsuarios();
      await cargarSanciones();
      await cargarResumenPanel();
    } catch (error: any) {
      mostrarMensaje("Error", error.response?.data?.detail || "No se pudo levantar la sancion", "error");
    }
  };

  // FUNCIONES DE CARGA DE DATOS
  //Carga todas las solicitudes de usuarios que quieren ser vendedores, 
  //se llama al montar el componente y cada vez que se aprueba o rechaza una solicitud para mantener la lista actualizada
  const cargarSolicitudesVendedor = useCallback(async () => {
    try {
      setCargandoSolicitudes(true);
      const data = await obtenerSolicitudesVendedor();
      setSolicitudesVendedor(data);
    } catch (error) {
      console.error("Error al cargar solicitudes de vendedor:", error);
      mostrarMensaje("Error", "No se pudieron cargar las solicitudes", "error");
    } finally {
      setCargandoSolicitudes(false);
    }
  }, []);
  //Carga todos los reportes contra vendedores, se puede filtrar por estado
  //se llama al montar el componente y cada vez que se procesa un reporte para mantener la lista actualizada
  const cargarReportes = useCallback(async () => {
    try {
      setCargandoReportes(true); //Si el filtro es diferente a "todos" se carga solo los reportes con ese estado, si es "todos" se cargan todos los reportes sin filtrar por estado
      const filtroEstado = filtroReporte === "todos" ? undefined : filtroReporte;
      const data = await obtenerTodosReportes(filtroEstado);
      setReportes(data);
    } catch (error) {
      console.error("Error al cargar reportes:", error);
      mostrarMensaje("Error", "No se pudieron cargar los reportes", "error");
    } finally {
      setCargandoReportes(false);
    }
  }, [filtroReporte]);

  const cargarSanciones = useCallback(async () => {
    try {
      setCargandoSanciones(true);
      const data = await obtenerSanciones({
        activas: filtroSancion === "activas" ? true : undefined,
      });
      setSanciones(data);
    } catch (error) {
      console.error("Error al cargar sanciones:", error);
      mostrarMensaje("Error", "No se pudieron cargar las sanciones", "error");
    } finally {
      setCargandoSanciones(false);
    }
  }, [filtroSancion]);

  const cargarResumenPanel = useCallback(async () => {
    // :> Esto trae los numeros del panel apenas abre para que los badges salgan desde el inicio
    try {
      const [solicitudesData, reportesData, sancionesData] = await Promise.all([
        obtenerSolicitudesVendedor(),
        obtenerTodosReportes("pendiente"),
        obtenerSanciones({ activas: true }),
      ]);

      setSolicitudesPendientesResumen(
        solicitudesData.filter((solicitud) => solicitud.estado === "pendiente").length
      );
      setReportesPendientesResumen(reportesData.length);
      setSancionesActivasResumen(sancionesData.length);
    } catch (error) {
      console.error("Error al cargar resumen del panel admin:", error);
    }
  }, []);

  // Cargar datos al montar el componente 
  useEffect(() => {
    onListarUsuarios();
    cargarResumenPanel();
  }, [onListarUsuarios, cargarResumenPanel]);

  useEffect(() => {
    if (tabActiva === "solicitudes") {
      cargarSolicitudesVendedor();
    } else if (tabActiva === "reportes") {
      cargarReportes();
    } else if (tabActiva === "sanciones") {
      cargarSanciones();
    } else if (tabActiva === "usuarios") {
      onListarUsuarios();
    }
  }, [tabActiva, cargarSolicitudesVendedor, cargarReportes, cargarSanciones, onListarUsuarios]);

  // CALCULOS PARA ESTADISTICAS
  const totalUsuarios = usuarios.length; 
  const totalVendedores = usuarios.filter(u => u.relacion?.rol === "vendedor").length;
  const totalClientes = usuarios.filter(u => u.relacion?.rol === "cliente").length;
  const solicitudesPendientes = solicitudesPendientesResumen;
  const reportesPendientes = reportesPendientesResumen;
  const sancionesActivas = sancionesActivasResumen;
  //Convierte el codigo de rol a un nombre legible para mostrar en la tabla de usuarios
  const getRolNombre = (rol: string | undefined) => {
    if (rol === "administrador") return "Administrador";
    if (rol === "vendedor") return "Vendedor";
    if (rol === "cliente") return "Cliente";
    return "Sin rol";
  };

  const getEstadoNombre = (estado?: number) => {
    return estado === 0 ? "Inactivo" : "Activo";
  };

  // RENDERIZADO DEL COMPONENTE
  return (
    <div className="admin-dashboard">
      
      {/* HEADER DEL ADMINISTRADOR 
      muestra estadisticas claves del sistema*/}
      <div className="admin-header">
        <div className="admin-welcome">
          <h1>Panel de Administrador</h1>
          <p className="admin-subtitle">Bienvenido, {user.apodo || user.nombre}</p>
        </div>
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-info">
              <h3>{totalUsuarios}</h3>
              <p>Usuarios totales</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{totalVendedores}</h3>
              <p>Vendedores</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{totalClientes}</h3>
              <p>Clientes</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{solicitudesPendientes}</h3>
              <p>Solicitudes pendientes</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{reportesPendientes}</h3>
              <p>Reportes pendientes</p>
            </div>
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGACION */}
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${tabActiva === "usuarios" ? "active" : ""}`}
          onClick={() => setTabActiva("usuarios")}
        >
          Listar Usuarios
        </button>
        <button 
          className={`tab-btn ${tabActiva === "solicitudes" ? "active" : ""}`}
          onClick={() => setTabActiva("solicitudes")}
        >
          Solicitudes de Vendedor
          {solicitudesPendientes > 0 && (
            <span className="tab-badge">{solicitudesPendientes}</span>
          )}
        </button>
        <button 
          className={`tab-btn ${tabActiva === "reportes" ? "active" : ""}`}
          onClick={() => setTabActiva("reportes")}
        >
          Reportes de Vendedores
          {reportesPendientes > 0 && (
            <span className="tab-badge reportes">{reportesPendientes}</span>
          )}
        </button>
        <button 
          className={`tab-btn ${tabActiva === "sanciones" ? "active" : ""}`}
          onClick={() => setTabActiva("sanciones")}
        >
          Sanciones
          {sancionesActivas > 0 && (
            <span className="tab-badge reportes">{sancionesActivas}</span>
          )}
        </button>
      </div>

      {/* PANEL DE USUARIOS */}
      {tabActiva === "usuarios" && usuarios.length > 0 && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Usuarios Registrados</h2>
          </div>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Apodo</th>
                  <th>Correo</th>
                  <th>Telefono</th>
                  <th>Matricula</th>
                  <th>Rol</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.nombre}</td>
                    <td>{u.apodo || "-"}</td>
                    <td>{u.correo}</td>
                    <td>{u.telefono || "-"}</td>
                    <td className="matricula-col">{u.relacion?.matricula}</td>
                    <td>
                      <span className={`role-badge ${u.relacion?.rol || "sin-rol"}`}>
                        {getRolNombre(u.relacion?.rol)}
                      </span>
                    </td>
                    <td>{getEstadoNombre(u.relacion?.estado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PANEL DE SOLICITUDES DE VENDEDOR */}
      {tabActiva === "solicitudes" && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Solicitudes para ser Vendedor</h2>
          </div>
          
          {cargandoSolicitudes ? (
            <div className="empty-state">Cargando solicitudes...</div>
          ) : solicitudesVendedor.length === 0 ? (
            <div className="empty-state">No hay solicitudes pendientes</div>
          ) : (
            <div className="solicitudes-grid">
              {solicitudesVendedor.map(solicitud => (
                <div key={solicitud.id} className="solicitud-card">
                  <div className="solicitud-header">
                    <span className="solicitud-nombre">
                      {solicitud.usuario?.apodo || solicitud.usuario?.nombre}
                    </span>
                    <span className={`estado-badge ${solicitud.estado}`}>
                      {solicitud.estado === "pendiente" ? "Pendiente" :
                       solicitud.estado === "aprobado" ? "Aprobado" : "Rechazado"}
                    </span>
                  </div>
                  <div className="solicitud-body">
                    <p><strong>Correo:</strong> {solicitud.usuario?.correo}</p>
                    <p><strong>Motivo:</strong> {solicitud.motivo}</p>
                    {solicitud.fecha_solicitud && (
                      <p><strong>Solicitado:</strong> {new Date(solicitud.fecha_solicitud).toLocaleDateString()}</p>
                    )}
                    {solicitud.respuesta_admin && (
                      <p><strong>Respuesta del admin:</strong> {solicitud.respuesta_admin}</p>
                    )}
                  </div>
                  
                  {solicitud.estado === "pendiente" && (
                    <div className="solicitud-actions">
                      <button 
                        className="btn-aprobar"
                        onClick={() => abrirModalRespuesta(solicitud.id, "aprobado", solicitud.usuario?.apodo || solicitud.usuario?.nombre || "el usuario")}
                      >
                        <IconoCheck className="icono-check" /> Aprobar
                      </button>
                      <button 
                        className="btn-rechazar"
                        onClick={() => abrirModalRespuesta(solicitud.id, "rechazado", solicitud.usuario?.apodo || solicitud.usuario?.nombre || "el usuario")}
                      >
                        <IconoX className="icono-x" /> Rechazar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PANEL DE REPORTES DE VENDEDORES */}
      {tabActiva === "reportes" && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Reportes de Vendedores</h2>
            <div className="filtros-reportes">
              <button 
                className={`filtro-btn ${filtroReporte === "todos" ? "active" : ""}`}
                onClick={() => setFiltroReporte("todos")}
              >
                Todos
              </button>
              <button 
                className={`filtro-btn ${filtroReporte === "pendiente" ? "active" : ""}`}
                onClick={() => setFiltroReporte("pendiente")}
              >
                Pendientes
              </button>
              <button 
                className={`filtro-btn ${filtroReporte === "resuelto" ? "active" : ""}`}
                onClick={() => setFiltroReporte("resuelto")}
              >
                Resueltos
              </button>
              <button 
                className={`filtro-btn ${filtroReporte === "rechazado" ? "active" : ""}`}
                onClick={() => setFiltroReporte("rechazado")}
              >
                Rechazados
              </button>
            </div>
          </div>
          
          {cargandoReportes ? (
            <div className="empty-state">Cargando reportes...</div>
          ) : reportes.length === 0 ? (
            <div className="empty-state">No hay reportes de vendedores</div>
          ) : (
            <div className="reportes-grid">
              {reportes.map(reporte => (
                <div key={reporte.id} className={`reporte-card ${reporte.estado}`}>
                  <div className="reporte-header">
                    <div>
                      <span className="reporte-vendedor">Vendedor: {reporte.vendedor_nombre}</span>
                      <span className="reporte-comprador">Reportado por: {reporte.comprador_nombre}</span>
                    </div>
                    <span className={`estado-badge ${reporte.estado}`}>
                      {reporte.estado === "pendiente" ? "Pendiente" :
                       reporte.estado === "resuelto" ? "Resuelto" : "Rechazado"}
                    </span>
                  </div>
                  <div className="reporte-body">
                    <p><strong>Motivo del reporte:</strong></p>
                    <p className="reporte-motivo">{reporte.motivo}</p>
                    <p><strong>Fecha:</strong> {new Date(reporte.fecha_creacion).toLocaleString()}</p>
                    {reporte.respuesta_admin && (
                      <p><strong>Respuesta del admin:</strong> {reporte.respuesta_admin}</p>
                    )}
                  </div>
                  
                  {reporte.estado === "pendiente" && (
                    <div className="reporte-actions">
                      <button 
                        className="btn-resolver"
                        onClick={() => abrirModalReporte(reporte)}
                      >
                        Revisar Reporte
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tabActiva === "sanciones" && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Sanciones de Usuarios</h2>
            <div className="filtros-reportes">
              <button 
                className={`filtro-btn ${filtroSancion === "activas" ? "active" : ""}`}
                onClick={() => setFiltroSancion("activas")}
              >
                Activas
              </button>
              <button 
                className={`filtro-btn ${filtroSancion === "todas" ? "active" : ""}`}
                onClick={() => setFiltroSancion("todas")}
              >
                Todas
              </button>
            </div>
          </div>

          {cargandoSanciones ? (
            <div className="empty-state">Cargando sanciones...</div>
          ) : sanciones.length === 0 ? (
            <div className="empty-state">No hay sanciones para mostrar</div>
          ) : (
            <div className="reportes-grid">
              {sanciones.map(sancion => (
                <div key={sancion.id} className={`reporte-card sancion-card ${sancion.activa ? "pendiente" : "rechazado"}`}>
                  <div className="reporte-header">
                    <div>
                      <span className="reporte-vendedor">Usuario: {sancion.usuario_nombre || `#${sancion.usuario_id}`}</span>
                      <span className="reporte-comprador">Aplicada por: {sancion.admin_nombre || `#${sancion.admin_id}`}</span>
                    </div>
                    <span className={`estado-badge ${sancion.activa ? "pendiente" : "rechazado"}`}>
                      {sancion.activa ? "Activa" : "Levantada"}
                    </span>
                  </div>
                  <div className="reporte-body">
                    <p><strong>Tipo:</strong> {sancion.tipo}</p>
                    <p><strong>Motivo:</strong></p>
                    <p className="reporte-motivo">{sancion.motivo}</p>
                    <p><strong>Fecha:</strong> {new Date(sancion.fecha_creacion).toLocaleString()}</p>
                  </div>

                  {sancion.activa && (
                    <div className="reporte-actions">
                      <button className="btn-resolver" onClick={() => abrirModalLevantarSancion(sancion)}>
                        Levantar sancion
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE RESPUESTA DEL ADMIN (Solicitudes) */}
      {modalRespuestaAbierto && solicitudActual && (
        <div className="modal-overlay" onClick={() => setModalRespuestaAbierto(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{solicitudActual.accion === "aprobado" ? "Aprobar solicitud" : "Rechazar solicitud"}</h3>
            <p>Escribe un mensaje para {solicitudActual.nombre}:</p>
            <textarea
              value={respuestaAdmin}
              onChange={(e) => setRespuestaAdmin(e.target.value)}
              placeholder="Escribe tu respuesta..."
              rows={4}
              className="admin-modal-textarea"
            />
            <div className="modal-actions">
              <button className="btn-cancelar" onClick={() => setModalRespuestaAbierto(false)}>Cancelar</button>
              <button className="btn-guardar" onClick={enviarRespuesta}>Enviar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REVISION DE REPORTE */}
      {modalReporteAbierto && reporteActual && (
        <div className="modal-overlay" onClick={() => setModalReporteAbierto(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Revisar Reporte</h3>
            <div className="reporte-detalle">
              <p><strong>Vendedor:</strong> {reporteActual.vendedor_nombre}</p>
              <p><strong>Reportado por:</strong> {reporteActual.comprador_nombre}</p>
              <p><strong>Motivo:</strong></p>
              <p className="reporte-motivo">{reporteActual.motivo}</p>
            </div>
            
            <div className="form-group">
              <label>Respuesta del administrador para el reporte</label>
              <textarea
                value={respuestaReporte}
                onChange={(e) => setRespuestaReporte(e.target.value)}
                placeholder="Aqui puedes dejar contexto para quien reporto"
                rows={3}
                className="admin-modal-textarea"
              />
            </div>

            <div className="form-group">
              <label>Tipo de sancion</label>
              <select
                value={tipoSancion}
                onChange={(e) => setTipoSancion(e.target.value)}
              >
                <option value="advertencia">Advertencia</option>
                <option value="bloqueo">Bloqueo</option>
              </select>
            </div>

            <div className="form-group">
              <label>Mensaje o motivo</label>
              <textarea
                value={motivoSancion}
                onChange={(e) => setMotivoSancion(e.target.value)}
                placeholder={
                  tipoSancion === "advertencia"
                    ? "Este texto le llegara al vendedor como aviso del admin"
                    : "Este texto se usara como motivo formal del bloqueo"
                }
                rows={3}
                className="admin-modal-textarea"
              />
            </div>
            
            <div className="modal-actions">
              <button className="btn-cancelar" onClick={() => setModalReporteAbierto(false)}>Cancelar</button>
              <button className="btn-guardar" onClick={aplicarSancion}>Aplicar sancion</button>
              <button className="btn-rechazar" onClick={() => procesarReporte("rechazado")}>Rechazar Reporte</button>
              <button className="btn-aprobar" onClick={() => procesarReporte("resuelto")}>Marcar como Resuelto</button>
            </div>
          </div>
        </div>
      )}

      {modalLevantarSancionAbierto && sancionActual && (
        <div className="modal-overlay" onClick={() => setModalLevantarSancionAbierto(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Levantar Sancion</h3>
            <div className="reporte-detalle">
              <p><strong>Usuario:</strong> {sancionActual.usuario_nombre || `#${sancionActual.usuario_id}`}</p>
              <p><strong>Tipo:</strong> {sancionActual.tipo}</p>
              <p><strong>Motivo actual:</strong></p>
              <p className="reporte-motivo">{sancionActual.motivo}</p>
            </div>

            <div className="form-group">
              <label>Motivo para levantar la sancion</label>
              <textarea
                value={motivoLevantarSancion}
                onChange={(e) => setMotivoLevantarSancion(e.target.value)}
                placeholder="Cuenta rapido por que se levanta la sancion"
                rows={3}
                className="admin-modal-textarea"
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancelar" onClick={() => setModalLevantarSancionAbierto(false)}>Cancelar</button>
              <button className="btn-guardar" onClick={confirmarLevantarSancion}>Confirmar</button>
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

export default AdminDashboard;
