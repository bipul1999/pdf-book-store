import { body } from "express-validator";
import User from "../models/User.js";
import { createAndSendOtp, verifyOtp } from "../utils/otp.js";
import { issueSessionToken, publicUser } from "../utils/tokens.js";
import { logRequestEvent } from "../utils/logger.js";

const otpMeta = { otpExpiresInSeconds: 5 * 60, resendAfterSeconds: 60 };
const ownerAdminEmail = normalizeEmailForLookup(process.env.OWNER_ADMIN_EMAIL);
const adminOtpLoginEnabled = process.env.ADMIN_OTP_LOGIN_ENABLED === "true";

function loginAudit(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return {
    at: new Date(),
    ip: forwarded || req.ip || req.socket?.remoteAddress || "",
    userAgent: String(req.headers["user-agent"] || "").slice(0, 500)
  };
}

function normalizeEmailForLookup(email) {
  const value = String(email || "").trim().toLowerCase();
  const [localPart, domainPart] = value.split("@");
  if (!localPart || !domainPart) return value;

  if (domainPart === "gmail.com" || domainPart === "googlemail.com") {
    return `${localPart.split("+")[0].replaceAll(".", "")}@gmail.com`;
  }

  return value;
}

function loginIdentifierCandidates(identifier) {
  const value = String(identifier || "").trim();
  const lowerValue = value.toLowerCase();
  if (!value.includes("@")) return { phone: value, emails: [] };

  return {
    phone: value,
    emails: Array.from(new Set([lowerValue, normalizeEmailForLookup(value)]))
  };
}

export const signupRules = [
  body("name").trim().isLength({ min: 1, max: 120 }),
  body("email").isEmail().normalizeEmail(),
  body("phone").trim().isLength({ min: 8, max: 16 }),
  body("password").isLength({ min: 8, max: 128 })
];

export const adminSignupRules = [
  body("name").trim().isLength({ min: 1, max: 120 }),
  body("email").isEmail().normalizeEmail().custom((value) => {
    if (!value.endsWith("@gmail.com")) throw new Error("Admin email must be a Gmail address");
    return true;
  }),
  body("phone").trim().isLength({ min: 8, max: 16 }),
  body("password").isLength({ min: 8, max: 128 })
];

export async function signup(req, res) {
  const { name, email, phone, password } = req.body;
  const exists = await User.findOne({ $or: [{ email }, { phone }] }).select("+password");
  if (exists?.isVerified) {
    const devOtp = await createAndSendOtp({ email: exists.email, phone: exists.phone, purpose: "login" });
    return res.json({ message: "Account already exists. Login OTP sent.", loginOtp: true, email: exists.email, devOtp, ...otpMeta });
  }
  if (exists) {
    exists.name = name;
    exists.email = email;
    exists.phone = phone;
    exists.password = password;
    await exists.save();
    const devOtp = await createAndSendOtp({ email, phone, purpose: "signup" });
    return res.json({ message: "OTP resent. Verify your account.", devOtp, ...otpMeta });
  }
  await User.create({ name, email, phone, password });
  const devOtp = await createAndSendOtp({ email, phone, purpose: "signup" });
  res.status(201).json({ message: "Signup successful. Verify OTP sent to email.", devOtp, ...otpMeta });
}

export async function resendSignupOtp(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email, role: "user" });
  if (!user) return res.status(404).json({ message: "No signup found for this email" });
  if (user.isVerified) return res.status(409).json({ message: "Account already verified. Please login with OTP." });
  const devOtp = await createAndSendOtp({ email: user.email, phone: user.phone, purpose: "signup" });
  res.json({ message: "OTP resent.", devOtp, ...otpMeta });
}

export async function verifySignupOtp(req, res) {
  const { email, code } = req.body;
  await verifyOtp({ email, purpose: "signup", code });
  const user = await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ token: await issueSessionToken(user, loginAudit(req)), user: publicUser(user) });
}

export async function adminStatus(_req, res) {
  const admin = await User.findOne({ role: "admin", isVerified: true });
  res.json({ adminExists: Boolean(admin) });
}

export async function adminSignup(req, res) {
  const { name, email, phone, password } = req.body;
  const verifiedAdmin = await User.findOne({ role: "admin", isVerified: true });
  if (verifiedAdmin) {
    return res.status(409).json({ message: "Admin account already exists. Use forgot password if you need to recover access." });
  }
  const requestedAdminEmail = normalizeEmailForLookup(email);
  if (!ownerAdminEmail) return res.status(503).json({ message: "Admin registration is disabled." });
  const isOwnerEmail = requestedAdminEmail === ownerAdminEmail;
  if (!isOwnerEmail) {
    return res.status(403).json({ message: "Admin registration is restricted to the authorized email." });
  }

  const existingDifferentUser = await User.findOne({
    role: { $ne: "admin" },
    $or: [{ email }, { phone }]
  });
  if (existingDifferentUser) return res.status(409).json({ message: "Email or phone already exists as a user account" });

  let admin = verifiedAdmin || await User.findOne({ role: "admin", isVerified: false }).select("+password");
  if (admin && normalizeEmailForLookup(admin.email) !== requestedAdminEmail && !isOwnerEmail) {
    return res.status(409).json({ message: "An admin signup is already pending verification" });
  }

  if (admin) {
    admin.name = name;
    admin.email = email;
    admin.phone = phone;
    admin.password = password;
    admin.isVerified = false;
    await admin.save();
  } else {
    admin = await User.create({ name, email, phone, password, role: "admin", isVerified: false });
  }

  const devOtp = await createAndSendOtp({ email, phone, purpose: "admin-signup" });
  res.status(201).json({ message: "Admin OTP sent to Gmail. Verify to activate admin profile.", devOtp, ...otpMeta });
}

