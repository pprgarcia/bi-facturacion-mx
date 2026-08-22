from argon2 import PasswordHasher
import jwt
from datetime import datetime, timedelta

import os
from dotenv import load_dotenv

load_dotenv() # Carga las variables del .env
ph = PasswordHasher()
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "SecretKeyForJWT")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(hashed: str, plain: str) -> bool:
    try:
        return ph.verify(hashed, plain)
    except:
        return False

def create_token(data: dict):
    # El token expira en 24 horas para este ejemplo
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)