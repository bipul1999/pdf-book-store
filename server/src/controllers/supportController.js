import SupportTicket from "../models/SupportTicket.js";
import { sendEmail } from "../utils/email.js";

const categoryRules = [
  ["payment", ["payment", "paid", "razorpay", "upi", "refund", "transaction", "pay", "amount", "order"]],
  ["login", ["login", "otp", "password", "signup", "account", "verify", "credential"]],
  ["download", ["download", "pdf", "library", "read", "open", "file", "access"]],
  ["book", ["book", "author", "price", "cart", "purchase", "content"]],
  ["technical", ["error", "bug", "not working", "blank", "slow", "crash", "mobile", "website"]]
];

function cleanText(value, max = 2000) {
  return String(value || "").trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildAssistantReply({ category, priority }) {
  const replies = {
    payment: "Payment issue note ho gaya. Agar amount deduct hua hai to order/payment screenshot sambhal kar rakhiye. Admin payment verify karke order unlock karega; urgent case high priority me mark ho gaya hai.",
    login: "Login/OTP issue note ho gaya. Email aur mobile sahi hain to spam folder bhi check kijiye. Admin ko details mil gayi hain, woh account/OTP flow verify karke help karega.",
    download: "PDF/download issue note ho gaya. Payment successful hone ke baad book Library me unlock hoti hai. Admin aapka order aur access check karke resolve karega.",
    book: "Book related query note ho gayi. Admin price, availability ya content detail check karke aapko update karega.",
    technical: "Website technical issue note ho gaya. Device, browser aur page URL admin ko mil gaya hai, isliye issue reproduce karke fix karna easy rahega.",
    general: "Thanks, aapki query admin ko send ho gayi hai. Admin details check karke aapko reply karega."
  };
  const followUp = priority === "high"
    ? " Yeh high priority par bheja gaya hai."
    : " Aapko jaldi help milegi.";
  return `${replies[category] || replies.general}${followUp}`;
}

function analyzeProblem(message) {
  const text = message.toLowerCase();
  const category = categoryRules.find(([, words]) => words.some((word) => text.includes(word)))?.[0] || "general";
  const priority = /(paid|payment|money|refund|urgent|not received|download.*not|login.*not|otp.*not)/i.test(message)
    ? "high"
    : "normal";
  const subject = message.split(/[.!?\n]/)[0]?.trim().slice(0, 90) || "Customer support request";
  const summary = message.length > 180 ? `${message.slice(0, 177)}...` : message;

  return {
    category,
    priority,
    subject,
    summary,
    reply: buildAssistantReply({ category, priority })
  };
}

async function notifyAdmin(ticket) {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return;

  await sendEmail({
    to: adminEmail,
    subject: `Support: ${ticket.subject}`,
    html: `
      <p>A customer submitted a support request.</p>
      <p><strong>Category:</strong> ${ticket.category}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <p><strong>Name:</strong> ${escapeHtml(ticket.name) || "Not provided"}</p>
      <p><strong>Email:</strong> ${escapeHtml(ticket.email) || "Not provided"}</p>
      <p><strong>Phone:</strong> ${escapeHtml(ticket.phone) || "Not provided"}</p>
      <p><strong>Page:</strong> ${escapeHtml(ticket.pageUrl) || "Not provided"}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(ticket.messages.at(-1)?.text || ticket.summary)}</p>
    `
  });
}

export async function createSupportTicket(req, res) {
  const message = cleanText(req.body.message);
  if (!message || message.length < 8) return res.status(400).json({ message: "Please describe your problem in a little more detail." });

  const analysis = analyzeProblem(message);
  const ticket = await SupportTicket.create({
    user: req.user?._id,
    name: cleanText(req.body.name || req.user?.name, 80),
    email: cleanText(req.body.email || req.user?.email, 120).toLowerCase(),
    phone: cleanText(req.body.phone || req.user?.phone, 20),
    subject: analysis.subject,
    category: analysis.category,
    priority: analysis.priority,
    summary: analysis.summary,
    pageUrl: cleanText(req.body.pageUrl, 500),
    messages: [
      { role: "user", text: message },
      { role: "assistant", text: analysis.reply }
    ]
  });

  notifyAdmin(ticket).catch((error) => {
    console.error(`Support notification failed for ticket ${ticket._id}:`, error.message);
  });

  res.status(201).json({
    ticketId: ticket._id,
    reply: analysis.reply,
    category: ticket.category,
    priority: ticket.priority
  });
}

export async function listSupportTickets(_req, res) {
  const tickets = await SupportTicket.find()
    .populate("user", "name email phone")
    .sort("-createdAt")
    .limit(200);
  res.json({ tickets });
}

export async function updateSupportTicket(req, res) {
  const allowed = ["open", "in_progress", "resolved"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid ticket status" });
  const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  res.json({ ticket });
}
