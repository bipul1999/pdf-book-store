import mongoose from "mongoose";

let connectionPromise;
let lastDatabaseError = "";

export function getLastDatabaseError() {
  return lastDatabaseError;
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");

  mongoose.set("strictQuery", true);
  mongoose.set("bufferCommands", false);
  mongoose.set("sanitizeFilter", true);

  connectionPromise = mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || "pdf-book-store",
    autoIndex: process.env.NODE_ENV !== "production",
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
    minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 1),
    maxIdleTimeMS: Number(process.env.MONGO_MAX_IDLE_MS || 60000),
    waitQueueTimeoutMS: Number(process.env.MONGO_WAIT_QUEUE_TIMEOUT_MS || 5000),
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 20000
  }).finally(() => {
    connectionPromise = undefined;
  });

  try {
    await connectionPromise;
  } catch (error) {
    lastDatabaseError = error.message;
    throw error;
  }

  lastDatabaseError = "";
  console.log("MongoDB connected");
  return mongoose.connection;
}
