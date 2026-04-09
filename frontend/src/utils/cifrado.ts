import * as CryptoJS from "crypto-js";

/**
 * Cifra un mensaje usando SHA-256
 * @param mensaje - Texto a cifrar
 * @returns Hash SHA-256 del mensaje
 */
export function cifrarSHA256(mensaje: string): string {
  return CryptoJS.SHA256(mensaje).toString();
}

/**
 * Verifica si un mensaje coincide con un hash
 * @param mensaje - Texto original
 * @param hash - Hash almacenado
 * @returns true si coinciden
 */
export function verificarHash(mensaje: string, hash: string): boolean {
  return cifrarSHA256(mensaje) === hash;
}

/**
 * Cifra un mensaje con un salt adicional para mayor seguridad
 * @param mensaje - Texto a cifrar
 * @param salt - Valor adicional para el cifrado
 */
export function cifrarConSalt(mensaje: string, salt: string): string {
  return CryptoJS.SHA256(mensaje + salt).toString();
}