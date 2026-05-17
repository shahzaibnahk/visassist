"""
Security utilities for VissaAssist - Password hashing with bcrypt
"""
import jwt
from datetime import datetime, timedelta
from typing import Optional, Any
from bcrypt import hashpw, checkpw, gensalt
from app.core.config import settings

def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    """Create a new JWT access token."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    """Create a new JWT refresh token."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    """Verify a JWT token and return its payload."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != token_type:
            return None
        return payload
    except jwt.PyJWTError:
        return None

def hash_password(password: str) -> str:
    """Hash password using bcrypt for secure storage."""
    salt = gensalt(rounds=12)
    hashed = hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hash.
    Handles both valid bcrypt hashes and plain text for backward compatibility."""
    try:
        # Try bcrypt verification first
        return checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except (ValueError, TypeError):
        # If bcrypt fails (invalid salt/hash), try plain text comparison
        # for backward compatibility with any existing plain text passwords
        return plain_password == hashed_password

# Keep backward compatibility
def get_password_hash(password: str) -> str:
    """Alias for hash_password for backward compatibility."""
    return hash_password(password)

