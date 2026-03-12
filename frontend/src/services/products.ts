import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function getAuthHeader() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

// Interfaz para crear un producto (ahora incluye vendedor_id y stock)
export interface ProductoCreate {
  vendedor_id: number;  // 👈 NUEVO: ID del vendedor
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;        // 👈 NUEVO: Stock del producto
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
  producto?: Producto;  // Información del producto (si se incluye)
}

/**
 * Crea un nuevo producto
 * @param producto - Datos del producto a crear
 */
export async function crearProducto(producto: ProductoCreate): Promise<Producto> {
  console.log("📤 Creando producto:", producto);
  console.log("URL:", `${API_URL}/productos/`);
  
  const response = await axios.post(`${API_URL}/productos/`, producto, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene todos los productos
 */
export async function listarProductos(): Promise<Producto[]> {
  const response = await axios.get(`${API_URL}/productos/`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

// ============ FUNCIONES PARA FAVORITOS ============

/**
 * Agrega un producto a favoritos
 * @param productoId - ID del producto a agregar
 */
export async function agregarFavorito(productoId: number): Promise<{ mensaje: string }> {
  const response = await axios.post(
    `${API_URL}/productos/${productoId}/favorito`,
    {}, // Cuerpo vacío
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