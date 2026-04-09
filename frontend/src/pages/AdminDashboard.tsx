import React, { useState, useEffect, useCallback } from "react";
import { type Usuario } from "../services/users";
import { 
  obtenerSolicitudesVendedor, 
  procesarSolicitudVendedor,
  prepararMensajeCifrado,
  type SolicitudVendedor 
} from "../services/products";
import { IconoCheck, IconoX } from "../components/Iconos";
import "./Dashboard.css";

// ============================================================================
// INTERFAZ DE PROPS
// ============================================================================

interface AdminDashboardProps {
  user: Usuario;
  usuarios: Usuario[];
  onListarUsuarios: () => void;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  user, 
  usuarios, 
  onListarUsuarios 
}) => {
  
  // ==========================================================================
  // ESTADOS DEL COMPONENTE
  // ==========================================================================

  const [solicitudesVendedor, setSolicitudesVendedor] = useState<SolicitudVendedor[]>([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false);
  const [tabActiva, setTabActiva] = useState<string>("usuarios");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // ==========================================================================
  // ESTADOS PARA MODALES
  // ==========================================================================
  const [modalRespuestaAbierto, setModalRespuestaAbierto] = useState(false);
  const [solicitudActual, setSolicitudActual] = useState<{id: number, accion: string, nombre: string} | null>(null);
  const [respuestaAdmin, setRespuestaAdmin] = useState("");
  
  // Modal de mensajes (reemplaza alert)
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
  // FUNCIONES DE MODALES
  // ==========================================================================
  
  const mostrarMensaje = (titulo: string, mensaje: string, tipo: "info" | "success" | "error" | "warning" = "info") => {
    setModalMensaje({ isOpen: true, titulo, mensaje, tipo });
  };

  const abrirModalRespuesta = (solicitudId: number, accion: string, nombreUsuario: string) => {
    setSolicitudActual({ id: solicitudId, accion, nombre: nombreUsuario });
    setRespuestaAdmin("");
    setModalRespuestaAbierto(true);
  };

  const enviarRespuesta = async () => {
    if (!solicitudActual) return;
    if (respuestaAdmin.trim() === "") {
      mostrarMensaje("Error", "Debes escribir una respuesta", "error");
      return;
    }
    
    try {
      // Cifrar la respuesta antes de enviarla
      const respuestaCifrada = prepararMensajeCifrado(respuestaAdmin);
      
      await procesarSolicitudVendedor(
        solicitudActual.id, 
        solicitudActual.accion, 
        respuestaCifrada.textoOriginal,
      );
      
      mostrarMensaje("Exito", `Solicitud ${solicitudActual.accion === "aprobado" ? "aprobada" : "rechazada"} correctamente`, "success");
      cargarSolicitudesVendedor();
      onListarUsuarios();
      setModalRespuestaAbierto(false);
      setSolicitudActual(null);
    } catch (error: any) {
      mostrarMensaje("Error", error.response?.data?.detail || "Error al procesar solicitud", "error");
    }
  };

  // ==========================================================================
  // FUNCIONES DE CARGA DE DATOS
  // ==========================================================================

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

  // Cargar solicitudes al montar el componente
  useEffect(() => {
    cargarSolicitudesVendedor();
  }, [cargarSolicitudesVendedor]);

  // ==========================================================================
  // CALCULOS PARA ESTADISTICAS
  // ==========================================================================

  const totalUsuarios = usuarios.length;
  const totalVendedores = usuarios.filter(u => u.relacion?.rol === "vendedor").length;
  const totalClientes = usuarios.filter(u => u.relacion?.rol === "cliente").length;
  const solicitudesPendientes = solicitudesVendedor.filter(s => s.estado === "pendiente").length;

  // ==========================================================================
  // RENDERIZADO DEL COMPONENTE
  // ==========================================================================

  return (
    <div className="admin-dashboard">
      
      {/* ======================================================================
           HEADER DEL ADMINISTRADOR
      ====================================================================== */}
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
        </div>
      </div>

      {/* ======================================================================
           TABS DE NAVEGACION
      ====================================================================== */}
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${tabActiva === "usuarios" ? "active" : ""}`}
          onClick={() => {
            setTabActiva("usuarios");
            onListarUsuarios();
          }}
        >
          Listar Usuarios
        </button>
        <button 
          className={`tab-btn ${tabActiva === "solicitudes" ? "active" : ""}`}
          onClick={() => {
            setTabActiva("solicitudes");
            cargarSolicitudesVendedor();
          }}
        >
          Solicitudes de Vendedor
          {solicitudesPendientes > 0 && (
            <span className="tab-badge">{solicitudesPendientes}</span>
          )}
        </button>
      </div>

      {/* ======================================================================
           PANEL DE USUARIOS
      ====================================================================== */}
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
                      <span className={`role-badge ${u.relacion?.rol}`}>
                        {u.relacion?.rol === "administrador" ? "Administrador" :
                         u.relacion?.rol === "vendedor" ? "Vendedor" : "Cliente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================================
           PANEL DE SOLICITUDES DE VENDEDOR
      ====================================================================== */}
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
                  
                  {/* Botones de accion - solo visibles para solicitudes pendientes */}
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

      {/* ======================================================================
           MODAL DE RESPUESTA DEL ADMIN
      ====================================================================== */}
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

      {/* ======================================================================
           MODAL DE MENSAJES (reemplaza alert)
      ====================================================================== */}
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