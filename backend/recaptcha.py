import requests
import os
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()  # Carga variables de entorno

# Obtener la secret key de las variables de entorno
RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY")

async def verify_recaptcha(token: str):
    #:> Este helper valida un token de Google reCAPTCHA contra el servicio oficial
    #:> Se puede reutilizar en flujos sensibles si luego deciden prender esa capa desde backend
    """
    Verifica que el token de reCAPTCHA sea válido
    """
    if not token:
        raise HTTPException(
            status_code=400,
            detail="Token de reCAPTCHA no proporcionado"
        )
    
    # URL de verificación de Google
    url = "https://www.google.com/recaptcha/api/siteverify"
    
    # Datos a enviar
    data = {
        "secret": RECAPTCHA_SECRET_KEY,
        "response": token
    }
    
    try:
        # Hacer la petición a Google
        response = requests.post(url, data=data)
        result = response.json()
        
        # Verificar si la validación fue exitosa
        if not result.get("success"):
            print(f"Error de reCAPTCHA: {result}")  # Para debug
            raise HTTPException(
                status_code=400,
                detail="Verificación de seguridad fallida. Por favor, intenta de nuevo."
            )
        
        return True
        
    except Exception as e:
        print(f"Error al verificar reCAPTCHA: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error al verificar el reCAPTCHA"
        )
