from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.core.database import get_database
from app.core.dependencies import get_current_active_user
from app.models.user import UserModel
from app.core.database import db

def _ensure_sales_user(user: UserModel = Depends(get_current_active_user)):
    # allow admin or sales role
    if getattr(user, 'user_type', None) not in ('sales', 'admin') and getattr(user, 'role', None) not in ('sales', 'admin'):
        raise HTTPException(status_code=403, detail='Forbidden - Sales access required')
    return user

from app.models.lead import LeadBase
from app.services.lead_service import (
    create_or_get_lead, 
    add_communication, 
    add_follow_up,
    update_follow_up_status,
    update_lead_stage,
    get_leads_by_stage,
    get_leads_by_source,
    get_generic_leads
)
from app.services.email_service import send_email
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


def _serialize_document(doc: dict) -> dict:
    payload = dict(doc)
    payload['id'] = str(payload.pop('_id', payload.get('id', '')))
    return payload

class LeadUpdate(BaseModel):
    stage: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

class FollowUpCreate(BaseModel):
    type: str  # call, email, meeting, document
    title: str
    description: Optional[str] = None
    due_date: datetime
    assigned_to: Optional[str] = None

class CommunicationLog(BaseModel):
    type: str  # email, call, meeting, note
    subject: Optional[str] = None
    body: Optional[str] = None
    recipients: Optional[List[str]] = []
    metadata: Optional[dict] = {}

class BulkEmailPayload(BaseModel):
    subject: str
    body: str
    recipients: List[str]

