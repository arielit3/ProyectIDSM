import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// ============================================================================
// INSTANCIA COMPARTIDA DE AXIOS
// ============================================================================

/**
 * Instancia central de axios que usa toda la aplicacion.
 *
 * Por que usar esto en lugar de axios directo con getAuthHeader():
 * Cuando el usuario inicia sesion, el token se guarda en localStorage y
 * React navega al dashboard inmediatamente. En ese instante, los componentes
 * se montan y hacen peticiones casi al mismo tiempo. Si cada funcion llamaba
 * getAuthHeader() por su cuenta, habia un riesgo de que leyera localStorage
 * antes de que el sistema operativo (especialmente en iOS/Android) terminara
 * de escribir el token, resultando en peticiones sin autorizacion que fallaban
 * silenciosamente y devolvian datos vacios.
 *
 * El interceptor resuelve esto porque:
 * 1. Se ejecuta justo ANTES de que axios envie cada peticion (no al definir la funcion)
 * 2. Lee el token en el ultimo momento posible, garantizando que ya este disponible
 * 3. Es el unico lugar donde se maneja la autenticacion — no hay que recordar
 *    agregar headers en cada llamada individual
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