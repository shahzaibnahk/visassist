from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models.user import PyObjectId


class InvoiceModel(BaseModel):
    """Invoice model for tracking generated invoices."""
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    application_id: PyObjectId
    user_id: PyObjectId
    invoice_number: str  # Unique invoice number (INV-2026-001, etc.)
    amount: float  # Invoice amount
    currency: str = "USD"
    description: Optional[str] = "Visa Application Processing Fee"
    
    # Status tracking
    status: str = "generated"  # generated, sent, paid, failed
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    generated_by: Optional[PyObjectId] = None
    sent_at: Optional[datetime] = None
    sent_to_email: Optional[str] = None
    
    # Invoice details
    invoice_date: datetime = Field(default_factory=datetime.utcnow)
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_deleted: bool = False

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
