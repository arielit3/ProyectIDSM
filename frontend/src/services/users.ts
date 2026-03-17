import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function getAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Tipos para los roles
export type Rol = "administrador" | "vendedor" | "cliente";

// Interfaz para crear usuario (registro)
export interface UsuarioCreate {
  apodo: string;
  nombre: string;
  correo: string;
  telefono: string;
  matricula: number;
  password: string;
  rol: Rol;
  recaptcha_token?: string;
}

// Interfaz para la respuesta del usuario (incluye relación)
export interface Usuario {
  id: number;
  apodo: string;
  nombre: string;
  correo: string;
  telefono: string;
  relacion: {
    matricula: number;
    rol: Rol;
  };
}

// ============ ENDPOINTS PÚBLICOS ============

/**
 * Crea un nuevo usuario (registro público - NO requiere autenticación)
 */
export async function crearUsuario(data: UsuarioCreate): Promise<Usuario> {
  const response = await axios.post(`${API_URL}/usuarios/`, data);
  return response.data;
}

// ============ ENDPOINTS PROTEGIDOS ============

/**
 * Obtiene la lista de todos los usuarios (requiere autenticación)
 */
export async function listarUsuarios(): Promise<Usuario[]> {
  const response = await axios.get(`${API_URL}/usuarios/`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Elimina un usuario por su ID (requiere autenticación)
 */
export async function eliminarUsuario(id: number): Promise<{ mensaje: string }> {
  const response = await axios.delete(`${API_URL}/usuarios/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

/**
 * Obtiene los datos del usuario actual (autenticado)
 */
export async function obtenerUsuarioActual(): Promise<Usuario> {
  try {
    const response = await axios.get(`${API_URL}/usuarios/me`, {
      headers: getAuthHeader(),
    });
    console.log("Usuario actual:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error al obtener usuario actual:", error);
    throw error;
  }
}

// ============ MODIFICACIONES DE PERFIL ============

export async function modificarNombre(nombre: string): Promise<{ mensaje: string }> {
  const response = await axios.put(
    `${API_URL}/usuarios/modificar-nombre`,
    { valor: nombre },  // Usa 'valor' porque el backend espera CampoUpdate
    { headers: getAuthHeader() }
  );
  return response.data;
}

export async function modificarCorreo(correo: string): Promise<{ mensaje: string }> {
  const response = await axios.put(
    `${API_URL}/usuarios/modificar-correo`,
    { valor: correo },  // Usa 'valor' porque el backend espera CampoUpdate
    { headers: getAuthHeader() }
  );
  return response.data;
}

export async function modificarApodo(apodo: string): Promise<{ mensaje: string }> {
  const response = await axios.put(
    `${API_URL}/usuarios/modificar-apodo`,
    { valor: apodo },  // Usa 'valor' porque el backend espera CampoUpdate
    { headers: getAuthHeader() }
  );
  return response.data;
}

export async function modificarTelefono(telefono: string): Promise<{ mensaje: string }> {
  const response = await axios.put(
    `${API_URL}/usuarios/modificar-telefono`,
    { valor: telefono },  // Usa 'valor' porque el backend espera CampoUpdate
    { headers: getAuthHeader() }
  );
  return response.data;
}

export async function modificarPassword(password: string): Promise<{ mensaje: string }> {
  const response = await axios.put(
    `${API_URL}/usuarios/modificar-password`,
    { password },  // CORREGIDO: Envía { password } directamente
    { headers: getAuthHeader() }
  );
  return response.data;
}

// ============ FUNCIÓN UNIFICADA PARA ACTUALIZAR PERFIL ============

interface UpdateUserData {
  nombre?: string;
  correo?: string;
  apodo?: string;
  telefono?: string;
  password?: string;
  recaptcha_token?: string;
}

interface ResultadoActualizacion {
  campo: string;
  exito: boolean;
  mensaje?: string;
  error?: any;
}

/**
 * Actualiza múltiples campos del perfil del usuario
 * Usa Promise.allSettled para manejar éxitos y errores parciales
 */
export const actualizarUsuario = async (userId: number, userData: UpdateUserData) => {
  const promesas: Promise<any>[] = [];
  const campos: string[] = [];

  // Preparar todas las promesas
  if (userData.nombre !== undefined) {
    promesas.push(modificarNombre(userData.nombre));
    campos.push("nombre");
  }

  if (userData.correo !== undefined) {
    promesas.push(modificarCorreo(userData.correo));
    campos.push("correo");
  }

  if (userData.apodo !== undefined) {
    promesas.push(modificarApodo(userData.apodo));
    campos.push("apodo");
  }

  if (userData.telefono !== undefined) {
    promesas.push(modificarTelefono(userData.telefono));
    campos.push("telefono");
  }

  if (userData.password) {
    promesas.push(modificarPassword(userData.password));
    campos.push("password");
  }

  if (promesas.length === 0) {
    return {
      mensaje: "No hay cambios para guardar",
      exitosos: [],
      fallidos: []
    };
  }

  // Ejecutar todas las promesas en paralelo
  const resultados = await Promise.allSettled(promesas);
  
  const exitosos: ResultadoActualizacion[] = [];
  const fallidos: ResultadoActualizacion[] = [];

  resultados.forEach((result, index) => {
    const campo = campos[index];
    if (result.status === "fulfilled") {
      exitosos.push({
        campo,
        exito: true,
        mensaje: result.value.mensaje
      });
    } else {
      fallidos.push({
        campo,
        exito: false,
        error: result.reason?.response?.data?.detail || result.reason?.message || "Error desconocido"
      });
    }
  });

  return {
    mensaje: fallidos.length === 0 
      ? "Perfil actualizado correctamente" 
      : `Se actualizaron ${exitosos.length} campos, ${fallidos.length} fallaron`,
    exitosos,
    fallidos
  };
};