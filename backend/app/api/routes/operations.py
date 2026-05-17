from datetime import datetime
import os
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import db
from app.core.dependencies import get_current_active_user
from app.models.user import UserModel
from app.services.audit_service import audit_service


router = APIRouter()


class BulkMoveRequest(BaseModel):
    admin_notes: Optional[str] = ""


class FinalizeReviewRequest(BaseModel):
    status: str  # reviewed or rejected
    admin_notes: Optional[str] = ""
    rejection_reason: Optional[str] = ""


def _ensure_operations_user(current_user: UserModel = Depends(get_current_active_user)) -> UserModel:
    role = getattr(current_user, "role", "")
    user_type = getattr(current_user, "user_type", "")

    # Admin can view and manage operations flow from admin portal.
    if role == "admin":
        return current_user

    role_ok = role in {"operation", "operations"}
    type_ok = user_type in {"operation", "operations"}

    if not (role_ok and type_ok):
        raise HTTPException(status_code=403, detail="Forbidden - Operations access required")

    return current_user


def _get_users_collection():
    if db.client is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")
    return db.client[settings.DATABASE_NAME]["users"]


def _get_applications_collection():
    if db.client is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")
    return db.client[settings.DATABASE_NAME]["applications"]


async def _augment_application_with_user(app: dict) -> dict:
    users_collection = _get_users_collection()
    payload = dict(app)
    payload["id"] = str(payload.pop("_id", ""))

    user_payload = None
    user_id = payload.get("user_id")
    if user_id and ObjectId.is_valid(user_id):
        user = await users_collection.find_one({"_id": ObjectId(user_id), "is_deleted": {"$ne": True}})
        if user:
            user_payload = {
                "id": str(user.get("_id")),
                "name": user.get("full_name"),
                "email": user.get("email"),
                "phone": user.get("phone"),
            }

    payload["user"] = user_payload
    payload["user_name"] = user_payload.get("name") if user_payload else "Unknown"
    payload["user_email"] = user_payload.get("email") if user_payload else "Unknown"
    return payload


@router.get("/applications/processing")
async def get_processing_applications(
    search: str = Query(""),
    current_user: UserModel = Depends(_ensure_operations_user),
):
    apps_collection = _get_applications_collection()

    query = {"status": "processing", "is_deleted": {"$ne": True}}
    if search:
        query["$or"] = [
            {"country": {"$regex": search, "$options": "i"}},
            {"visa_type": {"$regex": search, "$options": "i"}},
            {"application_number": {"$regex": search, "$options": "i"}},
        ]

    apps = await apps_collection.find(query).sort("updated_at", -1).to_list(length=500)
    payload = [await _augment_application_with_user(app) for app in apps]
    return {"applications": payload, "total": len(payload)}


@router.get("/applications/under-review")
async def get_under_review_applications(
    search: str = Query(""),
    current_user: UserModel = Depends(_ensure_operations_user),
):
    apps_collection = _get_applications_collection()

    query = {"status": "under_review", "is_deleted": {"$ne": True}}
    if search:
        query["$or"] = [
            {"country": {"$regex": search, "$options": "i"}},
            {"visa_type": {"$regex": search, "$options": "i"}},
            {"application_number": {"$regex": search, "$options": "i"}},
        ]

    apps = await apps_collection.find(query).sort("updated_at", -1).to_list(length=500)
    payload = [await _augment_application_with_user(app) for app in apps]
    return {"applications": payload, "total": len(payload)}


@router.get("/applications/finalized")
async def get_finalized_applications(
    search: str = Query(""),
    current_user: UserModel = Depends(_ensure_operations_user),
):
    apps_collection = _get_applications_collection()

    query = {"status": {"$in": ["reviewed", "rejected"]}, "is_deleted": {"$ne": True}}
    if search:
        query["$or"] = [
            {"country": {"$regex": search, "$options": "i"}},
            {"visa_type": {"$regex": search, "$options": "i"}},
            {"application_number": {"$regex": search, "$options": "i"}},
        ]

    apps = await apps_collection.find(query).sort("updated_at", -1).to_list(length=500)
    payload = [await _augment_application_with_user(app) for app in apps]
    return {"applications": payload, "total": len(payload)}


@router.get("/applications/{application_id}")
async def get_application_for_review(
    application_id: str,
    current_user: UserModel = Depends(_ensure_operations_user),
):
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID")

    apps_collection = _get_applications_collection()
    app = await apps_collection.find_one({"_id": ObjectId(application_id), "is_deleted": {"$ne": True}})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    return await _augment_application_with_user(app)


