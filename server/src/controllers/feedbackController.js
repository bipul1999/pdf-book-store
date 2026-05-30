import Feedback from "../models/Feedback.js";
import { sendEmail } from "../utils/email.js";

function cleanText(value, max) {
  return String(value || "").trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function notifyAdmin(feedback) {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return;
  await sendEmail({
    to: adminEmail,
    subject: `New store feedback: ${feedback.rating}/5 - ${feedback.category}`,
    html: `
      <p>A visitor submitted store feedback.</p>
      <p><strong>Category:</strong> ${escapeHtml(feedback.category)}</p>
      <p><strong>Rating:</strong> ${feedback.rating}/5</p>
      <p><strong>Name:</strong> ${escapeHtml(feedback.name) || "Not provided"}</p>
      <p><strong>Email:</strong> ${escapeHtml(feedback.email) || "Not provided"}</p>
      <p><strong>Phone:</strong> ${escapeHtml(feedback.phone) || "Not provided"}</p>
      <p><strong>Feedback:</strong></p>
      <p>${escapeHtml(feedback.message)}</p>
    `
  });
}

export async function createFeedback(req, res) {
  const feedback = await Feedback.create({
    user: req.user?._id,
    name: cleanText(req.body.name || req.user?.name, 80),
    email: cleanText(req.body.email || req.user?.email, 120).toLowerCase(),
    phone: cleanText(req.body.phone || req.user?.phone, 20),
    category: req.body.category,
    rating: Number(req.body.rating),
    message: cleanText(req.body.message, 2000)
  });
  notifyAdmin(feedback).catch((error) => {
    console.error(`Feedback notification failed for ${feedback._id}:`, error.message);
  });
  res.status(201).json({ message: "Thank you. Your feedback has been submitted." });
}

export async function listFeedback(_req, res) {
  const feedback = await Feedback.find()
    .populate("user", "name email phone")
    .sort("-createdAt")
    .limit(300);
  res.json({ feedback });
}

export async function updateFeedbackStatus(req, res) {
  if (!["new", "reviewed"].includes(req.body.status)) {
    return res.status(422).json({ message: "Invalid feedback status" });
  }
  const feedback = await Feedback.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!feedback) return res.status(404).json({ message: "Feedback not found" });
  res.json({ feedback });
}
