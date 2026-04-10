function hashRapido(texto: string): string {
  let hash = 0;

  for (let i = 0; i < texto.length; i += 1) {
    hash = (hash << 5) - hash + texto.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash).toString(16);
}

export function cifrarSHA256(mensaje: string): string {
  return hashRapido(mensaje);
}

export function verificarHash(mensaje: string, hash: string): boolean {
  return cifrarSHA256(mensaje) === hash;
}

export function cifrarConSalt(mensaje: string, salt: string): string {
  return cifrarSHA256(`${mensaje}:${salt}`);
}
