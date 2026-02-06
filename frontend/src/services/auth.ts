import axios from "axios";
//importamos axios para la verificacion

const API_URL = import.meta.env.VITE_API_URL;
//con esto podemos acceder a la url de conexion, es una instancia de conexion de la url 

export async function login(username: string, password: string) {
  //creamos una funcion para login que recibe 2 datos tipo string
  const params = new URLSearchParams(); //creamos un arreglo
  params.append("username", username);
  params.append("password", password);
  //agregamos una clave con un valor a el arreglo

  
  const response = await axios.post(`${API_URL}/login`, params, {
    /*creamos un metodo el cual esspera una respuesta de el envio de los datos
    almacenados en el arreglo params, enviamos los datos como un tipo de contenido especifico
    segun sea el endpoint*/
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  // al iniciar sesion guardamos el token en la localstorage
  localStorage.setItem("token", response.data.access_token);

  return response.data;//regresamos la respuesta de la peticion a el endpoint
}
//funcion que usamos para logg a el usuario, al confirmar y enviar los datos en el formato requerido por el endpoint
//lo que hacemos es recibir el token y guardarlo, este lo usamos para la autenticacion de usuario