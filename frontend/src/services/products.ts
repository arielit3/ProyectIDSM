import axios from "axios";
// Importamos axios para realizar peticiones HTTP al backend

// CONFIGURACIÓN INICIAL
// URL base de la API, se carga desde el archivo .env
const API_URL = import.meta.env.VITE_API_URL;

/**
 * Función para obtener el header de autenticación con el token JWT
 * @returns Objeto con el header Authorization o vacío si no hay token
 */
function getAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// INTERFACES Y TIPOS
// Interfaz que define la estructura de un producto
export interface Producto {
  id: number;                    // Identificador único del producto
  vendedor_id: number;           // ID del vendedor que publicó el producto
  nombre: string;                // Nombre del producto
  descripcion: string;           // Descripción detallada
  precio: number;                // Precio del producto
  stock: number;                 // Cantidad disponible
  categoria: string;             // Categoría del producto
  imagen_nombre: string | null;  // Nombre del archivo de imagen (o null si no tiene)
  activo: number;                // 1 = visible, 0 = oculto
  vendedor?: {                   // Información del vendedor (opcional, viene en algunas respuestas)
    id: number;
    nombre: string;
    apodo: string;
    telefono?: string;
  };
}

// Interfaz para actualizar un producto (todos los campos son opcionales)
export interface ProductoUpdate {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  stock?: number;
  categoria?: string;
  activo?: number;
}

// PRODUCTOS - CRUD (Crear, Leer, Actualizar, Eliminar)
/**
 * Crea un nuevo producto con imagen opcional
 * Usa multipart/form-data para enviar la imagen junto con los datos
 * @param formData - Datos del producto y archivo de imagen
 * @returns Producto creado con su ID
 */
export async function crearProductoConImagen(formData: FormData): Promise<Producto> {
  const response = await axios.post(`${API_URL}/productos/`, formData, {
    headers: {
      ...getAuthHeader(),
      "Content-Type": "multipart/form-data", // Necesario para enviar archivos
    },
  });
  return response.data;
}

/**
 * Obtiene todos los productos del vendedor autenticado (incluye ocultos)
 * @returns Lista de productos del vendedor
 */
