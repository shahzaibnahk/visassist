from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
from app.services.ai_service import get_ai_service
from app.core.dependencies import get_current_active_user, get_optional_user
from app.services.audit_service import audit_service
from app.models.user import UserModel

router = APIRouter()

class ChatMessage(BaseModel):
    message: str
    conversation_history: Optional[List[Dict]] = None

class ChatResponse(BaseModel):
    response: str
    timestamp: datetime

@router.post("/", response_model=ChatResponse)
async def send_message(chat_message: ChatMessage, user: Optional[UserModel] = Depends(get_optional_user)):
    """Send a message to the Azure OpenAI assistant"""
    try:
        if not chat_message.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        ai_service = get_ai_service()
        response = await ai_service.chat_response(
            chat_message.message,
            chat_message.conversation_history
        )
        
        user_id = str(user.id) if user else "anonymous"
        await audit_service.log_activity(
            action="CHATBOT_INTERACTION",
            entity_type="CHAT",
            details="User interacted with the chatbot",
            user_id=user_id,
            entity_id=None
        )
        
        return ChatResponse(response=response, timestamp=datetime.utcnow())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat service error: {str(e)}")

@router.get("/history")
async def get_chat_history(current_user: dict = Depends(get_current_active_user)):
    """Get chat history for the current user"""
    # Placeholder - will be replaced with database queries
    return {"messages": [], "total": 0}
