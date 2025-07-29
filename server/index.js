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

// Store room information
const rooms = new Map();
const users = new Map();

// Generate random room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

app.get("/", (req, res) => {
  res.send("Success");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.emit("me", socket.id);
  
  // Create a new room
  socket.on("createRoom", ({ name }) => {
    const roomCode = generateRoomCode();
    rooms.set(roomCode, {
      host: socket.id,
      users: [{ id: socket.id, name }],
      createdAt: new Date()
    });
    users.set(socket.id, { roomCode, name });
    socket.join(roomCode);
    socket.emit("roomCreated", { roomCode });
    console.log(`Room ${roomCode} created by ${name}`);
  });

  // Join an existing room
  socket.on("joinRoom", ({ roomCode, name }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit("roomError", { message: "Room not found" });
      return;
    }
    
    if (room.users.length >= 6) {
      socket.emit("roomError", { message: "Room is full (max 6 players)" });
      return;
    }

    // Add user to room
    room.users.push({ id: socket.id, name });
    users.set(socket.id, { roomCode, name });
    socket.join(roomCode);
    
    // Notify all users in room about the new user
    socket.to(roomCode).emit("userJoined", { 
      userId: socket.id, 
      name,
      allUsers: room.users 
    });
    
    // Send existing users to the new user
    socket.emit("roomJoined", { 
      roomCode, 
      users: room.users.filter(user => user.id !== socket.id)
    });
    
    console.log(`${name} joined room ${roomCode}. Total users: ${room.users.length}`);
  });

  // Handle WebRTC signaling for multiple users
  socket.on("signal", ({ userToSignal, callerID, signal }) => {
    io.to(userToSignal).emit("signal", { signal, callerID });
  });

  socket.on("returning signal", ({ callerID, signal }) => {
    io.to(callerID).emit("receiving returned signal", { id: socket.id, signal });
  });

  // Handle chat messages
  socket.on("sendMessage", ({ roomCode, message, senderName }) => {
    socket.to(roomCode).emit("receiveMessage", { 
      message, 
      senderName, 
      senderId: socket.id,
      timestamp: new Date()
    });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user) {
      const room = rooms.get(user.roomCode);
      if (room) {
        // Remove user from room
        room.users = room.users.filter(u => u.id !== socket.id);
        
        // Notify other users
        socket.to(user.roomCode).emit("userLeft", { 
          userId: socket.id,
          allUsers: room.users 
        });
        
        // If room is empty, delete it
        if (room.users.length === 0) {
          rooms.delete(user.roomCode);
          console.log(`Room ${user.roomCode} deleted`);
        }
      }
      users.delete(socket.id);
    }
    console.log("User disconnected:", socket.id);
  });

  // Legacy support for old 1-on-1 calling (keeping for backward compatibility)
  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit("callUser", { signal: signalData, from, name });
  });
  
  socket.on("answerCall", ({signal, to, receiverName}) => {
    io.to(to).emit("callAccepted", {signal, to, receiverName});
  });
});
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
