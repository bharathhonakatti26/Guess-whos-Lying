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

// Clean up user from all data structures
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
    console.log(`Socket ${socket.id} disconnecting, cleaning up user...`);
    cleanupUser(socket.id);
    socket.broadcast.emit("callEnded");
  });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
