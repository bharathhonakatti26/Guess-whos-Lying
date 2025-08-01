// Load environment variables
require('dotenv').config();

const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Database imports
const connectDB = require("./config/database");
const Room = require("./models/Room");

app.use(cors());
const PORT = process.env.PORT || 8090;

// Connect to database
connectDB();

// Room and user management
const rooms = new Map(); // roomCode -> { users: Set of socketIds, createdAt: timestamp }
const userCodes = new Map(); // socketId -> 4-digit code
const codeToSocket = new Map(); // 4-digit code -> socketId
const userRooms = new Map(); // socketId -> roomCode

// Generate 4-digit user code
function generateUserCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (codeToSocket.has(code));
  return code;
}

// Generate 6-digit room code
function generateRoomCode() {
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(code));
  return code;
}

// Clean up user from all data structures and database
async function cleanupUser(socketId) {
  const userCode = userCodes.get(socketId);
  const roomCode = userRooms.get(socketId);
  
  if (userCode) {
    codeToSocket.delete(userCode);
    userCodes.delete(socketId);
  }
  
  if (roomCode) {
    try {
      // Update database
      const room = await Room.findByRoomCode(roomCode);
      if (room) {
        const wasHost = room.users.find(u => u.userCode === userCode)?.isHost || false;
        
        // Remove user from database (this may delete the room if no users left)
        await room.removeUser(userCode);
        
        // Check if room still exists after removal
        const updatedRoom = await Room.findByRoomCode(roomCode);
        
        if (updatedRoom) {
          // Room still exists, notify remaining users
          const activeUsers = updatedRoom.getActiveUsers();
          
          if (activeUsers.length > 0) {
            const roomUsers = activeUsers.map(user => ({
              userCode: user.userCode,
              socketId: user.socketId,
              isHost: user.isHost,
              userName: user.userName
            }));
            
            // Notify all remaining users
            activeUsers.forEach(user => {
              if (user.socketId !== socketId) {
                io.to(user.socketId).emit("userLeft", { 
                  userCode,
                  roomUsers,
                  participants: activeUsers.length
                });
                
                // If host was transferred, notify the new host
                if (wasHost && user.isHost) {
                  io.to(user.socketId).emit("hostTransferred", { 
                    newHostUserCode: user.userCode,
                    message: "You are now the host of this room"
                  });
                }
              }
            });
            
            // Notify all users about updated room state
            io.to(roomCode).emit("roomUpdated", {
              roomCode,
              roomUsers,
              participants: activeUsers.length
            });
          }
        } else {
          // Room was deleted because no users left
          console.log(`Room ${roomCode} was completely deleted - no users remaining`);
          rooms.delete(roomCode);
        }
      }
      
      // Clean up in-memory structures
      if (rooms.has(roomCode)) {
        const room = rooms.get(roomCode);
        room.users.delete(socketId);
        
        if (room.users.size === 0) {
          rooms.delete(roomCode);
        }
      }
    } catch (error) {
      console.error("Error cleaning up user:", error);
    }
  }
  
  userRooms.delete(socketId);
}

app.get("/", (req, res) => {
  res.send("Success");
});

