from datetime import datetime, timedelta
from bson import ObjectId
from typing import Optional, List

async def create_or_get_lead(db, email, full_name=None, phone=None, source='generic', country=None, visa_type=None, application_id=None):
    """Create a new lead or get existing one. Update if already exists."""
    existing = await db['leads'].find_one({'email': email})
    now = datetime.utcnow()
    
    if existing and not existing.get('is_deleted', False):
        # update timestamps
        update_data = {'updated_at': now}
        if country:
            update_data['country'] = country
        if visa_type:
            update_data['visa_type'] = visa_type
        if application_id:
            update_data['application_id'] = application_id
        await db['leads'].update_one({'_id': existing['_id']}, {'$set': update_data})
        existing['updated_at'] = now
        return str(existing['_id']), existing
    
    # create new lead
    lead_doc = {
        'email': email,
        'full_name': full_name,
        'phone': phone,
        'source': source,
        'stage': 'new',
        'status': 'active',
        'priority': 'medium',
        'country': country,
        'visa_type': visa_type,
        'application_id': application_id,
        'assigned_to': None,
        'notes': '',
        'follow_ups': [],
        'communications': [],
        'created_at': now,
        'updated_at': now,
        'is_deleted': False,
    }
    res = await db['leads'].insert_one(lead_doc)
    return str(res.inserted_id), lead_doc

async def add_communication(db, lead_id, comm):
    """Add communication log entry to a lead."""
    lead_id_obj = ObjectId(lead_id) if not isinstance(lead_id, ObjectId) else lead_id
    entry = {
        'type': comm.get('type', 'email'),
        'subject': comm.get('subject'),
        'body': comm.get('body'),
        'recipients': comm.get('recipients', []),
        'sent_at': comm.get('sent_at') or datetime.utcnow(),
        'metadata': comm.get('metadata', {}),
    }
    
    # Add to lead's communications array
    await db['leads'].update_one(
        {'_id': lead_id_obj},
        {
            '$push': {'communications': entry},
            '$set': {'updated_at': datetime.utcnow()}
        }
    )
    return entry

async def add_follow_up(db, lead_id, follow_up):
    """Add follow-up task to a lead."""
    lead_id_obj = ObjectId(lead_id) if not isinstance(lead_id, ObjectId) else lead_id
    import uuid
    task_id = str(uuid.uuid4())
    
    task = {
        'task_id': task_id,
        'type': follow_up.get('type', 'email'),
        'title': follow_up.get('title'),
        'description': follow_up.get('description'),
        'due_date': follow_up.get('due_date'),
        'status': 'pending',
        'assigned_to': follow_up.get('assigned_to'),
        'completed_at': None,
        'notes': '',
        'created_at': datetime.utcnow(),
    }
    
    await db['leads'].update_one(
        {'_id': lead_id_obj},
        {
            '$push': {'follow_ups': task},
            '$set': {'updated_at': datetime.utcnow()}
        }
    )
    return task

async def update_follow_up_status(db, lead_id, task_id, status, notes=None):
    """Update follow-up task status."""
    lead_id_obj = ObjectId(lead_id) if not isinstance(lead_id, ObjectId) else lead_id
    update_data = {
        'follow_ups.$.status': status,
        'updated_at': datetime.utcnow(),
    }
    
    if status == 'completed':
        update_data['follow_ups.$.completed_at'] = datetime.utcnow()
    
    if notes:
        update_data['follow_ups.$.notes'] = notes
    
    await db['leads'].update_one(
        {'_id': lead_id_obj, 'follow_ups.task_id': task_id},
        {'$set': update_data}
    )

async def update_lead_stage(db, lead_id, stage):
    """Update lead's pipeline stage."""
    lead_id_obj = ObjectId(lead_id) if not isinstance(lead_id, ObjectId) else lead_id
    await db['leads'].update_one(
        {'_id': lead_id_obj},
        {'$set': {
            'stage': stage,
            'updated_at': datetime.utcnow()
        }}
    )

async def get_leads_by_stage(db, stage):
    """Get all leads at a specific pipeline stage."""
    cursor = db['leads'].find({
        'stage': stage,
        'is_deleted': False
    }).sort('created_at', -1)
    leads = []
    async for lead in cursor:
        lead['id'] = str(lead['_id'])
        leads.append(lead)
    return leads

async def get_leads_by_source(db, source):
    """Get all leads from a specific source."""
    cursor = db['leads'].find({
        'source': source,
        'is_deleted': False
    }).sort('created_at', -1)
    leads = []
    async for lead in cursor:
        lead['id'] = str(lead['_id'])
        leads.append(lead)
    return leads

async def get_generic_leads(db):
    """Get all generic leads (from signup)."""
    cursor = db['leads'].find({
        'source': 'generic',
        'is_deleted': False
    }).sort('created_at', -1)
    leads = []
    async for lead in cursor:
        lead['id'] = str(lead['_id'])
        leads.append(lead)
    return leads