export async function listarMisProductos(): Promise<Producto[]> {
  const response = await axios.get(`${API_URL}/productos/mis-productos`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene todos los productos visibles de todos los vendedores
 * Los productos ocultos no aparecen en esta lista
 * @returns Lista de productos disponibles para compradores
 */
export async function listarTodosProductos(): Promise<Producto[]> {
  const response = await axios.get(`${API_URL}/productos/`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene los productos visibles de un vendedor específico
 * @param vendedorId - ID del vendedor
 * @returns Lista de productos del vendedor
 */
export async function listarProductosPorVendedor(vendedorId: number): Promise<Producto[]> {
  const response = await axios.get(`${API_URL}/productos/vendedor/${vendedorId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Actualiza los campos de un producto existente (solo el dueño puede hacerlo)
 * @param productoId - ID del producto a actualizar
 * @param data - Datos a actualizar (nombre, precio, stock, etc.)
 * @returns Producto actualizado
 */
export async function actualizarProducto(productoId: number, data: ProductoUpdate): Promise<Producto> {
  const response = await axios.put(`${API_URL}/productos/${productoId}`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Elimina un producto permanentemente (solo el dueño puede hacerlo)
 * @param productoId - ID del producto a eliminar
 * @returns Mensaje de confirmación
 */
export async function eliminarProducto(productoId: number): Promise<{ mensaje: string }> {
  const response = await axios.delete(`${API_URL}/productos/${productoId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Alterna la visibilidad de un producto entre visible (1) y oculto (0)
 * @param productoId - ID del producto
 * @returns Mensaje y nuevo estado de visibilidad
 */
export async function toggleProductoVisibilidad(productoId: number): Promise<{ mensaje: string; activo: number }> {
  const response = await axios.patch(`${API_URL}/productos/${productoId}/toggle`, {}, {
    headers: getAuthHeader(),
  });
  return response.data;
}

// FAVORITOS - Gestión de productos favoritos del usuario
/**
 * Agrega un producto a los favoritos del usuario autenticado
 * @param productoId - ID del producto a agregar
 * @returns Mensaje de confirmación
 */
export async function agregarFavorito(productoId: number): Promise<{ mensaje: string }> {
  const response = await axios.post(`${API_URL}/productos/${productoId}/favorito`, {}, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene todos los favoritos del usuario autenticado con detalles del producto
 * @returns Lista de favoritos
 */
export async function obtenerFavoritos(): Promise<any[]> {
  const response = await axios.get(`${API_URL}/productos/favoritos`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Elimina un producto de los favoritos del usuario autenticado
 * @param productoId - ID del producto a eliminar
 * @returns Mensaje de confirmación
 */
export async function quitarFavorito(productoId: number): Promise<{ mensaje: string }> {
  const response = await axios.delete(`${API_URL}/productos/${productoId}/favorito`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

// SOLICITUDES DE PRODUCTOS - Comunicación entre compradores y vendedores
// Interfaz para una solicitud de producto
export interface SolicitudProducto {
  id: number;
  producto_id: number;
  comprador_id: number;
  vendedor_id: number;
  cantidad: number;
  mensaje: string;
  estado: string;              // pendiente, aceptado, rechazado, entregado, completado
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

// Datos necesarios para crear una solicitud
export interface CrearSolicitudData {
  producto_id: number;
  vendedor_id: number;
  cantidad: number;
  mensaje: string;
}

// Interfaz para una notificación
export interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  data: any;
  fecha_creacion: string;
}

/**
 * Crea una solicitud de producto (comprador -> vendedor)
 * @param data - Datos de la solicitud
 * @returns Solicitud creada
 */
export async function crearSolicitudProducto(data: CrearSolicitudData): Promise<SolicitudProducto> {
  const response = await axios.post(`${API_URL}/solicitudes/`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene las solicitudes recibidas por el vendedor actual
 * @returns Lista de solicitudes recibidas
 */
export async function obtenerSolicitudesRecibidas(): Promise<SolicitudProducto[]> {
  const response = await axios.get(`${API_URL}/solicitudes/recibidas`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene las solicitudes enviadas por el comprador actual
 * @returns Lista de solicitudes enviadas
 */
export async function obtenerSolicitudesEnviadas(): Promise<SolicitudProducto[]> {
  const response = await axios.get(`${API_URL}/solicitudes/enviadas`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Actualiza el estado de una solicitud (aceptar/rechazar)
 * @param solicitudId - ID de la solicitud
 * @param estado - Nuevo estado ('aceptado' o 'rechazado')
 * @param respuesta - Mensaje opcional de respuesta
 * @returns Solicitud actualizada
 */
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

/**
 * Marca una solicitud como entregada (comprador confirma recepción)
 * @param solicitudId - ID de la solicitud
 * @returns Mensaje y nuevo estado
 */
export async function marcarSolicitudComoEntregada(solicitudId: number): Promise<{ mensaje: string; estado: string }> {
  const response = await axios.put(
    `${API_URL}/solicitudes/${solicitudId}/entregar`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
}

/**
 * Obtiene todas las notificaciones del usuario actual
 * @returns Lista de notificaciones
 */
export async function obtenerNotificaciones(): Promise<Notificacion[]> {
  const response = await axios.get(`${API_URL}/solicitudes/notificaciones`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Marca una notificación como leída
 * @param notificacionId - ID de la notificación
 * @returns Mensaje de confirmación
 */
export async function marcarNotificacionLeida(notificacionId: number): Promise<{ mensaje: string }> {
  const response = await axios.put(
    `${API_URL}/solicitudes/notificaciones/leer/${notificacionId}`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
}

/**
 * Marca todas las notificaciones del usuario como leídas
 * @returns Mensaje de confirmación
 */
export async function marcarTodasNotificacionesLeidas(): Promise<{ mensaje: string }> {
  const response = await axios.put(
    `${API_URL}/solicitudes/notificaciones/leer-todas`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
}

// VENTAS - Historial de transacciones completadas
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

/**
 * Obtiene las ventas realizadas por el vendedor actual
 * @returns Lista de ventas
 */
export async function obtenerMisVentas(): Promise<Venta[]> {
  const response = await axios.get(`${API_URL}/solicitudes/mis-ventas`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene las compras realizadas por el comprador actual
 * @returns Lista de compras
 */
export async function obtenerMisCompras(): Promise<Venta[]> {
  const response = await axios.get(`${API_URL}/solicitudes/mis-compras`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

// SOLICITUDES PARA SER VENDEDOR

export interface SolicitudVendedor {
  id: number;
  usuario_id: number;
  motivo: string;
  estado: string; // pendiente, aprobado, rechazado
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
 * Crea una solicitud para que un comprador se convierta en vendedor
 * @param data - Motivo de la solicitud
 * @returns Solicitud creada
 */
export async function crearSolicitudVendedor(data: CrearSolicitudVendedorData): Promise<SolicitudVendedor> {
  const response = await axios.post(`${API_URL}/solicitudes-vendedor/`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene todas las solicitudes de vendedor (solo administradores)
 * @returns Lista de solicitudes
 */
export async function obtenerSolicitudesVendedor(): Promise<SolicitudVendedor[]> {
  const response = await axios.get(`${API_URL}/solicitudes-vendedor/`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene la solicitud del usuario actual para ser vendedor
 * @returns Solicitud del usuario o null si no existe
 */
export async function obtenerMiSolicitudVendedor(): Promise<SolicitudVendedor | null> {
  const response = await axios.get(`${API_URL}/solicitudes-vendedor/mi-solicitud`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Aprueba o rechaza una solicitud de vendedor (solo administradores)
 * @param solicitudId - ID de la solicitud
 * @param estado - 'aprobado' o 'rechazado'
 * @param respuesta_admin - Mensaje de respuesta del admin
 * @returns Solicitud actualizada
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

// CIFRADO DE MENSAJES (SHA-256)
import { cifrarSHA256 } from "../utils/cifrado";

export interface MensajeCifrado {
  textoOriginal: string;  // Mensaje original
  hash: string;           // Hash SHA-256 del mensaje
}

/**
 * Prepara un mensaje cifrado para enviar al backend
 * Utiliza SHA-256 para generar un hash del mensaje
 * @param mensaje - Texto a cifrar
 * @returns Objeto con texto original y hash
 */
export function prepararMensajeCifrado(mensaje: string): MensajeCifrado {
  return {
    textoOriginal: mensaje,
    hash: cifrarSHA256(mensaje)
  };
}

/**
 * Verifica la integridad de un mensaje comparando su hash
 * @param mensaje - Mensaje recibido
 * @param hash - Hash almacenado previamente
 * @returns true si el mensaje no ha sido alterado
 */
export function verificarIntegridadMensaje(mensaje: string, hash: string): boolean {
  return cifrarSHA256(mensaje) === hash;
}

// REPORTES DE VENDEDORES - Quejas de compradores contra vendedores
export interface ReporteVendedor {
  id: number;
  comprador_id: number;
  vendedor_id: number;
  motivo: string;
  estado: string; // pendiente, resuelto, rechazado
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
 * Crea un reporte contra un vendedor (solo compradores pueden reportar)
 * @param data - ID del vendedor y motivo del reporte
 * @returns Reporte creado
 */
export async function crearReporteVendedor(data: CrearReporteData): Promise<ReporteVendedor> {
  const response = await axios.post(`${API_URL}/reportes/vendedor`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene todos los reportes (solo administradores)
 * @param estado - Filtro opcional por estado ('pendiente', 'resuelto', 'rechazado')
 * @returns Lista de reportes
 */
export async function obtenerTodosReportes(estado?: string): Promise<ReporteVendedor[]> {
  const url = estado ? `${API_URL}/reportes/todos?estado=${estado}` : `${API_URL}/reportes/todos`;
  const response = await axios.get(url, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene los reportes de un vendedor específico (solo administradores)
 * @param vendedorId - ID del vendedor
 * @returns Lista de reportes del vendedor
 */
export async function obtenerReportesVendedor(vendedorId: number): Promise<ReporteVendedor[]> {
  const response = await axios.get(`${API_URL}/reportes/vendedor/${vendedorId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Actualiza el estado de un reporte (solo administradores)
 * @param reporteId - ID del reporte
 * @param estado - Nuevo estado ('resuelto' o 'rechazado')
 * @param respuesta_admin - Respuesta del administrador (opcional)
 * @returns Reporte actualizado
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
 * Cuenta los reportes de un vendedor (para estadísticas)
 * @param vendedorId - ID del vendedor
 * @returns Totales de reportes (total, pendientes, resueltos)
 */
export async function contarReportesVendedor(vendedorId: number): Promise<{ total: number; pendientes: number; resueltos: number }> {
  const response = await axios.get(`${API_URL}/reportes/vendedor/${vendedorId}/contar`, {
    headers: getAuthHeader(),
  });
  return response.data;
}