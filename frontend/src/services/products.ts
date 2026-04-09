import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function getAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface Producto {
  id: number;
  vendedor_id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: string;
  imagen_nombre: string | null;
  activo: number;
  vendedor?: {
    id: number;
    nombre: string;
    apodo: string;
    telefono?: string;
  };
}

export interface ProductoUpdate {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  stock?: number;
  categoria?: string;
  activo?: number;
}

// ============================================================================
// PRODUCTOS
// ============================================================================

export async function crearProductoConImagen(formData: FormData): Promise<Producto> {
  const response = await axios.post(`${API_URL}/productos/`, formData, {
    headers: {
      ...getAuthHeader(),
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function listarMisProductos(): Promise<Producto[]> {
  const response = await axios.get(`${API_URL}/productos/mis-productos`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function listarTodosProductos(): Promise<Producto[]> {
  const response = await axios.get(`${API_URL}/productos/`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function listarProductosPorVendedor(vendedorId: number): Promise<Producto[]> {
  const response = await axios.get(`${API_URL}/productos/vendedor/${vendedorId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function actualizarProducto(productoId: number, data: ProductoUpdate): Promise<Producto> {
  const response = await axios.put(`${API_URL}/productos/${productoId}`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function eliminarProducto(productoId: number): Promise<{ mensaje: string }> {
  const response = await axios.delete(`${API_URL}/productos/${productoId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function toggleProductoVisibilidad(productoId: number): Promise<{ mensaje: string; activo: number }> {
  const response = await axios.patch(`${API_URL}/productos/${productoId}/toggle`, {}, {
    headers: getAuthHeader(),
  });
  return response.data;
}

// ============================================================================
// FAVORITOS
// ============================================================================

export async function agregarFavorito(productoId: number): Promise<{ mensaje: string }> {
  const response = await axios.post(`${API_URL}/productos/${productoId}/favorito`, {}, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function obtenerFavoritos(): Promise<any[]> {
  const response = await axios.get(`${API_URL}/productos/favoritos`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function quitarFavorito(productoId: number): Promise<{ mensaje: string }> {
  const response = await axios.delete(`${API_URL}/productos/${productoId}/favorito`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

// ============================================================================
// SOLICITUDES
// ============================================================================

export interface SolicitudProducto {
  id: number;
  producto_id: number;
  comprador_id: number;
  vendedor_id: number;
  cantidad: number;
  mensaje: string;
  estado: string;
  fecha_solicitud: string;
  fecha_respuesta: string | null;
  fecha_entrega: string | null;
  producto?: {
    id: number;
    nombre: string;
    precio: number;
  };
  comprador?: {
    id: number;
    nombre: string;
    apodo: string;
  };
  vendedor?: {
    id: number;
    nombre: string;
    apodo: string;
  };
}

export interface CrearSolicitudData {
  producto_id: number;
  vendedor_id: number;
  cantidad: number;
  mensaje: string;
}

export interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  data: any;
  fecha_creacion: string;
}

export async function crearSolicitudProducto(data: CrearSolicitudData): Promise<SolicitudProducto> {
  const response = await axios.post(`${API_URL}/solicitudes/`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function obtenerSolicitudesRecibidas(): Promise<SolicitudProducto[]> {
  const response = await axios.get(`${API_URL}/solicitudes/recibidas`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function obtenerSolicitudesEnviadas(): Promise<SolicitudProducto[]> {
  const response = await axios.get(`${API_URL}/solicitudes/enviadas`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function actualizarEstadoSolicitud(
  solicitudId: number, 
  estado: string, 
  respuesta?: string
): Promise<SolicitudProducto> {
  const response = await axios.put(
    `${API_URL}/solicitudes/${solicitudId}/estado`,
    { estado, respuesta },
    { headers: getAuthHeader() }
  );
  return response.data;
}

export async function marcarSolicitudComoEntregada(solicitudId: number): Promise<{ mensaje: string; estado: string }> {
  const response = await axios.put(
    `${API_URL}/solicitudes/${solicitudId}/entregar`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
}

export async function obtenerNotificaciones(): Promise<Notificacion[]> {
  const response = await axios.get(`${API_URL}/solicitudes/notificaciones`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function marcarNotificacionLeida(notificacionId: number): Promise<{ mensaje: string }> {
  const response = await axios.put(
    `${API_URL}/solicitudes/notificaciones/leer/${notificacionId}`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
}

export async function marcarTodasNotificacionesLeidas(): Promise<{ mensaje: string }> {
  const response = await axios.put(
    `${API_URL}/solicitudes/notificaciones/leer-todas`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
}