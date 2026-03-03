import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function getAuthHeader() {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
}

// En la interfaz para crear un producto
export interface ProductoCreate {
    nombre: string;
    descripcion: string;
    precio: number;
}

// Respuesta del producto
export interface Producto extends ProductoCreate {
    id: number;
}

/**
 * Crear nuevo producto
 * @param producto - Datos del producto a crear
 */
export async function crearProducto(producto: ProductoCreate): Promise<Producto> {
    console.log("URL:", `${API_URL}/productos/`);
    console.log("Datos enviados:", producto);

    const response = await axios.post(`${API_URL}/productos/`, producto, {
    headers: getAuthHeader(),
    });
    return response.data;
}

/**
 * Para obtener los productos
 */
export async function listarProductos(): Promise<Producto[]> {
    const response = await axios.get(`${API_URL}/productos/`, {
    headers: getAuthHeader(),
    });
    return response.data;
}