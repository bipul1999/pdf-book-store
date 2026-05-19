import crypto from "crypto";
import QRCode from "qrcode";
import Book from "../models/Book.js";
import Order from "../models/Order.js";
import PaymentSettings from "../models/PaymentSettings.js";
import User from "../models/User.js";
import { getRazorpay } from "../config/razorpay.js";
import { sendEmail } from "../utils/email.js";

const MIN_RAZORPAY_AMOUNT = 100;

function isRazorpayAuthError(error) {
  return (
    error?.statusCode === 401 ||
    (error?.error?.code === "BAD_REQUEST_ERROR" && error?.error?.description?.toLowerCase().includes("authentication"))
  );
}

function razorpayErrorResponse(error, res) {
  const isAuthError = isRazorpayAuthError(error);
  const status = isAuthError
    ? 401
    : 500;
  return res.status(status).json({
    message: status === 401 ? "Razorpay authentication failed" : "Could not create Razorpay order"
  });
}

function signaturesMatch(expected, received) {
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function unlockBooks(order) {
  const ids = order.items.map((item) => item.book);
  await User.findByIdAndUpdate(order.user, { $addToSet: { purchasedBooks: { $each: ids } } });
}

async function lockBooks(order) {
  const ids = order.items.map((item) => item.book);
  await User.findByIdAndUpdate(order.user, { $pull: { purchasedBooks: { $in: ids } } });
}

async function sendPaymentStatusEmail(order) {
  try {
    const populated = await order.populate("user", "name email");
    if (!populated.user?.email) return;
    const isSuccess = order.status === "success";
    const subject = isSuccess ? "Your PDF Book Store payment is successful" : "Your PDF Book Store payment failed";
    const message = isSuccess
      ? "Your payment has been verified. Your PDF books are now unlocked in My Library."
      : "Your payment could not be verified. Please contact support or try ordering again.";

    await sendEmail({
      to: populated.user.email,
      subject,
      html: `
        <p>Hello ${populated.user.name || "Reader"},</p>
        <p>${message}</p>
        <p><strong>Order:</strong> ${order._id}</p>
        <p><strong>Amount:</strong> Rs. ${order.amount}</p>
      `
    });
  } catch (error) {
    console.error(`Payment status email failed for order ${order._id}:`, error.message);
  }
}

async function sendAdminPaymentProofEmail(req, order) {
  try {
    const populated = await order.populate("user", "name email phone");
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    if (!adminEmail) return;
    const proofUrl = fileUrl(req, order.paymentProof);
    const books = order.items.map((item) => `<li>${item.title} - Rs. ${item.price}</li>`).join("");

    await sendEmail({
      to: adminEmail,
      subject: "New UPI payment proof needs verification",
      html: `
        <p>A user has submitted UPI payment proof. Please verify the order from the admin panel.</p>
        <p><strong>Order:</strong> ${order._id}</p>
        <p><strong>Amount:</strong> Rs. ${order.amount}</p>
        <p><strong>User:</strong> ${populated.user?.name || "Unknown"}</p>
        <p><strong>Email:</strong> ${populated.user?.email || "N/A"}</p>
        <p><strong>Phone:</strong> ${populated.user?.phone || "N/A"}</p>
        <p><strong>Payment note / transaction ID:</strong> ${order.paymentNote || "Not provided"}</p>
        <p><strong>Books:</strong></p>
        <ul>${books}</ul>
        ${proofUrl ? `<p><strong>Proof:</strong> <a href="${proofUrl}">${proofUrl}</a></p>` : ""}
      `
    });
  } catch (error) {
    console.error(`Admin payment proof email failed for order ${order._id}:`, error.message);
  }
}

function coverUrl(req, filePath) {
  if (!filePath?.startsWith("uploads")) return filePath;
  const normalized = filePath.replaceAll("\\", "/").replace("uploads/covers/", "");
  return `${req.protocol}://${req.get("host")}/uploads/covers/${normalized}`;
}

function publicBook(req, book) {
  const plain = book.toObject ? book.toObject() : book;
  return { ...plain, coverImage: coverUrl(req, plain.coverImage), pdfPath: undefined };
}

function fileUrl(req, filePath) {
  if (!filePath?.startsWith("uploads")) return filePath;
  const normalized = filePath.replaceAll("\\", "/").replace("uploads/payments/", "");
  return `${req.protocol}://${req.get("host")}/uploads/payments/${normalized}`;
}

async function paymentSettings() {
  const settings = await PaymentSettings.findOne().sort("-updatedAt");
  return {
    upiId: settings?.upiId || process.env.UPI_ID || "",
    payeeName: settings?.payeeName || process.env.UPI_PAYEE_NAME || "PDF Book Store",
    qrImage: settings?.qrImage || "",
    instructions: settings?.instructions || "Pay the exact amount and upload the payment screenshot for admin verification."
  };
}

function upiPaymentUri({ upiId, payeeName, amount, note }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: Number(amount).toFixed(2),
    cu: "INR",
    tn: note
  });
  return `upi://pay?${params.toString()}`;
}

