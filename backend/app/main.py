from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.routes import applications, countries, chat, admin, auth
from app.api.routes import sales
from app.api.routes import operations
from app.api.routes import finance
from app.core.middleware import AuditLoggingMiddleware
from app.services.scheduler import start_scheduler
from app.core.database import get_database
import asyncio
from app.services import email_service as _email_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB
    await connect_to_mongo()
    # Attach database and email service to app.state for scheduler access
    from app.core.database import db
    
    # Start APScheduler jobs
    try:
        start_scheduler(db.client[settings.DATABASE_NAME])
    except Exception as e:
        print('Failed to start scheduler:', e)
    
    yield
    # Shutdown: Close MongoDB connection
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="VissaAssist - AI-Powered Visa Application Management System",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add our custom audit logging middleware
app.add_middleware(AuditLoggingMiddleware)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(countries.router, prefix="/api/countries", tags=["Countries"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(sales.router, prefix="/api/sales", tags=["Sales"])
app.include_router(operations.router, prefix="/api/operations", tags=["Operations"])
app.include_router(finance.router, prefix="/api/finance", tags=["Finance"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to VissaAssist API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "VissaAssist API"}
