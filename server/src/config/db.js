import mongoose from "mongoose";

export async function connectDB() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");
  mongoose.set("strictQuery", true);
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME || "pdf-book-store" });
  console.log("MongoDB connected");
}
