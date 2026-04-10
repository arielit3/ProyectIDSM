from datetime import datetime, timedelta
from jose import JWTError, jwt
from hashlib import sha256
from fastapi.security import OAuth2PasswordBearer

#:> Estas constantes mandan la firma del JWT y el tiempo de vida del token

SECRET_KEY = "toroeats"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")
#:> Este helper le dice a FastAPI que tome el bearer token desde /login

def hash_password(password: str) -> str:
    #:> Esto transforma la contrasena en hash para guardarla o compararla
    # Usar SHA-256 como metodo temporal para hashear(cifrar) contraseñas
    return sha256(password.encode('utf-8')).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    #:> Esto valida si la contrasena que llega coincide con la que ya esta guardada
    # Verificar si la contraseniaa hasheada coincde con la contrasenia 
    return hash_password(plain) == hashed

def create_access_token(data: dict): #metodo para crear token de acceso
    #:> Esto arma el JWT que luego usa el frontend en endpoints protegidos
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
