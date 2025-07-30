const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use a local MongoDB connection or set MONGODB_URI environment variable
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guess-whos-lying';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
