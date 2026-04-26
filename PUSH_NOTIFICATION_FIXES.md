# Push Notification Fixes for Customer PWA

## Issues Identified and Fixed

### 1. **Enhanced Server-Side Logging**
**File:** `server/modules/customer/controllers/customerAuth.controller.js`

**Problem:** Limited logging made it difficult to debug subscription issues.

**Fix:** Added comprehensive logging to the `subscribeToPush` endpoint:
- Logs when subscription requests are received
- Logs the subscription data being saved
- Logs success/failure with customer details
- Validates subscription object and endpoint

### 2. **Added Test Endpoint**
**File:** `server/modules/customer/routes/customerAuth.routes.js`

**New Feature:** Added `/api/customer/auth/push/test` endpoint
- Allows customers to send themselves a test notification
- Verifies that push subscription is saved in database
- Helps diagnose issues quickly

### 3. **Enhanced Service Worker Logging**
**File:** `customer/public/sw.js`

**Fix:** Added detailed logging to push event handler:
- Logs when push events are received
- Logs the raw push data
- Logs parsed notification data
- Logs notification display success/failure
- Matches the verbose logging in cook app

### 4. **Created Push Test Page**
**Files:** 
- `customer/src/pages/PushTest.jsx` (new)
- `customer/src/App.jsx` (updated)

**New Feature:** Comprehensive debugging interface at `/push-test`
- Check notification permission status
- Check service worker registration
- Check browser push subscription
- Check server push subscription
- Request permission and subscribe
- Resubscribe to server
- Send test notification
- Real-time status display

## How to Test

### Step 1: Start the Applications

```bash
# Terminal 1 - Start server
cd server
npm run dev

# Terminal 2 - Start customer app
cd customer
npm run dev
```

### Step 2: Access the Test Page

1. Open customer app in browser (http://localhost:5173)
2. Login as a customer
3. Navigate to: http://localhost:5173/push-test

### Step 3: Run Diagnostics

1. Click **"Check Status"** to see current state
2. Review all status items:
   - ✅ Green = Working correctly
   - ⚠️ Yellow = Needs attention
   - ❌ Red = Problem detected

### Step 4: Fix Issues

**If permission is "default":**
- Click "Request Permission & Subscribe"
- Accept the browser prompt

**If "Push Subscription (Server)" shows "No":**
- Click "Resubscribe to Server"
- Check server console for logs

**If VAPID key is "Missing":**
- Check `customer/.env` file
- Ensure `VITE_VAPID_PUBLIC_KEY` is set

### Step 5: Test Notifications

1. Click **"Send Test Notification"**
2. You should receive a notification immediately
3. Check browser console for detailed logs
4. Check server console for push sending logs

### Step 6: Test Real Scenarios

**Test 1: Cook sends message to customer**
1. Login as cook in another browser/tab
2. Send a message to the customer
3. Customer should receive push notification

**Test 2: Order status update**
1. Place an order as customer
2. Update order status as cook
3. Customer should receive push notification

**Test 3: Payment verification**
1. Upload payment proof as customer
2. Verify payment as cook
3. Customer should receive push notification

## Console Logs to Monitor

### Customer App Console (Browser)
```
[Push] Waiting for service worker to be ready...
[Push] Service worker ready
[Push] Existing subscription: Found/None
[Push] Sending subscription to server...
[Push] Successfully subscribed to push notifications!
```

### Service Worker Console (Browser)
```
[Service Worker] Push event received!
[Service Worker] Push event data: [object]
[Service Worker] Parsed push data: {title, body, url}
[Service Worker] Showing notification with options: {...}
[Service Worker] Notification shown successfully
```

### Server Console (Node.js)
```
[Customer Push Subscribe] Request received from user: <userId>
[Customer Push Subscribe] Subscription data: {...}
[Customer Push Subscribe] ✅ Successfully saved subscription for customer: <name> <id>

📨 [Push] Sending notification to <name>: "Order Update"
✅ [Push] Notification sent successfully to <name>
```

## Common Issues and Solutions

### Issue 1: "No push subscription found"
**Cause:** Subscription not saved to database
**Solution:** 
1. Check server logs for errors during subscription
2. Click "Resubscribe to Server" on test page
3. Verify MongoDB connection is working

### Issue 2: "Permission denied"
**Cause:** User blocked notifications
**Solution:**
1. Go to browser settings
2. Find site settings for localhost:5173
3. Change notifications from "Block" to "Allow"
4. Refresh page and try again

### Issue 3: "Service worker not ready"
**Cause:** Service worker failed to register
**Solution:**
1. Check browser console for SW errors
2. Clear browser cache and reload
3. Check `customer/public/sw.js` exists
4. Verify `customer/src/main.jsx` registers SW

### Issue 4: Notifications work on desktop but not mobile
**Cause:** Mobile browsers have stricter requirements
**Solution:**
1. Ensure HTTPS is used (or localhost for testing)
2. Verify user gesture triggers permission request
3. Check mobile browser console for errors
4. Test with Chrome DevTools mobile emulation first

### Issue 5: "VAPID key missing"
**Cause:** Environment variable not set
**Solution:**
1. Check `customer/.env` file
2. Ensure `VITE_VAPID_PUBLIC_KEY` is present
3. Restart dev server after adding
4. Value should match server's `VAPID_PUBLIC_KEY`

## Verification Checklist

- [ ] Customer can enable notifications via modal
- [ ] Subscription is saved to MongoDB
- [ ] Test notification works from `/push-test` page
- [ ] Cook messages trigger customer notifications
- [ ] Order status updates trigger notifications
- [ ] Payment verification triggers notifications
- [ ] Notifications work on mobile PWA
- [ ] Clicking notification opens correct page
- [ ] Server logs show successful push sends
- [ ] Browser console shows no errors

## Files Modified

1. `server/modules/customer/controllers/customerAuth.controller.js` - Enhanced logging
2. `server/modules/customer/routes/customerAuth.routes.js` - Added test endpoint
3. `customer/public/sw.js` - Enhanced logging
4. `customer/src/pages/PushTest.jsx` - New test page
5. `customer/src/App.jsx` - Added test route

## Next Steps

1. Test on actual mobile devices (not just emulator)
2. Test with HTTPS deployment (not just localhost)
3. Monitor server logs in production
4. Set up error tracking for push failures
5. Consider adding retry logic for failed pushes
6. Add analytics to track notification delivery rates

## Support

If issues persist after following this guide:
1. Check all console logs (browser + server)
2. Verify VAPID keys match between client and server
3. Test with a fresh browser profile
4. Check MongoDB for pushSubscription field
5. Verify network requests are reaching server
