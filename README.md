# Multi-Player Video Chat Application

A video conferencing application that supports up to 6 players per room with WebRTC peer-to-peer connections.

## Features

### 🎥 Multi-Player Video Calls
- Support for up to 6 participants per room
- Real-time video and audio streaming
- Grid-based video layout

### 🚪 Room System
- **Create Room**: Generate a unique 6-character room code
- **Join Room**: Enter an existing room code to join
- **Room Codes**: Easy-to-share alphanumeric codes

### 💬 Group Chat
- Real-time messaging for all room participants
- Message sender identification
- Persistent chat during video calls

### 🔄 Legacy Support
- Maintains backward compatibility with 1-on-1 calling
- Direct user ID calling still available

## How to Use

### For Room-Based Calling (New)

1. **Start the Application**
   - Enter your name
   - Choose to create a new room or join an existing one

2. **Create a Room**
   - Click "Create New Room"
   - Share the generated room code with others
   - Wait for participants to join (max 6 total)

3. **Join a Room**
   - Enter the room code shared with you
   - Click "Join" to enter the room

4. **During the Call**
   - See all participants' video feeds in a grid
   - Use the chat to send messages to everyone
   - Click "Leave Room" to exit

### For 1-on-1 Calling (Legacy)

1. Copy your socket ID
2. Share it with the person you want to call
3. Enter their socket ID and click "Call"
4. They can accept the incoming call notification

## Technical Details

### Server Architecture
- **Express.js** server with Socket.io
- Room management with automatic cleanup
- WebRTC signaling for peer connections

### Client Architecture
- **React** with Context API for state management
- **simple-peer** for WebRTC connections
- **Tailwind CSS** for styling
- Multiple peer connection handling

### Room Management
- Unique room codes (6 characters)
- Automatic room cleanup when empty
- User limit enforcement (6 max)
- Real-time user join/leave notifications

## Installation

### Server
```bash
cd server
npm install
npm start
```

### Client
```bash
cd client
npm install
npm run dev
```

## Dependencies

### Server
- express
- socket.io
- cors

### Client
- react
- socket.io-client
- simple-peer
- tailwindcss
- react-copy-to-clipboard
- react-icons

## Browser Compatibility

Requires browsers with WebRTC support:
- Chrome 50+
- Firefox 38+
- Safari 11+
- Edge 79+

## Limitations

- Maximum 6 users per room
- Requires HTTPS in production for WebRTC
- No recording functionality
- No screen sharing (can be added)

## Future Enhancements

- Screen sharing capability
- Recording functionality
- Room passwords
- User management features
- Mobile app support
