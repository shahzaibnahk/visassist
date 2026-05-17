from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from bson import ObjectId
from app.core.database import get_database
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, verify_token
from app.core.dependencies import get_current_active_user
from app.schemas.auth import UserLogin, LoginResponse, RefreshRequest, TokenResponse
from app.schemas.user import UserCreate, UserResponse
from app.schemas.profile import UserProfileResponse, UserProfileUpdate
from app.services.audit_service import audit_service
from app.services.lead_service import create_or_get_lead

router = APIRouter()


def _default_profile(email: str = "", phone: str = "", country: str = "") -> dict:
    return {
        "personal_info": {
            "first_name": "",
            "middle_name": "",
            "last_name": "",
            "email": email,
            "phone": phone,
            "address": "",
            "city": "",
            "state": "",
            "postal_code": "",
            "country": country,
            "date_of_birth": "",
            "passport_number": "",
            "gender": "",
            "marital_status": "",
        },
        "education_history": [],
        "employment_history": [],
    }


def _to_plain_value(value):
    if hasattr(value, "model_dump"):
        return value.model_dump(exclude_unset=True)
    if isinstance(value, list):
        return [_to_plain_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _to_plain_value(item) for key, item in value.items()}
    return value


def _normalize_profile(user_doc: dict) -> dict:
    profile = user_doc.get("profile") or {}
    normalized = _default_profile(
        email=user_doc.get("email", ""),
        phone=user_doc.get("phone", ""),
        country=user_doc.get("country", ""),
    )
    normalized["personal_info"].update(profile.get("personal_info") or {})
    normalized["personal_info"].setdefault("email", user_doc.get("email", ""))
    normalized["personal_info"].setdefault("phone", user_doc.get("phone", ""))
    normalized["personal_info"].setdefault("country", user_doc.get("country", ""))
    normalized["education_history"] = _to_plain_value(profile.get("education_history") or [])
    normalized["employment_history"] = _to_plain_value(profile.get("employment_history") or [])
    return normalized


def _calculate_profile_completion(user_doc: dict) -> int:
    profile = _normalize_profile(user_doc)
    personal = profile["personal_info"]
    checks = [
        bool(user_doc.get("full_name")),
        bool(user_doc.get("email")),
        bool(personal.get("phone") or user_doc.get("phone")),
        bool(personal.get("address")),
        bool(personal.get("city")),
        bool(personal.get("country") or user_doc.get("country")),
        bool(personal.get("date_of_birth")),
        bool(personal.get("passport_number")),
        bool(profile["education_history"]),
        bool(profile["employment_history"]),
    ]
    return int(round((sum(checks) / len(checks)) * 100)) if checks else 0


def _build_user_response(user_doc: dict) -> UserResponse:
    profile = _normalize_profile(user_doc)
    profile_response = UserProfileResponse(
        personal_info=profile.get("personal_info"),
        education_history=profile.get("education_history") or [],
        employment_history=profile.get("employment_history") or [],
        profile_completion=_calculate_profile_completion(user_doc),
    )
    user_id = str(user_doc.get("_id") or user_doc.get("id"))
    return UserResponse(
        id=user_id,
        email=user_doc["email"],
        full_name=user_doc.get("full_name", ""),
        phone=user_doc.get("phone", ""),
        country=user_doc.get("country", ""),
        role=user_doc.get("role", "user"),
        user_type=user_doc.get("user_type", "local_user"),
        is_active=user_doc.get("is_active", True),
        is_deleted=user_doc.get("is_deleted", False),
        email_verified=user_doc.get("email_verified", False),
        avatar=user_doc.get("avatar"),
        last_login=user_doc.get("last_login"),
        profile=profile_response,
        profile_completion=profile_response.profile_completion,
        created_at=user_doc.get("created_at", datetime.utcnow()),
        updated_at=user_doc.get("updated_at", datetime.utcnow()),
    )

