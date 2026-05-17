from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models.user import PyObjectId

class AuditLogModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: Optional[PyObjectId] = None
    action: str  # e.g., "LOGIN", "APPLICATION_SUBMITTED", "USER_UPDATED"
    entity_type: str  # e.g., "USER", "APPLICATION", "AUTH"
    entity_id: Optional[str] = None
    details: str
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
