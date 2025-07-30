const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");
require('dotenv').config();

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Import database and models
const connectDB = require('./config/database');
const User = require('./models/User');
const Room = require('./models/Room');
const Message = require('./models/Message');

// Connect to MongoDB
connectDB();

app.use(cors());
const PORT = process.env.PORT || 8090;

// Room and user management (keeping in-memory for real-time operations)
const rooms = new Map(); // roomCode -> { users: Set of socketIds, createdAt: timestamp }
const userCodes = new Map(); // socketId -> 4-digit code
const codeToSocket = new Map(); // 4-digit code -> socketId
const userRooms = new Map(); // socketId -> roomCode
const userNames = new Map(); // userCode -> userName

// Generate 4-digit user code
async function generateUserCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (codeToSocket.has(code) || await User.findOne({ userCode: code }));
  return code;
}

// Generate 6-digit room code
async function generateRoomCode() {
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(code) || await Room.findOne({ roomCode: code }));
  return code;
}

// Clean up user from all data structures
async function cleanupUser(socketId) {
  const userCode = userCodes.get(socketId);
  const roomCode = userRooms.get(socketId);
  
  if (userCode) {
    codeToSocket.delete(userCode);
    userCodes.delete(socketId);
    userNames.delete(userCode);
    
    // Update user status in database
    try {
      await User.findOneAndUpdate(
        { userCode },
        { 
          isOnline: false,
          lastActive: new Date(),
          currentRoom: null 
        }
      );
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  }
  
  if (roomCode && rooms.has(roomCode)) {
    const room = rooms.get(roomCode);
    room.users.delete(socketId);
    
    // Notify other users in room that this user left
    room.users.forEach(otherSocketId => {
      const otherUserCode = userCodes.get(otherSocketId);
      const userName = userNames.get(userCode);
      io.to(otherSocketId).emit("userLeft", { userCode, userName });
    });
    
    // Update room in database and delete if empty
    try {
      if (room.users.size === 0) {
        rooms.delete(roomCode);
        await Room.findOneAndUpdate(
          { roomCode },
          { isActive: false }
        );
      } else {
        // Update room users in database
        const roomUsers = Array.from(room.users).map(socketId => ({
          userCode: userCodes.get(socketId),
          userName: userNames.get(userCodes.get(socketId))
        }));
        
        await Room.findOneAndUpdate(
          { roomCode },
          { users: roomUsers }
        );
      }
    } catch (error) {
      console.error('Error updating room:', error);
    }
  }
  
  userRooms.delete(socketId);
}

app.get("/", (req, res) => {
  res.send("Success");
});

io.on("connection", async (socket) => {
  // Generate and assign 4-digit user code
  const userCode = await generateUserCode();
  userCodes.set(socket.id, userCode);
  codeToSocket.set(userCode, socket.id);
  
  // Create user in database
  try {
    await User.create({
      userCode,
      userName: '', // Will be set when user provides name
      socketId: socket.id,
      isOnline: true
    });
  } catch (error) {
    console.error('Error creating user:', error);
  }
  
  socket.emit("me", userCode); // Send 4-digit code instead of socket.id
  
  // Handle user setting their name (for 1-on-1 calls)
  socket.on("setUserName", async ({ userName }) => {
    userNames.set(userCode, userName);
    
    try {
      await User.findOneAndUpdate(
        { userCode },
        { userName }
      );
    } catch (error) {
      console.error('Error updating user name:', error);
    }
  });
  
  // Get user name by user code
  socket.on("getUserName", async ({ userCode: requestedUserCode }, callback) => {
    try {
      // First check in-memory store
      const userName = userNames.get(requestedUserCode);
      if (userName) {
        callback({ success: true, userName });
        return;
      }
      
      // If not in memory, check database
      const user = await User.findOne({ userCode: requestedUserCode });
      if (user && user.userName) {
        userNames.set(requestedUserCode, user.userName); // Cache it
        callback({ success: true, userName: user.userName });
      } else {
        callback({ success: false, userName: null });
      }
    } catch (error) {
      console.error('Error getting user name:', error);
      callback({ success: false, userName: null });
    }
  });
  
  // Legacy 1-on-1 calling support
  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    // Check if userToCall is a 4-digit code or socket ID
    const targetSocketId = codeToSocket.get(userToCall) || userToCall;
    io.to(targetSocketId).emit("callUser", { signal: signalData, from, name });
  });
  
  socket.on("answerCall", ({signal, to, receiverName}) => {
    const targetSocketId = codeToSocket.get(to) || to;
    io.to(targetSocketId).emit("callAccepted", {signal, to, receiverName});
  });
  
  // Room functionality
  socket.on("createRoom", async ({ userName }) => {
    const roomCode = await generateRoomCode();
    const room = {
      users: new Set([socket.id]),
      createdAt: Date.now(),
      host: socket.id
    };
    rooms.set(roomCode, room);
    userRooms.set(socket.id, roomCode);
    userNames.set(userCode, userName);
    
    // Update user in database
    try {
      await User.findOneAndUpdate(
        { userCode },
        { 
          userName,
          currentRoom: roomCode 
        }
      );
      
      // Create room in database
      await Room.create({
        roomCode,
        hostUserCode: userCode,
        users: [{
          userCode,
          userName,
          joinedAt: new Date()
        }]
      });
    } catch (error) {
      console.error('Error creating room:', error);
    }
    
    socket.join(roomCode);
    socket.emit("roomCreated", { 
      roomCode, 
      userCode,
      userName,
      isHost: true,
      participants: 1
    });
  });
  
  socket.on("joinRoom", async ({ roomCode, userName }) => {
    if (!rooms.has(roomCode)) {
      socket.emit("roomError", { message: "Room not found" });
      return;
    }
    
    const room = rooms.get(roomCode);
    if (room.users.size >= 6) {
      socket.emit("roomError", { message: "Room is full (max 6 people)" });
      return;
    }
    
    // Leave current room if in one
    const currentRoom = userRooms.get(socket.id);
    if (currentRoom) {
      socket.leave(currentRoom);
      if (rooms.has(currentRoom)) {
        rooms.get(currentRoom).users.delete(socket.id);
      }
    }
    
    room.users.add(socket.id);
    userRooms.set(socket.id, roomCode);
    userNames.set(userCode, userName);
    socket.join(roomCode);
    
    // Update user in database
    try {
      await User.findOneAndUpdate(
        { userCode },
        { 
          userName,
          currentRoom: roomCode 
        }
      );
      
      // Update room in database
      const roomUsers = Array.from(room.users).map(socketId => ({
        userCode: userCodes.get(socketId),
        userName: userNames.get(userCodes.get(socketId)),
        joinedAt: new Date()
      }));
      
      await Room.findOneAndUpdate(
        { roomCode },
        { users: roomUsers }
      );
    } catch (error) {
      console.error('Error updating room:', error);
    }
    
    // Get all user codes in room with names
    const roomUsers = Array.from(room.users).map(socketId => {
      const userCodeInRoom = userCodes.get(socketId);
      return {
        userCode: userCodeInRoom,
        userName: userNames.get(userCodeInRoom),
        socketId: socketId,
        isHost: socketId === room.host
      };
    });
    
    // Notify everyone in room about new user
    io.to(roomCode).emit("userJoined", { 
      userCode,
      userName,
      roomUsers,
      participants: room.users.size
    });
    
    socket.emit("roomJoined", { 
      roomCode, 
      userCode,
      userName,
      roomUsers,
      participants: room.users.size,
      isHost: socket.id === room.host
    });
  });
  
  socket.on("leaveRoom", () => {
    cleanupUser(socket.id);
  });
  
  // WebRTC signaling for rooms
  socket.on("signal", ({ userCode: targetUserCode, signal, roomCode }) => {
    const targetSocketId = codeToSocket.get(targetUserCode);
    if (targetSocketId) {
      io.to(targetSocketId).emit("signal", { 
        userCode: userCodes.get(socket.id), 
        signal,
        roomCode 
      });
    }
  });
  
  // Room chat
  socket.on("roomMessage", async ({ roomCode, message, userName }) => {
    if (userRooms.get(socket.id) === roomCode) {
      const messageData = { 
        message, 
        userName, 
        userCode,
        timestamp: Date.now() 
      };
      
      // Save message to database
      try {
        await Message.create({
          roomCode,
          userCode,
          userName,
          message
        });
      } catch (error) {
        console.error('Error saving message:', error);
      }
      
      io.to(roomCode).emit("roomMessage", messageData);
    }
  });
  
  socket.on("disconnect", () => {
    cleanupUser(socket.id);
    socket.broadcast.emit("callEnded");
  });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
