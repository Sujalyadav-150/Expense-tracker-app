const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return true;
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.warn("MONGODB_URI is not set in environment variables. Auth/Data will fall back to local storage.");
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log("Connected to MongoDB Atlas successfully");
    return true;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    isConnected = false;
    return false;
  }
}

module.exports = {
  connectDB,
  get isConnected() {
    return isConnected || mongoose.connection.readyState === 1;
  }
};
