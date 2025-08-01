// Load environment variables
require('dotenv').config();

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

<<<<<<< HEAD
// Import database and models
const connectDB = require('./config/database');
const User = require('./models/User');
const Room = require('./models/Room');
const Message = require('./models/Message');

// Connect to MongoDB
connectDB();
=======
// Database imports
const connectDB = require("./config/database");
const Room = require("./models/Room");
>>>>>>> dd81abf913b56b2591cfb37ed805cba89e585c85

app.use(cors());
const PORT = process.env.PORT || 8090;

<<<<<<< HEAD
// Room and user management (keeping in-memory for real-time operations)
=======
// Connect to database
connectDB();

// Room and user management
>>>>>>> dd81abf913b56b2591cfb37ed805cba89e585c85
const rooms = new Map(); // roomCode -> { users: Set of socketIds, createdAt: timestamp }
const userCodes = new Map(); // socketId -> 4-digit code
const codeToSocket = new Map(); // 4-digit code -> socketId
const userRooms = new Map(); // socketId -> roomCode
const userNames = new Map(); // userCode -> userName
const userDbCreated = new Map(); // userCode -> boolean (track if DB entry already created)

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

<<<<<<< HEAD
// Clean up user from all data structures
=======
// Clean up user from all data structures and database
>>>>>>> dd81abf913b56b2591cfb37ed805cba89e585c85
async function cleanupUser(socketId) {
  const userCode = userCodes.get(socketId);
  const roomCode = userRooms.get(socketId);
  
  if (userCode) {
    codeToSocket.delete(userCode);
    userCodes.delete(socketId);
    userNames.delete(userCode);
    userDbCreated.delete(userCode);
    
    // Always delete user from database when they disconnect
    try {
      const deletedUser = await User.findOneAndDelete({ userCode });
      if (deletedUser) {
        console.log(`User ${userCode} deleted from database on disconnect`);
      }
    } catch (error) {
      console.error('Error deleting user on disconnect:', error);
    }
  }
  
<<<<<<< HEAD
  if (roomCode && rooms.has(roomCode)) {
    const room = rooms.get(roomCode);
    const wasHost = room.host === socketId;
    
    room.users.delete(socketId);
    
    // Notify other users in room that this user left
    room.users.forEach(otherSocketId => {
      const otherUserCode = userCodes.get(otherSocketId);
      const userName = userNames.get(userCode);
      io.to(otherSocketId).emit("userLeft", { userCode, userName });
    });
    
    // Handle room cleanup and host transfer
    try {
      if (room.users.size === 0) {
        // No users left - delete room completely
        rooms.delete(roomCode);
        await Room.findOneAndDelete({ roomCode });
        console.log(`Room ${roomCode} deleted - no users remaining`);
      } else {
        // Users still in room - update room
        let newHostSocketId = room.host;
        
        // If the host left, assign new host
        if (wasHost) {
          newHostSocketId = Array.from(room.users)[0]; // First remaining user becomes host
          room.host = newHostSocketId;
          const newHostUserCode = userCodes.get(newHostSocketId);
          const newHostUserName = userNames.get(newHostUserCode);
          
          // Notify all users about new host
          room.users.forEach(otherSocketId => {
            io.to(otherSocketId).emit("newHost", { 
              hostUserCode: newHostUserCode,
              hostUserName: newHostUserName
            });
          });
          
          console.log(`New host assigned: ${newHostUserCode} for room ${roomCode}`);
        }
        
        // Update room users in database
        const roomUsers = Array.from(room.users).map(socketId => ({
          userCode: userCodes.get(socketId),
          userName: userNames.get(userCodes.get(socketId)),
          joinedAt: new Date()
        }));
        
        await Room.findOneAndUpdate(
          { roomCode },
          { 
            users: roomUsers,
            hostUserCode: userCodes.get(newHostSocketId)
          }
        );
        
        console.log(`Room ${roomCode} updated - ${room.users.size} users remaining`);
      }
    } catch (error) {
      console.error('Error updating room:', error);
=======
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
>>>>>>> dd81abf913b56b2591cfb37ed805cba89e585c85
    }
  }
  
  userRooms.delete(socketId);
}

app.get("/", (req, res) => {
  res.send("Success");
});

