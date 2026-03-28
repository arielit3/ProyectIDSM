import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Instancia central de axios que usa toda la aplicacion.
 
 * Cuando el usuario inicia sesion, el token se guarda en localStorage y
 * React navega al dashboard inmediatamente. En ese instante, los componentes
 * se montan y hacen peticiones casi al mismo tiempo. 
 
 */
const api = axios.create({
  baseURL: API_URL,
});

// Interceptor de peticiones: adjunta el token Bearer en cada request automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;