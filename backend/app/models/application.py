from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId
from app.models.user import PyObjectId
from app.schemas.profile import EducationEntry, EmploymentEntry

class PersonalInfo(BaseModel):
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    date_of_birth: str
    nationality: str
    passport_number: str
    passport_expiry: str
    gender: str
    marital_status: str

class ContactInfo(BaseModel):
    email: EmailStr
    phone: str
    address: str
    city: str
    state: Optional[str] = None
    postal_code: str
    country: str

class TravelInfo(BaseModel):
    purpose_of_visit: str
    intended_arrival_date: str
    intended_departure_date: Optional[str] = None
    duration_of_stay: str
    accommodation_details: Optional[str] = None
    travel_history: Optional[List[str]] = []

class EmploymentInfo(BaseModel):
    occupation: str
    employer_name: Optional[str] = None
    employer_address: Optional[str] = None
    institution_name: Optional[str] = None
    institution_address: Optional[str] = None
    monthly_income: Optional[str] = None
    employment_status: str

class ApplicationModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: PyObjectId
    country: str
    country_code: str
    visa_type: str
    application_number: Optional[str] = None
    status: str = "draft"  # draft, submitted, processing, under_review, reviewed, fee_unpaid, fee_verification, fee_verified, fee_verification_failed, final_approved, final_rejected, approved, rejected
    
    # Application form data
    personal_info: Optional[PersonalInfo] = None
    contact_info: Optional[ContactInfo] = None
    travel_info: Optional[TravelInfo] = None
    employment_info: Optional[EmploymentInfo] = None
    education_history: List[EducationEntry] = Field(default_factory=list)
    employment_history: List[EmploymentEntry] = Field(default_factory=list)
    
    # Additional fields
    documents: List[str] = []
    uploaded_files: List[Dict[str, Any]] = []
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    assigned_to_role: Optional[str] = None
    assigned_to_user_id: Optional[PyObjectId] = None
    assignment_notes: Optional[str] = None
    
    # Finance/Invoice fields
    invoice_id: Optional[PyObjectId] = None
    invoice_generated_at: Optional[datetime] = None
    invoice_generated_by: Optional[PyObjectId] = None
    payment_proof_id: Optional[PyObjectId] = None
    payment_proof_uploaded_at: Optional[datetime] = None
    fee_verified_at: Optional[datetime] = None
    fee_verified_by: Optional[PyObjectId] = None
    fee_verification_notes: Optional[str] = None
    fee_verification_rejected_reason: Optional[str] = None
    final_approval_at: Optional[datetime] = None
    final_approved_by: Optional[PyObjectId] = None
    final_approval_notes: Optional[str] = None
    
    # Metadata
    ai_assistance_used: bool = False
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[PyObjectId] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[PyObjectId] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
