import mongoose from "mongoose";

let connectionPromise;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");

  mongoose.set("strictQuery", true);
  mongoose.set("bufferCommands", false);

  connectionPromise = mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || "pdf-book-store",
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 20000
  }).finally(() => {
    connectionPromise = undefined;
  });

  await connectionPromise;
  console.log("MongoDB connected");
  return mongoose.connection;
}
