import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import { connectDB } from "../config/db.js";

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function createAdmin() {
  const email = readArg("email", process.env.ADMIN_EMAIL).toLowerCase();
  const password = readArg("password", process.env.ADMIN_PASSWORD);
  const phone = readArg("phone", process.env.ADMIN_PHONE || "9999999999");
  const name = readArg("name", "Admin");

  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing. Create server/.env first.");
  if (!email || !password) throw new Error("Email and password are required.");
  if (password.length < 8) throw new Error("Admin password must be at least 8 characters.");

  await connectDB();

  const existingAdmin = await User.findOne({ role: "admin" }).select("+password");
  if (existingAdmin && existingAdmin.email !== email) {
    throw new Error(`Admin already exists: ${existingAdmin.email}`);
  }

  let admin = existingAdmin || await User.findOne({ email }).select("+password");
  if (admin) {
    admin.name = name;
    admin.phone = phone;
    admin.password = password;
    admin.role = "admin";
    admin.isVerified = true;
    await admin.save();
    console.log(`Admin updated: ${email}`);
  } else {
    admin = await User.create({
      name,
      email,
      phone,
      password,
      role: "admin",
      isVerified: true
    });
    console.log(`Admin created: ${admin.email}`);
  }

  await mongoose.disconnect();
}

createAdmin().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
