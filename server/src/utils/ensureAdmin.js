import User from "../models/User.js";
import Otp from "../models/Otp.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export async function ensureAdmin() {
  if (process.env.SEED_ADMIN_FROM_ENV !== "true") return;
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const password = process.env.ADMIN_PASSWORD;
  const phone = String(process.env.ADMIN_PHONE || "0000000000").trim();
  const name = String(process.env.ADMIN_NAME || "Admin").trim();
  const shouldReset = process.env.RESET_ADMIN_FROM_ENV === "true";

  if (!email || !password) return;

  if (shouldReset) {
    await User.deleteMany({
      $or: [
        { role: "admin" },
        { email },
        { phone }
      ]
    });
    await Otp.deleteMany({ purpose: "admin-signup" });
  } else {
    const existing = await User.findOne({ role: "admin" });
    if (existing) return;
  }

  await User.create({
    name,
    email,
    phone,
    password,
    role: "admin",
    isVerified: true
  });

  console.log(shouldReset ? "Reset admin user from environment" : "Seeded admin user from environment");
}
