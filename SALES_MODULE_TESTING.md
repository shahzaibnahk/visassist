# Sales Module - Quick Start Testing Guide

## Prerequisites
- Backend running with MongoDB connected
- Frontend running on dev server
- APScheduler installed (`pip install apscheduler` - already in requirements.txt)

## Step 1: Verify Backend Scheduler

### Check that scheduler starts on app startup:
```bash
# Start backend
cd backend
python -m uvicorn app.main:app --reload
```

Look for messages in terminal:
- Should NOT show scheduler errors
- Should see successful startup

## Step 2: Create Test Users

### Create Regular User:
1. Go to http://localhost:5173/signup
2. Register with:
   - Email: `user@example.com`
   - Full Name: `Test User`
   - Password: `Test123!`
   - Country: Select any
3. This creates a **generic lead** automatically

### Create Admin User:
Use admin creation endpoint or direct database insert:
```javascript
{
  email: "admin@example.com",
  full_name: "Admin User",
  password_hash: "$2b$12$...", // bcrypt hash
  role: "admin",
  user_type: "admin",
  is_active: true,
  created_at: new Date()
}
```

### Create Sales User:
Use admin panel or direct database insert:
```javascript
{
  email: "sales@example.com",
  full_name: "Sales Person",
  password_hash: "$2b$12$...", // bcrypt hash
  role: "user",
  user_type: "sales",
  is_active: true,
  created_at: new Date()
}
```

## Step 3: Test Generic Lead Creation

1. Register 3-4 new users via signup
2. Check MongoDB `leads` collection:
   ```bash
   db.leads.find({source: 'generic'})
   ```
3. Should see entries for all new users

## Step 4: Test Sales Dashboard Access

### As Regular User:
1. Login as regular user
2. Try to access http://localhost:5173/sales
3. ✅ Should redirect to /dashboard (forbidden)

### As Sales User:
1. Logout
2. Login as sales user (`sales@example.com`)
3. Navigate to http://localhost:5173/sales
4. ✅ Should see Sales Dashboard with tabs:
   - Overview (KPI cards)
   - All Leads (list)
   - Generic Leads (signup users)
   - Email Campaign

### As Admin User:
1. Login as admin
2. Go to http://localhost:5173/admin
3. Should see tabs including "Sales"
4. Click Sales tab
5. ✅ Should see generic leads from all registered users

## Step 5: Test Application & Draft Flow

### Create Draft Application:
1. Login as regular user
2. Click "New Application"
3. Fill only personal info (partial)
4. Click "Save as Draft"
5. ✅ Should see success modal
6. Verify in DB:
   ```bash
   db.applications.find({user_id: "<user_id>", status: "draft"})
   ```

### Test Draft Reminder (Fast-track):
1. Manually update draft created_at to 3 days ago:
   ```bash
   db.applications.updateOne(
     {_id: ObjectId("...")},
     {$set: {created_at: new Date(Date.now() - 3*24*60*60*1000)}}
   )
   ```

2. Run scheduler job manually or wait 24 hours
3. ✅ Check email logs for reminder
4. Verify `reminder_sent: true` flag set

### Test Draft Auto-Delete:
1. Manually update draft created_at to 16 days ago:
   ```bash
   db.applications.updateOne(
     {_id: ObjectId("...")},
     {$set: {created_at: new Date(Date.now() - 16*24*60*60*1000)}}
   )
   ```

2. Run scheduler or wait 24 hours
3. ✅ Verify application marked as deleted:
   ```bash
   db.applications.findOne({_id: ObjectId("...")})
   // Should have: is_deleted: true, deletion_reason: 'auto_deleted_after_15_days'
   ```

## Step 6: Test Application Approval Flow

### Submit Application:
1. Login as regular user
2. Complete all required fields for an application
3. Submit application
4. ✅ Status should be "submitted"

### Approve as Admin:
1. Login as admin
2. Go to Admin Dashboard > Applications
3. Find the submitted application
4. Update status to "approved"
5. ✅ Should see update success

### Verify Lead Created:
1. Check MongoDB leads:
   ```bash
   db.leads.find({source: 'approved_application'})
   ```