export async function resendAdminSignupOtp(req, res) {
  const { email } = req.body;
  if (!ownerAdminEmail || normalizeEmailForLookup(email) !== ownerAdminEmail) {
    return res.status(403).json({ message: "Admin registration is restricted to the authorized email." });
  }
  const admin = await User.findOne({ email, role: "admin", isVerified: false });
  if (!admin) return res.status(404).json({ message: "Pending admin profile not found" });
  const devOtp = await createAndSendOtp({ email: admin.email, phone: admin.phone, purpose: "admin-signup" });
  res.json({ message: "Admin OTP resent.", devOtp, ...otpMeta });
}

export async function verifyAdminSignupOtp(req, res) {
  const { email, code } = req.body;
  const verifiedAdmin = await User.findOne({ role: "admin", isVerified: true });
  if (verifiedAdmin && verifiedAdmin.email !== email) return res.status(409).json({ message: "Admin account already exists" });

  await verifyOtp({ email, purpose: "admin-signup", code });
  const admin = await User.findOneAndUpdate(
    { email, role: "admin", isVerified: false },
    { isVerified: true },
    { new: true }
  );
  if (!admin) return res.status(404).json({ message: "Pending admin profile not found" });
  res.json({ token: await issueSessionToken(admin, loginAudit(req)), user: publicUser(admin) });
}

export async function login(req, res) {
  const { identifier, password } = req.body;
  const { emails, phone } = loginIdentifierCandidates(identifier);
  const user = await User.findOne({
    $or: [...emails.map((email) => ({ email })), { phone }]
  }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    logRequestEvent("security", "login_failed", req, { identifier: String(identifier || "").slice(0, 180) });
    return res.status(401).json({ message: "Invalid credentials" });
  }
  if (!user.isVerified) return res.status(403).json({ message: "Please verify your email before login" });
  if (user.role === "admin") logRequestEvent("admin", "admin_login_success", req, { adminId: user._id });
  res.json({ token: await issueSessionToken(user, loginAudit(req)), user: publicUser(user) });
}

export async function requestLoginOtp(req, res) {
  const { identifier } = req.body;
  const { emails, phone } = loginIdentifierCandidates(identifier);
  const user = await User.findOne({
    ...(adminOtpLoginEnabled ? {} : { role: "user" }),
    $or: [...emails.map((email) => ({ email })), { phone }]
  });
  if (user?.role === "admin" && !adminOtpLoginEnabled) {
    return res.status(404).json({ message: "No account found. Please create an account first." });
  }

  if (!user) return res.status(404).json({ message: "No account found. Please create an account first." });
  if (!user.isVerified) {
    const devOtp = await createAndSendOtp({ email: user.email, phone: user.phone, purpose: "signup" });
    return res.status(403).json({ message: "Account not verified. Signup OTP sent again.", signupOtp: true, email: user.email, devOtp, ...otpMeta });
  }

  const devOtp = await createAndSendOtp({ email: user.email, phone: user.phone, purpose: "login" });
  res.json({ message: "Login OTP sent.", email: user.email, devOtp, ...otpMeta });
}

export async function verifyLoginOtp(req, res) {
  const { email, code } = req.body;
  await verifyOtp({ email, purpose: "login", code });
  const user = await User.findOne({
    email,
    isVerified: true,
    ...(adminOtpLoginEnabled ? {} : { role: "user" })
  });
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.role === "admin") logRequestEvent("admin", "admin_otp_login_success", req, { adminId: user._id });
  res.json({ token: await issueSessionToken(user, loginAudit(req)), user: publicUser(user) });
}

export async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (user) {
    const devOtp = await createAndSendOtp({ email, phone: user.phone, purpose: "forgot-password" });
    return res.json({ message: "If the email exists, OTP has been sent.", devOtp, ...otpMeta });
  }
  res.json({ message: "If the email exists, OTP has been sent.", ...otpMeta });
}

export async function resetPassword(req, res) {
  const { email, code, password } = req.body;
  await verifyOtp({ email, purpose: "forgot-password", code });
  const user = await User.findOne({ email }).select("+password");
  if (!user) return res.status(404).json({ message: "User not found" });
  user.password = password;
  user.activeSessionId = "";
  await user.save();
  res.json({ message: "Password reset successful" });
}

export async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}
