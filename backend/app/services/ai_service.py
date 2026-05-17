# AI Service - Azure OpenAI Integration

from openai import AzureOpenAI
from app.core.config import settings
from typing import Optional
import warnings

class AIService:
    """Service for AI-powered features using Azure OpenAI"""
    
    def __init__(self):
        """Initialize Azure OpenAI client"""
        if not settings.AZURE_OPENAI_API_KEY:
            warnings.warn("AZURE_OPENAI_API_KEY not set. Chat functionality will be disabled until API key is configured.")
            self.client = None
            self.model_name = None
        else:
            try:
                self.client = AzureOpenAI(
                    api_key=settings.AZURE_OPENAI_API_KEY,
                    api_version="2024-02-15-preview",
                    azure_endpoint=settings.AZURE_OPENAI_ENDPOINT
                )
                self.model_name = settings.AZURE_OPENAI_DEPLOYMENT_NAME
            except Exception as e:
                warnings.warn(f"Failed to initialize Azure OpenAI client: {str(e)}")
                self.client = None
                self.model_name = None
    
    @staticmethod
    async def analyze_document(document_path: str):
        """Analyze uploaded documents using AI"""
        # Placeholder for document analysis
        return {"status": "success", "analysis": "Document analysis coming soon"}
    
    @staticmethod
    async def generate_visa_recommendation(user_data: dict):
        """Generate visa recommendations based on user data"""
        # Placeholder for recommendation engine
        return {"recommended_visa": "Tourist Visa", "confidence": 0.85}
    
    async def chat_response(self, message: str, conversation_history: Optional[list] = None) -> str:
        """Generate AI chat responses using Azure OpenAI Llama model"""
        try:
            # Check if client is initialized
            if not self.client or not self.model_name:
                return "Chat service is not configured. Please set AZURE_OPENAI_API_KEY in your environment variables."
            
            # Build messages list
            messages = []
            
            # Add system prompt to guide the AI
            messages.append({
                "role": "system",
                "content": """You are VissaAssist AI, a specialized visa application assistant. 
                Your role is to:
                1. Provide instant answers to FAQs and visa program guidance
                2. Conduct preliminary eligibility screening to qualify leads before human involvement
                3. Guide users through the visa application process
                4. Answer questions about visa requirements, processing times, fees, documents needed
                5. Help users understand different visa types
                
                Be professional, helpful, and concise. If a question is outside visa assistance scope, 
                politely redirect back to visa-related topics."""
            })
            
            # Add conversation history if provided
            if conversation_history:
                messages.extend(conversation_history)
            
            # Add current user message
            messages.append({
                "role": "user",
                "content": message
            })
            
            # Call Azure OpenAI API
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.7,
                max_tokens=500,
                top_p=0.95
            )
            
            # Extract and return the assistant's response
            return response.choices[0].message.content
        except Exception as e:
            # Fallback response if API fails
            print(f"Azure OpenAI API Error: {str(e)}")
            return f"I apologize, but I'm having trouble processing your request. Please try again later. (Error: {str(e)})"


# Create a singleton instance
_ai_service_instance = None

def get_ai_service():
    """Get or create AI service instance"""
    global _ai_service_instance
    if _ai_service_instance is None:
        _ai_service_instance = AIService()
    return _ai_service_instance
