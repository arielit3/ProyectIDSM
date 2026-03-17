import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function getAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Interfaz para crear un producto
export interface ProductoCreate {
  vendedor_id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
}

// Interfaz para la respuesta del producto
export interface Producto extends ProductoCreate {
  id: number;
}

// Interfaz para favoritos
export interface Favorito {
  id: number;
  usuario_id: number;
  producto_id: number;
}

// ============ PRODUCTOS ============

/**
 * Crea un nuevo producto
 */
export async function crearProducto(producto: ProductoCreate): Promise<Producto> {
  const response = await axios.post(`${API_URL}/productos/`, producto, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene todos los productos de un vendedor específico
 * @param vendedorId - ID del vendedor
 */
export async function listarProductosPorVendedor(vendedorId: number): Promise<Producto[]> {
  const response = await axios.get(`${API_URL}/productos/vendedor/${vendedorId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene un producto por su ID
 * @param productoId - ID del producto
 */
export async function obtenerProducto(productoId: number): Promise<Producto> {
  const response = await axios.get(`${API_URL}/productos/${productoId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene todos los productos (solo para admin)
 */
export async function listarTodosProductos(): Promise<Producto[]> {
  const response = await axios.get(`${API_URL}/productos/todos`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

// ============ FAVORITOS ============

/**
 * Agrega un producto a favoritos
 * @param productoId - ID del producto a agregar
 */
export async function agregarFavorito(productoId: number): Promise<{ mensaje: string }> {
  const response = await axios.post(
    `${API_URL}/productos/${productoId}/favorito`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
}

/**
 * Obtiene la lista de favoritos del usuario actual
 */
export async function obtenerFavoritos(): Promise<Favorito[]> {
  const response = await axios.get(`${API_URL}/productos/favoritos`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Elimina un producto de favoritos
 * @param productoId - ID del producto a eliminar
 */
export async function quitarFavorito(productoId: number): Promise<{ mensaje: string }> {
  const response = await axios.delete(
    `${API_URL}/productos/${productoId}/favorito`,
    { headers: getAuthHeader() }
  );
  return response.data;
}