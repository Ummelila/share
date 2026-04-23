# Step 4: Product Request Feature - Testing Guide

## Prerequisites
1. ✅ Run `DATABASE_SETUP_PRODUCT_REQUESTS.sql` in Supabase SQL Editor
2. ✅ Have at least one approved product donation in the database
3. ✅ Have a verified user account (recipient)
4. ✅ Have admin account access

---

## Test 1: Database Setup ✅
**Goal:** Verify the table was created correctly

1. Go to Supabase → Table Editor
2. Check if `product_requests` table exists
3. Verify columns:
   - `id` (UUID)
   - `user_id` (BIGINT)
   - `product_donation_id` (BIGINT) ← **Important: Should be BIGINT, not UUID**
   - `status` (VARCHAR)
   - `reason` (TEXT)
   - etc.

**Expected:** Table exists with correct column types

---

## Test 2: Product Request Submission (Recipient) ✅
**Goal:** Verify recipients can request products

### Steps:
1. **Login as a verified recipient user**
2. **Go to Dashboard** → Click "Browse Products"
3. **Browse products:**
   - Search for a product
   - Filter by category
   - Click "View Details" on any product
4. **Request a product:**
   - Click "Request This Product" button
   - Modal should open
   - Fill in "Reason for Request" (required)
   - Click "Submit Request"
5. **Check result:**
   - Should show success message: "Product request submitted successfully!"
   - Should redirect to Dashboard after 2 seconds
   - Dashboard should show "⏳ Product request pending approval"
   - "Browse Products" button should be disabled

**Expected Results:**
- ✅ Modal opens correctly
- ✅ Can't submit without reason
- ✅ Success message appears
- ✅ Redirects to dashboard
- ✅ Dashboard shows pending status
- ✅ Browse Products button is disabled

---

## Test 3: Validation Checks ✅
**Goal:** Verify all validation rules work

### Test 3a: Not Logged In
1. Logout
2. Go to `/browse-products`
3. Try to request a product
4. **Expected:** Error message + redirect to login

### Test 3b: Not Verified
1. Login as unverified user
2. Try to request a product
3. **Expected:** Error message about needing verification

### Test 3c: Already Has Pending Request
1. As verified user, submit a product request
2. Try to request another product immediately
3. **Expected:** Warning message: "You already have a pending product request"

### Test 3d: Duplicate Request for Same Product
1. Request a product (get it approved)
2. Try to request the same product again
3. **Expected:** Warning: "You have already requested this product"

---

## Test 4: Admin Panel - Product Requests Tab ✅
**Goal:** Verify admin can see and manage product requests

### Steps:
1. **Login as admin**
2. **Go to Admin Panel**
3. **Check Statistics:**
   - Look for "📦 Product Requests" card
   - Should show total count, pending, approved, rejected
4. **Check Tab:**
   - Click "Product Requests" tab
   - Should show list of all product requests
   - Pending requests should show first
5. **View Request Details:**
   - Each request should show:
     - User name and email
     - Product name
     - Category
     - Reason
     - Date
     - Status badge

**Expected Results:**
- ✅ Statistics card shows correct counts
- ✅ Tab button shows pending count in brackets
- ✅ Requests list displays correctly
- ✅ Pending requests appear first

---

## Test 5: Admin Approval ✅
**Goal:** Verify admin can approve product requests

### Steps:
1. **In Admin Panel → Product Requests tab**
2. **Find a pending request**
3. **Click "Approve" button**
4. **Check results:**
   - Success message appears
   - Request status changes to "approved"
   - Request moves to approved section
   - Statistics update
5. **Check user notification:**
   - Recipient should receive notification
   - Email should be sent (if EmailJS configured)
   - Notification should say: "Your product request for [product] has been approved!"

**Expected Results:**
- ✅ Approval works instantly
- ✅ Status updates correctly
- ✅ Notification sent to user
- ✅ Statistics update

---

## Test 6: Admin Rejection ✅
**Goal:** Verify admin can reject product requests with reason

### Steps:
1. **In Admin Panel → Product Requests tab**
2. **Find a pending request**
3. **Click "Reject" button**
4. **Rejection modal opens:**
   - Should ask for rejection reason
   - Reason field is required
   - Can't submit without reason
5. **Enter reason and confirm:**
   - Type a reason (e.g., "Product already allocated")
   - Click "Confirm Rejection"