@router.post("/signup", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate, db = Depends(get_database)):
    """Register a new user - saves to database."""
    
    # Check if email already exists and is active (not deleted)
    existing_user = await db["users"].find_one({"email": user_data.email, "is_deleted": False})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user document
    now = datetime.utcnow()
    user_dict = {
        "email": user_data.email,
        "full_name": user_data.full_name,
        "password_hash": get_password_hash(user_data.password),
        "phone": user_data.phone,
        "country": user_data.country,
        "role": "user",
        "user_type": "local_user",
        "is_active": True,
        "is_deleted": False,
        "email_verified": False,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
        "last_login": None,
        "avatar": None,
        "preferences": {},
        "profile": _default_profile(email=user_data.email, phone=user_data.phone, country=user_data.country),
    }
    
    # Insert user into database
    result = await db["users"].insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    await audit_service.log_activity(
        action="SIGNUP",
        entity_type="USER",
        details=f"New user registered: {user_data.email}",
        user_id=user_id,
        entity_id=user_id
    )
    
    # Issue tokens
    access_token = create_access_token(subject=user_id)
    refresh_token = create_refresh_token(subject=user_id)
    
    user_response = _build_user_response({**user_dict, "_id": user_id})

    # Create a generic lead entry for this user email
    try:
        await create_or_get_lead(db, user_data.email, full_name=user_data.full_name, phone=user_data.phone, source='signup')
    except Exception as e:
        print('Warning: could not create lead for new signup', e)
    
    return LoginResponse(
        success=True,
        message="Account created successfully",
        user=user_response,
        access_token=access_token,
        refresh_token=refresh_token
    )

@router.post("/login", response_model=LoginResponse)
async def login(credentials: UserLogin, db = Depends(get_database)):
    """Login user - simple email/password check."""
    
    # Check for hardcoded admin credentials
    ADMIN_EMAIL = "admin@vissaassist.com"
    ADMIN_PASSWORD = "Admin@123"
    
    if credentials.email == ADMIN_EMAIL and credentials.password == ADMIN_PASSWORD:
        now = datetime.utcnow()
        # Find if this test admin exists in DB so we can assign an actual ID, or default.
        admin_doc = await db["users"].find_one({"email": ADMIN_EMAIL})
        if admin_doc:
            user_id = str(admin_doc["_id"])
            admin_source = {**admin_doc, "last_login": now}
        else:
            # First time logging in with hardcoded admin - create DB entry
            user_dict = {
                "email": ADMIN_EMAIL,
                "full_name": "Admin User",
                "password_hash": get_password_hash(ADMIN_PASSWORD),
                "phone": "+1234567890",
                "country": "USA",
                "role": "admin",
                "user_type": "admin",
                "is_active": True,
                "is_deleted": False,
                "email_verified": True,
                "created_at": now,
                "updated_at": now,
                "avatar": None,
                "preferences": {},
                "last_login": None,
                "deleted_at": None,
                "profile": _default_profile(email=ADMIN_EMAIL, phone="+1234567890", country="USA"),
            }
            res = await db["users"].insert_one(user_dict)
            user_id = str(res.inserted_id)
            admin_source = {**user_dict, "_id": user_id, "last_login": now}
            
        await audit_service.log_activity(
            action="LOGIN",
            entity_type="USER",
            details="Admin user logged in",
            user_id=user_id,
            entity_id=user_id
        )
            
        access_token = create_access_token(subject=user_id)
        refresh_token = create_refresh_token(subject=user_id)
        
        admin_user = _build_user_response(admin_source)
        return LoginResponse(
            success=True,
            message="Admin login successful",
            user=admin_user,
            access_token=access_token,
            refresh_token=refresh_token
        )
    
    # Find user by email
    user_data = await db["users"].find_one({
        "email": {"$regex": f"^{credentials.email}$", "$options": "i"},
        "is_deleted": {"$ne": True}
    })
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    stored_password = user_data.get("password") or user_data.get("password_hash")
    if not stored_password or not verify_password(credentials.password, stored_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Update last login
    now = datetime.utcnow()
    await db["users"].update_one(
        {"_id": user_data["_id"]},
        {"$set": {"last_login": now}}
    )
    
    user_id = str(user_data["_id"])
    
    await audit_service.log_activity(
        action="LOGIN",
        entity_type="USER",
        details=f"User logged in: {credentials.email}",
        user_id=user_id,
        entity_id=user_id
    )
    
    # Generate tokens
    access_token = create_access_token(subject=user_id)
    refresh_token = create_refresh_token(subject=user_id)
    
    user_response = _build_user_response({**user_data, "last_login": now})
    
    return LoginResponse(
        success=True,
        message="Login successful",
        user=user_response,
        access_token=access_token,
        refresh_token=refresh_token
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshRequest):
    """Issue a new access token using a valid refresh token."""
    payload = verify_token(request.refresh_token, token_type="refresh")
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    access_token = create_access_token(subject=user_id)
    new_refresh_token = create_refresh_token(subject=user_id)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token
    )

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user = Depends(get_current_active_user)):
    """Fetch profile details using current valid token"""
    return _build_user_response(dict(current_user))


