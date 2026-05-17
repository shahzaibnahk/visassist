from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.user import PyObjectId


class InvoiceCreate(BaseModel):
    """Schema for creating an invoice."""
    application_id: PyObjectId
    amount: float
    currency: str = "USD"
    description: Optional[str] = "Visa Application Processing Fee"
    due_date: Optional[datetime] = None
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    """Schema for updating an invoice."""
    status: Optional[str] = None
    notes: Optional[str] = None
    sent_to_email: Optional[str] = None


class InvoiceResponse(BaseModel):
    """Schema for invoice response."""
    id: str
    application_id: str
    invoice_number: str
    amount: float
    currency: str
    status: str
    invoice_date: datetime
    due_date: Optional[datetime]
    generated_at: datetime
    sent_at: Optional[datetime]
    notes: Optional[str]

    class Config:
        arbitrary_types_allowed = True
