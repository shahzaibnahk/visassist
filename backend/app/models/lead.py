from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from enum import Enum

class LeadSource(str, Enum):
    GENERIC = "generic"
    APPLICATION = "application"
    SIGNUP = "signup"
    MANUAL = "manual"

class LeadStage(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    IN_PROCESS = "in_process"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"

class FollowUp(BaseModel):
    task_id: Optional[str] = None
    type: str  # call, email, meeting, document
    title: str
    description: Optional[str] = None
    due_date: datetime
    status: str = "pending"  # pending, completed, cancelled
    assigned_to: Optional[str] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Communication(BaseModel):
    comm_id: Optional[str] = None
    type: str  # email, call, meeting, note
    subject: Optional[str] = None
    body: Optional[str] = None
    recipients: Optional[List[str]] = []
    sent_at: Optional[datetime] = None
    metadata: Optional[dict] = {}

class LeadBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = 'generic'
    stage: Optional[str] = 'new'
    status: Optional[str] = "active"  # active, inactive, converted
    priority: Optional[str] = "medium"  # low, medium, high
    assigned_to: Optional[str] = None
    country: Optional[str] = None
    visa_type: Optional[str] = None
    application_id: Optional[str] = None
    notes: Optional[str] = None
    follow_ups: Optional[List[FollowUp]] = []
    communications: Optional[List[Communication]] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_deleted: Optional[bool] = False

class LeadInDB(LeadBase):
    id: Optional[str]
