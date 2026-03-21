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
  vendedor?: {
    id: number;
    nombre: string;
    apodo: string;
  };
}

/**
 * Crea un nuevo producto con imagen
 */
export async function crearProductoConImagen(
  formData: FormData
): Promise<Producto> {
  const response = await axios.post(`${API_URL}/productos/`, formData, {
    headers: {
      ...getAuthHeader(),
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

/**
 * Obtiene todos los productos (para compradores)
 */
export async function listarTodosProductos(): Promise<Producto[]> {
  const response = await axios.get(`${API_URL}/productos/`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene productos por categoría
 */
export async function listarProductosPorCategoria(categoria: string): Promise<Producto[]> {
  const response = await axios.get(`${API_URL}/productos/categoria/${categoria}`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene productos de un vendedor específico
 */
export async function listarProductosPorVendedor(vendedorId: number): Promise<Producto[]> {
  const response = await axios.get(`${API_URL}/productos/vendedor/${vendedorId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene un producto por su ID
 */
export async function obtenerProducto(productoId: number): Promise<Producto> {
  const response = await axios.get(`${API_URL}/productos/${productoId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

// ============ FUNCIONES DE FAVORITOS ============

export async function agregarFavorito(productoId: number): Promise<{ mensaje: string }> {
  const response = await axios.post(
    `${API_URL}/productos/${productoId}/favorito`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
}

export async function obtenerFavoritos(): Promise<any[]> {
  const response = await axios.get(`${API_URL}/productos/favoritos`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function quitarFavorito(productoId: number): Promise<{ mensaje: string }> {
  const response = await axios.delete(
    `${API_URL}/productos/${productoId}/favorito`,
    { headers: getAuthHeader() }
  );
  return response.data;
}