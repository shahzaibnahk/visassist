from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime

from app.schemas.profile import UserProfileResponse

class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=3, max_length=100)
    
class UserCreate(UserBase):
    """Schema for user registration"""
    password: str = Field(..., min_length=8)
    phone: str = Field(..., min_length=10)
    country: str = Field(..., min_length=2)
    
class UserUpdate(BaseModel):
    """Schema for user profile updates"""
    full_name: Optional[str] = Field(None, min_length=3, max_length=100)
    phone: Optional[str] = Field(None, min_length=10)
    country: Optional[str] = None
    avatar: Optional[str] = None
    preferences: Optional[dict] = None

class UserResponse(UserBase):
    """Schema for user response (no sensitive data)"""
    id: str
    phone: str
    country: str
    role: str = "user"
    user_type: str = "local_user"
    is_active: bool = True
    is_deleted: bool = False
    email_verified: bool = False
    avatar: Optional[str] = None
    last_login: Optional[datetime] = None
    profile: Optional[UserProfileResponse] = None
    profile_completion: int = 0
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserCreateAdmin(BaseModel):
    """Schema for admin creating users"""
    email: str
    full_name: str
    phone: str
    country: str
    password: str
    user_type: Literal["local_user", "manager", "admin", "sales", "operation", "finance"] = "local_user"
    role: Literal["user", "admin", "sales", "operation", "finance"] = "user"
    is_active: bool = True


class UserUpdateAdmin(BaseModel):
    """Schema for admin updating users"""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    password: Optional[str] = None
    user_type: Optional[Literal["local_user", "manager", "admin", "sales", "operation", "finance"]] = None
    role: Optional[Literal["user", "admin", "sales", "operation", "finance"]] = None
    is_active: Optional[bool] = None


class UserAdminResponse(UserBase):
    """Schema for admin user listing"""
    id: str
    phone: str
    country: str
    role: str
    user_type: str
    is_active: bool
    is_deleted: bool
    email_verified: bool
    avatar: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
