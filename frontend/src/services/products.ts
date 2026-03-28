import api from "./api";

// ============================================================================
// TIPOS
// ============================================================================

export interface Producto {
  id: number;
  vendedor_id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: string;
  imagen_nombre: string | null;
  activo: number; // 1 = visible, 0 = oculto
  vendedor?: {
    id: number;
    nombre: string;
    apodo: string;
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

/**
 * Crea un nuevo producto con imagen opcional.
 * Usa multipart/form-data — axios lo detecta automaticamente al recibir FormData,
 * no es necesario especificar el Content-Type manualmente.
 */
export async function crearProductoConImagen(formData: FormData): Promise<Producto> {
  const response = await api.post(`/productos/`, formData);
  return response.data;
}

/**
 * Obtiene todos los productos del vendedor autenticado (incluye ocultos).
 * El token se adjunta automaticamente via el interceptor de api.ts.
 */
export async function listarMisProductos(): Promise<Producto[]> {
  const response = await api.get(`/productos/mis-productos`);
  return response.data;
}

/**
 * Obtiene todos los productos visibles de todos los vendedores.
 */
export async function listarTodosProductos(): Promise<Producto[]> {
  const response = await api.get(`/productos/`);
  return response.data;
}

/**
 * Obtiene los productos visibles de un vendedor especifico por su ID.
 */
export async function listarProductosPorVendedor(vendedorId: number): Promise<Producto[]> {
  const response = await api.get(`/productos/vendedor/${vendedorId}`);
  return response.data;
}

/**
 * Actualiza los campos de un producto existente (solo el dueno puede hacerlo).
 */
export async function actualizarProducto(
  productoId: number,
  data: ProductoUpdate
): Promise<Producto> {
  const response = await api.put(`/productos/${productoId}`, data);
  return response.data;
}

/**
 * Elimina un producto permanentemente (solo el dueno puede hacerlo).
 */
export async function eliminarProducto(
  productoId: number
): Promise<{ mensaje: string }> {
  const response = await api.delete(`/productos/${productoId}`);
  return response.data;
}

/**
 * Alterna la visibilidad de un producto entre visible (1) y oculto (0).
 */
export async function toggleProductoVisibilidad(
  productoId: number
): Promise<{ mensaje: string; activo: number }> {
  const response = await api.patch(`/productos/${productoId}/toggle`, {});
  return response.data;
}

// ============================================================================
// FAVORITOS
// ============================================================================

/**
 * Agrega un producto a los favoritos del usuario autenticado.
 */
export async function agregarFavorito(
  productoId: number
): Promise<{ mensaje: string }> {
  const response = await api.post(`/productos/${productoId}/favorito`, {});
  return response.data;
}

/**
 * Obtiene todos los favoritos del usuario autenticado con detalles del producto.
 */
export async function obtenerFavoritos(): Promise<any[]> {
  const response = await api.get(`/productos/favoritos`);
  return response.data;
}

/**
 * Elimina un producto de los favoritos del usuario autenticado.
 */
export async function quitarFavorito(
  productoId: number
): Promise<{ mensaje: string }> {
  const response = await api.delete(`/productos/${productoId}/favorito`);
  return response.data;
}