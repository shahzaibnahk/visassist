# MongoDB Setup Guide for VissaAssist

This guide will help you set up MongoDB for the VissaAssist application.

## Option 1: MongoDB Atlas (Cloud - Recommended)

MongoDB Atlas is a fully managed cloud database service. It's free for development and perfect for this project.

### Steps:

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
   - Sign up with your email or Google account
   - Complete the registration process

2. **Create a Free Cluster**
   - Click "Build a Database"
   - Select "Free" (M0 Sandbox) tier
   - Choose a cloud provider and region (closest to you)
   - Click "Create Cluster" (takes 3-5 minutes)

3. **Configure Database Access**
   - Go to "Database Access" in left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `vissaassist`
   - Password: Generate a secure password (save it!)
   - User Privileges: "Atlas admin" (for development)
   - Click "Add User"

4. **Configure Network Access**
   - Go to "Network Access" in left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for development)
   - Or add your specific IP address for security
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" in left sidebar
   - Click "Connect" button on your cluster
   - Choose "Connect your application"
   - Driver: Python, Version: 3.12 or later
   - Copy the connection string, it looks like:
     ```
     mongodb+srv://vissaassist:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your actual password
   - Replace `?retryWrites` with `/vissaassist?retryWrites` to specify database name

6. **Update Backend Configuration**
   - Create a `.env` file in `backend/` directory
   - Add your connection string:
     ```env
     MONGODB_URL=mongodb+srv://vissaassist:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/vissaassist?retryWrites=true&w=majority
     DATABASE_NAME=vissaassist
     SECRET_KEY=your-secret-key-change-in-production-09a8f7d6e5c4b3a2
     ```

## Option 2: Local MongoDB Installation

If you prefer to run MongoDB locally:

### Windows:

1. **Download MongoDB**
   - Go to [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - Select "Windows" and download the MSI installer
   - Run the installer and follow the wizard
   - Select "Complete" installation
   - Install "MongoDB as a Service"

2. **Verify Installation**
   ```powershell
   mongod --version
   ```

3. **Start MongoDB Service**
   - MongoDB should start automatically as a service
   - Or manually start: `net start MongoDB`

4. **Update Backend Configuration**
   - Create `.env` file in `backend/` directory:
     ```env
     MONGODB_URL=mongodb://localhost:27017
     DATABASE_NAME=vissaassist
     SECRET_KEY=your-secret-key-change-in-production-09a8f7d6e5c4b3a2
     ```

### macOS:

1. **Install using Homebrew**
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   ```

2. **Start MongoDB**
   ```bash
   brew services start mongodb-community
   ```

3. **Update Backend Configuration** (same as Windows local)

### Linux (Ubuntu/Debian):

1. **Import MongoDB GPG Key**
   ```bash
   wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
   ```

2. **Add MongoDB Repository**
   ```bash
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
   ```

3. **Install MongoDB**
   ```bash
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   ```

4. **Start MongoDB**
   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

5. **Update Backend Configuration** (same as Windows local)

## Verify Connection

Once MongoDB is set up and configured:

1. **Install Python Dependencies**
   ```powershell
   cd backend
   pip install -r requirements.txt
   ```

2. **Start Backend Server**
   ```powershell
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Test Connection**
   - Open browser: http://localhost:8000/docs
   - Try the `/api/auth/signup` endpoint
   - If it works, MongoDB is connected!

## Database Structure

The application will automatically create these collections:

- **users**: User accounts (email, password, profile)
- **applications**: Visa applications
- **countries**: Country information (optional, can use mock data)

## Troubleshooting

### Connection Timeout
- Check firewall settings
- Verify network access in MongoDB Atlas
- Ensure correct connection string

### Authentication Failed
- Double-check username and password
- Verify user permissions in Atlas

### Cannot Connect to localhost:27017
- Ensure MongoDB service is running
- Check if port 27017 is available

## Security Tips for Production

1. **Change SECRET_KEY**: Generate a strong random key
2. **Restrict IP Access**: Don't use "Allow Access from Anywhere"
3. **Use Strong Passwords**: For database users
4. **Enable SSL/TLS**: For connection encryption
5. **Regular Backups**: Enable automated backups in Atlas

## Next Steps

After MongoDB is configured:
1. Start the backend server
2. Test authentication endpoints
3. Create a test user via signup
4. Login and get JWT token
5. Access protected routes

## Resources

- [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/)
- [MongoDB Python Driver](https://pymongo.readthedocs.io/)
- [FastAPI with MongoDB](https://www.mongodb.com/languages/python/pymongo-tutorial)
