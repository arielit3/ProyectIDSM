from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
import secrets
import string
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import models
from deps import get_db

load_dotenv()

#:> Este router maneja envio de correos utilitarios y el flujo OTP de registro
router = APIRouter(tags=["email"])

# Correo de soporte para desbloqueos y solicitudes de ayuda
SOPORTE_EMAIL = "toritoseats@gmail.com"


class EmailRequest(BaseModel):
    #:> Este modelo recibe un correo destino para pruebas de envio
    email: EmailStr


class SendOTPRequest(BaseModel):
    #:> Este modelo recibe el correo al que se le mandara el OTP
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    #:> Este modelo recibe correo y codigo para validar el OTP guardado
    email: EmailStr
    codigo: str


@router.post("/enviar-correo-prueba")
def enviar_correo_prueba(request: EmailRequest):
    #:> Este endpoint solo prueba que el servidor SMTP este mandando correos
    """
    Este endpoint es solo para pruebas de envio de correo a una direccion especifica,
    se usan las credenciales de EMAIL_USER y EMAIL_PASS para autenticar con el servidor SMTP
    y asi enviar el correo de prueba a la direccion especificada en el request
    """
    try:
        # Obtener credenciales de variables de entorno
        email_user = os.getenv("EMAIL_USER")
        email_pass = os.getenv("EMAIL_PASS")

        if not email_user or not email_pass:
            raise HTTPException(
                status_code=500,
                detail="Credenciales de email no configuradas"
            )

        # Configuracion del servidor SMTP
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com").strip()
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        print(f"DEBUG: Intentando prueba con {smtp_server}:{smtp_port}...")

        # Crear el mensaje
        message = MIMEMultipart()
        message["From"] = email_user
        message["To"] = request.email
        message["Subject"] = "Prueba de envio"

        # Cuerpo del correo
        body = "q rollo pa, soy fastapi y te estoy enviando este correo de prueba"
        message.attach(MIMEText(body, "plain"))

        # Conectar y enviar el correo
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=15) as server:
                server.set_debuglevel(1)  # Activa logs detallados en la consola
                server.login(email_user, email_pass)
                server.send_message(message)
        else:
            with smtplib.SMTP(smtp_server, smtp_port, timeout=15) as server:
                server.set_debuglevel(1)  # Activa logs detallados en la consola
                server.starttls()
                server.login(email_user, email_pass)
                server.send_message(message)

        return {"status": "sent"}

    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=401,
            detail="Error de autenticacion con el servidor SMTP"
        )
    except smtplib.SMTPException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error SMTP: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al enviar el correo: {str(e)}"
        )


@router.post("/enviar-otp")
def enviar_otp(request: SendOTPRequest, db: Session = Depends(get_db)):
    #:> Este endpoint genera un OTP, lo guarda en BD y lo manda por correo
    """
    Genera un codigo OTP de 6 digitos y lo envia por correo al email especificado.
    
    Logica:
    - Si existe OTP bloqueado para ese email, rechaza la solicitud (debe contactar soporte)
    - Si existe OTP vigente, lo elimina y crea uno nuevo
    - El nuevo OTP tiene validez de 5 minutos e intentos_restantes=6
    
    Retorna {"status": "sent"} si el envio fue exitoso.
    """
    try:
        # Validar que el email no este ya registrado en usuarios
        usuario_existente = db.query(models.Usuario).filter(
            models.Usuario.correo == request.email
        ).first()
        
        if usuario_existente:
            raise HTTPException(
                status_code=400,
                detail="Este correo ya esta registrado"
            )
        
        # Verificar si existe un OTP bloqueado para este email
        otp_bloqueado = db.query(models.VerificacionOTP).filter(
            models.VerificacionOTP.email == request.email,
            models.VerificacionOTP.estado == 'bloqueado'
        ).first()
        
        if otp_bloqueado:
            raise HTTPException(
                status_code=403,
                detail=f"Este email esta bloqueado. Contacta a {SOPORTE_EMAIL} para desbloquear tu cuenta"
            )
        
        # Buscar si existe un OTP vigente para este email y eliminarlo
        otp_existente = db.query(models.VerificacionOTP).filter(
            models.VerificacionOTP.email == request.email,
            models.VerificacionOTP.estado == 'vigente'
        ).first()
        
        if otp_existente:
            db.delete(otp_existente)
            db.commit()
        
        # Generar codigo OTP aleatorio de 6 digitos
        codigo_otp = ''.join(secrets.choice(string.digits) for _ in range(6))
        
        # Calcular fecha de expiracion (5 minutos desde ahora)
        fecha_creacion = datetime.utcnow()
        fecha_expiracion = fecha_creacion + timedelta(minutes=5)
        
        # Crear registro de verificacion OTP en la BD
        verificacion_otp = models.VerificacionOTP(
            email=request.email,
            codigo=codigo_otp,
            created_at=fecha_creacion,
            expires_at=fecha_expiracion,
            intentos_restantes=4,
            estado='vigente'
        )
        db.add(verificacion_otp)
        db.commit()
        
        # Obtener credenciales de variables de entorno
        email_user = os.getenv("EMAIL_USER")
        email_pass = os.getenv("EMAIL_PASS")
        
        if not email_user or not email_pass:
            raise HTTPException(
                status_code=500,
                detail="Credenciales de email no configuradas"
            )
        
        # Configuracion del servidor SMTP
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com").strip()
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        print(f"DEBUG: Enviando OTP a {request.email} via {smtp_server}:{smtp_port}...")
        
        # Crear el mensaje de correo
        message = MIMEMultipart()
        message["From"] = email_user
        message["To"] = request.email
        message["Subject"] = "Codigo de verificacion"
        
        # Cuerpo del correo con el codigo OTP
        body = f"Tu codigo de verificacion es: {codigo_otp}\n\nEste codigo expira en 5 minutos."
        message.attach(MIMEText(body, "plain"))
        
        # Conectar y enviar el correo
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=10) as server:
                server.set_debuglevel(1)
                server.login(email_user, email_pass)
                server.send_message(message)
        else:
            with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
                server.set_debuglevel(1)
                server.starttls()
                server.login(email_user, email_pass)
                server.send_message(message)
        
        return {"status": "sent"}
    
    except HTTPException:
        raise
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=401,
            detail="Error de autenticacion con el servidor SMTP"
        )
    except smtplib.SMTPException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error SMTP: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al enviar el OTP: {str(e)}"
        )