6. **Check results:**
   - Success message appears
   - Request status changes to "rejected"
   - Request moves to rejected section
   - Statistics update
7. **Check user notification:**
   - Recipient should receive notification
   - Email should include rejection reason

**Expected Results:**
- ✅ Rejection modal opens
- ✅ Reason is required
- ✅ Rejection works with reason
- ✅ Status updates correctly
- ✅ Notification sent with reason

---

## Test 7: Dashboard Status Updates ✅
**Goal:** Verify dashboard reflects request status changes

### Steps:
1. **As recipient, submit a product request**
2. **Check Dashboard:**
   - Should show "⏳ Product request pending approval"
   - "Browse Products" button disabled
3. **Admin approves the request**
4. **Refresh Dashboard (or wait for auto-refresh):**
   - Pending notice should disappear
   - "Browse Products" button should be enabled again
5. **Submit another request**
6. **Admin rejects it**
7. **Check Dashboard:**
   - Pending notice should disappear
   - Button should be enabled again

**Expected Results:**
- ✅ Dashboard shows pending status correctly
- ✅ Button disabled when pending
- ✅ Status updates after approval/rejection
- ✅ Button re-enabled after decision

---

## Test 8: Multiple Requests Flow ✅
**Goal:** Test the complete flow with multiple users/products

### Steps:
1. **User A requests Product 1** → Should work
2. **User A tries to request Product 2** → Should be blocked (pending request)
3. **Admin approves User A's request**
4. **User A requests Product 2** → Should work now
5. **User B requests Product 1** → Should work (different user)
6. **User A tries to request Product 1 again** → Should be blocked (already requested)

**Expected Results:**
- ✅ One pending request per user at a time
- ✅ Can request after approval
- ✅ Multiple users can request same product
- ✅ Can't request same product twice

---

## Test 9: Edge Cases ✅
**Goal:** Test edge cases and error handling

### Test 9a: Empty Product List
1. Delete all approved products
2. Go to Browse Products
3. **Expected:** "No products available" message

### Test 9b: Request Non-Existent Product
1. Try to request a product that was deleted
2. **Expected:** Error handling (shouldn't crash)

### Test 9c: Network Error
1. Disconnect internet
2. Try to submit request
3. **Expected:** Error message, doesn't crash

---

## Test 10: Integration with Other Features ✅
**Goal:** Verify integration with existing features

### Steps:
1. **Check notifications:**
   - Approve/reject should create notifications
   - Notifications should appear in bell icon
2. **Check email (if configured):**
   - Approval/rejection emails should be sent
3. **Check Admin Panel loading:**
   - Product requests should load with other data
   - Statistics should show correct counts
4. **Check Dashboard:**
   - Product request status should not interfere with cash requests
   - Both can be pending simultaneously

**Expected Results:**
- ✅ All integrations work smoothly
- ✅ No conflicts between features

---

## Quick Test Checklist

- [ ] Database table created successfully
- [ ] Can browse products
- [ ] Can request product (logged in + verified)
- [ ] Validation works (not logged in, not verified, pending check)
- [ ] Admin can see product requests tab
- [ ] Admin can approve requests
- [ ] Admin can reject requests with reason
- [ ] Notifications sent on approve/reject
- [ ] Dashboard shows pending status
- [ ] Dashboard button disabled when pending
- [ ] Status updates after admin decision
- [ ] Can't request multiple products simultaneously
- [ ] Can't request same product twice

---

## Common Issues & Solutions

### Issue: "Table doesn't exist"
**Solution:** Run the SQL script in Supabase SQL Editor

### Issue: "Foreign key constraint error"
**Solution:** Make sure `product_donation_id` is BIGINT (not UUID)

### Issue: "Can't see Product Requests tab"
**Solution:** Check if product_requests table has data, refresh admin panel

### Issue: "Request not showing in admin"
**Solution:** Check if request was inserted, verify user_id matches

### Issue: "Dashboard not updating"
**Solution:** Refresh page or check if loadUserData is called

---

## Success Criteria ✅

All tests pass = Step 4 is working correctly!

**Key indicators:**
1. Recipients can request products smoothly
2. Admin can approve/reject easily
3. Notifications work
4. Dashboard status updates correctly
5. All validations prevent errors

