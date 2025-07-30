const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    length: 6
  },
  hostUserCode: {
    type: String,
    required: true
  },
  users: [{
    userCode: String,
    userName: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  maxUsers: {
    type: Number,
    default: 6
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better performance
roomSchema.index({ roomCode: 1 });
roomSchema.index({ hostUserCode: 1 });
roomSchema.index({ isActive: 1 });

module.exports = mongoose.model('Room', roomSchema);
