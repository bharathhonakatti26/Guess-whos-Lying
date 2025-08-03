const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true
  },
  userCode: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better performance
messageSchema.index({ roomCode: 1, timestamp: -1 });
messageSchema.index({ userCode: 1 });

module.exports = mongoose.model('Message', messageSchema);
