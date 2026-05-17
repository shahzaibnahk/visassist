from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None
    
db = Database()

async def get_database():
    return db.client[settings.DATABASE_NAME]

async def connect_to_mongo():
    try:
        db.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=10000,  # Increase to 10 seconds
            connectTimeoutMS=20000,
            socketTimeoutMS=20000,
            retryWrites=True,
            retryReads=True,
        )
        # Test connection
        await db.client.admin.command('ping')
        print("Connected to MongoDB successfully!")
        
        # Create default user if not exists
        await create_default_user()
        
    except Exception as e:
        print(f"Warning: Could not connect to MongoDB: {str(e)}")
        print("Server will start but database operations will fail until connection is restored")
        # Don't raise - let server start anyway
        pass

async def create_default_user():
    """Create a default user for testing: admin@test.com / admin123"""
    try:
        database = db.client[settings.DATABASE_NAME]
        existing = await database["users"].find_one({"email": "admin@test.com"})
        
        if not existing:
            default_user = {
                "email": "admin@test.com",
                "full_name": "Admin User",
                "password": "admin123",  # Plain password
                "phone": "+1234567890",
                "country": "US",
                "role": "admin",
                "is_active": True,
                "email_verified": True,
                "avatar": None,
                "last_login": None,
                "created_at": datetime.utcnow(),
            }
            await database["users"].insert_one(default_user)
            print("Default user created: admin@test.com / admin123")
        else:
            print("Default user already exists")
    except Exception as e:
        print(f"Could not create default user: {e}")

async def close_mongo_connection():
    if db.client:
        db.client.close()
        print("Closed MongoDB connection")