export async function createOrder(req, res) {
  const ids = [...new Set(req.body.bookIds || [])];
  const paymentMethod = req.body.paymentMethod || "auto";
  if (!ids.length) return res.status(422).json({ message: "Cart is empty" });
  const books = await Book.find({ _id: { $in: ids }, isActive: true });
  if (books.length !== ids.length) return res.status(422).json({ message: "One or more books are unavailable" });

  const amount = books.reduce((sum, book) => sum + book.price, 0);
  const currency = process.env.RAZORPAY_CURRENCY || "INR";
  const settings = await paymentSettings();
  const razorpay = getRazorpay();
  let razorpayOrder = null;
  let provider = "upi_manual";
  let paymentWarning = "";

  if (paymentMethod === "razorpay" && !razorpay) {
    return res.status(422).json({ message: "Online card/payment gateway is not configured yet. Please use UPI." });
  }

  if (razorpay && paymentMethod !== "upi_manual") {
    provider = "razorpay";
    const amountInPaise = Math.round(amount * 100);
    if (amountInPaise < MIN_RAZORPAY_AMOUNT) return res.status(422).json({ message: "Minimum online payment amount is Rs. 1" });
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency,
        receipt: `order_${Date.now()}`
      });
    } catch (error) {
      if (!isRazorpayAuthError(error)) return razorpayErrorResponse(error, res);
      console.error("Razorpay authentication failed. Falling back to manual UPI payment.");
      paymentWarning = "Razorpay authentication failed. Please use manual UPI for this order.";
      provider = "upi_manual";
    }
  }

  const order = await Order.create({
    user: req.user._id,
    items: books.map((book) => ({ book: book._id, title: book.title, price: book.price })),
    amount,
    currency,
    provider,
    razorpayOrderId: razorpayOrder?.id
  });

  const upiNote = `PDF Book Store order ${order._id}`;
  const upiUri = upiPaymentUri({
    upiId: settings.upiId || "your-upi-id@bank",
    payeeName: settings.payeeName,
    amount,
    note: upiNote
  });
  const upiQrDataUrl = razorpayOrder ? null : await QRCode.toDataURL(upiUri, { width: 320, margin: 2 });

  res.status(201).json({
    message: paymentWarning,
    order,
    razorpay: razorpayOrder
      ? { keyId: process.env.RAZORPAY_KEY_ID, orderId: razorpayOrder.id, amount: razorpayOrder.amount, currency }
      : null,
    upi: razorpayOrder
      ? null
      : {
          id: settings.upiId || "your-upi-id@bank",
          payee: settings.payeeName,
          amount,
          note: upiNote,
          paymentUri: upiUri,
          qrImage: upiQrDataUrl,
          staticQrImage: fileUrl(req, settings.qrImage),
          instructions: settings.instructions
        }
  });
}

export async function confirmManualPayment(req, res) {
  const order = await Order.findOne({ _id: req.body.orderId, user: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.provider !== "upi_manual") return res.status(422).json({ message: "This order is not a UPI manual order" });
  if (!req.file) return res.status(422).json({ message: "Upload payment screenshot for verification" });
  order.status = "submitted";
  order.paymentProof = req.file.path;
  order.paymentNote = req.body.paymentNote || "";
  await order.save();
  await lockBooks(order);
  await sendAdminPaymentProofEmail(req, order);
  res.json({ message: "Payment proof submitted. Admin will verify and unlock your PDFs.", order });
}

export async function verifyPayment(req, res) {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing Razorpay verification fields" });
  }
  if (!process.env.RAZORPAY_KEY_SECRET) return res.status(401).json({ message: "Razorpay is not configured" });

  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (!signaturesMatch(expected, razorpay_signature) || order.razorpayOrderId !== razorpay_order_id) {
    order.status = "failed";
    await order.save();
    await sendPaymentStatusEmail(order);
    return res.status(400).json({ message: "Payment verification failed" });
  }

  order.status = "success";
  order.razorpayPaymentId = razorpay_payment_id;
  order.razorpaySignature = razorpay_signature;
  await order.save();
  await unlockBooks(order);
  await sendPaymentStatusEmail(order);
  res.json({ message: "Payment verified", order });
}