@router.get('/leads', dependencies=[Depends(_ensure_sales_user)])
async def list_leads(
    request: Request, 
    db=Depends(get_database),
    stage: Optional[str] = None,
    source: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get all leads with optional filtering."""
    query = {'is_deleted': False}
    
    if stage:
        query['stage'] = stage
    if source:
        query['source'] = source
    
    cursor = db['leads'].find(query).sort('created_at', -1).skip(skip).limit(limit)
    leads = []
    async for l in cursor:
        l['id'] = str(l.pop('_id', ''))
        leads.append(l)
    
    # Get total count
    total = await db['leads'].count_documents(query)
    
    return {'leads': leads, 'total': total, 'skip': skip, 'limit': limit}

@router.get('/leads/generic', dependencies=[Depends(_ensure_sales_user)])
async def list_generic_leads(db=Depends(get_database)):
    """Get all generic leads, including simple users who may not have a lead record yet."""
    leads = await get_generic_leads(db)
    lead_emails = {lead.get('email') for lead in leads if lead.get('email')}

    users_cursor = db['users'].find({
        'is_deleted': {'$ne': True},
        '$or': [
            {'role': 'user'},
            {'user_type': 'local_user'},
        ],
    }).sort('created_at', -1)
    async for user in users_cursor:
        email = user.get('email')
        if not email or email in lead_emails:
            continue
        leads.append({
            'id': str(user.get('_id')),
            'email': email,
            'full_name': user.get('full_name'),
            'phone': user.get('phone'),
            'source': 'user_signup',
            'stage': 'new',
            'status': 'active',
            'country': user.get('country'),
            'visa_type': None,
            'created_at': user.get('created_at'),
            'updated_at': user.get('updated_at'),
            'is_deleted': False,
        })

    return {'leads': leads, 'total': len(leads)}


@router.get('/applications/drafts', dependencies=[Depends(_ensure_sales_user)])
async def list_draft_applications(db=Depends(get_database), skip: int = 0, limit: int = 100):
    """Get draft applications for sales follow-up emails."""
    query = {
        'status': 'draft',
        'is_deleted': {'$ne': True},
    }
    total = await db['applications'].count_documents(query)
    cursor = db['applications'].find(query).sort('created_at', -1).skip(skip).limit(limit)
    applications = []
    users = db['users']

    async for app in cursor:
        app['id'] = str(app.pop('_id', ''))
        user = None
        if app.get('user_id') and ObjectId.is_valid(str(app['user_id'])):
            user = await users.find_one({'_id': ObjectId(str(app['user_id']))})

        contact_info = app.get('contact_info') or {}
        personal_info = app.get('personal_info') or {}
        applications.append({
            **app,
            'user_email': (user or {}).get('email') or contact_info.get('email') or personal_info.get('email') or 'Unknown',
            'user_name': (user or {}).get('full_name') or f"{personal_info.get('first_name', '')} {personal_info.get('last_name', '')}".strip() or 'Unknown',
            'phone': (user or {}).get('phone') or contact_info.get('phone') or 'N/A',
            'contact_email': contact_info.get('email'),
        })

    return {'applications': applications, 'total': total, 'skip': skip, 'limit': limit}

@router.get('/leads/by-stage/{stage}', dependencies=[Depends(_ensure_sales_user)])
async def list_leads_by_stage(stage: str, db=Depends(get_database)):
    """Get leads by pipeline stage."""
    leads = await get_leads_by_stage(db, stage)
    return {'stage': stage, 'leads': leads, 'total': len(leads)}

@router.get('/leads/{lead_id}', dependencies=[Depends(_ensure_sales_user)])
async def get_lead(lead_id: str, db=Depends(get_database)):
    """Get a specific lead."""
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail='Invalid lead ID')
    
    lead = await db['leads'].find_one({
        '_id': ObjectId(lead_id),
        'is_deleted': False
    })
    
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    
    lead['id'] = str(lead.pop('_id'))
    return lead

@router.post('/leads', dependencies=[Depends(_ensure_sales_user)])
async def create_lead(
    payload: LeadBase, 
    db=Depends(get_database),
    current_user: UserModel = Depends(_ensure_sales_user)
):
    """Create a new lead."""
    lead_id, lead = await create_or_get_lead(
        db, 
        payload.email, 
        payload.full_name, 
        payload.phone, 
        payload.source,
        payload.country,
        payload.visa_type
    )
    return {'id': lead_id, 'lead': lead}

@router.put('/leads/{lead_id}', dependencies=[Depends(_ensure_sales_user)])
async def update_lead(
    lead_id: str,
    update_data: LeadUpdate,
    db=Depends(get_database),
    current_user: UserModel = Depends(_ensure_sales_user)
):
    """Update a lead."""
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail='Invalid lead ID')
    
    lead = await db['leads'].find_one({
        '_id': ObjectId(lead_id),
        'is_deleted': False
    })
    
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    
    # Update only provided fields
    update_fields = {}
    if update_data.stage:
        update_fields['stage'] = update_data.stage
    if update_data.status:
        update_fields['status'] = update_data.status
    if update_data.priority:
        update_fields['priority'] = update_data.priority
    if update_data.assigned_to:
        update_fields['assigned_to'] = update_data.assigned_to
    if update_data.notes:
        update_fields['notes'] = update_data.notes
    
    update_fields['updated_at'] = datetime.utcnow()
    
    result = await db['leads'].update_one(
        {'_id': ObjectId(lead_id)},
        {'$set': update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail='Failed to update lead')
    
    updated_lead = await db['leads'].find_one({'_id': ObjectId(lead_id)})
    updated_lead['id'] = str(updated_lead.pop('_id'))
    return updated_lead

@router.post('/leads/{lead_id}/communications')
async def add_communication_log(
    lead_id: str,
    comm: CommunicationLog,
    db=Depends(get_database),
    current_user: UserModel = Depends(_ensure_sales_user)
):
    """Add a communication log to a lead."""
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail='Invalid lead ID')
    
    lead = await db['leads'].find_one({
        '_id': ObjectId(lead_id),
        'is_deleted': False
    })
    
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    
    entry = await add_communication(db, lead_id, {
        'type': comm.type,
        'subject': comm.subject,
        'body': comm.body,
        'recipients': comm.recipients,
        'metadata': comm.metadata
    })
    
    return {'message': 'Communication logged', 'entry': entry}

@router.get('/leads/{lead_id}/communications')
async def get_communications(
    lead_id: str,
    db=Depends(get_database),
    current_user: UserModel = Depends(_ensure_sales_user)
):
    """Get communication timeline for a lead."""
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail='Invalid lead ID')
    
    lead = await db['leads'].find_one({
        '_id': ObjectId(lead_id),
        'is_deleted': False
    })
    
    if not lead:
        # Check if it's a user ID rather than a lead ID (for generic leads)
        user = await db['users'].find_one({
            '_id': ObjectId(lead_id),
            'is_deleted': {'$ne': True}
        })
        if user:
            return {
                'lead_id': lead_id,
                'communications': [],
                'total': 0
            }
        raise HTTPException(status_code=404, detail='Lead not found')
    
    communications = lead.get('communications', [])
    return {
        'lead_id': lead_id,
        'communications': sorted(communications, key=lambda x: x.get('sent_at', datetime.utcnow()), reverse=True),
        'total': len(communications)
    }

@router.post('/leads/{lead_id}/follow-ups')
async def add_follow_up_task(
    lead_id: str,
    follow_up: FollowUpCreate,
    db=Depends(get_database),
    current_user: UserModel = Depends(_ensure_sales_user)
):
    """Add a follow-up task to a lead."""
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail='Invalid lead ID')
    
    lead = await db['leads'].find_one({
        '_id': ObjectId(lead_id),
        'is_deleted': False
    })
    
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    
    task = await add_follow_up(db, lead_id, {
        'type': follow_up.type,
        'title': follow_up.title,
        'description': follow_up.description,
        'due_date': follow_up.due_date,
        'assigned_to': follow_up.assigned_to
    })
    
    return {'message': 'Follow-up added', 'task': task}

@router.get('/leads/{lead_id}/follow-ups')
async def get_follow_ups(
    lead_id: str,
    db=Depends(get_database),
    current_user: UserModel = Depends(_ensure_sales_user)
):
    """Get follow-up tasks for a lead."""
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail='Invalid lead ID')
    
    lead = await db['leads'].find_one({
        '_id': ObjectId(lead_id),
        'is_deleted': False
    })
    
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    
    follow_ups = lead.get('follow_ups', [])
    return {
        'lead_id': lead_id,
        'follow_ups': sorted(follow_ups, key=lambda x: x.get('due_date', datetime.utcnow())),
        'total': len(follow_ups),
        'pending': len([f for f in follow_ups if f.get('status') == 'pending'])
    }

@router.put('/leads/{lead_id}/follow-ups/{task_id}')
async def update_follow_up(
    lead_id: str,
    task_id: str,
    status: str,
    notes: Optional[str] = None,
    db=Depends(get_database),
    current_user: UserModel = Depends(_ensure_sales_user)
):
    """Update follow-up task status."""
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail='Invalid lead ID')
    
    lead = await db['leads'].find_one({
        '_id': ObjectId(lead_id),
        'is_deleted': False
    })
    
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    
    await update_follow_up_status(db, lead_id, task_id, status, notes)
    
    updated_lead = await db['leads'].find_one({'_id': ObjectId(lead_id)})
    follow_up = None
    for fu in updated_lead.get('follow_ups', []):
        if fu.get('task_id') == task_id:
            follow_up = fu
            break
    
    return {'message': 'Follow-up updated', 'follow_up': follow_up}

@router.post('/send')
async def bulk_send(
    payload: BulkEmailPayload,
    request: Request,
    db=Depends(get_database),
    current_user: UserModel = Depends(_ensure_sales_user)
):
    """Send bulk email to leads/users."""
    subject = payload.subject
    body = payload.body
    recipients = payload.recipients
    
    if not subject or not body or not recipients:
        raise HTTPException(status_code=400, detail='subject, body and recipients required')
    
    sent = []
    errors = []
    
    for email in recipients:
        try:
            send_email(email, subject, body)
            sent.append(email)
            
            # Log communication per lead if exists
            lead = await db['leads'].find_one({'email': email})
            if lead:
                await add_communication(db, str(lead['_id']), {
                    'type': 'email',
                    'subject': subject,
                    'body': body,
                    'recipients': [email],
                    'sent_at': datetime.utcnow()
                })
        except Exception as e:
            errors.append({'email': email, 'error': str(e)})
    
    return {'sent': sent, 'errors': errors, 'total_sent': len(sent), 'total_errors': len(errors)}

@router.post('/leads/{lead_id}/from-application')
async def link_application_to_lead(
    lead_id: str,
    application_id: str,
    db=Depends(get_database),
    current_user: UserModel = Depends(_ensure_sales_user)
):
    """Link an application to a lead."""
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail='Invalid lead ID')
    
    await db['leads'].update_one(
        {'_id': ObjectId(lead_id)},
        {
            '$set': {
                'application_id': application_id,
                'updated_at': datetime.utcnow()
            }
        }
    )
    
    return {'message': 'Application linked to lead'}
