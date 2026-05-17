from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
import os
from io import BytesIO
from typing import List
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from app.schemas.application import ApplicationCreate, ApplicationUpdate, ApplicationResponse
from datetime import datetime
from app.core.dependencies import get_current_active_user
from app.models.user import UserModel
from app.core.database import db
from bson import ObjectId
from pymongo import ReturnDocument
from app.services.email_service import send_email
from app.services.audit_service import audit_service
from app.services.lead_service import create_or_get_lead

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas
except ImportError:
    A4 = None
    colors = None
    canvas = None

router = APIRouter(dependencies=[Depends(get_current_active_user)])


class CancelApplicationRequest(BaseModel):
    cancellation_reason: str = "Cancelled by user"

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)


def serialize_mongo_doc(doc):
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, dict):
                result[key] = serialize_mongo_doc(value)
            elif isinstance(value, list):
                result[key] = [
                    serialize_mongo_doc(item) if isinstance(item, dict) else (str(item) if isinstance(item, ObjectId) else item)
                    for item in value
                ]
            else:
                result[key] = value
        return result
    return doc


async def generate_application_number() -> str:
    """Generate next application number as VISA_XXXXXX."""
    seq = await db.client["vissaassist"]["counters"].find_one_and_update(
        {"_id": "application_number"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    # find_one_and_update with upsert can return None in some drivers on first insert.
    if not seq:
        seq = await db.client["vissaassist"]["counters"].find_one({"_id": "application_number"})
    current = int(seq.get("seq", 1))
    return f"VISA_{current:06d}"

@router.post("/{application_id}/upload")
async def upload_document(application_id: str, file: UploadFile = File(...), current_user: UserModel = Depends(get_current_active_user)):
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID format")
    
    app = await db.client["vissaassist"]["applications"].find_one({
        "_id": ObjectId(application_id),
        "user_id": str(current_user.id),
        "is_deleted": {"$ne": True},
    })
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    file_path = os.path.join(UPLOAD_DIR, f"{application_id}_{file.filename}")
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    doc_meta = {
        "filename": file.filename,
        "path": file_path,
        "content_type": file.content_type,
        "uploaded_at": datetime.utcnow().isoformat()
    }
    
    await db.client["vissaassist"]["applications"].update_one(
        {"_id": ObjectId(application_id)},
        {
            "$push": {
                "uploaded_files": doc_meta,
                "documents": file.filename,
            },
            "$set": {"updated_at": datetime.utcnow()},
        }
    )
    
    await audit_service.log_activity(
        action="DOCUMENT_UPLOADED",
        entity_type="APPLICATION",
        details=f"User uploaded '{file.filename}' to application {application_id}",
        user_id=str(current_user.id),
        entity_id=application_id
    )
    
    return {"message": "File uploaded successfully", "file": doc_meta}


@router.post("/{application_id}/upload-payment-proof")
async def upload_payment_proof(application_id: str, file: UploadFile = File(...), current_user: UserModel = Depends(get_current_active_user)):
    """Upload payment proof (invoice screenshot/receipt) for fee_unpaid applications."""
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID format")
    
    app = await db.client["vissaassist"]["applications"].find_one({
        "_id": ObjectId(application_id),
        "user_id": str(current_user.id),
        "is_deleted": {"$ne": True},
    })
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Verify application is in fee_unpaid status
    if app.get("status") != "fee_unpaid":
        raise HTTPException(status_code=400, detail="Application must be in fee_unpaid status")
    
    file_path = os.path.join(UPLOAD_DIR, f"{application_id}_proof_{file.filename}")
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    proof_meta = {
        "filename": file.filename,
        "path": file_path,
        "content_type": file.content_type,
        "uploaded_at": datetime.utcnow().isoformat()
    }
    
    # Update application: change status to fee_verification and store payment proof
    await db.client["vissaassist"]["applications"].update_one(
        {"_id": ObjectId(application_id)},
        {
            "$set": {
                "status": "fee_verification",
                "payment_proof_uploaded_at": datetime.utcnow(),
                "payment_proof_id": file.filename,  # Store simple reference
                "updated_at": datetime.utcnow(),
            },
            "$push": {
                "uploaded_files": proof_meta,
            }
        }
    )
    
    await audit_service.log_activity(
        action="PAYMENT_PROOF_UPLOADED",
        entity_type="APPLICATION",
        details=f"User uploaded payment proof '{file.filename}' for application {application_id}",
        user_id=str(current_user.id),
        entity_id=application_id
    )
    
    return {
        "message": "Payment proof uploaded successfully",
        "file": proof_meta,
        "status": "fee_verification"
    }


@router.get("/{application_id}/invoice-pdf")
async def download_invoice_pdf(application_id: str, current_user: UserModel = Depends(get_current_active_user)):
    """Generate and download invoice PDF for the owner's application."""
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID format")

    app = await db.client["vissaassist"]["applications"].find_one({
        "_id": ObjectId(application_id),
        "user_id": str(current_user.id),
        "is_deleted": {"$ne": True},
    })
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    invoice_id = app.get("invoice_id")
    if not invoice_id:
        raise HTTPException(status_code=404, detail="Invoice not found for this application")

    invoice = await db.client["vissaassist"]["invoices"].find_one({
        "_id": ObjectId(invoice_id) if isinstance(invoice_id, str) and ObjectId.is_valid(invoice_id) else invoice_id,
        "is_deleted": {"$ne": True},
    })
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice record not found")

    invoice_number = invoice.get("invoice_number") or app.get("invoice_number") or "N/A"
    amount = float(invoice.get("amount") or app.get("invoice_amount") or 0)
    currency = invoice.get("currency") or "USD"
    issue_date = invoice.get("invoice_date") or app.get("invoice_generated_at")
    issue_date_str = issue_date.strftime("%B %d, %Y") if hasattr(issue_date, "strftime") else str(issue_date or "N/A")
    due_date_str = "Upon Receipt" 

    if canvas is None or A4 is None or colors is None:
        raise HTTPException(
            status_code=503,
            detail="Invoice PDF generation is temporarily unavailable on this server",
        )

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 50

    # Header Top Bar - Modern Accent
    pdf.setFillColor(colors.HexColor("#2563EB"))  # Blue-600
    pdf.rect(0, height - 15, width, 15, fill=1, stroke=0)

    # Logo / Company Name
    y = height - 60
    pdf.setFillColor(colors.HexColor("#1E3A8A"))  # Dark Blue
    pdf.setFont("Helvetica-Bold", 28)
    pdf.drawString(margin, y, "VissaAssist")
    
    # "INVOICE" Title
    pdf.setFont("Helvetica-Bold", 32)
    pdf.setFillColor(colors.HexColor("#9CA3AF"))  # Gray-400
    pdf.drawRightString(width - margin, y, "INVOICE")
    
    # Company Details
    y -= 25
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(colors.HexColor("#4B5563"))
    pdf.drawString(margin, y, "Suit 502, 5th Floor, Trade Tower")
    y -= 15
    pdf.drawString(margin, y, "Shahrah-e-Faisal, Karachi, Pakistan")
    y -= 15
    pdf.drawString(margin, y, "Email: billing@vissaassist.com")
    y -= 15
    pdf.drawString(margin, y, "Phone: +92 (300) 123 4567")

    # Separator Line
    y -= 30
    pdf.setStrokeColor(colors.HexColor("#E5E7EB"))
    pdf.setLineWidth(1)
    pdf.line(margin, y, width - margin, y)

    # Billing & Invoice Details
    y -= 30
    customer_name = app.get("personal_info", {}).get("first_name", "") + " " + app.get("personal_info", {}).get("last_name", "")
    customer_name = customer_name.strip() or current_user.full_name or "Valued Client"
    customer_email = current_user.email or "N/A"

    pdf.setFont("Helvetica-Bold", 11)
    pdf.setFillColor(colors.HexColor("#374151"))
    pdf.drawString(margin, y, "Billed To:")
    
    pdf.drawString(width - 250, y, "Invoice Details:")

    y -= 20
    pdf.setFont("Helvetica-Bold", 12)
    pdf.setFillColor(colors.HexColor("#111827"))
    pdf.drawString(margin, y, customer_name)
    
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(colors.HexColor("#4B5563"))
    pdf.drawString(width - 250, y, "Invoice No:")
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawRightString(width - margin, y, str(invoice_number))

    y -= 15
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(colors.HexColor("#4B5563"))
    pdf.drawString(margin, y, customer_email)
    
    pdf.drawString(width - 250, y, "Date of Issue:")
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawRightString(width - margin, y, issue_date_str)
    
    y -= 15
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(colors.HexColor("#4B5563"))
    pdf.drawString(width - 250, y, "Payment Due:")
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawRightString(width - margin, y, due_date_str)

    y -= 15
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(colors.HexColor("#4B5563"))
    pdf.drawString(width - 250, y, "Application Ref:")
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawRightString(width - margin, y, str(app.get("application_number", "N/A")))

    # Table Header Background
    y -= 40
    pdf.setFillColor(colors.HexColor("#F3F4F6"))  # Gray-100
    pdf.rect(margin, y - 10, width - (2 * margin), 25, fill=1, stroke=0)

    # Table Header Text
    pdf.setFillColor(colors.HexColor("#374151"))
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(margin + 10, y, "Description")
    pdf.drawString(width - 250, y, "Quantity")
    pdf.drawString(width - 150, y, "Unit Price")
    pdf.drawRightString(width - margin - 10, y, "Amount")

    # Table Row 1
    y -= 30
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(colors.HexColor("#111827"))
    country = app.get("country", "Destination")
    v_type = app.get("visa_type", "Visa")
    desc = f"{country} {v_type} Application Processing Fee"
    pdf.drawString(margin + 10, y, desc)
    
    pdf.setFillColor(colors.HexColor("#4B5563"))
    pdf.drawString(width - 240, y, "1")
    pdf.drawString(width - 150, y, f"{amount:.2f}")
    
    pdf.setFillColor(colors.HexColor("#111827"))
    pdf.drawRightString(width - margin - 10, y, f"{amount:.2f}")

    # Bottom line of table
    y -= 15
    pdf.setStrokeColor(colors.HexColor("#E5E7EB"))
    pdf.line(margin, y, width - margin, y)

    # Totals Section
    y -= 25
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(colors.HexColor("#4B5563"))
    pdf.drawString(width - 200, y, "Subtotal:")
    pdf.drawRightString(width - margin - 10, y, f"{amount:.2f}")

    y -= 20
    pdf.drawString(width - 200, y, "Tax (0%):")
    pdf.drawRightString(width - margin - 10, y, "0.00")

    y -= 10
    pdf.setStrokeColor(colors.HexColor("#D1D5DB"))
    pdf.line(width - 200, y, width - margin, y)

    y -= 25
    pdf.setFont("Helvetica-Bold", 14)
    pdf.setFillColor(colors.HexColor("#1E3A8A"))
    pdf.drawString(width - 200, y, "Total Due:")
    pdf.drawRightString(width - margin - 10, y, f"{currency} {amount:.2f}")

    # Payment Instructions
    y = 150
    pdf.setFillColor(colors.HexColor("#F9FAFB"))
    pdf.rect(margin, y, width - (2 * margin), 60, fill=1, stroke=0)
    
    y += 40
    pdf.setFont("Helvetica-Bold", 10)
    pdf.setFillColor(colors.HexColor("#374151"))
    pdf.drawString(margin + 15, y, "Payment Instructions:")
    
    y -= 15
    pdf.setFont("Helvetica", 9)
    pdf.setFillColor(colors.HexColor("#4B5563"))
    pdf.drawString(margin + 15, y, "Please submit payment using the designated portal on your Dashboard.")
    
    y -= 15
    pdf.drawString(margin + 15, y, "After payment, upload the transaction receipt or proof under your application details.")

    # Footer
    y = 50
    pdf.setStrokeColor(colors.HexColor("#E5E7EB"))
    pdf.line(margin, y, width - margin, y)
    
    y -= 20
    pdf.setFont("Helvetica", 8)
    pdf.setFillColor(colors.HexColor("#9CA3AF"))
    pdf.drawCentredString(width / 2.0, y, "Thank you for your business. | VissaAssist | www.vissaassist.com")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{invoice_number}.pdf"'},
    )

@router.get("/", response_model=List[ApplicationResponse])
async def get_applications(current_user: UserModel = Depends(get_current_active_user)):
    """Get all applications for the current user"""
    cursor = db.client["vissaassist"]["applications"].find({
        "user_id": str(current_user.id),
        "is_deleted": {"$ne": True},
    }).sort("updated_at", -1)
    applications = await cursor.to_list(length=100)
    for idx, app in enumerate(applications):
        app["id"] = str(app.pop("_id"))
        applications[idx] = serialize_mongo_doc(app)
    return applications

@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(application_id: str, current_user: UserModel = Depends(get_current_active_user)):
    """Get a specific application by ID"""
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID format")
    
    app = await db.client["vissaassist"]["applications"].find_one({
        "_id": ObjectId(application_id),
        "user_id": str(current_user.id),
        "is_deleted": {"$ne": True},
    })
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    app["id"] = str(app.pop("_id"))
    app = serialize_mongo_doc(app)
    return app

@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(application: ApplicationCreate, current_user: UserModel = Depends(get_current_active_user)):
    """Create a new application"""
    new_app = application.model_dump()
    new_app["user_id"] = str(current_user.id)
    new_app["status"] = "draft"
    new_app["application_number"] = None
    new_app["submitted_at"] = None
    new_app["updated_at"] = datetime.utcnow()
    new_app["created_at"] = datetime.utcnow()
    new_app["uploaded_files"] = []
    new_app["assigned_to_role"] = None
    new_app["assigned_to_user_id"] = None
    new_app["assignment_notes"] = None
    new_app["is_deleted"] = False
    new_app["deleted_at"] = None
    new_app["deleted_by"] = None
    new_app["cancellation_reason"] = None
    
    result = await db.client["vissaassist"]["applications"].insert_one(new_app)
    new_app["id"] = str(result.inserted_id)
    new_app.pop("_id", None)
    
    await audit_service.log_activity(
        action="APPLICATION_CREATED",
        entity_type="APPLICATION",
        details=f"Application draft created for {new_app['country']}",
        user_id=str(current_user.id),
        entity_id=str(result.inserted_id)
    )
    
    # Email Notification
    if current_user.email:
        send_email(
            to_email=current_user.email,
            subject="Application Draft Created",
            message=f"<h1>Application Draft Created</h1><p>Your visa application draft for {new_app['country']} has been saved.</p>"
        )
    
    return new_app

@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application(application_id: str, application: ApplicationUpdate, current_user: UserModel = Depends(get_current_active_user)):
    """Update an existing application"""
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID format")
        
    app = await db.client["vissaassist"]["applications"].find_one({
        "_id": ObjectId(application_id),
        "user_id": str(current_user.id),
        "is_deleted": {"$ne": True},
    })
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    update_data = application.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    is_submitting = False
    if update_data.get("status") == "submitted" and app.get("status") != "submitted":
        update_data["submitted_at"] = datetime.utcnow()
        if not app.get("application_number"):
            update_data["application_number"] = await generate_application_number()
        is_submitting = True
            
    await db.client["vissaassist"]["applications"].update_one(
        {"_id": ObjectId(application_id)},
        {"$set": update_data}
    )
    
    if is_submitting:
        await audit_service.log_activity(
            action="APPLICATION_SUBMITTED",
            entity_type="APPLICATION",
            details=f"Application submitted for {app.get('country')}",
            user_id=str(current_user.id),
            entity_id=application_id
        )
        # Email Notification
        if current_user.email:
            send_email(
                to_email=current_user.email,
                subject="Application Submitted Successfully",
                message=f"<h1>Application Submitted</h1><p>Your visa application for {app.get('country')} has been successfully submitted and is now under processing.</p>"
            )
        # Create or update lead from this application
        try:
            email = None
            # try to pull email from update payload or stored app
            if isinstance(application, ApplicationUpdate) and getattr(application, 'contact_info', None):
                email = application.contact_info.email
            if not email:
                email = app.get('contact_info', {}).get('email') or app.get('personal_info', {}).get('email') or current_user.email
            await create_or_get_lead(db.client['vissaassist'], email, full_name=app.get('personal_info', {}).get('first_name'), phone=app.get('contact_info', {}).get('phone'), source='application')
        except Exception as e:
            print('Warning: could not create lead from application submission', e)
    else:
        await audit_service.log_activity(
            action="APPLICATION_UPDATED",
            entity_type="APPLICATION",
            details=f"Application updated",
            user_id=str(current_user.id),
            entity_id=application_id
        )
    
    updated_app = await db.client["vissaassist"]["applications"].find_one({"_id": ObjectId(application_id)})
    updated_app["id"] = str(updated_app.pop("_id"))
    updated_app = serialize_mongo_doc(updated_app)
    return updated_app

@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(application_id: str, current_user: UserModel = Depends(get_current_active_user)):
    """Soft delete (cancel) an application."""
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID format")

    result = await db.client["vissaassist"]["applications"].update_one(
        {
            "_id": ObjectId(application_id),
            "user_id": str(current_user.id),
            "is_deleted": {"$ne": True},
        },
        {
            "$set": {
                "is_deleted": True,
                "deleted_at": datetime.utcnow(),
                "deleted_by": str(current_user.id),
                "status": "cancelled",
                "cancellation_reason": "Cancelled by user",
                "updated_at": datetime.utcnow(),
            }
        },
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")

    await audit_service.log_activity(
        action="APPLICATION_CANCELLED",
        entity_type="APPLICATION",
        details=f"Application cancelled by user {current_user.email}",
        user_id=str(current_user.id),
        entity_id=application_id,
    )

    return None


@router.patch("/{application_id}/cancel", response_model=ApplicationResponse)
async def cancel_application(
    application_id: str,
    payload: CancelApplicationRequest,
    current_user: UserModel = Depends(get_current_active_user),
):
    """Cancel an application and move it to soft-deleted state."""
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID format")

    app = await db.client["vissaassist"]["applications"].find_one(
        {
            "_id": ObjectId(application_id),
            "user_id": str(current_user.id),
            "is_deleted": {"$ne": True},
        }
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    await db.client["vissaassist"]["applications"].update_one(
        {"_id": ObjectId(application_id)},
        {
            "$set": {
                "is_deleted": True,
                "deleted_at": datetime.utcnow(),
                "deleted_by": str(current_user.id),
                "status": "cancelled",
                "cancellation_reason": payload.cancellation_reason or "Cancelled by user",
                "updated_at": datetime.utcnow(),
            }
        },
    )

    await audit_service.log_activity(
        action="APPLICATION_CANCELLED",
        entity_type="APPLICATION",
        details=f"Application cancelled by user {current_user.email}",
        user_id=str(current_user.id),
        entity_id=application_id,
    )

    updated_app = await db.client["vissaassist"]["applications"].find_one({"_id": ObjectId(application_id)})
    updated_app["id"] = str(updated_app.pop("_id"))
    return updated_app
