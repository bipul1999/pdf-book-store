import bcrypt from "bcryptjs";
import Otp from "../models/Otp.js";
import { isEmailConfigured, sendEmail } from "./email.js";
import { isSmsConfigured, sendOtpSms } from "./sms.js";

export async function createAndSendOtp({ email, phone, purpose }) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await Otp.updateMany({ email, purpose, consumed: false }, { consumed: true });
  await Otp.create({
    email,
    phone,
    purpose,
    codeHash: await bcrypt.hash(code, 10),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  let delivered = false;
  try {
    delivered = await sendOtpSms({ phone, code }) || delivered;
  } catch (error) {
    console.error(`OTP SMS failed for ${phone}:`, error.message);
  }

  try {
    await sendEmail({
      to: email,
      subject: "Your PDF Book Store OTP",
      html: `<p>Your OTP is <strong>${code}</strong>. It expires in 10 minutes.</p>`
    });
    delivered = true;
  } catch (error) {
    console.error(`OTP email failed for ${email}:`, error.message);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`Development OTP for ${email} (${purpose}): ${code}`);
  }

  if (!delivered && process.env.NODE_ENV === "production") {
    throw new Error("Could not send OTP. Please try again later.");
  }

  return process.env.NODE_ENV === "production" ? undefined : code;
}

export async function verifyOtp({ email, purpose, code }) {
  const otp = await Otp.findOne({ email, purpose, consumed: false }).sort({ createdAt: -1 });
  if (!otp) throw new Error("OTP not found or already used");
  if (otp.expiresAt < new Date()) throw new Error("OTP expired");
  if (otp.attempts >= 5) throw new Error("Too many OTP attempts");

  otp.attempts += 1;
  const ok = await bcrypt.compare(code, otp.codeHash);
  if (!ok) {
    await otp.save();
    throw new Error("Invalid OTP");
  }
  otp.consumed = true;
  await otp.save();
}
