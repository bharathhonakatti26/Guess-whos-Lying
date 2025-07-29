const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
const PORT = process.env.PORT || 8090;

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

// Clean up user from all data structures
function cleanupUser(socketId) {
  const userCode = userCodes.get(socketId);
  const roomCode = userRooms.get(socketId);
  
  if (userCode) {
    codeToSocket.delete(userCode);
    userCodes.delete(socketId);
  }
  
  if (roomCode && rooms.has(roomCode)) {
    const room = rooms.get(roomCode);
    room.users.delete(socketId);
    
    // Notify other users in room that this user left
    room.users.forEach(otherSocketId => {
      io.to(otherSocketId).emit("userLeft", { userCode });
    });
    
    // Delete room if empty
    if (room.users.size === 0) {
      rooms.delete(roomCode);
    }
  }
  
  userRooms.delete(socketId);
}

app.get("/", (req, res) => {
  res.send("Success");
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
  socket.on("createRoom", ({ userName }) => {
    const roomCode = generateRoomCode();
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
  });
  
  socket.on("joinRoom", ({ roomCode, userName }) => {
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
    socket.join(roomCode);
    
    // Get all user codes in room
    const roomUsers = Array.from(room.users).map(socketId => {
      return {
        userCode: userCodes.get(socketId),
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
  socket.on("roomMessage", ({ roomCode, message, userName }) => {
    if (userRooms.get(socket.id) === roomCode) {
      io.to(roomCode).emit("roomMessage", { 
        message, 
        userName, 
        userCode,
        timestamp: Date.now() 
      });
    }
  });
  
  socket.on("disconnect", () => {
    cleanupUser(socket.id);
    socket.broadcast.emit("callEnded");
  });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
