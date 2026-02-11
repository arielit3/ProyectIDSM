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
  const response = await axios.get(`${API_URL}/usuarios/me`, {
    headers: getAuthHeader(), // envia el token en el header
  });
  return response.data;
}