const mongoose = require('mongoose');

const connectDB = async () => {
  try {
<<<<<<< HEAD
    // Use a local MongoDB connection or set MONGODB_URI environment variable
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guess-whos-lying';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
=======
    // MongoDB connection string - you can use MongoDB Atlas (cloud) or local MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guess-whos-lying';
    
    const conn = await mongoose.connect(mongoURI, {
      // Removed deprecated options
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes for better performance after a short delay
    setTimeout(async () => {
      await createIndexes();
    }, 1000);
    
  } catch (error) {
    console.error('Database connection error:', error);
>>>>>>> dd81abf913b56b2591cfb37ed805cba89e585c85
    process.exit(1);
  }
};

<<<<<<< HEAD
=======
const createIndexes = async () => {
  try {
    // Import Room model only when needed
    const Room = require('../models/Room');
    
    // Create indexes for frequently queried fields
    await Room.createIndexes();
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Handle app termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

>>>>>>> dd81abf913b56b2591cfb37ed805cba89e585c85
module.exports = connectDB;
