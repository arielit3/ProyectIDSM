import base64
import hashlib
import os


SECRET = os.getenv("APP_MESSAGE_SECRET", "toroeats-mensajes")


def _keystream(length: int) -> bytes:
    #:> Esto arma un flujo de bytes a partir de una llave fija para cifrar y descifrar
    bloque = b""
    contador = 0

    while len(bloque) < length:
        semilla = f"{SECRET}:{contador}".encode("utf-8")
        bloque += hashlib.sha256(semilla).digest()
        contador += 1

    return bloque[:length]


def encrypt_text(texto: str) -> str:
    #:> Aqui el texto se guarda ofuscado para que no quede legible en la BD
    if texto is None:
        return ""

    data = texto.encode("utf-8")
    mask = _keystream(len(data))
    cifrado = bytes(a ^ b for a, b in zip(data, mask))
    return base64.urlsafe_b64encode(cifrado).decode("utf-8")


def decrypt_text(texto_cifrado: str | None) -> str:
    #:> Esto devuelve el texto normal para las respuestas del API
    if not texto_cifrado:
        return ""
    try:
        data = base64.urlsafe_b64decode(texto_cifrado.encode("utf-8"))
        mask = _keystream(len(data))
        texto = bytes(a ^ b for a, b in zip(data, mask))
        return texto.decode("utf-8")
    except Exception:
        #:> Si llega texto viejo en plano lo regresamos tal cual para no romper vistas ni consultas
        return texto_cifrado
