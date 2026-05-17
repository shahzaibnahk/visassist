from datetime import datetime
import os
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import db
from app.core.dependencies import get_current_active_user
from app.models.user import UserModel
from app.services.email_service import send_email


# Country-based invoice pricing (in USD)
COUNTRY_INVOICE_PRICING = {
    "USA": 500,
    "Canada": 600,
    "UK": 700,
    "Australia": 800,
    "Germany": 750,
    "France": 700,
    "India": 450,
    "China": 550,
    "Japan": 900,
    "Singapore": 850,
    "Dubai": 950,
    "New Zealand": 850,
    "Netherlands": 700,
    "Spain": 650,
    "Italy": 650,
    "South Korea": 850,
    "Thailand": 500,
    "Vietnam": 450,
    "Philippines": 500,
    "Malaysia": 600,
    "Indonesia": 550,
    "Brazil": 700,
    "Mexico": 600,
    "South Africa": 750,
    "Turkey": 600,
}

def get_invoice_amount_for_country(country: str) -> float:
    """Get invoice amount based on country. Default to 700 if not found."""
    return float(COUNTRY_INVOICE_PRICING.get(country, 700))


router = APIRouter()


class InvoiceCreateRequest(BaseModel):
    """Request to create invoice for an application."""
    application_id: str
    amount: float = 500  # Default amount
    currency: str = "USD"
    due_date: Optional[str] = None
    notes: Optional[str] = None


class FeeVerificationRequest(BaseModel):
    """Request to verify or reject payment proof."""
    application_id: str
    status: str  # approved or rejected
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class BulkInvoiceRequest(BaseModel):
    """Request to generate invoices for multiple reviewed applications."""
    application_ids: list[str]
    amount: float = 500
    currency: str = "USD"


class AdminFinalApprovalRequest(BaseModel):
    """Request for admin final approval/rejection of fee_verified applications."""
    application_id: str
    status: str  # approved or rejected
    approval_notes: Optional[str] = None


router = APIRouter()


def _ensure_finance_user(current_user: UserModel = Depends(get_current_active_user)) -> UserModel:
    """Ensure the user has finance role and user_type."""
    role = getattr(current_user, "role", "")
    user_type = getattr(current_user, "user_type", "")

    # Admin can view finance data from admin portal if needed
    if role == "admin":
        return current_user

    role_ok = role == "finance"
    type_ok = user_type == "finance"

    if not (role_ok and type_ok):
        raise HTTPException(status_code=403, detail="Forbidden - Finance access required")

    return current_user


def _get_applications_collection():
    if db.client is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")
    return db.client[settings.DATABASE_NAME]["applications"]


def _get_invoices_collection():
    if db.client is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")
    return db.client[settings.DATABASE_NAME]["invoices"]


def _get_users_collection():
    if db.client is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")
    return db.client[settings.DATABASE_NAME]["users"]


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


async def _generate_invoice_number() -> str:
    """Generate a unique invoice number."""
    invoices_collection = _get_invoices_collection()
    count = await invoices_collection.count_documents({})
    year = datetime.utcnow().year
    return f"INV-{year}-{count + 1:05d}"


async def _get_user_by_id(user_id: str):
    """Get user details from database."""
    if not ObjectId.is_valid(user_id):
        return None
    users_collection = _get_users_collection()
    user = await users_collection.find_one({"_id": ObjectId(user_id), "is_deleted": {"$ne": True}})
    return user