export async function createRazorpayOrder(req, res) {
  const amount = Number(req.body.amount);
  const currency = req.body.currency || process.env.RAZORPAY_CURRENCY || "INR";
  const receipt = String(req.body.receipt || `receipt_${Date.now()}`).slice(0, 40);
  const razorpay = getRazorpay();

  if (!Number.isInteger(amount) || amount < MIN_RAZORPAY_AMOUNT) {
    return res.status(400).json({ message: "Amount must be at least 100 paise" });
  }
  if (!razorpay) return res.status(401).json({ message: "Razorpay is not configured" });

  try {
    const order = await razorpay.orders.create({ amount, currency, receipt });
    res.status(201).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    return razorpayErrorResponse(error, res);
  }
}

export async function verifyRazorpaySignature(req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing Razorpay verification fields" });
  }
  if (!process.env.RAZORPAY_KEY_SECRET) return res.status(401).json({ message: "Razorpay is not configured" });

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (!signaturesMatch(expected, razorpay_signature)) {
    return res.status(400).json({ success: false, message: "Payment verification failed" });
  }

  res.json({ success: true, message: "Payment verified" });
}

export async function razorpayWebhook(req, res) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(501).json({ message: "Razorpay webhook is not configured" });

  const signature = req.headers["x-razorpay-signature"];
  const expected = crypto.createHmac("sha256", secret).update(req.body).digest("hex");
  if (signature !== expected) return res.status(400).json({ message: "Invalid webhook signature" });

  const event = JSON.parse(req.body.toString("utf8"));
  if (event.event !== "payment.captured") return res.json({ received: true });

  const payment = event.payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id;
  if (!razorpayOrderId) return res.json({ received: true });

  const order = await Order.findOne({ razorpayOrderId });
  if (!order || order.status === "success") return res.json({ received: true });

  order.status = "success";
  order.razorpayPaymentId = payment.id;
  await order.save();
  await unlockBooks(order);
  await sendPaymentStatusEmail(order);
  res.json({ received: true });
}

export async function myOrders(req, res) {
  const orders = await Order.find({ user: req.user._id, status: { $in: ["success", "failed"] } }).populate("items.book").sort("-updatedAt");
  res.json({ orders: orders.map((order) => ({ ...order.toObject(), paymentProof: fileUrl(req, order.paymentProof) })) });
}

export async function myLibrary(req, res) {
  const accessWindowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const orders = await Order.find({ user: req.user._id, status: "success", updatedAt: { $gte: accessWindowStart } }).populate({ path: "items.book", populate: "category" });
  const uniqueBooks = new Map();
  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (item.book && item.book.isActive !== false) {
        uniqueBooks.set(String(item.book._id), {
          book: item.book,
          accessExpiresAt: new Date(order.updatedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
        });
      }
    });
  });
  res.json({ books: [...uniqueBooks.values()].map(({ book, accessExpiresAt }) => ({ ...publicBook(req, book), accessExpiresAt })) });
}

export async function updateOrderStatus(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  const previousStatus = order.status;
  order.status = req.body.status;
  await order.save();
  if (order.status === "success") await unlockBooks(order);
  else await lockBooks(order);
  if (["success", "failed"].includes(order.status) && previousStatus !== order.status) {
    await sendPaymentStatusEmail(order);
  }
  res.json({ order });
}

export async function getPaymentSettings(req, res) {
  const settings = await paymentSettings();
  res.json({ settings: { ...settings, qrImage: fileUrl(req, settings.qrImage) } });
}

export async function updatePaymentSettings(req, res) {
  const settings = await PaymentSettings.findOneAndUpdate(
    {},
    {
      upiId: req.body.upiId || "",
      payeeName: req.body.payeeName || "PDF Book Store",
      instructions: req.body.instructions || "",
      ...(req.file ? { qrImage: req.file.path } : {})
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ settings: { ...settings.toObject(), qrImage: fileUrl(req, settings.qrImage) } });
}
