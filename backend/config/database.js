const mongoose = require("mongoose");

let cachedPromise = null;

async function connectDB() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return true;
  }

  if (cachedPromise) {
    try {
      await cachedPromise;
      return true;
    } catch (e) {
      cachedPromise = null;
    }
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.warn("MONGODB_URI is not set in environment. App operating in local fallback mode.");
    return false;
  }

  if (process.env.VERCEL && (uri.includes("localhost") || uri.includes("127.0.0.1"))) {
    console.warn("Localhost MONGODB_URI detected in production Vercel environment. Falling back to local mode.");
    return false;
  }

  cachedPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10
  }).then(() => {
    console.log("Connected to MongoDB Atlas successfully.");
    return true;
  }).catch(err => {
    console.error("MongoDB Atlas connection failed:", err.message);
    cachedPromise = null;
    return false;
  });

  return cachedPromise;
}

module.exports = {
  connectDB,
  get isConnected() {
    return mongoose.connection && mongoose.connection.readyState === 1;
  }
};
