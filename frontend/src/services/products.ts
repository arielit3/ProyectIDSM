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

// ============================================================================
// VENTAS
// ============================================================================

export interface Venta {
  id: number;
  solicitud_id: number;
  cantidad: number;
  precio_unitario: number;
  total: number;
  fecha_venta: string;
  estado: string;
  producto?: {
    id: number;
    nombre: string;
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

export async function obtenerMisVentas(): Promise<Venta[]> {
  const response = await axios.get(`${API_URL}/solicitudes/mis-ventas`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function obtenerMisCompras(): Promise<Venta[]> {
  const response = await axios.get(`${API_URL}/solicitudes/mis-compras`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

//Esto
// ============================================================================
// SOLICITUDES PARA SER VENDEDOR
// ============================================================================

export interface SolicitudVendedor {
  id: number;
  usuario_id: number;
  motivo: string;
  estado: string;
  fecha_solicitud: string;
  fecha_respuesta: string | null;
  respuesta_admin: string | null;
  usuario?: {
    id: number;
    nombre: string;
    apodo: string;
    correo: string;
  };
}

export interface CrearSolicitudVendedorData {
  motivo: string;
}

/**
 * Crea una solicitud para ser vendedor
 */
export async function crearSolicitudVendedor(data: CrearSolicitudVendedorData): Promise<SolicitudVendedor> {
  const response = await axios.post(`${API_URL}/solicitudes-vendedor/`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene todas las solicitudes de vendedor (solo admin)
 */
export async function obtenerSolicitudesVendedor(): Promise<SolicitudVendedor[]> {
  const response = await axios.get(`${API_URL}/solicitudes-vendedor/`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene la solicitud del usuario actual (si existe)
 */
export async function obtenerMiSolicitudVendedor(): Promise<SolicitudVendedor | null> {
  const response = await axios.get(`${API_URL}/solicitudes-vendedor/mi-solicitud`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Aprueba o rechaza una solicitud de vendedor (solo admin)
 */
export async function procesarSolicitudVendedor(
  solicitudId: number,
  estado: string,
  respuesta_admin: string
): Promise<SolicitudVendedor> {
  const response = await axios.put(
    `${API_URL}/solicitudes-vendedor/${solicitudId}`,
    { estado, respuesta_admin },
    { headers: getAuthHeader() }
  );
  return response.data;
}

// ============================================================================
// CIFRADO DE MENSAJES
// ============================================================================

import { cifrarSHA256 } from "../utils/cifrado";

export interface MensajeCifrado {
  textoOriginal: string;
  hash: string;
}

/**
 * Envia un mensaje cifrado (para solicitudes, quejas, etc.)
 * @param mensaje - Texto a enviar
 * @returns Objeto con texto original y hash
 */
export function prepararMensajeCifrado(mensaje: string): MensajeCifrado {
  return {
    textoOriginal: mensaje,
    hash: cifrarSHA256(mensaje)
  };
}

/**
 * Verifica la integridad de un mensaje
 * @param mensaje - Mensaje recibido
 * @param hash - Hash almacenado
 * @returns true si el mensaje no ha sido alterado
 */
export function verificarIntegridadMensaje(mensaje: string, hash: string): boolean {
  return cifrarSHA256(mensaje) === hash;
}

// ============================================================================
// REPORTES DE VENDEDORES
// ============================================================================

export interface ReporteVendedor {
  id: number;
  comprador_id: number;
  vendedor_id: number;
  motivo: string;
  estado: string;
  respuesta_admin: string | null;
  fecha_creacion: string;
  fecha_resolucion: string | null;
  comprador_nombre?: string;
  vendedor_nombre?: string;
}

export interface CrearReporteData {
  vendedor_id: number;
  motivo: string;
}

/**
 * Crea un reporte contra un vendedor
 */
export async function crearReporteVendedor(data: CrearReporteData): Promise<ReporteVendedor> {
  const response = await axios.post(`${API_URL}/reportes/vendedor`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene todos los reportes (solo admin)
 */
export async function obtenerTodosReportes(estado?: string): Promise<ReporteVendedor[]> {
  const url = estado ? `${API_URL}/reportes/todos?estado=${estado}` : `${API_URL}/reportes/todos`;
  const response = await axios.get(url, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene reportes de un vendedor específico (solo admin)
 */
export async function obtenerReportesVendedor(vendedorId: number): Promise<ReporteVendedor[]> {
  const response = await axios.get(`${API_URL}/reportes/vendedor/${vendedorId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Actualiza el estado de un reporte (solo admin)
 */
export async function actualizarReporte(
  reporteId: number,
  estado: string,
  respuesta_admin?: string
): Promise<ReporteVendedor> {
  const response = await axios.put(
    `${API_URL}/reportes/${reporteId}`,
    { estado, respuesta_admin: respuesta_admin || "" },
    { headers: getAuthHeader() }
  );
  return response.data;
}

/**
 * Cuenta los reportes de un vendedor
 */
export async function contarReportesVendedor(vendedorId: number): Promise<{ total: number; pendientes: number; resueltos: number }> {
  const response = await axios.get(`${API_URL}/reportes/vendedor/${vendedorId}/contar`, {
    headers: getAuthHeader(),
  });
  return response.data;
}