@router.post("/verificar-otp")
def verificar_otp(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    #:> Este endpoint revisa si el codigo recibido sigue vigente y si coincide con el guardado
    """
    Valida el codigo OTP ingresado por el usuario.
    
    Logica de puntos crecientes:
    - 1er intento fallido: resta 1 punto (intentos_restantes = 5)
    - 2do intento fallido: resta 2 puntos (intentos_restantes = 3)
    - 3er intento fallido: resta 3 puntos (intentos_restantes = 0, bloqueado)
    
    Si el codigo es correcto:
    - Marca el OTP como 'usado' y retorna {"status": "verified"}
    
    Si codigo incorrecto:
    - Incrementa puntos y valida si debe bloquear
    
    Si OTP expirado o bloqueado:
    - Retorna error 400 o 403
    """
    try:
        # Buscar el OTP para este email
        otp = db.query(models.VerificacionOTP).filter(
            models.VerificacionOTP.email == request.email,
            models.VerificacionOTP.estado != 'usado'
        ).first()
        
        # Si no existe OTP para este email
        if not otp:
            raise HTTPException(
                status_code=404,
                detail="No hay codigo OTP vigente para este correo"
            )
        
        # Si el OTP esta bloqueado
        if otp.estado == 'bloqueado':
            raise HTTPException(
                status_code=403,
                detail=f"Este email esta bloqueado por exceso de intentos. Contacta a {SOPORTE_EMAIL}"
            )
        
        # Verificar que el OTP no haya expirado
        if datetime.utcnow() > otp.expires_at:
            otp.estado = 'expirado'
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="El codigo OTP ha expirado. Solicita uno nuevo"
            )
        
        # Verificar que el codigo ingresado sea correcto
        if otp.codigo != request.codigo:
            # Restar 1 intento por cada fallo
            otp.intentos_restantes -= 1
            
            # Validar si se debe bloquear (cuando intentos_restantes llega a 0)
            if otp.intentos_restantes <= 0:
                otp.estado = 'bloqueado'
                otp.intentos_restantes = 0
                db.commit()
                raise HTTPException(
                    status_code=429,
                    detail=f"Demasiados intentos fallidos. Tu cuenta ha sido bloqueada. Contacta a {SOPORTE_EMAIL} para desbloquearla"
                )
            
            # Retornar intentos restantes
            db.commit()
            raise HTTPException(
                status_code=401,
                detail=f"Codigo incorrecto. Te quedan {otp.intentos_restantes} intentos"
            )
        
        # Si el codigo es correcto, marcar como usado
        otp.estado = 'usado'
        db.commit()
        
        return {"status": "verified"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al verificar el OTP: {str(e)}"
        )
