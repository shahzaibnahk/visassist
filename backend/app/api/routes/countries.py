from fastapi import APIRouter
from typing import List, Dict

router = APIRouter()

COUNTRIES_DATA = [
    {"code": "US", "name": "United States", "flag": "🇺🇸", "popular": True, "processing_days": "10-15"},
    {"code": "CA", "name": "Canada", "flag": "🇨🇦", "popular": True, "processing_days": "15-20"},
    {"code": "GB", "name": "United Kingdom", "flag": "🇬🇧", "popular": True, "processing_days": "10-15"},
    {"code": "AU", "name": "Australia", "flag": "🇦🇺", "popular": True, "processing_days": "20-30"},
    {"code": "DE", "name": "Germany", "flag": "🇩🇪", "popular": True, "processing_days": "15-25"},
    {"code": "FR", "name": "France", "flag": "🇫🇷", "popular": False, "processing_days": "10-20"},
    {"code": "JP", "name": "Japan", "flag": "🇯🇵", "popular": False, "processing_days": "5-10"},
    {"code": "SG", "name": "Singapore", "flag": "🇸🇬", "popular": False, "processing_days": "3-5"},
    {"code": "AE", "name": "UAE", "flag": "🇦🇪", "popular": True, "processing_days": "5-10"},
    {"code": "NZ", "name": "New Zealand", "flag": "🇳🇿", "popular": False, "processing_days": "20-30"},
]

VISA_TYPES = {
    "TOURIST": "Tourist Visa",
    "STUDENT": "Student Visa",
    "WORK": "Work Visa",
    "BUSINESS": "Business Visa",
    "FAMILY": "Family Visa",
    "TRANSIT": "Transit Visa",
}

@router.get("/")
async def get_all_countries():
    """Get all available countries"""
    return {"countries": COUNTRIES_DATA, "total": len(COUNTRIES_DATA)}

@router.get("/{country_code}")
async def get_country(country_code: str):
    """Get specific country information"""
    country = next((c for c in COUNTRIES_DATA if c["code"] == country_code), None)
    if not country:
        return {"error": "Country not found"}, 404
    return country

@router.get("/{country_code}/visa-types")
async def get_visa_types(country_code: str):
    """Get available visa types for a country"""
    return {"country_code": country_code, "visa_types": list(VISA_TYPES.values())}
