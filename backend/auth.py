from datetime import datetime, timedelta
from jose import JWTError, jwt
from hashlib import sha256
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = "toroeats"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def hash_password(password: str) -> str:
    # Usar SHA-256 como metodo temporal para hashear(cifrar) contraseñas
    return sha256(password.encode('utf-8')).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    # Verificar si la contraseniaa hasheada coincde con la contrasenia 
    return hash_password(plain) == hashed

def create_access_token(data: dict): #metodo para crear token de acceso
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)