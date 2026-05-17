import User from "../models/User.js";

export async function ensureAdmin() {
  if (process.env.SEED_ADMIN_FROM_ENV !== "true") return;
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return;
  const existing = await User.findOne({ role: "admin" });
  if (existing) return;
  await User.create({
    name: "Admin",
    email: process.env.ADMIN_EMAIL,
    phone: "0000000000",
    password: process.env.ADMIN_PASSWORD,
    role: "admin",
    isVerified: true
  });
  console.log("Seeded admin user from environment");
}