2. ✅ Should see lead with:
   - source: 'approved_application'
   - application_id: "<application_id>"
   - country: "<from_application>"
   - visa_type: "<from_application>"

### Verify Feedback Email Sent:
1. Run scheduler or wait 12 hours
2. ✅ Check email logs
3. Application should have `feedback_sent: true`

## Step 7: Test Sales Dashboard Features

### Test Lead Filtering:
1. Login as sales user
2. Go to Sales Dashboard > All Leads
3. Select different stages from dropdown
4. ✅ Should filter leads
5. Select different sources
6. ✅ Should filter by source

### Test Email Campaign:
1. Go to Email Campaign tab
2. Enter Subject: "Test Campaign"
3. Enter Body: "Testing email campaign feature"
4. Click "Select All"
5. ✅ Should show all leads selected
6. Click "Send to X recipients"
7. ✅ Should see success message
8. Verify in DB:
   ```bash
   db.leads.findOne({email: "<test_email>"})
   // Should have communication logged
   ```

### Test Lead Details Modal:
1. Go to All Leads tab
2. Click "View" button on any lead
3. ✅ Modal should show:
   - Lead info (email, name, stage, status)
   - Communication history (if any)
   - Follow-up tasks (if any)

### Test Stage Update:
1. From All Leads table
2. Click dropdown on "Stage" column for any lead
3. Change to "contacted"
4. ✅ Should update in DB

## Step 8: Test Admin Sales Section

### View Generic Leads:
1. Login as admin
2. Go to Admin Dashboard
3. Click "Sales" tab
4. ✅ Should see all generic leads (signup users)
5. Can search, view details
6. Shows registration date

## Database Verification Checklist

After each test, verify in MongoDB:

### Leads Collection:
```bash
# Generic leads from signups
db.leads.find({source: 'generic'})

# Leads from approved applications
db.leads.find({source: 'approved_application'})

# Leads with communications
db.leads.find({communications: {$exists: true, $ne: []}})

# Count leads by stage
db.leads.aggregate([{$group: {_id: '$stage', count: {$sum: 1}}}])
```

### Applications Collection:
```bash
# Draft applications
db.applications.find({status: 'draft'})

# Approved applications with feedback sent
db.applications.find({status: 'approved', feedback_sent: true})

# Soft deleted (expired drafts)
db.applications.find({is_deleted: true, deletion_reason: 'auto_deleted_after_15_days'})
```

## API Testing with cURL/Postman

### Get Generic Leads (requires sales user token):
```bash
curl -H "Authorization: Bearer <sales_token>" \
  http://localhost:8000/api/sales/leads/generic
```

### Get All Leads with Stage Filter:
```bash
curl -H "Authorization: Bearer <sales_token>" \
  http://localhost:8000/api/sales/leads?stage=contacted
```

### Send Bulk Email:
```bash
curl -X POST \
  -H "Authorization: Bearer <sales_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Email",
    "body": "This is a test",
    "recipients": ["user@example.com"]
  }' \
  http://localhost:8000/api/sales/send
```

## Troubleshooting

### Scheduler Not Running:
1. Check backend console for scheduler errors
2. Verify APScheduler installed: `pip list | grep apscheduler`
3. Check database connection is active

### Email Not Sending:
1. Verify email service configured in backend
2. Check console logs for send errors
3. Verify recipient email addresses are valid

### Lead Not Created from Approved Application:
1. Check admin.py update endpoint logs
2. Verify application has valid email in contact_info
3. Check if lead_service.create_or_get_lead() raised errors

### Leads Not Appearing in Sales Dashboard:
1. Verify user has sales or admin role
2. Check that leads exist in MongoDB
3. Check API response with browser DevTools

## Success Indicators

✅ All tests passed when:
- Generic leads auto-created on user signup
- Draft reminders sent after 2 days
- Drafts auto-deleted after 15 days
- Leads auto-created from approved applications
- Feedback emails sent to approved applicants
- Sales dashboard shows all leads correctly
- Email campaigns send successfully
- Lead details and communication logs display
- Admin can view generic leads
- Sales users can access sales dashboard
- Regular users cannot access sales features
