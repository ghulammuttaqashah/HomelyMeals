# Real-Time Chat Feature Implementation

## Overview
Implemented a real-time chat feature between customers and cooks with the following capabilities:
- **Customer**: Can see all approved/active cooks and start conversations with any of them
- **Cook**: Can only see and reply to customers who have initiated conversations
- Full real-time messaging using Socket.IO
- Message read/unread tracking
- Optimistic UI updates for better UX

## Backend Implementation

### 1. Database Model
**File**: `server/shared/models/chat.model.js`
- Chat document stores conversation between one customer and one cook
- Messages array with sender info, content, timestamps
- Tracks unread counts separately for customer and cook
- Compound unique index on customerId + cookId

### 2. API Endpoints

#### Customer Routes (`/api/customer/chats`)
- `GET /cooks` - Get all cooks available for chat
- `GET /` - Get all customer's chats
- `GET /unread` - Get unread message count
- `GET /cook/:cookId` - Get or create chat with a cook
- `GET /cook/:cookId/messages` - Get messages (with pagination)
- `POST /cook/:cookId/message` - Send message to cook

#### Cook Routes (`/api/cook/chats`)
- `GET /` - Get all cook's chats (only customers who messaged first)
- `GET /unread` - Get unread message count
- `GET /customer/:customerId/messages` - Get messages (with pagination)
- `POST /customer/:customerId/message` - Reply to customer

**Files**:
- `server/modules/customer/controllers/customerChat.controller.js`
- `server/modules/customer/routes/customerChat.routes.js`
- `server/modules/cook/controllers/cookChat.controller.js`
- `server/modules/cook/routes/cookChat.routes.js`

### 3. Real-Time Socket Events
- Uses existing Socket.IO infrastructure
- Event: `new_message` - Emitted when a message is sent
- Automatically updates chat lists and message threads
- Messages marked as read when viewed

## Frontend Implementation

### Customer App

#### Files Created:
1. **API Client**: `customer/src/api/chat.js`
   - Functions to interact with chat endpoints

2. **Chat Page**: `customer/src/pages/Chats.jsx`
   - Split-pane layout: Cook list on left, chat on right
   - Shows all approved cooks (sortable by last message)
   - Real-time message updates via Socket.IO
   - Optimistic UI updates when sending messages
   - Mobile-responsive (single panel view)
   - Unread message badges
   - Navigate directly to chat via URL: `/chats/:cookId`

3. **Routing**: Added to `customer/src/App.jsx`
   - `/chats` - Main chat page
   - `/chats/:cookId` - Direct chat with specific cook

4. **Navigation**: Updated `customer/src/components/Header.jsx`
   - Added "Chats" button in header

### Cook App

#### Files Created:
1. **API Client**: `cook/src/api/chat.js`
   - Functions to interact with chat endpoints

2. **Chat Page**: `cook/src/pages/Chats.jsx`
   - Split-pane layout: Customer list on left, chat on right
   - Shows only customers who have sent messages
   - Real-time message updates via Socket.IO
   - Optimistic UI updates when sending messages
   - Mobile-responsive (single panel view)
   - Unread message badges
   - Navigate directly to chat via URL: `/chats/:customerId`
   - Error handling for attempting to message a customer who hasn't initiated contact

3. **Routing**: Added to `cook/src/App.jsx`
   - `/chats` - Main chat page
   - `/chats/:customerId` - Direct chat with specific customer

4. **Navigation**: Updated `cook/src/components/Header.jsx`
   - Added "Chats" link in navigation menu

## Key Features

### Security & Permissions
- ✅ Customers can initiate conversations with any approved cook
- ✅ Cooks can ONLY reply to customers who messaged them first
- ✅ All routes protected with authentication middleware
- ✅ Server validates user permissions before operations

### Real-Time Updates
- ✅ Messages appear instantly via Socket.IO
- ✅ Chat lists update automatically when new messages arrive
- ✅ Message read status updates in real-time
- ✅ Unread counters update automatically

### User Experience
- ✅ Optimistic UI updates (messages appear immediately before server confirms)
- ✅ Responsive design (mobile & desktop)
- ✅ Smooth scrolling to latest message
- ✅ Timestamp formatting (relative times)
- ✅ Loading states for async operations
- ✅ Error handling with user-friendly messages

### Data Management
- ✅ Message pagination support (50 messages per page)
- ✅ Efficient queries with MongoDB indexes
- ✅ Unread count aggregation
- ✅ Last message caching for quick chat list rendering

## Testing Checklist

1. **Customer Flow**:
   - [ ] Login as customer
   - [ ] Navigate to Chats page
   - [ ] See list of all cooks
   - [ ] Click on a cook to start chat
   - [ ] Send messages
   - [ ] Receive real-time replies from cook
   - [ ] See unread badges update

2. **Cook Flow**:
   - [ ] Login as cook
   - [ ] Navigate to Chats page
   - [ ] Initially see empty state (if no customers messaged)
   - [ ] After customer sends message, see that customer in list
   - [ ] Click on customer to view chat
   - [ ] Reply to customer
   - [ ] See real-time messages from customer
   - [ ] Verify cannot message customers who haven't initiated

3. **Real-Time**:
   - [ ] Open customer app in one browser
   - [ ] Open cook app in another browser
   - [ ] Send messages from both sides
   - [ ] Verify instant delivery in both directions
   - [ ] Check unread badges update correctly

## Future Enhancements (Optional)

- [ ] Message attachments (images, files)
- [ ] Typing indicators
- [ ] Message deletion
- [ ] Block/Report user
- [ ] Message search
- [ ] Push notifications for new messages
- [ ] Online/offline status indicators
- [ ] Voice messages
- [ ] Emoji picker
- [ ] Message reactions

## Notes

- All chat data is stored in MongoDB with proper indexing for performance
- Socket.IO handles reconnection automatically
- Messages are limited to 1000 characters
- Pagination loads 50 messages at a time (can be adjusted)
- All timestamps are stored in UTC and formatted on client side
