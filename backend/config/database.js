const mongoose = require("mongoose");

let cachedPromise = null;

function isProduction() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.NODE_ENV === "production");
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) return true;

  if (cachedPromise) {
    try {
      return await cachedPromise;
    } catch {
      cachedPromise = null;
    }
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    if (isProduction()) {
      throw new Error("MONGODB_URI is required in production.");
    }
    console.warn("MONGODB_URI is not set. Local development database fallback may be used by callers.");
    return false;
  }

  if (isProduction() && (uri.includes("localhost") || uri.includes("127.0.0.1"))) {
    throw new Error("A localhost MongoDB URI cannot be used in production.");
  }

  cachedPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
    maxIdleTimeMS: 10000
  }).then(() => {
    console.log("Connected to MongoDB Atlas successfully.");
    return true;
  }).catch(err => {
    cachedPromise = null;
    console.error("MongoDB Atlas connection failed:", err.message);
    throw err;
  });

  return await cachedPromise;
}

module.exports = {
  connectDB,
  get isConnected() {
    return mongoose.connection.readyState === 1;
  }
};