@router.get("/dashboard/overview")
async def get_finance_overview(
    current_user: UserModel = Depends(_ensure_finance_user),
):
    """Get financial dashboard overview stats."""
    apps_collection = _get_applications_collection()

    # Get total applications and revenue metrics
    total_apps = await apps_collection.count_documents({"is_deleted": {"$ne": True}})
    submitted_apps = await apps_collection.count_documents(
        {"status": "submitted", "is_deleted": {"$ne": True}}
    )
    processed_apps = await apps_collection.count_documents(
        {"status": {"$in": ["reviewed", "approved", "rejected"]}, "is_deleted": {"$ne": True}}
    )

    return {
        "total_applications": total_apps,
        "submitted_applications": submitted_apps,
        "processed_applications": processed_apps,
        "pending_applications": total_apps - processed_apps,
        "total_revenue": 0,  # Placeholder - implement revenue calculation as needed
        "monthly_revenue": 0,  # Placeholder
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/applications/all")
async def get_all_applications(
    current_user: UserModel = Depends(_ensure_finance_user),
):
    """Get all applications for finance report generation."""
    apps_collection = _get_applications_collection()

    apps = await apps_collection.find(
        {"is_deleted": {"$ne": True}}
    ).sort("created_at", -1).to_list(length=None)

    payload = []
    for app in apps:
        app_data = serialize_mongo_doc(app)
        app_data["id"] = app_data.pop("_id", "")
        payload.append(app_data)

    return {"applications": payload, "total": len(payload)}


@router.get("/applications/by-status")
async def get_applications_by_status(
    current_user: UserModel = Depends(_ensure_finance_user),
):
    """Get applications grouped by status for finance analysis."""
    apps_collection = _get_applications_collection()

    statuses = ["draft", "submitted", "processing", "under_review", "reviewed", "approved", "rejected"]
    results = {}

    for status in statuses:
        count = await apps_collection.count_documents(
            {"status": status, "is_deleted": {"$ne": True}}
        )
        results[status] = count

    return results


@router.get("/applications/by-country")
async def get_applications_by_country(
    current_user: UserModel = Depends(_ensure_finance_user),
):
    """Get applications grouped by country for finance analysis."""
    apps_collection = _get_applications_collection()

    pipeline = [
        {"$match": {"is_deleted": {"$ne": True}}},
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]

    results = await apps_collection.aggregate(pipeline).to_list(length=None)
    payload = [{"country": r["_id"], "count": r["count"]} for r in results]

    return {"by_country": payload}


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "module": "finance"}


# ========================
# Finance-specific endpoints
# ========================

@router.get("/applications/reviewed")
async def get_reviewed_applications(
    current_user: UserModel = Depends(_ensure_finance_user),
):
    """Get all applications with reviewed status (ready for invoicing)."""
    apps_collection = _get_applications_collection()

    apps = await apps_collection.find(
        {"status": "reviewed", "is_deleted": {"$ne": True}}
    ).sort("reviewed_at", -1).to_list(length=500)

    payload = []
    for app in apps:
        app_data = serialize_mongo_doc(app)
        app_data["id"] = app_data.pop("_id", "")
        payload.append(app_data)

    return {"applications": payload, "total": len(payload)}


@router.get("/applications/fee-unpaid")
async def get_fee_unpaid_applications(
    current_user: UserModel = Depends(_ensure_finance_user),
):
    """Get all applications with fee_unpaid status (invoices sent, awaiting payment)."""
    apps_collection = _get_applications_collection()

    apps = await apps_collection.find(
        {"status": "fee_unpaid", "is_deleted": {"$ne": True}}
    ).sort("invoice_generated_at", -1).to_list(length=500)

    payload = []
    for app in apps:
        app_data = serialize_mongo_doc(app)
        app_data["id"] = app_data.pop("_id", "")
        payload.append(app_data)

    return {"applications": payload, "total": len(payload)}


@router.get("/applications/fee-verification")
async def get_fee_verification_applications(
    current_user: UserModel = Depends(_ensure_finance_user),
):
    """Get all applications with fee_verification status (payment proof uploaded)."""
    apps_collection = _get_applications_collection()

    apps = await apps_collection.find(
        {"status": "fee_verification", "is_deleted": {"$ne": True}}
    ).sort("payment_proof_uploaded_at", -1).to_list(length=500)

    payload = []
    for app in apps:
        app_data = serialize_mongo_doc(app)
        app_data["id"] = app_data.pop("_id", "")
        payload.append(app_data)

    return {"applications": payload, "total": len(payload)}


@router.get("/applications/{application_id}/payment-proof")
async def get_payment_proof_file(
    application_id: str,
    current_user: UserModel = Depends(_ensure_finance_user),
):
    """Allow finance officers to view/download uploaded payment proof file."""
    apps_collection = _get_applications_collection()

    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID")

    app = await apps_collection.find_one({
        "_id": ObjectId(application_id),
        "status": {"$in": ["fee_verification", "fee_verified", "fee_verification_failed"]},
        "is_deleted": {"$ne": True},
    })
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    uploaded_files = app.get("uploaded_files") or []
    payment_file = None
    payment_proof_id = app.get("payment_proof_id")

    if payment_proof_id:
        for file_meta in reversed(uploaded_files):
            if file_meta.get("filename") == payment_proof_id:
                payment_file = file_meta
                break

    if not payment_file:
        for file_meta in reversed(uploaded_files):
            name = (file_meta.get("filename") or "").lower()
            if "proof" in name or "receipt" in name or "invoice" in name:
                payment_file = file_meta
                break

    if not payment_file:
        raise HTTPException(status_code=404, detail="Payment proof file not found")

    file_path = payment_file.get("path")
    if not file_path or not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Payment proof path not found on server")

    media_type = payment_file.get("content_type") or "application/octet-stream"
    filename = payment_file.get("filename") or "payment-proof"

    return FileResponse(path=file_path, media_type=media_type, filename=filename)


