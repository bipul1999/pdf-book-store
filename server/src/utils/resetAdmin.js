import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { connectDB } from "../config/db.js";

async function resetAdmin() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing. Create server/.env first.");
  await connectDB();
  const users = await User.deleteMany({ role: "admin" });
  const otps = await Otp.deleteMany({ purpose: "admin-signup" });
  console.log(`Deleted ${users.deletedCount} admin profile(s) and ${otps.deletedCount} admin OTP(s).`);
  await mongoose.disconnect();
}

resetAdmin().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
