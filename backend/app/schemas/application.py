from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, EmailStr, Field

from app.schemas.profile import EducationEntry, EmploymentEntry

class PersonalInfoSchema(BaseModel):
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    date_of_birth: str
    nationality: str
    passport_number: str
    passport_expiry: str
    gender: str
    marital_status: str

class ContactInfoSchema(BaseModel):
    email: EmailStr
    phone: str
    address: str
    city: str
    state: Optional[str] = None
    postal_code: str
    country: str

class TravelInfoSchema(BaseModel):
    purpose_of_visit: str
    intended_arrival_date: str
    intended_departure_date: Optional[str] = None
    duration_of_stay: str
    accommodation_details: Optional[str] = None
    travel_history: Optional[List[str]] = []

class EmploymentInfoSchema(BaseModel):
    occupation: str
    employer_name: Optional[str] = None
    employer_address: Optional[str] = None
    institution_name: Optional[str] = None
    institution_address: Optional[str] = None
    monthly_income: Optional[str] = None
    employment_status: str

class ApplicationCreate(BaseModel):
    country: str
    country_code: str
    visa_type: str
    personal_info: Optional[PersonalInfoSchema] = None
    contact_info: Optional[ContactInfoSchema] = None
    travel_info: Optional[TravelInfoSchema] = None
    employment_info: Optional[EmploymentInfoSchema] = None
    documents: List[str] = []
    notes: Optional[str] = None
    ai_assistance_used: bool = False
    education_history: List[EducationEntry] = Field(default_factory=list)
    employment_history: List[EmploymentEntry] = Field(default_factory=list)

class ApplicationUpdate(BaseModel):
    country: Optional[str] = None
    country_code: Optional[str] = None
    visa_type: Optional[str] = None
    status: Optional[str] = None
    application_number: Optional[str] = None
    personal_info: Optional[PersonalInfoSchema] = None
    contact_info: Optional[ContactInfoSchema] = None
    travel_info: Optional[TravelInfoSchema] = None
    employment_info: Optional[EmploymentInfoSchema] = None
    education_history: Optional[List[EducationEntry]] = None
    employment_history: Optional[List[EmploymentEntry]] = None
    documents: Optional[List[str]] = None
    notes: Optional[str] = None
    ai_assistance_used: Optional[bool] = None
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    assigned_to_role: Optional[str] = None
    assigned_to_user_id: Optional[str] = None
    assignment_notes: Optional[str] = None
    cancellation_reason: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    application_number: Optional[str] = None
    country: str
    country_code: str
    visa_type: str
    status: str
    personal_info: Optional[PersonalInfoSchema] = None
    contact_info: Optional[ContactInfoSchema] = None
    travel_info: Optional[TravelInfoSchema] = None
    employment_info: Optional[EmploymentInfoSchema] = None
    education_history: List[EducationEntry] = Field(default_factory=list)
    employment_history: List[EmploymentEntry] = Field(default_factory=list)
    submitted_at: Optional[datetime] = None
    updated_at: datetime
    documents: List[str]
    uploaded_files: List[Dict[str, Any]] = []
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    assigned_to_role: Optional[str] = None
    assigned_to_user_id: Optional[str] = None
    assignment_notes: Optional[str] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None
    cancellation_reason: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    invoice_id: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_amount: Optional[float] = None
    invoice_generated_at: Optional[datetime] = None
    payment_proof_uploaded_at: Optional[datetime] = None
    payment_proof_id: Optional[str] = None
    created_at: Optional[datetime] = None
    ai_assistance_used: bool

    class Config:
        from_attributes = True
