from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class ProfilePersonalInfo(BaseModel):
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    date_of_birth: Optional[str] = None
    passport_number: Optional[str] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None


class EducationEntry(BaseModel):
    institution_name: str = Field(..., min_length=2, max_length=150)
    qualification: str = Field(..., min_length=2, max_length=150)
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    grade: Optional[str] = None
    country: Optional[str] = None
    description: Optional[str] = None


class EmploymentEntry(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=150)
    job_title: str = Field(..., min_length=2, max_length=150)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    currently_working: bool = False
    location: Optional[str] = None
    responsibilities: Optional[str] = None


class UserProfileUpdate(BaseModel):
    personal_info: Optional[ProfilePersonalInfo] = None
    education_history: Optional[List[EducationEntry]] = None
    employment_history: Optional[List[EmploymentEntry]] = None


class UserProfileResponse(UserProfileUpdate):
    profile_completion: int = 0

    class Config:
        from_attributes = True