# VissaAssist - AI-Powered Visa Application Management System

## 🎯 Project Overview
VissaAssist is a comprehensive visa application management platform with AI-powered assistance, featuring secure authentication, real-time chat support, and streamlined application tracking.

### Current Implementation (30% MVP - Phase 1 Complete)
- **Authentication System**: Complete JWT-based auth with signup, login, protected routes
- **Client Module**: User dashboard, country selection, application management
- **AI Features**: Chatbot assistant for visa queries, VAPI voice call integration (pending)
- **Admin Module**: Basic control panel with role-based access
- **Professional UI**: Responsive design with Tailwind CSS, smooth animations

## ✨ Key Features

### 🔐 Authentication & Security
- JWT-based authentication with access & refresh tokens
- Secure password hashing (bcrypt)
- Protected routes with role-based access control
- Token persistence with automatic expiration handling
- Social login placeholders (Google, Facebook, LinkedIn)

### 👥 User Experience
- Professional signup/login pages with validation
- Personalized dashboard with statistics
- Profile completion tracking
- Real-time toast notifications
- Responsive mobile-friendly design

### 🤖 AI Integration
- Interactive chatbot widget (authenticated users only)
- AI-powered visa query assistance
- Voice call integration with VAPI (coming soon)

### 📊 Application Management
- Track visa applications by status
- Country selection with search & filters
- Application history and timeline
- Document upload support (planned)

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, React Hook Form, Zod
- **Backend**: FastAPI, Motor (async MongoDB), Pydantic, Python-Jose, Passlib
- **Database**: MongoDB (Atlas recommended)
- **Authentication**: JWT tokens, bcrypt password hashing
- **AI Integration**: Custom chatbot, VAPI voice SDK

## 📂 Project Structure
```
VissaAssist/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/   # UI components & auth guards
│   │   ├── pages/        # Page components (Home, Dashboard, Auth)
│   │   ├── features/     # Feature modules (chatbot, call)
│   │   ├── context/      # Auth context provider
│   │   ├── services/     # API services
│   │   └── utils/        # Utility functions
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/routes/   # API endpoints (auth, apps, chat)
│   │   ├── models/       # Database models (User, Application)
│   │   ├── schemas/      # Pydantic schemas (validation)
│   │   ├── core/         # Config, security, dependencies
│   │   └── services/     # Business logic (AI service)
│   ├── requirements.txt
│   └── MONGODB_SETUP.md
├── AUTHENTICATION_TESTING.md
├── AUTHENTICATION_COMPLETE.md
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- MongoDB (Atlas or local)

### 1. Run Everything with One Command (Windows)
```powershell
.\run.bat
```

What this does automatically:
- Creates `backend/.venv` (if missing)
- Installs backend Python dependencies
- Installs frontend npm dependencies
- Starts backend on `http://127.0.0.1:8000`
- Starts frontend on `http://127.0.0.1:3000`

Faster restart (skip dependency install):
```powershell
.\run.bat -SkipInstall
```

### 2. Clone Repository
```bash
git clone <repository-url>
cd "Vissa Assist"
```

### 3. MongoDB Setup
Follow the detailed guide: **`backend/MONGODB_SETUP.md`**

Quick option - MongoDB Atlas (Cloud):
1. Create free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create free cluster (M0)
3. Create database user
4. Get connection string
5. Create `backend/.env` file (see below)

### 4. Backend Setup
```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env` file:
```env
MONGODB_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/vissaassist?retryWrites=true&w=majority
DATABASE_NAME=vissaassist
SECRET_KEY=your-super-secret-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=7
```

Start backend server:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API Documentation: http://localhost:8000/docs

### 5. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Application: http://localhost:3000

## 🧪 Testing Authentication

Follow the comprehensive testing guide: **`AUTHENTICATION_TESTING.md`**

Quick test:
1. Visit http://localhost:3000
2. Click "Get Started" → Fill signup form
3. Login with credentials
4. Access dashboard and protected routes
5. Test logout functionality

## 📚 Documentation

- **Quick Start**: `QUICK_START.md` - Get started in 5 minutes
- **Project Guide**: `PROJECT_GUIDE.md` - Architecture overview
- **Features Map**: `FEATURES_MAP.md` - Feature breakdown
- **MongoDB Setup**: `backend/MONGODB_SETUP.md` - Database configuration
- **Auth Testing**: `AUTHENTICATION_TESTING.md` - Test authentication flow
- **Auth Complete**: `AUTHENTICATION_COMPLETE.md` - Implementation details

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 📋 Features Implemented (30%)
- ✅ Interactive landing page/dashboard
- ✅ Country selection with visa types
- ✅ Application management dashboard
- ✅ AI chatbot interface
- ✅ Basic admin controls
- ✅ Responsive design with Tailwind CSS

## 🔮 Future Enhancements (Remaining 70%)
- Document upload and management
- Payment processing
- Email notifications
- Advanced admin analytics
- Multi-language support
- Full AI integration with document analysis
- Real-time application tracking
- Interview scheduling
- And more...

## 📝 Development Timeline
- **Phase 1 (Current)**: 30% - Core client features (4 hours)
- **Phase 2**: Additional 40% - Advanced features
- **Phase 3**: Final 30% - Polish, testing, deployment

## 👥 Team
[Your Name] - Full Stack Developer

## 📄 License
[Your License]
