import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function getAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────

export type Rol = "administrador" | "vendedor" | "cliente";

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

// ────────────────────────────────────────────
// Endpoints de usuarios
// ────────────────────────────────────────────

/** Registro público — sin header de autenticación */
export async function crearUsuario(data: UsuarioCreate): Promise<Usuario> {
  const response = await axios.post(`${API_URL}/usuarios/`, data);
  return response.data;
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const response = await axios.get(`${API_URL}/usuarios/`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function eliminarUsuario(id: number): Promise<{ mensaje: string }> {
  const response = await axios.delete(`${API_URL}/usuarios/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function obtenerUsuarioActual(): Promise<Usuario> {
  const response = await axios.get(`${API_URL}/usuarios/me`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

// ────────────────────────────────────────────
// Modificación de perfil
// Todos envían { valor } — el backend usa CampoUpdate para todos
// ────────────────────────────────────────────

export async function modificarNombre(nombre: string): Promise<{ mensaje: string }> {
  const response = await axios.put(
    `${API_URL}/usuarios/modificar-nombre`,
    { valor: nombre },
    { headers: getAuthHeader() }
  );
  return response.data;
}

export async function modificarCorreo(correo: string): Promise<{ mensaje: string }> {
  const response = await axios.put(
    `${API_URL}/usuarios/modificar-correo`,
    { valor: correo },
    { headers: getAuthHeader() }
  );
  return response.data;
}

export async function modificarApodo(apodo: string): Promise<{ mensaje: string }> {
  const response = await axios.put(
    `${API_URL}/usuarios/modificar-apodo`,
    { valor: apodo },
    { headers: getAuthHeader() }
  );
  return response.data;
}

export async function modificarTelefono(telefono: string): Promise<{ mensaje: string }> {
  const response = await axios.put(
    `${API_URL}/usuarios/modificar-telefono`,
    { valor: telefono },
    { headers: getAuthHeader() }
  );
  return response.data;
}

/**
 * El backend usa CampoUpdate para todos los campos, incluyendo password.
 * Se envía { valor } igual que los demás.
 */
export async function modificarPassword(password: string): Promise<{ mensaje: string }> {
  const response = await axios.put(
    `${API_URL}/usuarios/modificar-password`,
    { valor: password },
    { headers: getAuthHeader() }
  );
  return response.data;
}

// ────────────────────────────────────────────
// Función unificada para actualizar perfil
// ────────────────────────────────────────────

interface UpdateUserData {
  nombre?: string;
  correo?: string;
  apodo?: string;
  telefono?: string;
  password?: string;
}

interface ResultadoActualizacion {
  campo: string;
  exito: boolean;
  mensaje?: string;
  error?: string;
}

export async function actualizarUsuario(
  userData: UpdateUserData
): Promise<{ mensaje: string; exitosos: ResultadoActualizacion[]; fallidos: ResultadoActualizacion[] }> {
  const tareas: Array<{ campo: string; promesa: Promise<{ mensaje: string }> }> = [];

  if (userData.nombre   !== undefined) tareas.push({ campo: "nombre",   promesa: modificarNombre(userData.nombre) });
  if (userData.correo   !== undefined) tareas.push({ campo: "correo",   promesa: modificarCorreo(userData.correo) });
  if (userData.apodo    !== undefined) tareas.push({ campo: "apodo",    promesa: modificarApodo(userData.apodo) });
  if (userData.telefono !== undefined) tareas.push({ campo: "telefono", promesa: modificarTelefono(userData.telefono) });
  if (userData.password)               tareas.push({ campo: "password", promesa: modificarPassword(userData.password) });

  if (tareas.length === 0) {
    return { mensaje: "No hay cambios para guardar", exitosos: [], fallidos: [] };
  }

  const resultados = await Promise.allSettled(tareas.map((t) => t.promesa));

  const exitosos: ResultadoActualizacion[] = [];
  const fallidos: ResultadoActualizacion[] = [];

  resultados.forEach((res, i) => {
    const campo = tareas[i].campo;
    if (res.status === "fulfilled") {
      exitosos.push({ campo, exito: true, mensaje: res.value.mensaje });
    } else {
      console.error(`Error al actualizar ${campo}:`, res.reason);
      fallidos.push({
        campo,
        exito: false,
        error: res.reason?.response?.data?.detail ?? res.reason?.message ?? "Error desconocido",
      });
    }
  });

  return {
    mensaje: fallidos.length === 0
      ? "Perfil actualizado correctamente"
      : `Se actualizaron ${exitosos.length} campos, ${fallidos.length} fallaron`,
    exitosos,
    fallidos,
  };
}