# Database Integration Guide

## Overview
The application now uses MongoDB to persist room data, user information, and chat messages. This ensures data persistence across server restarts and provides better scalability.

## Database Schema

### Room Collection
Each room is stored as a single document with the following structure:

```javascript
{
  roomCode: String,        // 6-digit unique room code
  users: [UserSchema],     // Array of users in the room
  messages: [MessageSchema], // Array of chat messages
  hostUserCode: String,    // User code of room host
  createdAt: Date,         // Room creation timestamp
  updatedAt: Date,         // Last update timestamp
  isActive: Boolean,       // Room status
  maxUsers: Number         // Maximum users allowed (default: 6)
}
```

### User Schema (embedded in Room)
```javascript
{
  userCode: String,        // 4-digit user code
  userName: String,        // Display name
  socketId: String,        // Current socket connection ID
  isHost: Boolean,         // Host status
  joinedAt: Date,         // When user joined
  isActive: Boolean        // Active status
}
```

### Message Schema (embedded in Room)
```javascript
{
  message: String,         // Message content
  userName: String,        // Sender's display name
  userCode: String,        // Sender's user code
  timestamp: Date          // Message timestamp
}
```

## Features

### 🔄 Automatic Data Persistence
- All rooms, users, and messages are automatically saved to MongoDB
- No duplicate room entries - existing rooms are updated when users join/leave
- Messages persist across disconnections

### 👥 User Management
- User reconnection handling - updates socket ID when user reconnects
- Inactive user tracking instead of immediate deletion
- Host transfer capabilities

### 💬 Message History
- All messages are stored in the database
- Previous messages load automatically when joining a room
- API endpoints for message retrieval with pagination

### 🔍 Room Discovery
- API endpoints to list all active rooms
- Room statistics and user counts
- Message history access

## API Endpoints

### GET /api/rooms
Returns all active rooms with basic information.

### GET /api/rooms/:roomCode
Returns detailed information about a specific room including users and recent messages.

### GET /api/rooms/:roomCode/messages
Returns messages for a specific room with pagination support.

Query parameters:
- `limit`: Number of messages to return (default: 50)
- `skip`: Number of messages to skip for pagination (default: 0)

## Setup Instructions

### 1. Install Dependencies
```bash
cd server
npm install mongodb mongoose dotenv
```

### 2. Database Configuration

#### Option A: Local MongoDB
1. Install MongoDB on your local machine
2. Create a `.env` file in the server directory:
```env
MONGODB_URI=mongodb://localhost:27017/guess-whos-lying
PORT=8090
NODE_ENV=development
```

#### Option B: MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Create a `.env` file in the server directory:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/guess-whos-lying?retryWrites=true&w=majority
PORT=8090
NODE_ENV=development
```

### 3. Start the Application
```bash
# Start server
cd server
npm start

# Start client (in another terminal)
cd client
npm run dev
```

## Database Operations

The application automatically handles:
- ✅ Room creation and updates
- ✅ User joining/leaving without duplicates
- ✅ Message persistence
- ✅ Connection cleanup on disconnect
- ✅ Room cleanup when empty
- ✅ Index creation for performance

## Benefits

1. **Data Persistence**: Rooms and messages survive server restarts
2. **No Duplicates**: Smart upsert operations prevent duplicate entries
3. **Scalability**: Can handle multiple server instances with shared database
4. **Message History**: Users can see previous conversation when joining
5. **Analytics**: Room usage and message statistics available
6. **Backup**: All data is safely stored and can be backed up

## Monitoring

Monitor your database usage through:
- MongoDB Compass (local)
- MongoDB Atlas dashboard (cloud)
- Application logs for database operations
- API endpoints for room statistics

## Next Steps

Consider adding:
- User authentication and profiles
- Room permissions and privacy settings
- Message search functionality
- File sharing capabilities
- Room expiration policies
- Advanced analytics and reporting
