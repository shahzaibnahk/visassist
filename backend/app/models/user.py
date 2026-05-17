from datetime import datetime
from typing import Any, Dict, Optional, Literal
from pydantic import BaseModel, Field, field_validator
from pydantic_core import core_schema
from bson import ObjectId

class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type: Any, _handler):
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ])
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

class UserModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    email: str
    full_name: str
    password_hash: str
    phone: str
    country: str
    role: Literal["user", "admin", "sales", "operation", "finance"] = "user"
    user_type: Literal["local_user", "manager", "admin", "sales", "operation", "finance"] = "local_user"
    is_active: bool = True
    is_deleted: bool = False  # Soft delete flag
    email_verified: bool = False
    avatar: Optional[str] = None
    last_login: Optional[datetime] = None
    preferences: Optional[dict] = None
    profile: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
