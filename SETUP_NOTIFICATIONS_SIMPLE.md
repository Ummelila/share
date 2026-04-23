# 📋 Simple Setup Guide for Notifications

## ⚠️ IMPORTANT: You MUST do Step 1 for notifications to work!

---

## Step 1: Create Database Table (REQUIRED) ⭐

This is the **most important step**. Without this, notifications won't work at all.

### How to do it:

1. **Open your Supabase Dashboard**
   - Go to https://app.supabase.com/
   - Log in to your account
   - Select your project

2. **Open SQL Editor**
   - Look for "SQL Editor" in the left sidebar
   - Click on it

3. **Create a New Query**
   - Click "New Query" button (usually top right)

4. **Copy and Paste this SQL code:**

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

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
```

5. **Run the Query**
   - Click the "Run" button (or press Ctrl+Enter)
   - You should see a success message like "Success. No rows returned"

6. **Verify it worked**
   - Go to "Table Editor" in the left sidebar
   - You should see a new table called "notifications"
   - Click on it to see the columns

### ✅ That's it! Notifications will now work!

---

## Step 2: Test It (Optional but Recommended)

1. **Login as a regular user** (not admin)
2. **Submit a request or donation**
3. **Login as admin** and approve/reject it
4. **Go back to the user dashboard**
5. **Click the bell icon** 🔔 in the top right
6. **You should see a notification!**

---

## Step 3: Email Notifications (OPTIONAL)

Email notifications are **completely optional**. The dashboard notifications work fine without them.

If you want email notifications too, follow these steps:

### 3.1: Sign up for EmailJS (Free)

1. Go to https://www.emailjs.com/
2. Click "Sign Up" (it's free)
3. Create an account

### 3.2: Connect Your Email

1. After logging in, go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the instructions to connect your email
5. **Copy the Service ID** (you'll need this later)

### 3.3: Create Email Template

1. Go to "Email Templates"
2. Click "Create New Template"
3. Use this template:

**Subject:**
```
{{subject}}
```

**Content:**
```
Hello {{to_name}},

{{message}}

Best regards,
Share For Good Team
```

4. **Copy the Template ID** (you'll need this later)

### 3.4: Get Your Public Key

1. Go to "Account" → "General"
2. Find "API Keys"
3. **Copy your Public Key**

### 3.5: Install EmailJS in Your Project

Open your terminal in the project folder and run:

```bash
npm install @emailjs/browser
```

### 3.6: Create .env File

1. In your project root folder, create a file named `.env` (if it doesn't exist)
2. Add these lines (replace with YOUR actual values):

```
REACT_APP_EMAILJS_SERVICE_ID=your_service_id_here
REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id_here
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key_here
```

**Example:**
```
REACT_APP_EMAILJS_SERVICE_ID=service_abc123
REACT_APP_EMAILJS_TEMPLATE_ID=template_xyz789
REACT_APP_EMAILJS_PUBLIC_KEY=abcdefghijklmnop
```

### 3.7: Restart Your App

After creating the `.env` file:
1. Stop your React app (Ctrl+C in terminal)
2. Start it again: `npm start`

---

## 🎉 Done!

Now when an admin approves or rejects something:
- ✅ User gets a notification on their dashboard (bell icon)
- ✅ User gets an email (if you set up EmailJS)

---

## ❓ Troubleshooting

### "Notifications table not created yet" error?
- Make sure you ran the SQL query in Step 1
- Check that the table exists in Supabase Table Editor

### Bell icon not showing?
- Make sure you're logged in
- Refresh the page
- Check browser console for errors (F12)

### No notifications appearing?
- Make sure Step 1 is completed
- Try approving/rejecting a request as admin
- Check browser console for errors

### Email not sending?
- Email notifications are optional - dashboard notifications work without them
- Make sure you completed all EmailJS steps
- Check that your `.env` file has correct values
- Restart your app after creating `.env`

---

## 📝 Quick Checklist

- [ ] Step 1: Created notifications table in Supabase ✅ **REQUIRED**
- [ ] Step 2: Tested notifications work ✅ **Recommended**
- [ ] Step 3: Set up EmailJS (optional) ⚪ **Optional**

**You only need Step 1 for notifications to work!**

