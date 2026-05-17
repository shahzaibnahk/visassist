from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
import asyncio
from app.services.email_service import send_email
from app.services.lead_service import create_or_get_lead

scheduler = AsyncIOScheduler()

async def draft_reminder_and_cleanup(db):
    """Handle draft application reminders and auto-deletion."""
    now = datetime.utcnow()
    # Reminder: drafts created 2+ days ago but not reminded
    two_days_ago = now - timedelta(days=2)
    fifteen_days_ago = now - timedelta(days=15)

    # Send reminders for drafts older than 2 days and no reminder_sent
    try:
        cursor = db['applications'].find({
            'status': 'draft',
            'created_at': {'$lte': two_days_ago},
            'reminder_sent': {'$ne': True}
        })
        async for draft in cursor:
            try:
                email = draft.get('contact_info', {}).get('email')
                if email:
                    send_email(
                        to_email=email,
                        subject='Reminder: Complete your visa application',
                        message='<h2>Complete Your Application</h2><p>Please complete and submit your saved visa application. It will be automatically deleted after 15 days if not submitted.</p>'
                    )
                    await db['applications'].update_one(
                        {'_id': draft['_id']}, 
                        {'$set': {'reminder_sent': True, 'reminder_sent_at': datetime.utcnow()}}
                    )
            except Exception as e:
                print(f'Failed to send draft reminder for {draft.get("_id")}: {e}')
    except Exception as e:
        print(f'Error in draft reminder job: {e}')

    # Delete drafts older than 15 days
    try:
        del_cursor = db['applications'].find({
            'status': 'draft',
            'created_at': {'$lte': fifteen_days_ago}
        })
        async for old in del_cursor:
            try:
                email = old.get('contact_info', {}).get('email')
                # Soft delete
                await db['applications'].update_one(
                    {'_id': old['_id']},
                    {
                        '$set': {
                            'is_deleted': True,
                            'deleted_at': datetime.utcnow(),
                            'deletion_reason': 'auto_deleted_after_15_days'
                        }
                    }
                )
                # Send notification email
                if email:
                    send_email(
                        to_email=email,
                        subject='Your Visa Application Draft Has Been Deleted',
                        message='<h2>Application Deleted</h2><p>Your draft visa application was automatically deleted after 15 days of inactivity. Please start a new application if you wish to proceed.</p>'
                    )
            except Exception as e:
                print(f'Failed to delete old draft {old.get("_id")}: {e}')
    except Exception as e:
        print(f'Error in draft deletion job: {e}')


async def process_approved_applications(db):
    """Send feedback survey emails for approved and completed applications."""
    try:
        # Find applications that are approved and 100% complete but feedback not sent
        cursor = db['applications'].find({
            'status': 'approved',
            'is_deleted': {'$ne': True},
            'feedback_sent': {'$ne': True}
        })
        async for app in cursor:
            try:
                email = app.get('contact_info', {}).get('email')
                full_name = app.get('personal_info', {}).get('first_name', 'User')
                
                if email:
                    # Send feedback/survey email and create lead
                    send_email(
                        to_email=email,
                        subject='Your Visa Application Approved - Share Your Feedback',
                        message=f'''
                        <h2>Congratulations!</h2>
                        <p>Dear {full_name},</p>
                        <p>Your visa application has been approved and processing is complete!</p>
                        <p>We would love to hear about your experience. Your feedback helps us improve our services.</p>
                        <p>Please reply to this email with your thoughts and suggestions.</p>
                        <p>Best regards,<br>Vissa Assist Team</p>
                        '''
                    )
                    
                    # Create lead from approved application
                    await create_or_get_lead(
                        db,
                        email,
                        full_name=app.get('personal_info', {}).get('first_name'),
                        phone=app.get('contact_info', {}).get('phone'),
                        source='approved_application',
                        country=app.get('country'),
                        visa_type=app.get('travel_info', {}).get('purpose_of_visit'),
                        application_id=str(app.get('_id'))
                    )
                    
                    # Mark feedback email as sent
                    await db['applications'].update_one(
                        {'_id': app['_id']},
                        {'$set': {'feedback_sent': True, 'feedback_sent_at': datetime.utcnow()}}
                    )
            except Exception as e:
                print(f'Failed to send feedback for application {app.get("_id")}: {e}')
    except Exception as e:
        print(f'Error in approved applications job: {e}')


def start_scheduler(db):
    """Start the APScheduler instance with scheduled jobs."""
    # Schedule draft reminder and cleanup every 24 hours
    scheduler.add_job(
        lambda: asyncio.create_task(draft_reminder_and_cleanup(db)), 
        'interval', 
        hours=24, 
        id='draft_jobs',
        replace_existing=True
    )
    
    # Schedule approved application processing every 12 hours
    scheduler.add_job(
        lambda: asyncio.create_task(process_approved_applications(db)), 
        'interval', 
        hours=12, 
        id='approved_app_jobs',
        replace_existing=True
    )
    
    # Only start if not already running
    if not scheduler.running:
        scheduler.start()

def stop_scheduler():
    """Stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
