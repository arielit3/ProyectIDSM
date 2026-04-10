import React, { useState, useEffect, useCallback } from "react";
import { type Usuario } from "../services/users";
import { 
  obtenerSolicitudesVendedor, 
  procesarSolicitudVendedor,
  prepararMensajeCifrado,
  obtenerTodosReportes,
  actualizarReporte,
  type SolicitudVendedor,
  type ReporteVendedor
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
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false); //EStados de carga para mostrar indicadores de carga
  const [cargandoReportes, setCargandoReportes] = useState(false);
  const [tabActiva, setTabActiva] = useState<string>("usuarios"); //Pestaña activa del dashboard, puede ser usuarios, solicitudes o reportes
  const [filtroReporte, setFiltroReporte] = useState<string>("todos"); //Filtro de los reportes, puede ser todos, pendientes, resueltos o rechazados

  // ESTADOS PARA MODALES
  //Modal de respuesta a solicitudes de vendedor
  const [modalRespuestaAbierto, setModalRespuestaAbierto] = useState(false);
  const [solicitudActual, setSolicitudActual] = useState<{id: number, accion: string, nombre: string} | null>(null);
  const [respuestaAdmin, setRespuestaAdmin] = useState("");
  //Modal para revisar un reporte contra un vendedor
  const [modalReporteAbierto, setModalReporteAbierto] = useState(false);
  const [reporteActual, setReporteActual] = useState<ReporteVendedor | null>(null);
  const [respuestaReporte, setRespuestaReporte] = useState("");
  
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
  //Envia la respuesta del admin para aprobar o rechazar la solicitud de vendedor, se cifra la respuesta antes de enviarla
  const enviarRespuesta = async () => {
    if (!solicitudActual) return;
    if (respuestaAdmin.trim() === "") {
      mostrarMensaje("Error", "Debes escribir una respuesta", "error");
      return;
    }
    
    try {
      //Cifrado de SHA-256 de la respuesta del admin para mayor seguridad, se envia el texto original
      //para que el backend pueda verificarlo y almacenarlo de forma segura sin exponer la respuesta en texto plano en la base de datos
      const respuestaCifrada = prepararMensajeCifrado(respuestaAdmin);
      //Procesa la solicitud la aprueba o la rechaza
      await procesarSolicitudVendedor(
        solicitudActual.id, 
        solicitudActual.accion, 
        respuestaCifrada.textoOriginal
      );
      
      mostrarMensaje("Exito", `Solicitud ${solicitudActual.accion === "aprobado" ? "aprobada" : "rechazada"} correctamente`, "success");
      await cargarSolicitudesVendedor(); //recargar la lista
      onListarUsuarios(); //actualiza la lista de usuarios para reflejar los cambios de rol
      setModalRespuestaAbierto(false);
      setSolicitudActual(null);
    } catch (error: any) {
      mostrarMensaje("Error", error.response?.data?.detail || "Error al procesar solicitud", "error");
    }
  };

  // Funciones para reportes
  const abrirModalReporte = (reporte: ReporteVendedor) => {
    setReporteActual(reporte);
    setRespuestaReporte("");
    setModalReporteAbierto(true);
  };
  //Procesa un reporte marcandolo como resuelto o rechazado, se envia una respuesta del admin que se cifra antes de enviarla para mayor seguridad
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
      setModalReporteAbierto(false);
      setReporteActual(null);
      setRespuestaReporte("");
    } catch (error: any) {
      mostrarMensaje("Error", error.message || "Error al procesar reporte", "error");
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

  // Cargar datos al montar el componente 
  useEffect(() => {
    if (tabActiva === "solicitudes") {
      cargarSolicitudesVendedor();
    } else if (tabActiva === "reportes") {
      cargarReportes();
    } else if (tabActiva === "usuarios") {
      onListarUsuarios();
    }
  }, [tabActiva, cargarSolicitudesVendedor, cargarReportes, onListarUsuarios]);

  // CALCULOS PARA ESTADISTICAS
  const totalUsuarios = usuarios.length; 
  const totalVendedores = usuarios.filter(u => u.relacion?.rol === "vendedor").length;
  const totalClientes = usuarios.filter(u => u.relacion?.rol === "cliente").length;
  const solicitudesPendientes = solicitudesVendedor.filter(s => s.estado === "pendiente").length;
  const reportesPendientes = reportes.filter(r => r.estado === "pendiente").length;
  //Convierte el codigo de rol a un nombre legible para mostrar en la tabla de usuarios
  const getRolNombre = (rol: string | undefined) => {
    if (rol === "administrador") return "Administrador";
    if (rol === "vendedor") return "Vendedor";
    if (rol === "cliente") return "Cliente";
    return "Sin rol";
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
              style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontFamily: "inherit" }}
            />
            <div className="modal-actions" style={{ display: "flex", gap: "12px", marginTop: "20px", justifyContent: "flex-end" }}>
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
            
            <div className="form-group" style={{ marginTop: "20px" }}>
              <label>Respuesta del administrador (opcional):</label>
              <textarea
                value={respuestaReporte}
                onChange={(e) => setRespuestaReporte(e.target.value)}
                placeholder="Ej: Hemos revisado el reporte y tomaremos las medidas correspondientes..."
                rows={3}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontFamily: "inherit", marginTop: "8px" }}
              />
            </div>
            
            <div className="modal-actions" style={{ display: "flex", gap: "12px", marginTop: "20px", justifyContent: "flex-end" }}>
              <button className="btn-cancelar" onClick={() => setModalReporteAbierto(false)}>Cancelar</button>
              <button className="btn-rechazar" onClick={() => procesarReporte("rechazado")}>Rechazar Reporte</button>
              <button className="btn-aprobar" onClick={() => procesarReporte("resuelto")}>Marcar como Resuelto</button>
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