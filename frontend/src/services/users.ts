import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function getAuthHeader() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

//estas funciones, son la puerta de envio de datos entre el front y back
//para crearlas primero, debe ser async pues esperara respuesta de la peticion
/*damos nombre y entre parentesis se ingresan los datos que solicita la peticion(o los datos que enviamos)*/
export async function crearUsuario(data:/*Todos los datos se guardan dentro de una lista*/ {
  nombre: string; //Datos que enviamos a la peticion
  correo: string; //Datos que enviamos a la peticion
  telefono: string; //Datos que enviamos a la peticion
  matricula: number; //Datos que enviamos a la peticion
  password: string; //Datos que enviamos a la peticion
  rol_id: number;             //Datos que enviamos a la peticion
  recaptcha_token?: string; // 👈 AGREGADO (opcional por si acaso)
}) //una vez se enviamos los datos
 {
  //creamos una constante, esta la usaremos como metodo de envio de datos/*
  // hacia la peticion, debe ser await para esperar la respuesta, axios nos permite ejecutar el tipo de peticion
  // en base a http, ingresamos axios.post, axios.get, axios.patch, segun el tipo, luego entre parentesis
  // ingresamos hacia donde se envian que es el servidor donde corre el back, el cual esta 
  // almacenado en una variable de entorno virtual, luego ingresamos lo que seria el filtro/distintivo que
  // suele usarse para destinguir peticiones y espicificar su uso, luego, enviamos
  // el arreglo data el cual contiene todos los datos que envie el que use esta funcion*/
  const response = await axios.post(`${API_URL}/usuarios/`, data, {
    //espera la respuesta y la obtiene en headers
    headers: getAuthHeader(),
  });
  return response.data;//con esto obtenemos el resultado que envia la peticion, ya sea si se registro, si no
  //y cual fue el error
}

export async function listarUsuarios() {
  const response = await axios.get(`${API_URL}/usuarios/`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function eliminarUsuario(id: number) {
  const response = await axios.delete(`${API_URL}/usuarios/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function obtenerUsuarioActual() {
   try {
    const response = await axios.get(`${API_URL}/usuarios/me`, {
      headers: getAuthHeader(),
    });
    console.log("Respuesta completa del backend:", response.data); // <-- Debug
    return response.data;
  } catch (error) {
    console.error("Error al obtener usuario actual:", error);
    throw error;
  }
}

// ============ NUEVOS ENDPOINTS PARA MODIFICAR PERFIL ============

/**
 * Modifica el apodo del usuario actual
 * @param apodo - Nuevo apodo
 * @param recaptchaToken - Token de reCAPTCHA (opcional por ahora)
 */
export async function modificarApodo(apodo: string, recaptchaToken?: string) {
  const response = await axios.put(
    `${API_URL}/usuarios/modificar-apodo`,
    { apodo, ...(recaptchaToken && { recaptcha_token: recaptchaToken }) }, // 👈 Solo incluir si existe
    { headers: getAuthHeader() }
  );
  return response.data;
}

/**
 * Modifica la matrícula del usuario actual
 * @param matricula - Nueva matrícula (número)
 * @param recaptchaToken - Token de reCAPTCHA (opcional por ahora)
 */
export async function modificarMatricula(matricula: number, recaptchaToken?: string) {
  const response = await axios.put(
    `${API_URL}/usuarios/modificar-matricula`,
    { matricula, ...(recaptchaToken && { recaptcha_token: recaptchaToken }) }, // 👈 Solo incluir si existe
    { headers: getAuthHeader() }
  );
  return response.data;
}

/**
 * Modifica el teléfono del usuario actual
 * @param telefono - Nuevo teléfono
 * @param recaptchaToken - Token de reCAPTCHA (opcional por ahora)
 */
export async function modificarTelefono(telefono: string, recaptchaToken?: string) {
  const response = await axios.put(
    `${API_URL}/usuarios/modificar-telefono`,
    { telefono, ...(recaptchaToken && { recaptcha_token: recaptchaToken }) }, // 👈 Solo incluir si existe
    { headers: getAuthHeader() }
  );
  return response.data;
}

/**
 * Modifica la contraseña del usuario actual
 * @param password - Nueva contraseña
 * @param recaptchaToken - Token de reCAPTCHA (opcional por ahora)
 */
export async function modificarPassword(password: string, recaptchaToken?: string) {
  const response = await axios.put(
    `${API_URL}/usuarios/modificar-password`,
    { password, ...(recaptchaToken && { recaptcha_token: recaptchaToken }) }, // 👈 Solo incluir si existe
    { headers: getAuthHeader() }
  );
  return response.data;
}

// servicio para actualizar usuario - AHORA USA LOS NUEVOS ENDPOINTS
export const actualizarUsuario = async (userId: number, userData: any) => {
  const promises = [];
  const resultados = [];
  
  // Extraer el token si existe
  const recaptchaToken = userData.recaptcha_token;
  
  // Actualizar apodo si viene en los datos
  if (userData.apodo !== undefined) {
    try {
      const result = await modificarApodo(userData.apodo || "", recaptchaToken);
      resultados.push({ campo: "apodo", resultado: result });
    } catch (error) {
      console.error("Error al actualizar apodo:", error);
      throw error;
    }
  }
  
  // Actualizar matrícula si viene en los datos
  if (userData.matricula !== undefined) {
    try {
      const matriculaNum = typeof userData.matricula === 'string' 
        ? parseInt(userData.matricula) 
        : userData.matricula;
      
      if (!isNaN(matriculaNum)) {
        const result = await modificarMatricula(matriculaNum, recaptchaToken);
        resultados.push({ campo: "matricula", resultado: result });
      }
    } catch (error) {
      console.error("Error al actualizar matrícula:", error);
      throw error;
    }
  }
  
  // Actualizar teléfono si viene en los datos
  if (userData.telefono !== undefined) {
    try {
      const result = await modificarTelefono(userData.telefono || "", recaptchaToken);
      resultados.push({ campo: "telefono", resultado: result });
    } catch (error) {
      console.error("Error al actualizar teléfono:", error);
      throw error;
    }
  }
  
  // Actualizar contraseña si viene en los datos
  if (userData.password) {
    try {
      const result = await modificarPassword(userData.password, recaptchaToken);
      resultados.push({ campo: "password", resultado: result });
    } catch (error) {
      console.error("Error al actualizar contraseña:", error);
      throw error;
    }
  }
  
  return { 
    mensaje: "Perfil actualizado correctamente",
    resultados: resultados 
  };
};