@router.get("/profile", response_model=UserProfileResponse)
async def get_my_profile_details(current_user = Depends(get_current_active_user)):
    """Fetch the editable profile data for the logged-in user."""
    user_dict = dict(current_user)
    profile = _normalize_profile(user_dict)
    return UserProfileResponse(
        personal_info=profile.get("personal_info"),
        education_history=profile.get("education_history") or [],
        employment_history=profile.get("employment_history") or [],
        profile_completion=_calculate_profile_completion(user_dict),
    )


@router.put("/profile", response_model=UserResponse)
async def update_my_profile(payload: UserProfileUpdate, db = Depends(get_database), current_user = Depends(get_current_active_user)):
    """Update the logged-in user's profile and sync key account fields."""
    user_id = str(current_user.id)
    user_doc = await db["users"].find_one({"_id": ObjectId(user_id), "is_deleted": {"$ne": True}})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    current_profile = _normalize_profile(user_doc)
    updated_profile = {
        "personal_info": {
            **current_profile["personal_info"],
            **(_to_plain_value(payload.personal_info) if payload.personal_info else {}),
        },
        "education_history": _to_plain_value(payload.education_history) if payload.education_history is not None else current_profile["education_history"],
        "employment_history": _to_plain_value(payload.employment_history) if payload.employment_history is not None else current_profile["employment_history"],
    }

    personal_info = updated_profile["personal_info"]
    update_fields = {
        "profile": updated_profile,
        "full_name": " ".join(part for part in [personal_info.get("first_name", ""), personal_info.get("middle_name", ""), personal_info.get("last_name", "")] if part).strip() or user_doc.get("full_name", ""),
        "phone": personal_info.get("phone") or user_doc.get("phone", ""),
        "country": personal_info.get("country") or user_doc.get("country", ""),
        "updated_at": datetime.utcnow(),
    }
    if personal_info.get("email") and personal_info.get("email") != user_doc.get("email"):
        existing = await db["users"].find_one({"email": personal_info.get("email"), "_id": {"$ne": ObjectId(user_id)}, "is_deleted": {"$ne": True}})
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        update_fields["email"] = personal_info.get("email")

    await db["users"].update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})
    updated_user = await db["users"].find_one({"_id": ObjectId(user_id)})
    return _build_user_response(updated_user)

@router.post("/logout")
async def logout(current_user = Depends(get_current_active_user)):
    """Logout endpoint - just returns success (handled client-side)."""
    # Create an audit log for logout
    user_dict = dict(current_user)
    user_id = str(user_dict.get("_id") or user_dict.get("id"))
    
    await audit_service.log_activity(
        action="LOGOUT",
        entity_type="USER",
        details="User logged out",
        user_id=user_id,
        entity_id=user_id
    )
    
    return {"success": True, "message": "Logged out successfully"}