@router.get("/applications/fee-verified")
async def get_fee_verified_applications(
    current_user: UserModel = Depends(_ensure_finance_user),
):
    """Get all applications with fee_verified status (verified and revenue counted)."""
    apps_collection = _get_applications_collection()

    apps = await apps_collection.find(
        {"status": "fee_verified", "is_deleted": {"$ne": True}}
    ).sort("fee_verified_at", -1).to_list(length=500)

    payload = []
    for app in apps:
        app_data = serialize_mongo_doc(app)
        app_data["id"] = app_data.pop("_id", "")
        payload.append(app_data)

    return {"applications": payload, "total": len(payload)}


@router.post("/invoices/generate")
async def generate_invoice(
    request: InvoiceCreateRequest,
    current_user: UserModel = Depends(_ensure_finance_user),
):
    """Generate an invoice for a reviewed application."""
    apps_collection = _get_applications_collection()
    invoices_collection = _get_invoices_collection()

    # Verify application exists and has reviewed status
    if not ObjectId.is_valid(request.application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID")

    app = await apps_collection.find_one(
        {"_id": ObjectId(request.application_id), "is_deleted": {"$ne": True}}
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.get("status") != "reviewed":
        raise HTTPException(status_code=400, detail="Application must be in reviewed status")

    # Use country-based pricing if not specified
    if request.amount == 500:  # Default value from request
        request.amount = get_invoice_amount_for_country(app.get("country", ""))

    # Create invoice
    invoice_number = await _generate_invoice_number()
    invoice_doc = {
        "application_id": ObjectId(request.application_id),
        "user_id": app.get("user_id"),
        "invoice_number": invoice_number,
        "amount": request.amount,
        "currency": request.currency,
        "status": "generated",
        "invoice_date": datetime.utcnow(),
        "due_date": datetime.fromisoformat(request.due_date) if request.due_date else None,
        "description": "Visa Application Processing Fee",
        "notes": request.notes,
        "generated_at": datetime.utcnow(),
        "generated_by": ObjectId(current_user.id) if current_user.id else None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await invoices_collection.insert_one(invoice_doc)
    invoice_id = result.inserted_id

    # Update application status to fee_unpaid and link invoice
    await apps_collection.update_one(
        {"_id": ObjectId(request.application_id)},
        {
            "$set": {
                "status": "fee_unpaid",
                "invoice_id": invoice_id,
                "invoice_number": invoice_number,
                "invoice_amount": request.amount,
                "invoice_generated_at": datetime.utcnow(),
                "invoice_generated_by": ObjectId(current_user.id) if current_user.id else None,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    # Send email notification to user
    user = await _get_user_by_id(str(app.get("user_id")))
    if user:
        try:
            message = f"""<html><body>
            <h2>Invoice Generated</h2>
            <p>Dear {user.get('full_name', 'Applicant')},</p>
            <p>Your invoice has been generated for your visa application.</p>
            <p><strong>Invoice Details:</strong></p>
            <ul>
                <li>Invoice Number: {invoice_number}</li>
                <li>Amount: ${request.amount:.2f} {request.currency}</li>
                <li>Application Number: {app.get('application_number')}</li>
                <li>Due Date: {request.due_date or 'As soon as possible'}</li>
            </ul>
            <p>Please log in to your portal to view and pay the invoice.</p>
            <p>Best regards,<br>VissaAssist Team</p>
            </body></html>"""
            send_email(
                to_email=user.get("email"),
                subject="Invoice Generated - VissaAssist Visa Application",
                message=message
            )
        except Exception as e:
            print(f"Warning: Failed to send email for invoice {invoice_number}: {str(e)}")

    return {
        "success": True,
        "invoice_id": str(invoice_id),
        "invoice_number": invoice_number,
        "application_id": request.application_id,
        "amount": request.amount,
        "currency": request.currency,
        "status": "generated",
        "message": "Invoice generated successfully and email sent to applicant",
    }


@router.post("/invoices/send")
async def send_invoice(
    application_id: str,
    current_user: UserModel = Depends(_ensure_finance_user),
):
    """Send invoice to user via email."""
    apps_collection = _get_applications_collection()
    invoices_collection = _get_invoices_collection()

    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID")

    app = await apps_collection.find_one(
        {"_id": ObjectId(application_id), "is_deleted": {"$ne": True}}
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Get invoice
    invoice = await invoices_collection.find_one(
        {"application_id": ObjectId(application_id), "is_deleted": {"$ne": True}}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Get user details
    user = await _get_user_by_id(str(app.get("user_id")))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Send email with invoice
    try:
        message = f"""<html><body>
        <h2>Invoice Generated</h2>
        <p>Dear {user.get('full_name', 'Applicant')},</p>
        <p>Your invoice has been generated for your visa application.</p>
        <p><strong>Invoice Details:</strong></p>
        <ul>
            <li>Invoice Number: {invoice.get('invoice_number')}</li>
            <li>Amount: ${invoice.get('amount'):.2f} {invoice.get('currency')}</li>
            <li>Application Number: {app.get('application_number')}</li>
            <li>Due Date: {invoice.get('due_date') or 'As soon as possible'}</li>
        </ul>
        <p>Please log in to your portal to view and pay the invoice.</p>
        <p>Best regards,<br>VissaAssist Team</p>
        </body></html>"""
        send_email(
            to_email=user.get("email"),
            subject="Invoice Generated - VissaAssist Visa Application",
            message=message
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send invoice: {str(e)}")

    # Update invoice status
    await invoices_collection.update_one(
        {"_id": invoice.get("_id")},
        {
            "$set": {
                "status": "sent",
                "sent_at": datetime.utcnow(),
                "sent_to_email": user.get("email"),
            }
        },
    )

    return {
        "success": True,
        "message": f"Invoice sent to {user.get('email')}",
        "invoice_number": invoice.get("invoice_number"),
    }


@router.post("/invoices/bulk-generate-and-send")
async def bulk_generate_and_send_invoices(
    request: BulkInvoiceRequest,
    current_user: UserModel = Depends(_ensure_finance_user),
):
    """Generate and send invoices for multiple reviewed applications."""
    apps_collection = _get_applications_collection()
    invoices_collection = _get_invoices_collection()

    results = {
        "generated": 0,
        "sent": 0,
        "failed": 0,
        "errors": [],
    }

    for app_id in request.application_ids:
        try:
            if not ObjectId.is_valid(app_id):
                results["errors"].append(f"Invalid application ID: {app_id}")
                results["failed"] += 1
                continue

            app = await apps_collection.find_one(
                {"_id": ObjectId(app_id), "is_deleted": {"$ne": True}}
            )
            if not app:
                results["errors"].append(f"Application not found: {app_id}")
                results["failed"] += 1
                continue

            if app.get("status") != "reviewed":
                results["errors"].append(f"Application not in reviewed status: {app_id}")
                results["failed"] += 1
                continue

            # Use country-based pricing
            amount = get_invoice_amount_for_country(app.get("country", ""))

            # Generate invoice
            invoice_number = await _generate_invoice_number()
            invoice_doc = {
                "application_id": ObjectId(app_id),
                "user_id": app.get("user_id"),
                "invoice_number": invoice_number,
                "amount": amount,
                "currency": request.currency,
                "status": "generated",
                "invoice_date": datetime.utcnow(),
                "description": "Visa Application Processing Fee",
                "generated_at": datetime.utcnow(),
                "generated_by": ObjectId(current_user.id) if current_user.id else None,
                "created_at": datetime.utcnow(),
            }

            result = await invoices_collection.insert_one(invoice_doc)
            invoice_id = result.inserted_id

            # Update application
            await apps_collection.update_one(
                {"_id": ObjectId(app_id)},
                {
                    "$set": {
                        "status": "fee_unpaid",
                        "invoice_id": invoice_id,
                        "invoice_number": invoice_number,
                        "invoice_amount": amount,
                        "invoice_generated_at": datetime.utcnow(),
                        "invoice_generated_by": ObjectId(current_user.id) if current_user.id else None,
                        "updated_at": datetime.utcnow(),
                    }
                },
            )

            results["generated"] += 1

            # Send email
            user = await _get_user_by_id(str(app.get("user_id")))
            if user:
                try:
                    message = f"""<html><body>
                    <h2>Invoice Generated</h2>
                    <p>Dear {user.get('full_name', 'Applicant')},</p>
                    <p>Your invoice has been generated for your visa application.</p>
                    <p><strong>Invoice Details:</strong></p>
                    <ul>
                        <li>Invoice Number: {invoice_number}</li>
                        <li>Amount: ${amount:.2f} {request.currency}</li>
                        <li>Application Number: {app.get('application_number')}</li>
                    </ul>
                    <p>Please log in to your portal to view and pay the invoice.</p>
                    <p>Best regards,<br>VissaAssist Team</p>
                    </body></html>"""
                    send_email(
                        to_email=user.get("email"),
                        subject="Invoice Generated - VissaAssist Visa Application",
                        message=message
                    )
                    results["sent"] += 1
                except Exception as e:
                    results["errors"].append(f"Email failed for {app_id}: {str(e)}")

        except Exception as e:
            results["errors"].append(f"Error processing {app_id}: {str(e)}")
            results["failed"] += 1

    return results


@router.post("/payment-verification/approve")
async def approve_payment_verification(
    request: FeeVerificationRequest,
    current_user: UserModel = Depends(_ensure_finance_user),
):
    """Approve payment proof and update application status to fee_verified."""
    apps_collection = _get_applications_collection()

    if not ObjectId.is_valid(request.application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID")

    app = await apps_collection.find_one(
        {"_id": ObjectId(request.application_id), "is_deleted": {"$ne": True}}
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.get("status") != "fee_verification":
        raise HTTPException(status_code=400, detail="Application must be in fee_verification status")

    # Update application status
    await apps_collection.update_one(
        {"_id": ObjectId(request.application_id)},
        {
            "$set": {
                "status": "fee_verified",
                "fee_verified_at": datetime.utcnow(),
                "fee_verified_by": ObjectId(current_user.id) if current_user.id else None,
                "fee_verification_notes": request.notes,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    # Send email notification to user
    user = await _get_user_by_id(str(app.get("user_id")))
    if user:
        try:
            message = f"""<html><body>
            <h2>Payment Verified</h2>
            <p>Dear {user.get('full_name', 'Applicant')},</p>
            <p>Your payment has been verified successfully.</p>
            <p><strong>Application Details:</strong></p>
            <ul>
                <li>Application Number: {app.get('application_number')}</li>
                <li>Status: Fee Verified</li>
            </ul>
            <p>Your application is now under admin review.</p>
            <p>Best regards,<br>VissaAssist Team</p>
            </body></html>"""
            send_email(
                to_email=user.get("email"),
                subject="Payment Verified - VissaAssist",
                message=message
            )
        except Exception as e:
            print(f"Failed to send email: {e}")

    return {"success": True, "message": "Payment verified", "application_id": request.application_id}


@router.post("/payment-verification/reject")
async def reject_payment_verification(
    request: FeeVerificationRequest,
    current_user: UserModel = Depends(_ensure_finance_user),
):
    """Reject payment proof and update application status to fee_verification_failed."""
    apps_collection = _get_applications_collection()

    if not ObjectId.is_valid(request.application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID")

    app = await apps_collection.find_one(
        {"_id": ObjectId(request.application_id), "is_deleted": {"$ne": True}}
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.get("status") != "fee_verification":
        raise HTTPException(status_code=400, detail="Application must be in fee_verification status")

    # Update application status
    await apps_collection.update_one(
        {"_id": ObjectId(request.application_id)},
        {
            "$set": {
                "status": "fee_verification_failed",
                "fee_verification_rejected_reason": request.rejection_reason,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    # Send email notification to user
    user = await _get_user_by_id(str(app.get("user_id")))
    if user:
        try:
            message = f"""<html><body>
            <h2>Payment Verification Failed</h2>
            <p>Dear {user.get('full_name', 'Applicant')},</p>
            <p>Your payment verification has been rejected.</p>
            <p><strong>Application Details:</strong></p>
            <ul>
                <li>Application Number: {app.get('application_number')}</li>
                <li>Reason: {request.rejection_reason or 'Documents do not match'}</li>
            </ul>
            <p>Please contact support or re-upload the correct payment proof.</p>
            <p>Best regards,<br>VissaAssist Team</p>
            </body></html>"""
            send_email(
                to_email=user.get("email"),
                subject="Payment Verification Failed - VissaAssist",
                message=message
            )
        except Exception as e:
            print(f"Failed to send email: {e}")

    return {
        "success": True,
        "message": "Payment verification rejected",
        "application_id": request.application_id,
    }


# ========================
# Admin Final Approval Endpoints
# ========================

def _ensure_admin_user(current_user: UserModel = Depends(get_current_active_user)) -> UserModel:
    """Ensure the user has admin role."""
    role = getattr(current_user, "role", "")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden - Admin access required")
    return current_user


@router.get("/admin/applications/fee-verified")
async def get_fee_verified_for_admin_approval(
    current_user: UserModel = Depends(_ensure_admin_user),
):
    """Get all fee_verified applications for admin final approval."""
    apps_collection = _get_applications_collection()

    apps = await apps_collection.find(
        {"status": "fee_verified", "is_deleted": {"$ne": True}}
    ).sort("fee_verified_at", -1).to_list(length=500)

    payload = []
    for app in apps:
        app_data = serialize_mongo_doc(app)
        app_data["id"] = app_data.pop("_id", "")
        payload.append(app_data)

    return {"applications": payload, "total": len(payload)}


@router.post("/admin/final-approval/approve")
async def admin_approve_application(
    request: AdminFinalApprovalRequest,
    current_user: UserModel = Depends(_ensure_admin_user),
):
    """Admin final approval - mark application as final_approved."""
    apps_collection = _get_applications_collection()

    if not ObjectId.is_valid(request.application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID")

    app = await apps_collection.find_one(
        {"_id": ObjectId(request.application_id), "is_deleted": {"$ne": True}}
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.get("status") != "fee_verified":
        raise HTTPException(status_code=400, detail="Application must be in fee_verified status")

    # Update application status to final_approved
    await apps_collection.update_one(
        {"_id": ObjectId(request.application_id)},
        {
            "$set": {
                "status": "final_approved",
                "final_approval_at": datetime.utcnow(),
                "final_approved_by": ObjectId(current_user.id) if current_user.id else None,
                "final_approval_notes": request.approval_notes,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    # Send email notification to user
    user = await _get_user_by_id(str(app.get("user_id")))
    if user:
        try:
            message = f"""<html><body>
            <h2>Application Approved</h2>
            <p>Dear {user.get('full_name', 'Applicant')},</p>
            <p>Congratulations! Your visa application has been approved.</p>
            <p><strong>Application Details:</strong></p>
            <ul>
                <li>Application Number: {app.get('application_number')}</li>
                <li>Status: Final Approved</li>
            </ul>
            <p>Please log in to your portal to view the details and download your approval letter.</p>
            <p>Best regards,<br>VissaAssist Team</p>
            </body></html>"""
            send_email(
                to_email=user.get("email"),
                subject="Application Approved - VissaAssist",
                message=message
            )
        except Exception as e:
            print(f"Failed to send approval email: {e}")

    return {
        "success": True,
        "message": "Application approved by admin",
        "application_id": request.application_id,
    }


@router.post("/admin/final-approval/reject")
async def admin_reject_application(
    request: AdminFinalApprovalRequest,
    current_user: UserModel = Depends(_ensure_admin_user),
):
    """Admin final rejection - mark application as final_rejected."""
    apps_collection = _get_applications_collection()

    if not ObjectId.is_valid(request.application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID")

    app = await apps_collection.find_one(
        {"_id": ObjectId(request.application_id), "is_deleted": {"$ne": True}}
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.get("status") != "fee_verified":
        raise HTTPException(status_code=400, detail="Application must be in fee_verified status")

    # Update application status to final_rejected
    await apps_collection.update_one(
        {"_id": ObjectId(request.application_id)},
        {
            "$set": {
                "status": "final_rejected",
                "final_approval_at": datetime.utcnow(),
                "final_approved_by": ObjectId(current_user.id) if current_user.id else None,
                "final_approval_notes": request.approval_notes,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    # Send email notification to user
    user = await _get_user_by_id(str(app.get("user_id")))
    if user:
        try:
            message = f"""<html><body>
            <h2>Application Rejected</h2>
            <p>Dear {user.get('full_name', 'Applicant')},</p>
            <p>We regret to inform you that your visa application has been rejected.</p>
            <p><strong>Application Details:</strong></p>
            <ul>
                <li>Application Number: {app.get('application_number')}</li>
                <li>Status: Final Rejected</li>
                <li>Reason: {request.approval_notes or 'See portal for details'}</li>
            </ul>
            <p>Please contact our support team for more information.</p>
            <p>Best regards,<br>VissaAssist Team</p>
            </body></html>"""
            send_email(
                to_email=user.get("email"),
                subject="Application Rejected - VissaAssist",
                message=message
            )
        except Exception as e:
            print(f"Failed to send rejection email: {e}")

    return {
        "success": True,
        "message": "Application rejected by admin",
        "application_id": request.application_id,
    }
