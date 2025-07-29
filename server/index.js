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

// Room management
const rooms = new Map(); // roomCode -> { users: [socketId], userNames: Map<socketId, name>, maxUsers: 6 }
const userRooms = new Map(); // socketId -> roomCode

app.get("/", (req, res) => {
  res.send("Success");
});

// Generate unique room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a new room
function createRoom() {
  let roomCode;
  do {
    roomCode = generateRoomCode();
  } while (rooms.has(roomCode));
  
  rooms.set(roomCode, { 
    users: [], 
    userNames: new Map(),
    maxUsers: 6 
  });
  return roomCode;
}

io.on("connection", (socket) => {
  socket.emit("me", socket.id);
  
  // Handle room creation
  socket.on("createRoom", ({ userName }) => {
    const roomCode = createRoom();
    const room = rooms.get(roomCode);
    
    // Automatically join the creator to the room
    room.users.push(socket.id);
    room.userNames.set(socket.id, userName);
    userRooms.set(socket.id, roomCode);
    socket.join(roomCode);
    
    console.log(`Room ${roomCode} created by ${userName} (${socket.id})`);
    
    // Notify creator that room is created and they've joined
    socket.emit("roomCreated", { 
      roomCode,
      users: [{ id: socket.id, name: userName }]
    });
  });
  
  // Handle joining a room
  socket.on("joinRoom", ({ roomCode, userName }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit("roomError", { message: "Room not found" });
      return;
    }
    
    if (room.users.length >= room.maxUsers) {
      socket.emit("roomError", { message: "Room is full" });
      return;
    }
    
    // Add user to room
    room.users.push(socket.id);
    room.userNames.set(socket.id, userName);
    userRooms.set(socket.id, roomCode);
    socket.join(roomCode);
    
    console.log(`User ${userName} (${socket.id}) joined room ${roomCode}`);
    
    // Get existing users with names
    const existingUsers = room.users.filter(id => id !== socket.id).map(id => ({
      id, 
      name: room.userNames.get(id) || 'Unknown'
    }));
    
    // Add current user
    const allUsers = [...existingUsers, { id: socket.id, name: userName }];
    
    // Notify user of successful join
    socket.emit("roomJoined", { 
      roomCode, 
      users: allUsers
    });
    
    // Notify other users in room
    socket.to(roomCode).emit("userJoined", { 
      userId: socket.id, 
      userName,
      totalUsers: room.users.length 
    });
  });
  
  // Handle leaving room
  socket.on("leaveRoom", () => {
    const roomCode = userRooms.get(socket.id);
    if (roomCode) {
      leaveRoom(socket.id, roomCode);
    }
  });
  
  // Handle WebRTC signaling for rooms
  socket.on("signal", ({ roomCode, signal, targetUserId }) => {
    socket.to(targetUserId).emit("signal", {
      signal,
      fromUserId: socket.id
    });
  });
  
  // Legacy 1-on-1 calling support
  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit("callUser", { signal: signalData, from, name });
  });
  
  socket.on("answerCall", ({signal, to, receiverName}) => {
    io.to(to).emit("callAccepted", {signal, to, receiverName});
  });
  
  // Handle chat messages in rooms
  socket.on("roomMessage", ({ roomCode, message, userName }) => {
    socket.to(roomCode).emit("roomMessage", {
      message,
      userName,
      userId: socket.id,
      timestamp: Date.now()
    });
  });
  
  // Handle disconnect
  socket.on("disconnect", () => {
    const roomCode = userRooms.get(socket.id);
    if (roomCode) {
      leaveRoom(socket.id, roomCode);
    }
    socket.broadcast.emit("callEnded");
  });
});

function leaveRoom(socketId, roomCode) {
  const room = rooms.get(roomCode);
  if (room) {
    room.users = room.users.filter(id => id !== socketId);
    room.userNames.delete(socketId);
    userRooms.delete(socketId);
    
    // Notify other users
    io.to(roomCode).emit("userLeft", { 
      userId: socketId,
      totalUsers: room.users.length 
    });
    
    // Clean up empty rooms
    if (room.users.length === 0) {
      rooms.delete(roomCode);
      console.log(`Room ${roomCode} deleted (empty)`);
    }
  }
}

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