@router.put("/applications/{application_id}/move-under-review")
async def move_application_to_under_review(
    application_id: str,
    payload: BulkMoveRequest,
    current_user: UserModel = Depends(_ensure_operations_user),
):
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID")

    apps_collection = _get_applications_collection()
    app = await apps_collection.find_one({"_id": ObjectId(application_id), "is_deleted": {"$ne": True}})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.get("status") != "processing":
        raise HTTPException(status_code=400, detail="Only processing applications can be moved to under_review")

    await apps_collection.update_one(
        {"_id": ObjectId(application_id)},
        {
            "$set": {
                "status": "under_review",
                "admin_notes": payload.admin_notes,
                "reviewed_by": str(current_user.id),
                "reviewed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
        },
    )

    await audit_service.log_activity(
        action="APPLICATION_MOVED_TO_UNDER_REVIEW",
        entity_type="APPLICATION",
        details=f"Operations moved application to under_review",
        user_id=str(current_user.id),
        entity_id=application_id,
    )

    updated = await apps_collection.find_one({"_id": ObjectId(application_id)})
    return await _augment_application_with_user(updated)


@router.post("/applications/processing/move-all-under-review")
async def move_all_processing_to_under_review(
    payload: BulkMoveRequest,
    current_user: UserModel = Depends(_ensure_operations_user),
):
    apps_collection = _get_applications_collection()
    now = datetime.utcnow()

    result = await apps_collection.update_many(
        {"status": "processing", "is_deleted": {"$ne": True}},
        {
            "$set": {
                "status": "under_review",
                "admin_notes": payload.admin_notes,
                "reviewed_by": str(current_user.id),
                "reviewed_at": now,
                "updated_at": now,
            }
        },
    )

    await audit_service.log_activity(
        action="APPLICATIONS_MOVED_TO_UNDER_REVIEW_BULK",
        entity_type="APPLICATION",
        details=f"Operations moved {result.modified_count} applications to under_review",
        user_id=str(current_user.id),
        entity_id=None,
    )

    return {"message": "Applications moved to under_review", "modified_count": result.modified_count}


@router.put("/applications/{application_id}/finalize")
async def finalize_application_review(
    application_id: str,
    payload: FinalizeReviewRequest,
    current_user: UserModel = Depends(_ensure_operations_user),
):
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID")

    final_status = payload.status.lower().strip()
    if final_status not in {"reviewed", "rejected"}:
        raise HTTPException(status_code=400, detail="status must be reviewed or rejected")

    apps_collection = _get_applications_collection()
    app = await apps_collection.find_one({"_id": ObjectId(application_id), "is_deleted": {"$ne": True}})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.get("status") != "under_review":
        raise HTTPException(status_code=400, detail="Only under_review applications can be finalized")

    update_doc = {
        "status": final_status,
        "admin_notes": payload.admin_notes,
        "reviewed_by": str(current_user.id),
        "reviewed_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    if final_status == "rejected":
        update_doc["rejection_reason"] = payload.rejection_reason or "Rejected by operations"
    else:
        update_doc["rejection_reason"] = None

    await apps_collection.update_one({"_id": ObjectId(application_id)}, {"$set": update_doc})

    await audit_service.log_activity(
        action="APPLICATION_FINALIZED_BY_OPERATIONS",
        entity_type="APPLICATION",
        details=f"Operations finalized application as {final_status}",
        user_id=str(current_user.id),
        entity_id=application_id,
    )

    updated = await apps_collection.find_one({"_id": ObjectId(application_id)})
    return await _augment_application_with_user(updated)


@router.get("/applications/{application_id}/documents/{doc_index}")
async def get_application_document(
    application_id: str,
    doc_index: int,
    current_user: UserModel = Depends(_ensure_operations_user),
):
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID")

    apps_collection = _get_applications_collection()
    app = await apps_collection.find_one({"_id": ObjectId(application_id), "is_deleted": {"$ne": True}})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    files = app.get("uploaded_files", [])
    if doc_index < 0 or doc_index >= len(files):
        raise HTTPException(status_code=404, detail="Document not found")

    doc = files[doc_index]
    path = doc.get("path")

    if not path:
        raise HTTPException(status_code=404, detail="Document path not found")

    normalized = os.path.normpath(path)
    if not os.path.exists(normalized):
        raise HTTPException(status_code=404, detail="Document file missing on server")

    filename = doc.get("filename") or os.path.basename(normalized)
    content_type = doc.get("content_type") or "application/octet-stream"

    return FileResponse(path=normalized, media_type=content_type, filename=filename)