// Test database connection endpoint
app.get("/api/test-db", async (req, res) => {
  try {
    console.log("Testing database connection...");
    
    // Test creating a simple room
    const testRoom = new Room({
      roomCode: "TEST123",
      hostUserCode: "TEST",
      users: [{
        userCode: "TEST",
        userName: "Test User",
        socketId: "test-socket",
        isHost: true,
        isActive: true
      }],
      messages: []
    });
    
    const savedRoom = await testRoom.save();
    console.log("Test room saved:", savedRoom);
    
    // Delete the test room
    await Room.deleteOne({ roomCode: "TEST123" });
    console.log("Test room deleted");
    
    res.json({ 
      success: true, 
      message: "Database connection working", 
      testRoomId: savedRoom._id 
    });
  } catch (error) {
    console.error("Database test error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// API endpoints for room data
app.get("/api/rooms", async (req, res) => {
  try {
    const rooms = await Room.find({ isActive: true })
      .select('roomCode hostUserCode createdAt users messages')
      .sort({ createdAt: -1 });
    res.json(rooms);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

app.get("/api/rooms/:roomCode", async (req, res) => {
  try {
    const { roomCode } = req.params;
    const room = await Room.findByRoomCode(roomCode);
    
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    
    res.json(room);
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).json({ error: "Failed to fetch room" });
  }
});

app.get("/api/rooms/:roomCode/messages", async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    
    const room = await Room.findByRoomCode(roomCode);
    
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    
    // Get messages with pagination
    const messages = room.messages
      .slice(-parseInt(limit))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json({
      roomCode,
      messages,
      total: room.messages.length
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

io.on("connection", (socket) => {
  // Generate and assign 4-digit user code
  const userCode = generateUserCode();
  userCodes.set(socket.id, userCode);
  codeToSocket.set(userCode, socket.id);
  
  socket.emit("me", userCode); // Send 4-digit code instead of socket.id
  
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
    try {
      console.log(`Creating room for user: ${userCode}, userName: ${userName}`);
      const roomCode = generateRoomCode();
      console.log(`Generated room code: ${roomCode}`);
      
      // Create room in database
      console.log(`Attempting to create room in database...`);
      const dbRoom = await Room.createRoom(roomCode, userCode, userName, socket.id);
      console.log(`Room created in database:`, dbRoom);
      
      // Create in-memory room structure
      const room = {
        users: new Set([socket.id]),
        createdAt: Date.now(),
        host: socket.id
      };
      rooms.set(roomCode, room);
      userRooms.set(socket.id, roomCode);
      
      socket.join(roomCode);
      socket.emit("roomCreated", { 
        roomCode, 
        userCode,
        userName,
        isHost: true,
        participants: 1
      });
      console.log(`Room creation completed for room: ${roomCode}`);
    } catch (error) {
      console.error("Error creating room:", error);
      socket.emit("roomError", { message: "Failed to create room" });
    }
  });
  
  socket.on("joinRoom", async ({ roomCode, userName }) => {
    try {
      // Check database for room
      const dbRoom = await Room.findByRoomCode(roomCode);
      if (!dbRoom) {
        socket.emit("roomError", { message: "Room not found" });
        return;
      }
      
      const activeUsers = dbRoom.getActiveUsers();
      if (activeUsers.length >= 6) {
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
        
        // Update database for previous room
        const prevDbRoom = await Room.findByRoomCode(currentRoom);
        if (prevDbRoom) {
          await prevDbRoom.removeUser(userCode);
        }
      }
      
      // Add user to database
      await dbRoom.addUser(userCode, userName, socket.id, false);
      
      // Update in-memory structures
      let room = rooms.get(roomCode);
      if (!room) {
        room = {
          users: new Set(),
          createdAt: dbRoom.createdAt,
          host: dbRoom.hostUserCode
        };
        rooms.set(roomCode, room);
      }
      
      room.users.add(socket.id);
      userRooms.set(socket.id, roomCode);
      socket.join(roomCode);
      
      // Get updated active users from database
      const updatedDbRoom = await Room.findByRoomCode(roomCode);
      const roomUsers = updatedDbRoom.getActiveUsers().map(user => ({
        userCode: user.userCode,
        socketId: user.socketId,
        isHost: user.isHost
      }));
      
      // Notify everyone in room about new user
      io.to(roomCode).emit("userJoined", { 
        userCode,
        userName,
        roomUsers,
        participants: roomUsers.length
      });
      
      socket.emit("roomJoined", { 
        roomCode, 
        userCode,
        userName,
        roomUsers,
        participants: roomUsers.length,
        isHost: userCode === dbRoom.hostUserCode
      });
    } catch (error) {
      console.error("Error joining room:", error);
      socket.emit("roomError", { message: "Failed to join room" });
    }
  });
  
  socket.on("leaveRoom", async () => {
    await cleanupUser(socket.id);
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
    try {
      console.log(`Received room message:`, { roomCode, message, userName, userCode });
      if (userRooms.get(socket.id) === roomCode) {
        // Save message to database
        const dbRoom = await Room.findByRoomCode(roomCode);
        if (dbRoom) {
          console.log(`Saving message to database for room: ${roomCode}`);
          await dbRoom.addMessage(message, userName, userCode);
          console.log(`Message saved successfully`);
        } else {
          console.log(`Room not found in database: ${roomCode}`);
        }
        
        // Broadcast message to all users in room
        io.to(roomCode).emit("roomMessage", { 
          message, 
          userName, 
          userCode,
          timestamp: Date.now() 
        });
        console.log(`Message broadcasted to room: ${roomCode}`);
      } else {
        console.log(`User not in room or room mismatch:`, { 
          userRoom: userRooms.get(socket.id), 
          requestedRoom: roomCode 
        });
      }
    } catch (error) {
      console.error("Error sending room message:", error);
    }
  });
  
  socket.on("disconnect", async () => {
    await cleanupUser(socket.id);
    socket.broadcast.emit("callEnded");
  });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
