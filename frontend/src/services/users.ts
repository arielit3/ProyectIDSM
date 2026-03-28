import api from "./api";

// ============================================================================
// TIPOS
// ============================================================================

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

// ============================================================================
// ENDPOINTS DE USUARIOS
// ============================================================================

/**
 * Registro publico — no requiere token, se usa axios directo para este caso.
 * El interceptor de api.ts igual lo manejaria sin problema, pero como es
 * registro publico no importa si hay token o no.
 */
export async function crearUsuario(data: UsuarioCreate): Promise<Usuario> {
  const response = await api.post(`/usuarios/`, data);
  return response.data;
}

/**
 * Lista todos los usuarios (solo administradores).
 */
export async function listarUsuarios(): Promise<Usuario[]> {
  const response = await api.get(`/usuarios/`);
  return response.data;
}

/**
 * Elimina un usuario por ID (solo administradores).
 */
export async function eliminarUsuario(id: number): Promise<{ mensaje: string }> {
  const response = await api.delete(`/usuarios/${id}`);
  return response.data;
}

/**
 * Obtiene los datos del usuario autenticado actualmente.
 * Esta funcion es llamada por DashboardPage al montar — el interceptor
 * garantiza que el token ya guardado en localStorage se adjunte correctamente.
 */
export async function obtenerUsuarioActual(): Promise<Usuario> {
  const response = await api.get(`/usuarios/me`);
  return response.data;
}

// ============================================================================
// MODIFICACION DE PERFIL
// Todos los endpoints usan { valor: string } segun el modelo CampoUpdate del backend
// ============================================================================

export async function modificarNombre(nombre: string): Promise<{ mensaje: string }> {
  const response = await api.put(`/usuarios/modificar-nombre`, { valor: nombre });
  return response.data;
}

export async function modificarCorreo(correo: string): Promise<{ mensaje: string }> {
  const response = await api.put(`/usuarios/modificar-correo`, { valor: correo });
  return response.data;
}

export async function modificarApodo(apodo: string): Promise<{ mensaje: string }> {
  const response = await api.put(`/usuarios/modificar-apodo`, { valor: apodo });
  return response.data;
}

export async function modificarTelefono(telefono: string): Promise<{ mensaje: string }> {
  const response = await api.put(`/usuarios/modificar-telefono`, { valor: telefono });
  return response.data;
}

/**
 * El backend usa CampoUpdate para todos los campos, incluyendo password.
 * Se envia { valor } igual que los demas campos de perfil.
 */
export async function modificarPassword(password: string): Promise<{ mensaje: string }> {
  const response = await api.put(`/usuarios/modificar-password`, { valor: password });
  return response.data;
}

// ============================================================================
// FUNCION UNIFICADA PARA ACTUALIZAR PERFIL
// ============================================================================

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

/**
 * Actualiza uno o varios campos del perfil en paralelo.
 * Retorna un resumen de cuales campos se actualizaron correctamente y cuales fallaron.
 */
export async function actualizarUsuario(
  userData: UpdateUserData
): Promise<{
  mensaje: string;
  exitosos: ResultadoActualizacion[];
  fallidos: ResultadoActualizacion[];
}> {
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
        error:
          res.reason?.response?.data?.detail ??
          res.reason?.message ??
          "Error desconocido",
      });
    }
  });

  return {
    mensaje:
      fallidos.length === 0
        ? "Perfil actualizado correctamente"
        : `Se actualizaron ${exitosos.length} campos, ${fallidos.length} fallaron`,
    exitosos,
    fallidos,
  };
}