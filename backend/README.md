# VissaAssist Backend API

## Setup

1. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create .env file:
```bash
copy .env.example .env
```

4. Run the server:
```bash
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000
API documentation at http://localhost:8000/docs

## API Endpoints

### Applications
- GET /api/applications - Get all applications
- GET /api/applications/{id} - Get specific application
- POST /api/applications - Create new application
- PUT /api/applications/{id} - Update application
- DELETE /api/applications/{id} - Delete application

### Countries
- GET /api/countries - Get all countries
- GET /api/countries/{code} - Get country details
- GET /api/countries/{code}/visa-types - Get visa types

### Chat
- POST /api/chat - Send message to AI
- GET /api/chat/history - Get chat history

### Admin
- GET /api/admin/stats - Get dashboard statistics
- GET /api/admin/users - Get all users
- GET /api/admin/applications - Get all applications
# visassist_backend
