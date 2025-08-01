const mongoose = require('mongoose');

// User schema for room participants
const userSchema = new mongoose.Schema({
  userCode: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  socketId: {
    type: String,
    required: true
  },
  isHost: {
    type: Boolean,
    default: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Message schema for room chat
const messageSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userCode: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Main Room schema
const roomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  users: [userSchema],
  messages: [messageSchema],
  hostUserCode: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxUsers: {
    type: Number,
    default: 6
  }
});

// Update the updatedAt field before saving
roomSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance methods
roomSchema.methods.addUser = function(userCode, userName, socketId, isHost = false) {
  console.log(`Adding user to room:`, { userCode, userName, socketId, isHost });
  
  // Remove existing user if already exists (handles reconnection)
  this.users = this.users.filter(user => user.userCode !== userCode);
  
  // Add new user
  this.users.push({
    userCode,
    userName,
    socketId,
    isHost,
    isActive: true
  });
  
  console.log(`Room users after adding:`, this.users);
  
  return this.save().then(savedRoom => {
    console.log(`Room saved after adding user:`, savedRoom);
    return savedRoom;
  }).catch(error => {
    console.error(`Error saving room after adding user:`, error);
    throw error;
  });
};

roomSchema.methods.removeUser = function(userCode) {
  console.log(`Removing user ${userCode} from room`);
  
  // Find the user to remove
  const userToRemove = this.users.find(u => u.userCode === userCode);
  if (!userToRemove) {
    console.log(`User ${userCode} not found in room`);
    return this.save();
  }
  
  const wasHost = userToRemove.isHost;
  
  // Remove user completely from the room
  this.users = this.users.filter(user => user.userCode !== userCode);
  
  console.log(`User ${userCode} removed. Was host: ${wasHost}`);
  
  // If no users left, delete the room completely
  if (this.users.length === 0) {
    console.log(`No users left in room ${this.roomCode}, deleting room completely`);
    return this.deleteOne();
  }
  
  // If the removed user was the host, transfer host to next active user
  if (wasHost && this.users.length > 0) {
    const activeUsers = this.users.filter(user => user.isActive);
    if (activeUsers.length > 0) {
      // Make the first active user the new host
      activeUsers[0].isHost = true;
      this.hostUserCode = activeUsers[0].userCode;
      console.log(`Host transferred to user ${activeUsers[0].userCode}`);
    }
  }
  
  console.log(`Room users after removal:`, this.users);
  
  return this.save();
};

roomSchema.methods.addMessage = function(message, userName, userCode) {
  this.messages.push({
    message,
    userName,
    userCode,
    timestamp: new Date()
  });
  
  return this.save();
};

roomSchema.methods.getActiveUsers = function() {
  return this.users.filter(user => user.isActive);
};

roomSchema.methods.updateUserSocketId = function(userCode, newSocketId) {
  const user = this.users.find(u => u.userCode === userCode);
  if (user) {
    user.socketId = newSocketId;
    user.isActive = true;
    return this.save();
  }
  return Promise.resolve(this);
};

// Static methods
roomSchema.statics.findByRoomCode = function(roomCode) {
  return this.findOne({ roomCode, isActive: true });
};

roomSchema.statics.createRoom = function(roomCode, hostUserCode, hostUserName, hostSocketId) {
  console.log(`Creating room with params:`, { roomCode, hostUserCode, hostUserName, hostSocketId });
  
  const room = new this({
    roomCode,
    hostUserCode,
    users: [{
      userCode: hostUserCode,
      userName: hostUserName,
      socketId: hostSocketId,
      isHost: true,
      isActive: true
    }],
    messages: []
  });
  
  console.log(`Room object created:`, room);
  
  return room.save().then(savedRoom => {
    console.log(`Room saved to database:`, savedRoom);
    return savedRoom;
  }).catch(error => {
    console.error(`Error saving room to database:`, error);
    throw error;
  });
};

roomSchema.statics.deleteRoomCompletely = function(roomCode) {
  console.log(`Completely deleting room: ${roomCode}`);
  return this.deleteOne({ roomCode });
};

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;