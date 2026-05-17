from pydantic import BaseModel, EmailStr
from .user import UserResponse

class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    """Simple login response with user data"""
    success: bool
    message: str
    user: UserResponse | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
    
class RefreshRequest(BaseModel):
    """Schema for token refresh"""
    refresh_token: str

class TokenResponse(BaseModel):
    """Response containing standard OAuth2 token fields"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
