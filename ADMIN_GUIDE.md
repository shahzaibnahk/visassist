# Admin Panel Guide

## 🔐 Admin Access

### Admin Credentials
- **Email:** `admin@vissaassist.com`
- **Password:** `Admin@123`

### Access Method
1. Navigate to the login page (`/login`)
2. Enter the admin credentials above
3. You will be automatically redirected to `/admin` dashboard

## ✨ Admin Features

### Dashboard Overview
The admin dashboard provides comprehensive oversight of the entire VissaAssist platform:

#### 📊 Statistics Cards
- **Total Users:** See the total number of registered users with growth percentage
- **Total Applications:** Track all visa applications across the platform
- **Approved Applications:** Monitor successful applications
- **Success Rate:** View overall approval rate with trends

#### 👥 User Management
- **User List:** View all registered users with their details
- **Search Functionality:** Filter users by name or email
- **User Information:**
  - Full name and email
  - Number of applications submitted
  - Join date
  - Quick view action

#### 📄 Application Oversight
- **Application List:** Monitor all visa applications
- **Search Functionality:** Filter by user name or country
- **Application Details:**
  - User name
  - Destination country with flag
  - Visa type
  - Current status (with color-coded badges)
  - Submission date
  - Quick view action

#### 📈 Analytics (Coming Soon)
- Application trends chart
- User growth visualization
- Success rate trends

## 🔒 Security & Access Control

### Role-Based Access
- Admin routes are protected with `requiredRole="admin"`
- Non-admin users attempting to access `/admin` are redirected to `/dashboard`
- Admin link in navbar only visible to admin users

### Navigation
- Admin users see an additional "Admin" link in the navigation bar
- Regular users do not see this link

## 🎯 Current Implementation

### Backend API Endpoints
All admin endpoints are prefixed with `/api/admin`:

1. **GET /api/admin/stats**
   - Returns dashboard statistics
   - Includes user count, application count, success rate
   - Shows growth percentages

2. **GET /api/admin/users**
   - Returns list of all registered users
   - Includes user details and application count

3. **GET /api/admin/applications**
   - Returns list of all visa applications
   - Includes user info, country, status, and dates

### Frontend Features
- Real-time data fetching from backend APIs
- Search and filter capabilities
- Responsive design for mobile/tablet/desktop
- Professional UI with loading states
- Color-coded status badges

## 🚀 Testing Admin Features

1. **Login as Admin:**
   ```
   Email: admin@vissaassist.com
   Password: Admin@123
   ```

2. **Verify Dashboard:**
   - Check that statistics display correctly
   - Verify user list appears
   - Confirm application list shows data

3. **Test Search:**
   - Use search box to filter users
   - Use search box to filter applications

4. **Test Navigation:**
   - Verify "Admin" link appears in navbar
   - Test navigation between admin and user sections

## 📝 Notes

- Admin credentials are hardcoded in the backend for demo purposes
- In production, implement proper admin user management
- Consider adding more admin features like:
  - User approval/suspension
  - Application status updates
  - Bulk operations
  - Advanced analytics
  - Export functionality

## 🔄 Regular User Access

For comparison, regular users can:
- Create account via `/signup`
- Login and access `/dashboard`
- Submit visa applications
- View their own applications
- Access AI chat and call features

Regular users **cannot** access `/admin` routes.
