from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from app.core.database import db
from app.core.config import settings
from app.models.user import UserModel
from app.schemas.user import UserAdminResponse, UserCreateAdmin, UserUpdateAdmin
from app.core.security import hash_password
from app.core.dependencies import get_current_admin_user
from app.services.audit_service import audit_service
from app.services.lead_service import create_or_get_lead
from pymongo import ReturnDocument

router = APIRouter(dependencies=[Depends(get_current_admin_user)])


class ApplicationStatusUpdateRequest(BaseModel):
    status: str
    admin_notes: Optional[str] = ""
    assign_to_role: Optional[str] = None
    assign_to_user_id: Optional[str] = None
    assignment_notes: Optional[str] = None

# Helper function to get collections
def get_users_collection():
    """Get users collection from database"""
    if db.client is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")
    database = db.client[settings.DATABASE_NAME]
    return database["users"]

def get_applications_collection():
    """Get applications collection from database"""
    if db.client is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")
    database = db.client[settings.DATABASE_NAME]
    return database["applications"]

def serialize_mongo_doc(doc):
    """Convert all ObjectId fields to strings in a document"""
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, dict):
                result[key] = serialize_mongo_doc(value)
            elif isinstance(value, list):
                result[key] = [serialize_mongo_doc(item) if isinstance(item, dict) else (str(item) if isinstance(item, ObjectId) else item) for item in value]
            else:
                result[key] = value
        return result
    return doc


