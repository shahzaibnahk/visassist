from datetime import datetime
from bson import ObjectId
from app.core.database import db

class AuditService:
    @staticmethod
    async def log_activity(
        action: str,
        entity_type: str,
        details: str,
        user_id: str = None,
        entity_id: str = None,
        ip_address: str = None,
        request_data: dict = None,
        response_data: dict = None
    ):
        log_entry = {
            "user_id": ObjectId(user_id) if user_id and ObjectId.is_valid(user_id) else None,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "details": details,
            "ip_address": ip_address,
            "request_data": request_data,
            "response_data": response_data,
            "created_at": datetime.utcnow()
        }
        
        try:
            await db.client["vissaassist"]["audit_logs"].insert_one(log_entry)
        except Exception as e:
            print(f"Failed to write audit log: {e}")

audit_service = AuditService()
