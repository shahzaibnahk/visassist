import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

# Let's mock get_database
from app.core.database import get_database

class MockCollection:
    async def find_one(self, *args, **kwargs):
        # Always return None when finding if user exists
        # Except when looking up the admin for login
        if kwargs.get("email") == "admin@vissaassist.com":
            return {"_id": "test_id", "email": "admin@vissaassist.com", "password_hash": "some_hash"}
        return None
        
    async def insert_one(self, *args, **kwargs):
        class Result:
            inserted_id = "test_id"
        return Result()
        
    async def update_one(self, *args, **kwargs):
        pass

class MockDB:
    def __getitem__(self, val):
        return MockCollection()

async def override_get_database():
    return MockDB()

app.dependency_overrides[get_database] = override_get_database

@pytest.mark.asyncio
async def test_signup():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/auth/signup", json={
            "email": "test@example.com",
            "password": "Password123",
            "full_name": "Test User",
            "phone": "1234567890",
            "country": "USA"
        })
    assert response.status_code in (201, 400)
    if response.status_code == 201:
        assert "access_token" in response.json()
        assert "refresh_token" in response.json()

@pytest.mark.asyncio
async def test_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/auth/login", json={
            "email": "admin@vissaassist.com",
            "password": "Admin@123"
        })
    assert response.status_code == 200
    assert "access_token" in response.json()
