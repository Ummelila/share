# Notifications System Setup

This document explains how to set up the notifications system for Share For Good.

## Database Setup

You need to create a `notifications` table in your Supabase database. Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_id BIGINT,
  rejection_reason TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
```

## Email Notifications Setup (Optional)

Email notifications use EmailJS, which is free and easy to set up.

### Step 1: Create EmailJS Account
1. Go to https://www.emailjs.com/
2. Sign up for a free account
3. Create an email service (Gmail, Outlook, etc.)
4. Create an email template

### Step 2: Get Your Credentials
1. Go to EmailJS Dashboard → Account → API Keys
2. Copy your Public Key
3. Go to Email Services → Your Service → Service ID
4. Copy your Service ID
5. Go to Email Templates → Your Template → Template ID
6. Copy your Template ID

### Step 3: Add to Your Project
1. Install EmailJS:
   ```bash
   npm install @emailjs/browser
   ```

2. Create a `.env` file in your project root:
   ```
   REACT_APP_EMAILJS_SERVICE_ID=your_service_id
   REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id
   REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key
   ```

3. Update `src/utils/notifications.js` to import EmailJS:
   ```javascript
   import emailjs from '@emailjs/browser';
   
   // Initialize EmailJS (add this at the top of the file)
   if (process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
     emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
   }
   ```

4. Update the `sendEmailNotification` function to use EmailJS:
   ```javascript
   import emailjs from '@emailjs/browser';
   
   export const sendEmailNotification = async (userEmail, userName, type, details) => {
     if (!process.env.REACT_APP_EMAILJS_SERVICE_ID) {
       console.log("EmailJS not configured, skipping email notification");
       return false;
     }
   
     try {
       const emailTemplates = {
         // ... your templates
       };
   
       const template = emailTemplates[type];
       if (!template) return false;
   
       await emailjs.send(
         process.env.REACT_APP_EMAILJS_SERVICE_ID,
         process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
         {
           to_email: userEmail,
           to_name: userName,
           subject: template.subject,
           message: template.body,
         }
       );
   
       return true;
     } catch (error) {
       console.error("Error sending email:", error);
       return false;
     }
   };
   ```

### Step 4: EmailJS Template Variables
In your EmailJS template, use these variables:
- `{{to_email}}` - Recipient email
- `{{to_name}}` - Recipient name
- `{{subject}}` - Email subject
- `{{message}}` - Email body

## How It Works

1. **Dashboard Notifications**: When an admin approves or rejects a request/donation, a notification is created in the database and displayed on the user's dashboard.

2. **Email Notifications**: If EmailJS is configured, an email is also sent to the user.

3. **Notification Types**:
   - `request_approved` - Cash request approved
   - `request_rejected` - Cash request rejected
   - `donation_approved` - Donation approved
   - `donation_rejected` - Donation rejected
   - `verification_approved` - Account verification approved
   - `verification_rejected` - Account verification rejected

## Features

- ✅ Real-time notifications on dashboard
- ✅ Unread notification badge
- ✅ Mark as read functionality
- ✅ Mark all as read
- ✅ Email notifications (optional)
- ✅ Beautiful UI matching your design theme

## Notes

- Email notifications are optional - the system works fine without them
- Notifications are automatically created when admin approves/rejects items
- Users see notifications in the bell icon on the dashboard navbar
- Unread notifications show a red badge with count