<<<<<<< HEAD
io.on("connection", async (socket) => {
=======
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
>>>>>>> dd81abf913b56b2591cfb37ed805cba89e585c85
  // Generate and assign 4-digit user code
  const userCode = await generateUserCode();
  userCodes.set(socket.id, userCode);
  codeToSocket.set(userCode, socket.id);
  
  console.log(`New connection: Socket ${socket.id} assigned user code ${userCode}`);
  
  // Don't create user in database immediately - wait for user interaction
  
  socket.emit("me", userCode); // Send 4-digit code instead of socket.id
  
  // Handle user setting their name (for 1-on-1 calls)
  socket.on("setUserName", async ({ userName }) => {
    userNames.set(userCode, userName);
    
    // Only create database entry if not already created for this user
    if (!userDbCreated.get(userCode)) {
      try {
        const user = await User.findOneAndUpdate(
          { userCode },
          { 
            userCode,
            userName,
            socketId: socket.id,
            isOnline: true,
            lastActive: new Date()
          },
          { upsert: true, new: true }
        );
        userDbCreated.set(userCode, true);
        console.log(`User ${userCode} database entry created with name: ${userName}`);
      } catch (error) {
        console.error('Error creating/updating user:', error);
      }
    } else {
      // Just update the name in memory, don't spam database
      console.log(`User ${userCode} name updated to: ${userName} (in memory only)`);
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
<<<<<<< HEAD
    const roomCode = await generateRoomCode();
    const room = {
      users: new Set([socket.id]),
      createdAt: Date.now(),
      host: socket.id
    };
    rooms.set(roomCode, room);
    userRooms.set(socket.id, roomCode);
    userNames.set(userCode, userName);
    
    // Create or update user in database
    try {
      await User.findOneAndUpdate(
        { userCode },
        { 
          userCode,
          userName,
          socketId: socket.id,
          currentRoom: roomCode,
          isOnline: true,
          lastActive: new Date()
        },
        { upsert: true, new: true }
      );
      userDbCreated.set(userCode, true);
      
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
      console.log(`User ${userCode} created room ${roomCode}`);
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
    
    // Create or update user in database
    try {
      await User.findOneAndUpdate(
        { userCode },
        { 
          userCode,
          userName,
          socketId: socket.id,
          currentRoom: roomCode,
          isOnline: true,
          lastActive: new Date()
        },
        { upsert: true, new: true }
      );
      userDbCreated.set(userCode, true);
      
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
      console.log(`User ${userCode} joined room ${roomCode}`);
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
=======
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
>>>>>>> dd81abf913b56b2591cfb37ed805cba89e585c85
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
  
<<<<<<< HEAD
  socket.on("leaveRoom", async () => {
    const userCode = userCodes.get(socket.id);
    const roomCode = userRooms.get(socket.id);
    
    if (roomCode && rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      const wasHost = room.host === socket.id;
      
      // Remove user from room
      room.users.delete(socket.id);
      socket.leave(roomCode);
      userRooms.delete(socket.id);
      
      // Notify other users that this user left
      room.users.forEach(otherSocketId => {
        const userName = userNames.get(userCode);
        io.to(otherSocketId).emit("userLeft", { userCode, userName });
      });
      
      // Delete user from database completely when they leave room
      try {
        const deletedUser = await User.findOneAndDelete({ userCode });
        if (deletedUser) {
          console.log(`User ${userCode} deleted from database when leaving room`);
        }
      } catch (error) {
        console.error('Error deleting user when leaving room:', error);
      }
      
      // Handle room cleanup and host transfer
      try {
        if (room.users.size === 0) {
          // No users left - delete room completely
          rooms.delete(roomCode);
          await Room.findOneAndDelete({ roomCode });
          console.log(`Room ${roomCode} deleted - no users remaining`);
        } else {
          // Users still in room - update room
          let newHostSocketId = room.host;
          
          // If the host left, assign new host
          if (wasHost) {
            newHostSocketId = Array.from(room.users)[0]; // First remaining user becomes host
            room.host = newHostSocketId;
            const newHostUserCode = userCodes.get(newHostSocketId);
            const newHostUserName = userNames.get(newHostUserCode);
            
            // Notify all users about new host
            room.users.forEach(otherSocketId => {
              io.to(otherSocketId).emit("newHost", { 
                hostUserCode: newHostUserCode,
                hostUserName: newHostUserName
              });
            });
            
            console.log(`New host assigned: ${newHostUserCode} for room ${roomCode}`);
          }
          
          // Update room users in database
          const roomUsers = Array.from(room.users).map(socketId => ({
            userCode: userCodes.get(socketId),
            userName: userNames.get(userCodes.get(socketId)),
            joinedAt: new Date()
          }));
          
          await Room.findOneAndUpdate(
            { roomCode },
            { 
              users: roomUsers,
              hostUserCode: userCodes.get(newHostSocketId)
            }
          );
          
          console.log(`Room ${roomCode} updated - ${room.users.size} users remaining`);
        }
      } catch (error) {
        console.error('Error updating room:', error);
      }
    }
=======
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
>>>>>>> dd81abf913b56b2591cfb37ed805cba89e585c85
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
<<<<<<< HEAD
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
    console.log(`Socket ${socket.id} disconnecting, cleaning up user...`);
    cleanupUser(socket.id);
=======
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
>>>>>>> dd81abf913b56b2591cfb37ed805cba89e585c85
    socket.broadcast.emit("callEnded");
  });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