async def generate_application_number() -> str:
    counters = db.client[settings.DATABASE_NAME]["counters"]
    seq = await counters.find_one_and_update(
        {"_id": "application_number"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    current = int((seq or {}).get("seq", 1))
    return f"VISA_{current:06d}"


# ==================== ADMIN DASHBOARD ====================

@router.get("/applications")
async def get_all_applications_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None),
    search: str = Query(""),
    deleted_only: bool = Query(False),
    include_deleted: bool = Query(False),
):
    """Admin endpoint to see all submitted/saved applications, oldest to newest"""
    try:
        apps_collection = get_applications_collection()
        query_filter = {}
        if deleted_only:
            query_filter["is_deleted"] = True
        elif not include_deleted:
            query_filter["is_deleted"] = {"$ne": True}

        if status:
            query_filter["status"] = status
        if search:
            query_filter["$or"] = [
                {"country": {"$regex": search, "$options": "i"}},
                {"visa_type": {"$regex": search, "$options": "i"}},
            ]
            
        total = await apps_collection.count_documents(query_filter)
        
        # Show latest first for admin operations.
        cursor = apps_collection.find(query_filter).sort("created_at", -1).skip(skip).limit(limit)
        applications = await cursor.to_list(length=limit)
        
        users_collection = get_users_collection()
        apps_response = []
        for app in applications:
            # Serialize all ObjectId fields to strings
            app = serialize_mongo_doc(app)
            app_id = str(app.pop("_id", ""))
            app["id"] = app_id
            
            if app.get("user_id"):
                user = None
                try:
                    if ObjectId.is_valid(str(app["user_id"])):
                        user = await users_collection.find_one({"_id": ObjectId(str(app["user_id"]))})
                    app["user_email"] = user.get("email") if user else "Unknown"
                    app["user_name"] = user.get("full_name") if user else "Unknown"
                except Exception:
                    app["user_email"] = "Unknown"
                    app["user_name"] = "Unknown"
            
            apps_response.append(app)
            
        return {
            "applications": apps_response,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/applications/flush")
async def flush_all_applications(current_admin: UserModel = Depends(get_current_admin_user)):
    """Delete all applications permanently for clean restart."""
    apps_collection = get_applications_collection()
    result = await apps_collection.delete_many({})

    await audit_service.log_activity(
        action="APPLICATIONS_FLUSHED_BY_ADMIN",
        entity_type="APPLICATION",
        details=f"Admin flushed all applications. Deleted count={result.deleted_count}",
        user_id=str(current_admin.id),
        entity_id=None,
    )

    return {"message": "All applications flushed successfully", "deleted_count": result.deleted_count}

@router.get("/audit-logs")
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """Get system audit logs (admin only)"""
    try:
        logs_collection = db.client[settings.DATABASE_NAME]["audit_logs"]
        total = await logs_collection.count_documents({})
        cursor = logs_collection.find({}).sort("created_at", -1).skip(skip).limit(limit)
        logs = await cursor.to_list(length=limit)
        
        logs_response = []
        for log in logs:
            log["id"] = str(log.pop("_id", ""))
            if "user_id" in log and log["user_id"]:
                log["user_id"] = str(log["user_id"])
            logs_response.append(log)
            
        return {
            "logs": logs_response,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== USER MANAGEMENT ENDPOINTS ====================

@router.get("/users")
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: str = Query(""),
    user_type: str = Query("", description="Filter by user_type: local_user, manager, admin or empty for all"),
    role: str = Query("", description="Filter by role: user, admin, sales, operation, finance"),
    is_active: Optional[bool] = Query(None)
):
    """Get all users with filters (excludes soft-deleted users)"""
    try:
        # Build query filter - exclude soft deleted users
        query_filter = {"is_deleted": False}
        
        # Apply search filter
        if search:
            query_filter["$or"] = [
                {"full_name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        
        # Apply user_type filter
        if user_type:
            query_filter["user_type"] = user_type
        if role:
            query_filter["role"] = role
        
        # Apply is_active filter
        if is_active is not None:
            query_filter["is_active"] = is_active
        
        # Get total count before pagination
        users_collection = get_users_collection()
        total = await users_collection.count_documents(query_filter)
        
        # Get paginated users
        users = await users_collection.find(query_filter).skip(skip).limit(limit).to_list(None)
        
        # Convert ObjectId to string for response
        users_response = []
        for user in users:
            user["id"] = str(user.get("_id", ""))
            user.pop("_id", None)
            users_response.append(user)
        
        return {
            "users": users_response,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/{user_id}")
async def get_user_detail(user_id: str):
    """Get detailed information about a specific user"""
    try:
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID")
        
        users_collection = get_users_collection()
        user = await users_collection.find_one({
            "_id": ObjectId(user_id),
            "is_deleted": False
        })
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user["id"] = str(user.get("_id", ""))
        user.pop("_id", None)
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users")
async def create_user(user_data: UserCreateAdmin, current_admin: UserModel = Depends(get_current_admin_user)):
    """Create a new user (admin only)"""
    try:
        users_collection = get_users_collection()
        # Check if user already exists
        existing_user = await users_collection.find_one({
            "email": user_data.email,
            "is_deleted": False
        })
        
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Create new user document
        new_user = {
            "email": user_data.email,
            "full_name": user_data.full_name,
            "phone": user_data.phone,
            "country": user_data.country,
            "password_hash": hash_password(user_data.password),
            "role": user_data.role,
            "user_type": user_data.user_type,
            "is_active": user_data.is_active,
            "is_deleted": False,
            "email_verified": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "deleted_at": None,
            "last_login": None,
            "avatar": None,
            "preferences": {}
        }
        
        result = await users_collection.insert_one(new_user)
        new_user["id"] = str(result.inserted_id)
        new_user.pop("_id", None)
        
        await audit_service.log_activity(
            action="USER_CREATED_BY_ADMIN",
            entity_type="USER",
            details=f"Admin created new user: {new_user['email']}",
            user_id=str(current_admin.id),
            entity_id=new_user["id"]
        )
        
        return {
            "message": "User created successfully",
            "user_id": str(result.inserted_id),
            "user": new_user
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: UserUpdateAdmin, current_admin: UserModel = Depends(get_current_admin_user)):
    """Update user information"""
    try:
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID")
        
        users_collection = get_users_collection()
        # Check user exists and not deleted
        user = await users_collection.find_one({
            "_id": ObjectId(user_id),
            "is_deleted": False
        })
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prepare update data
        update_data = {}
        if user_data.full_name is not None:
            update_data["full_name"] = user_data.full_name
        if user_data.phone is not None:
            update_data["phone"] = user_data.phone
        if user_data.country is not None:
            update_data["country"] = user_data.country
        if user_data.password is not None and len(user_data.password) >= 6:
            update_data["password_hash"] = hash_password(user_data.password)
        if user_data.role is not None:
            update_data["role"] = user_data.role
        if user_data.user_type is not None:
            update_data["user_type"] = user_data.user_type
        if user_data.is_active is not None:
            update_data["is_active"] = user_data.is_active
        
        update_data["updated_at"] = datetime.utcnow()
        
        # Update user
        result = await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update user")
        
        # Get updated user
        updated_user = await users_collection.find_one({
            "_id": ObjectId(user_id)
        })
        updated_user["id"] = str(updated_user.get("_id", ""))
        updated_user.pop("_id", None)
        
        await audit_service.log_activity(
            action="USER_UPDATED_BY_ADMIN",
            entity_type="USER",
            details=f"Admin updated user info for {user.get('email')}",
            user_id=str(current_admin.id),
            entity_id=user_id
        )
        
        return {
            "message": "User updated successfully",
            "user": updated_user
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, hard_delete: bool = Query(False), current_admin: UserModel = Depends(get_current_admin_user)):
    """Soft delete a user (or hard delete if specified)"""
    try:
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID")
        
        users_collection = get_users_collection()
        # Check user exists
        user = await users_collection.find_one({
            "_id": ObjectId(user_id)
        })
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if already_deleted := user.get("is_deleted", False):
            raise HTTPException(status_code=400, detail="User is already deleted")
        
        if hard_delete:
            # Hard delete - remove from database
            result = await users_collection.delete_one({
                "_id": ObjectId(user_id)
            })
            if result.deleted_count == 0:
                raise HTTPException(status_code=500, detail="Failed to delete user")
            
            await audit_service.log_activity(
                action="USER_DELETED_HARD",
                entity_type="USER",
                details=f"Admin permanently deleted user {user.get('email')}",
                user_id=str(current_admin.id),
                entity_id=user_id
            )
            return {"message": "User permanently deleted"}
        else:
            # Soft delete - mark as deleted
            result = await users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "is_deleted": True,
                        "deleted_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count == 0:
                raise HTTPException(status_code=500, detail="Failed to delete user")
            
            await audit_service.log_activity(
                action="USER_DELETED_SOFT",
                entity_type="USER",
                details=f"Admin soft-deleted user {user.get('email')}",
                user_id=str(current_admin.id),
                entity_id=user_id
            )
            return {"message": "User soft deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STATS ENDPOINTS ====================

@router.get("/stats")
async def get_admin_stats():
    """Get admin dashboard statistics"""
    try:
        users_collection = get_users_collection()
        # Count users (excluding soft deleted)
        total_users = await users_collection.count_documents({"is_deleted": False})
        active_users = await users_collection.count_documents({
            "is_deleted": False,
            "is_active": True
        })
        
        # Count users by type
        local_users = await users_collection.count_documents({
            "is_deleted": False,
            "user_type": "local_user"
        })
        managers = await users_collection.count_documents({
            "is_deleted": False,
            "user_type": "manager"
        })
        admins = await users_collection.count_documents({
            "is_deleted": False,
            "user_type": "admin"
        })
        apps_collection = get_applications_collection()
        app_live_filter = {"is_deleted": {"$ne": True}}
        total_applications = await apps_collection.count_documents(app_live_filter)
        approved_applications = await apps_collection.count_documents({**app_live_filter, "status": "approved"})
        pending_applications = await apps_collection.count_documents({**app_live_filter, "status": {"$in": ["submitted", "processing", "under_review"]}})
        rejected_applications = await apps_collection.count_documents({**app_live_filter, "status": "rejected"})
        success_rate = round((approved_applications / total_applications) * 100) if total_applications else 0

        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)
        applications_this_month = await apps_collection.count_documents({**app_live_filter, "created_at": {"$gte": month_start}})
        approvals_this_month = await apps_collection.count_documents({**app_live_filter, "status": "approved", "reviewed_at": {"$gte": month_start}})
        rejections_this_month = await apps_collection.count_documents({**app_live_filter, "status": "rejected", "reviewed_at": {"$gte": month_start}})
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "user_breakdown": {
                "local_users": local_users,
                "managers": managers,
                "admins": admins
            },
            "total_applications": total_applications,
            "approved_applications": approved_applications,
            "pending_applications": pending_applications,
            "rejected_applications": rejected_applications,
            "success_rate": success_rate,
            "changes": {
                "users": "live",
                "applications": "live",
                "approved": "live",
                "success_rate": "live"
            },
            "monthly_stats": {
                "applications_this_month": applications_this_month,
                "approvals_this_month": approvals_this_month,
                "rejections_this_month": rejections_this_month,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== APPLICATIONS ENDPOINTS ====================
@router.get("/applications/{application_id}")
async def get_application_details(application_id: str):
    """Get detailed application information for admin review"""
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID")

    apps_collection = get_applications_collection()
    users_collection = get_users_collection()
    app = await apps_collection.find_one({"_id": ObjectId(application_id)})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app["id"] = str(app.pop("_id"))
    user_payload = None
    if app.get("user_id") and ObjectId.is_valid(app["user_id"]):
        user = await users_collection.find_one({"_id": ObjectId(app["user_id"])})
        if user:
            user_payload = {
                "id": str(user.get("_id")),
                "name": user.get("full_name"),
                "email": user.get("email"),
                "phone": user.get("phone"),
                "role": user.get("role"),
            }
    app["user"] = user_payload
    return app


@router.put("/applications/{application_id}/status")
async def update_application_status(
    application_id: str,
    payload: ApplicationStatusUpdateRequest,
    current_admin: UserModel = Depends(get_current_admin_user),
):
    """Update application status and optional assignment."""
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID")

    allowed_statuses = ["submitted", "processing", "under_review", "approved", "reviewed", "rejected"]
    if payload.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    allowed_roles = {"sales", "operation", "finance"}
    if payload.assign_to_role and payload.assign_to_role not in allowed_roles:
        raise HTTPException(status_code=400, detail="assign_to_role must be one of: sales, operation, finance")

    apps_collection = get_applications_collection()
    users_collection = get_users_collection()
    app = await apps_collection.find_one({"_id": ObjectId(application_id), "is_deleted": {"$ne": True}})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    update_doc = {
        "status": payload.status,
        "admin_notes": payload.admin_notes,
        "assignment_notes": payload.assignment_notes,
        "assigned_to_role": payload.assign_to_role,
        "updated_at": datetime.utcnow(),
    }

    if payload.status == "submitted" and not app.get("application_number"):
        update_doc["application_number"] = await generate_application_number()
    if payload.status == "submitted" and not app.get("submitted_at"):
        update_doc["submitted_at"] = datetime.utcnow()

    if payload.status in {"approved", "rejected", "processing", "under_review"}:
        update_doc["reviewed_at"] = datetime.utcnow()
        update_doc["reviewed_by"] = str(current_admin.id)

    if payload.assign_to_user_id:
        if not ObjectId.is_valid(payload.assign_to_user_id):
            raise HTTPException(status_code=400, detail="Invalid assign_to_user_id")
        assigned_user = await users_collection.find_one({"_id": ObjectId(payload.assign_to_user_id), "is_deleted": False})
        if not assigned_user:
            raise HTTPException(status_code=404, detail="Assigned user not found")
        update_doc["assigned_to_user_id"] = payload.assign_to_user_id
        if payload.assign_to_role and assigned_user.get("role") != payload.assign_to_role:
            raise HTTPException(status_code=400, detail="Assigned user role does not match assign_to_role")
    else:
        update_doc["assigned_to_user_id"] = None

    await apps_collection.update_one({"_id": ObjectId(application_id)}, {"$set": update_doc})

    # Create lead if application is approved (scheduler will send feedback email later)
    if payload.status == "approved":
        try:
            email = app.get('contact_info', {}).get('email')
            full_name = app.get('personal_info', {}).get('first_name')
            phone = app.get('contact_info', {}).get('phone')
            country = app.get('country')
            visa_type = app.get('travel_info', {}).get('purpose_of_visit')
            
            if email:
                await create_or_get_lead(
                    db.client[settings.DATABASE_NAME],
                    email,
                    full_name=full_name,
                    phone=phone,
                    source='approved_application',
                    country=country,
                    visa_type=visa_type,
                    application_id=application_id
                )
        except Exception as e:
            print(f"Warning: Failed to create lead for approved application {application_id}: {e}")

    await audit_service.log_activity(
        action="APPLICATION_STATUS_UPDATED_BY_ADMIN",
        entity_type="APPLICATION",
        details=f"Status changed to {payload.status}; assigned_to_role={payload.assign_to_role or 'none'}",
        user_id=str(current_admin.id),
        entity_id=application_id,
    )

    updated = await apps_collection.find_one({"_id": ObjectId(application_id)})
    updated["id"] = str(updated.pop("_id"))
    return updated


@router.get("/analytics")
async def get_analytics():
    """Get detailed analytics for admin dashboard"""
    return {
        "application_trends": [
            {"month": "Aug", "applications": 120, "approved": 95, "rejected": 15},
            {"month": "Sep", "applications": 145, "approved": 118, "rejected": 18},
            {"month": "Oct", "applications": 168, "approved": 142, "rejected": 16},
            {"month": "Nov", "applications": 192, "approved": 165, "rejected": 19},
            {"month": "Dec", "applications": 234, "approved": 198, "rejected": 24},
        ],
        "country_distribution": [
            {"country": "USA", "count": 567, "percentage": 28},
            {"country": "Canada", "count": 432, "percentage": 21},
            {"country": "UK", "count": 389, "percentage": 19},
            {"country": "Australia", "count": 312, "percentage": 15},
            {"country": "Germany", "count": 245, "percentage": 12},
            {"country": "Others", "count": 133, "percentage": 5},
        ],
        "visa_type_distribution": [
            {"type": "Tourist", "count": 1234, "percentage": 45},
            {"type": "Student", "count": 892, "percentage": 32},
            {"type": "Work", "count": 456, "percentage": 16},
            {"type": "Business", "count": 196, "percentage": 7},
        ]
    }
