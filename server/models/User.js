const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userCode: {
    type: String,
    required: true,
    unique: true,
    length: 4
  },
  userName: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  socketId: {
    type: String,
    required: true
  },
  currentRoom: {
    type: String,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better performance
userSchema.index({ userCode: 1 });
userSchema.index({ socketId: 1 });
userSchema.index({ currentRoom: 1 });

module.exports = mongoose.model('User', userSchema);
