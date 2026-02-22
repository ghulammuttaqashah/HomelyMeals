# Chat Feature Debugging Guide

## Test Steps

### 1. Server Startup
Start the server and check console output:
```bash
cd server
npm run dev
```

**Expected console output:**
```
🚀 Server running on http://localhost:5000
🔌 Socket.io initialized
```

### 2. Customer Login & Socket Connection
Open customer app in browser (http://localhost:5173)

**Expected browser console output:**
```
🔌 Customer socket connected: <socket-id>
```

### 3. Cook Login & Socket Connection
Open cook app in different browser/tab (http://localhost:5174)

**Expected browser console output:**
```
🔌 Cook socket connected: <socket-id>
```

**Expected server console output:**
```
🔌 Socket connected: cook:<cook-mongodb-id>
```

### 4. Customer Sends First Message

1. Navigate to Chats page in customer app
2. You should see a list of all approved cooks
3. Click on a cook to open chat
4. Type a message and send

**Expected browser console (customer):**
```
Setting up socket listener for new_message event
```

**Expected server console:**
```
📤 Emitting new_message to cook <cook-id>
📤 Emitting "new_message" to room "cook:<cook-id>"
✅ Message sent from customer <customer-id> to cook <cook-id>
```

### 5. Cook Receives Message

**Expected browser console (cook):**
```
Fetched chats for cook: [{ customerId: {...}, lastMessage: {...} }]
Received new_message event: {
  chatId: "...",
  message: {...},
  customerId: "...",
  cookUnread: 1
}
```

**What should happen:**
- Cook's chat list should show the new customer
- The customer name should be visible
- Unread badge should show "1"

### 6. Cook Clicks to Reply

**Expected browser console (cook):**
```
Selecting customer: { _id: "...", name: "Customer Name", email: "..." }
```

### 7. Cook Sends Reply

**Expected server console:**
```
📤 Emitting new_message to customer <customer-id>
📤 Emitting "new_message" to room "customer:<customer-id>"
✅ Message sent from cook <cook-id> to customer <customer-id>
```

**Expected browser console (customer):**
```
Received new_message event: {
  chatId: "...",
  message: {...},
  cookId: "...",
  customerUnread: 1
}
Adding message to current chat
```

## Common Issues & Solutions

### Issue 1: Socket not connecting
**Symptom:** No "Socket connected" message in console

**Solutions:**
1. Check that server is running
2. Verify VITE_API_BASE_URL in .env files
3. Check for CORS errors in console
4. Verify cookies are being sent (check Network tab)

### Issue 2: Customer name not showing in cook app
**Symptom:** Cook sees "Customer" instead of actual name

**Solutions:**
1. Check server console for chat fetch - should show populated customerId
2. Check browser console: `console.log(chats)` - customerId should have name and email
3. Verify MongoDB populate is working - check database directly

**Debug command in browser console:**
```javascript
// In cook's chat page
console.log('Chats:', chats)
console.log('First chat customer:', chats[0]?.customerId)
```

### Issue 3: Click not working to select conversation
**Symptom:** Clicking on a chat doesn't open it

**Solutions:**
1. Check browser console for "Selecting customer:" log
2. Check for any error messages
3. Verify customer object has _id property
4. Check if navigation is working (URL should change)

**Debug in browser console:**
```javascript
// Add temporary debug in handleSelectCustomer
console.log('Customer object:', customer)
console.log('Has _id?', customer?._id)
```

### Issue 4: Real-time not working
**Symptom:** Messages don't appear instantly

**Solutions:**

**Check Server:**
1. Look for emission logs in server console:
   ```
   📤 Emitting "new_message" to room "cook:<id>"
   ```
2. Verify the room name matches the socket connection room

**Check Client:**
1. Check browser console for "Received new_message event"
2. Verify socket listener is set up: "Setting up socket listener"
3. Check if getSocket() returns a connected socket:
   ```javascript
   // In browser console
   import { getSocket } from './utils/socket'
   const socket = getSocket()
   console.log('Connected?', socket.connected)
   console.log('Socket ID:', socket.id)
   ```

**Verify room names match:**
In server console, note the room name when socket connects:
```
🔌 Socket connected: cook:67abc123...
```

When message is sent, check if the room name matches:
```
📤 Emitting "new_message" to room "cook:67abc123..."
```

If room names don't match, there's a JWT/authentication issue.

### Issue 5: JWT/Room mismatch
**Symptom:** Socket connects but messages aren't received

**Debug steps:**
1. In server, add console.log in socket.js initializeSocket:
   ```javascript
   console.log('JWT decoded:', user)
   console.log('Room:', room)
   ```

2. Compare with emitToCook/emitToCustomer room names

3. Verify JWT contains `id` field (not `_id`)

## MongoDB Debug Queries

Check if chats are being created:
```javascript
// In MongoDB shell or Compass
db.chats.find().pretty()

// Check if customerId is populated
db.chats.findOne()

// Verify customer exists
db.customers.findOne({ _id: ObjectId("...") })
```

## Network Tab Debugging

1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Click on the socket.io connection
4. Go to "Messages" tab
5. You should see:
   - `42["new_message",{...}]` when messages are sent
   - Messages should appear in real-time

## Final Checklist

- [ ] Server running with Socket.io initialized
- [ ] Customer socket connected
- [ ] Cook socket connected
- [ ] Customer can see all cooks in chat list
- [ ] Customer can send message to cook
- [ ] Server emits to cook room
- [ ] Cook sees customer in chat list with name
- [ ] Cook can click to select conversation
- [ ] Cook can send reply to customer
- [ ] Server emits to customer room
- [ ] Customer receives message in real-time
- [ ] Unread badges update correctly
- [ ] Messages appear instantly on both sides

## Need More Help?

If issues persist:
1. Export console logs from both browser and server
2. Take screenshots of Network → WS messages
3. Check MongoDB for chat documents
4. Verify all dependencies are installed (`npm install` in all folders)
5. Clear browser cache and try again
6. Try in incognito mode to rule out extension issues
