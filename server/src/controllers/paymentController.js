import crypto from "crypto";
import fs from "fs";
import mongoose from "mongoose";
import QRCode from "qrcode";
import Book from "../models/Book.js";
import Order from "../models/Order.js";
import PaymentSettings from "../models/PaymentSettings.js";
import User from "../models/User.js";
import { clearPublicResponseCache } from "../middleware/publicResponseCache.js";
import { getRazorpay, getRazorpayKeyId, getRazorpayKeySecret, getRazorpayWebhookSecret } from "../config/razorpay.js";
import { sendEmail } from "../utils/email.js";
import { hasOwnerUploadedPdf } from "../utils/bookAvailability.js";
import { digitalAccessExpiry, initializeDigitalAccess, isVerifiedDigitalOrder, LIFETIME_DIGITAL_ACCESS_EXPIRES_AT, VERIFIED_DIGITAL_ORDER_STATUSES } from "../utils/digitalAccess.js";
import { logEvent, logRequestEvent } from "../utils/logger.js";

const MIN_RAZORPAY_AMOUNT = 100;
const MAX_BOOK_QUANTITY = 20;
const PDF_SALE_PRICE = 99;
const DIGITAL_ORDER_STATUSES = new Set(["pending", "submitted", "success", "failed"]);
const MANUAL_BOOK_ORDER_STATUSES = new Set(["pending", "submitted", "confirmed", "completed", "rejected"]);
const CHECKOUT_BOOK_LOOKUP_ATTEMPTS = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isRazorpayAuthError(error) {
  return (
    error?.statusCode === 401 ||
    (error?.error?.code === "BAD_REQUEST_ERROR" && error?.error?.description?.toLowerCase().includes("authentication"))
  );
}

function razorpayErrorResponse(error, res) {
  const isAuthError = isRazorpayAuthError(error);
  const status = isAuthError
    ? 422
    : 503;
  return res.status(status).json({
    message: isAuthError
      ? "Razorpay keys are not valid. Please contact support or use Manual UPI."
      : "Razorpay is temporarily unavailable. Please try again or use Manual UPI."
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

function orderBookIds(order) {
  return order.items
    .map((item) => item.book?._id || item.book)
    .filter(Boolean)
    .map((bookId) => String(bookId));
}

async function syncPurchasedBooksFromOrders(userId, orders) {
  const ids = [...new Set(orders.flatMap((order) => isVerifiedDigitalOrder(order) ? orderBookIds(order) : []))];
  if (!ids.length) return ids;
  await User.findByIdAndUpdate(userId, { $addToSet: { purchasedBooks: { $each: ids } } });
  return ids;
}

// Orders are the source of truth. Rebuild the user's durable library list from
// every verified digital payment whenever their orders or library are loaded.
// This also restores purchases made before purchasedBooks was introduced.
async function repairDigitalEntitlements(userId) {
  const verifiedOrders = await Order.find({
    user: userId,
    status: { $in: VERIFIED_DIGITAL_ORDER_STATUSES },
    orderType: { $ne: "manual_book" }
  }).select("items orderType status");
  await syncPurchasedBooksFromOrders(userId, verifiedOrders);
  return verifiedOrders;
}

function publicOrderResponse(req, order) {
  return {
    ...withoutPaymentProofData(order),
    paymentProof: fileUrl(req, order.paymentProof),
    unlockedBookIds: isVerifiedDigitalOrder(order) ? orderBookIds(order) : []
  };
}

async function fetchRazorpayPayment(paymentId) {
  const razorpay = getRazorpay();
  if (!razorpay || !paymentId) return null;
  return razorpay.payments.fetch(paymentId);
}

async function fetchRazorpayOrderPayments(razorpayOrderId) {
  const razorpay = getRazorpay();
  if (!razorpay || !razorpayOrderId || !razorpay.orders?.fetchPayments) return [];
  const response = await razorpay.orders.fetchPayments(razorpayOrderId);
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response)) return response;
  return [];
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
        <p>Hello ${escapeHtml(populated.user.name || "Reader")},</p>
        <p>${message}</p>
        <p><strong>Order:</strong> ${order._id}</p>
        <p><strong>Amount:</strong> Rs. ${order.amount}</p>
      `
    });
  } catch (error) {
    console.error(`Payment status email failed for order ${order._id}:`, error.message);
  }
}

async function grantDigitalOrderAccess(order, { paymentId, signature } = {}) {
  order.status = order.orderType === "manual_book" ? "confirmed" : "success";
  if (paymentId) order.razorpayPaymentId = paymentId;
  if (signature) order.razorpaySignature = signature;
  initializeDigitalAccess(order);
  await order.save();
  if (order.orderType !== "manual_book") await unlockBooks(order);
  return order;
}

async function reconcileUserRazorpayOrders(req) {
  let pendingOrders = [];
  try {
    pendingOrders = await Order.find({
      user: req.user._id,
      provider: "razorpay",
      status: "pending",
      razorpayOrderId: { $exists: true, $ne: "" }
    }).limit(25);
  } catch (error) {
    logRequestEvent("payment", "razorpay_reconcile_load_failed", req, { error: error.message });
    return;
  }
  if (!pendingOrders.length) return;

  for (const order of pendingOrders) {
    try {
      const payments = await fetchRazorpayOrderPayments(order.razorpayOrderId);
      const paid = payments.find((payment) => ["captured", "authorized"].includes(payment.status));
      if (!paid) continue;
      await grantDigitalOrderAccess(order, { paymentId: paid.id });
      logRequestEvent("payment", "razorpay_order_reconciled", req, {
        orderId: order._id,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: paid.id,
        status: paid.status
      });
    } catch (error) {
      logRequestEvent("payment", "razorpay_order_reconcile_failed", req, {
        orderId: order._id,
        razorpayOrderId: order.razorpayOrderId,
        error: error.message
      });
    }
  }
}

async function sendAdminPaymentProofEmail(req, order) {
  try {
    const populated = await order.populate("user", "name email phone");
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    if (!adminEmail) return;
    const books = order.items.map((item) => `<li>${escapeHtml(item.title)} x ${item.quantity || 1} - Rs. ${item.price * (item.quantity || 1)}</li>`).join("");

    await sendEmail({
      to: adminEmail,
      subject: "New UPI payment proof needs verification",
      html: `
        <p>A user has submitted UPI payment proof. Please verify the order from the admin panel.</p>
        <p><strong>Order:</strong> ${order._id}</p>
        <p><strong>Amount:</strong> Rs. ${order.amount}</p>
        <p><strong>User:</strong> ${escapeHtml(populated.user?.name || "Unknown")}</p>
        <p><strong>Email:</strong> ${escapeHtml(populated.user?.email || "N/A")}</p>
        <p><strong>Phone:</strong> ${escapeHtml(populated.user?.phone || "N/A")}</p>
        <p><strong>Payment note / transaction ID:</strong> ${escapeHtml(order.transactionId || order.paymentNote || "Not provided")}</p>
        <p><strong>Books:</strong></p>
        <ul>${books}</ul>
        <p>Open the admin panel to view and verify the uploaded proof.</p>
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
  const normalized = filePath.replaceAll("\\", "/");
  if (normalized.startsWith("uploads/payment-qrs/")) return `${req.protocol}://${req.get("host")}/${normalized}`;
  return "";
}

function withoutPaymentProofData(order) {
  const safeOrder = order.toObject ? order.toObject() : { ...order };
  delete safeOrder.paymentProofData;
  delete safeOrder.razorpaySignature;
  return safeOrder;
}

function normalizedExtraCharge(value) {
  const charge = Number(value);
  return Number.isFinite(charge) && charge >= 0 ? charge : 0;
}

function orderBookPrice(book) {
  const price = Number(book.orderBookPrice);
  return Number.isFinite(price) && price >= 0 ? price : book.price;
}

function paymentMethodExtraCharge(settings, paymentMethod) {
  return paymentMethod === "razorpay"
    ? settings.razorpayPaymentExtraCharge
    : settings.manualPaymentExtraCharge;
}

function paymentCurrency() {
  return String(process.env.RAZORPAY_CURRENCY || "INR").trim().toUpperCase() || "INR";
}

function isTransientDatabaseError(error) {
  const name = String(error?.name || "");
  const message = String(error?.message || "").toLowerCase();
  return (
    name.includes("MongoNetwork") ||
    name.includes("MongoServerSelection") ||
    name.includes("MongoTimeout") ||
    message.includes("timed out") ||
    message.includes("topology") ||
    message.includes("connection") ||
    message.includes("econnreset") ||
    message.includes("pool")
  );
}

async function loadCheckoutBooks(ids, req) {
  let lastError;
  for (let attempt = 1; attempt <= CHECKOUT_BOOK_LOOKUP_ATTEMPTS; attempt += 1) {
    try {
      return await Book.find({ _id: { $in: ids }, isActive: true })
        .select("+pdfPath +pdfFileId +pdfStored")
        .maxTimeMS(8000)
        .lean();
    } catch (error) {
      lastError = error;
      logRequestEvent("payment", "checkout_book_lookup_failed", req, {
        attempt,
        maxAttempts: CHECKOUT_BOOK_LOOKUP_ATTEMPTS,
        retryable: isTransientDatabaseError(error),
        error: error.message,
        name: error.name
      });
      if (!isTransientDatabaseError(error) || attempt === CHECKOUT_BOOK_LOOKUP_ATTEMPTS) break;
      await sleep(250 * attempt);
    }
  }
  lastError.retryable = isTransientDatabaseError(lastError);
  throw lastError;
}

function clientCheckoutBooks(ids, submittedBooks = []) {
  const submittedById = new Map(
    (Array.isArray(submittedBooks) ? submittedBooks : [])
      .filter((book) => ids.includes(String(book?._id || "")))
      .map((book) => [String(book._id), book])
  );
  return ids.map((id) => {
    const submitted = submittedById.get(id);
    return {
      _id: new mongoose.Types.ObjectId(id),
      title: String(submitted?.title || "PDF Book").slice(0, 200),
      pdfStored: true
    };
  });
}

export async function getRazorpayStatus(req, res) {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  res.setHeader("Cache-Control", "no-store");
  res.json({
    configured: Boolean(keyId && keySecret),
    keyIdPrefix: keyId ? `${keyId.slice(0, 8)}...` : "",
    mode: keyId.startsWith("rzp_live_") ? "live" : keyId.startsWith("rzp_test_") ? "test" : "unknown",
    currency: paymentCurrency(),
    createOrderDiagnostics: true,
    checkoutBookLookupRetries: CHECKOUT_BOOK_LOOKUP_ATTEMPTS,
    checkoutBookLookupFallback: true,
    legacyLibraryAccessFallback: true,
    razorpayAccessRepair: true,
    razorpayOrderReconciliation: true
  });
}

async function paymentSettings() {
  const settings = await PaymentSettings.findOne().sort("-updatedAt");
  return {
    upiId: settings?.upiId || process.env.UPI_ID || "",
    payeeName: settings?.payeeName || process.env.UPI_PAYEE_NAME || "PDF Book Store",
    qrImage: settings?.qrImage || "",
    orderBookExtraCharge: normalizedExtraCharge(settings?.orderBookExtraCharge),
    manualPaymentExtraCharge: normalizedExtraCharge(settings?.manualPaymentExtraCharge ?? 10),
    razorpayPaymentExtraCharge: normalizedExtraCharge(settings?.razorpayPaymentExtraCharge ?? 20),
    instructions: settings?.instructions || "Pay the exact amount and upload the payment screenshot for admin verification."
  };
}

async function safePaymentSettings(req) {
  try {
    return await paymentSettings();
  } catch (error) {
    logRequestEvent("payment", "payment_settings_fallback_used", req, {
      error: error.message,
      name: error.name
    });
    return {
      upiId: process.env.UPI_ID || "",
      payeeName: process.env.UPI_PAYEE_NAME || "PDF Book Store",
      qrImage: "",
      orderBookExtraCharge: 0,
      manualPaymentExtraCharge: 10,
      razorpayPaymentExtraCharge: 20,
      instructions: "Pay the exact amount and upload the payment screenshot for admin verification."
    };
  }
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

function parseBookIds(value) {
  try {
    const ids = Array.isArray(value) ? value : JSON.parse(value || "[]");
    return [...new Set(ids.filter((id) => typeof id === "string" && id.trim()))];
  } catch {
    return [];
  }
}

function parseBookSelections(itemsValue, legacyBookIds) {
  let values;
  try {
    values = itemsValue
      ? (Array.isArray(itemsValue) ? itemsValue : JSON.parse(itemsValue))
      : parseBookIds(legacyBookIds).map((bookId) => ({ bookId, quantity: 1 }));
  } catch {
    return null;
  }
  if (!Array.isArray(values)) return null;

  const seen = new Set();
  const selections = [];
  for (const value of values) {
    const bookId = String(value?.bookId || "").trim();
    const quantity = Number(value?.quantity);
    if (!mongoose.isValidObjectId(bookId) || seen.has(bookId) || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_BOOK_QUANTITY) {
      return null;
    }
    seen.add(bookId);
    selections.push({ bookId, quantity });
  }
  return selections;
}

function manualCustomerDetails(body) {
  return {
    fullName: String(body.fullName || "").trim(),
    mobileNumber: String(body.mobileNumber || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    address: String(body.address || "").trim(),
    city: String(body.city || "").trim(),
    state: String(body.state || "").trim(),
    pincode: String(body.pincode || "").trim()
  };
}

function validateManualCustomerDetails(customerDetails) {
  if (Object.values(customerDetails).some((value) => !value)) return "Please enter all delivery details.";
  if (customerDetails.fullName.length > 120 || customerDetails.email.length > 180 || customerDetails.address.length > 500 || customerDetails.city.length > 100 || customerDetails.state.length > 100) {
    return "One or more delivery details are too long.";
  }
  if (!/^\d{10}$/.test(customerDetails.mobileNumber)) return "Enter a valid 10 digit mobile number.";
  if (!/^\d{6}$/.test(customerDetails.pincode)) return "Enter a valid 6 digit pincode.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerDetails.email)) return "Enter a valid email address.";
  return "";
}

function manualOrderPaymentSummary(order, settings, paymentMethod) {
  const deliveryCharge = normalizedExtraCharge(settings.orderBookExtraCharge);
  const paymentCharge = paymentMethodExtraCharge(settings, paymentMethod);
  return {
    bookTotal: order.bookTotal,
    deliveryCharge,
    paymentCharge,
    extraCharge: deliveryCharge + paymentCharge,
    amount: order.bookTotal + deliveryCharge + paymentCharge
  };
}

export async function getOrderBookSettings(req, res) {
  const settings = await safePaymentSettings(req);
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json({
    settings: {
      upiId: settings.upiId,
      payeeName: settings.payeeName,
      qrImage: fileUrl(req, settings.qrImage),
      orderBookExtraCharge: settings.orderBookExtraCharge,
      manualPaymentExtraCharge: settings.manualPaymentExtraCharge,
      razorpayPaymentExtraCharge: settings.razorpayPaymentExtraCharge,
      instructions: settings.instructions
    }
  });
}

export async function createManualBookOrderDraft(req, res) {
  const selections = parseBookSelections(req.body.items, req.body.bookIds);
  if (!selections) return res.status(422).json({ message: `Select valid books and quantities up to ${MAX_BOOK_QUANTITY} copies.` });
  if (!selections.length) return res.status(422).json({ message: "Select at least one book." });
  const customerDetails = manualCustomerDetails(req.body);
  const customerDetailsError = validateManualCustomerDetails(customerDetails);
  if (customerDetailsError) return res.status(422).json({ message: customerDetailsError });
  const ids = selections.map((selection) => selection.bookId);
  const books = await Book.find({ _id: { $in: ids }, isActive: true });
  if (books.length !== ids.length) return res.status(422).json({ message: "One or more selected books are unavailable." });

  const booksById = new Map(books.map((book) => [String(book._id), book]));
  const items = selections.map(({ bookId, quantity }) => {
    const book = booksById.get(bookId);
    return { book: book._id, title: book.title, price: orderBookPrice(book), quantity };
  });
  const bookTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = await Order.create({
    user: req.user._id,
    items,
    amount: bookTotal,
    bookTotal,
    extraCharge: 0,
    currency: "INR",
    orderType: "manual_book",
    customerDetails,
    provider: "upi_manual",
    status: "pending"
  });
  res.status(201).json({ order: withoutPaymentProofData(order) });
}

export async function getManualBookOrderPayment(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Book order not found" });
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id, orderType: "manual_book" }).populate("items.book");
  if (!order) return res.status(404).json({ message: "Book order not found" });
  if (!["pending", "rejected"].includes(order.status) || order.paymentProof || order.razorpayPaymentId) {
    return res.status(409).json({ message: "Payment has already been submitted for this book order" });
  }
  const settings = await paymentSettings();
  res.json({
    order: withoutPaymentProofData(order),
    settings: {
      upiId: settings.upiId,
      payeeName: settings.payeeName,
      qrImage: fileUrl(req, settings.qrImage),
      instructions: settings.instructions,
      deliveryCharge: settings.orderBookExtraCharge,
      manualPaymentExtraCharge: settings.manualPaymentExtraCharge,
      razorpayPaymentExtraCharge: settings.razorpayPaymentExtraCharge
    }
  });
}

export async function startManualBookOrderPayment(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Book order not found" });
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id, orderType: "manual_book" });
  if (!order) return res.status(404).json({ message: "Book order not found" });
  if (!["pending", "rejected"].includes(order.status) || order.paymentProof || order.razorpayPaymentId) {
    return res.status(409).json({ message: "Payment has already been submitted for this book order" });
  }
  const paymentMethod = req.body.paymentMethod === "razorpay" ? "razorpay" : "upi_manual";
  const transactionId = String(req.body.transactionId || "").trim();
  if (paymentMethod === "upi_manual" && !req.file) return res.status(422).json({ message: "Upload payment screenshot for verification." });
  if (paymentMethod === "upi_manual" && !transactionId) return res.status(422).json({ message: "Enter transaction ID." });
  if (transactionId.length > 120) return res.status(422).json({ message: "Transaction ID is too long." });
  if (paymentMethod === "upi_manual") {
    const duplicate = await Order.findOne({
      _id: { $ne: order._id },
      provider: "upi_manual",
      transactionId,
      status: { $in: ["submitted", "success", "confirmed", "completed"] }
    }).select("_id");
    if (duplicate) {
      logRequestEvent("payment", "duplicate_manual_transaction_blocked", req, { orderId: order._id, duplicateOrderId: duplicate._id });
      return res.status(409).json({ message: "This transaction ID has already been submitted" });
    }
  }

  const settings = await paymentSettings();
  const summary = manualOrderPaymentSummary(order, settings, paymentMethod);
  let razorpayOrder = null;
  if (paymentMethod === "razorpay") {
    const razorpay = getRazorpay();
    if (!razorpay) return res.status(422).json({ message: "Razorpay is not configured yet. Please use Manual UPI." });
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(summary.amount * 100),
        currency: process.env.RAZORPAY_CURRENCY || "INR",
        receipt: `book_${Date.now()}`
      });
    } catch (error) {
      return razorpayErrorResponse(error, res);
    }
  }

  Object.assign(order, summary, {
    provider: paymentMethod,
    paymentProof: req.file?.path,
    paymentProofData: req.file ? await fs.promises.readFile(req.file.path) : undefined,
    paymentProofMimeType: req.file?.mimetype,
    paymentNote: transactionId || undefined,
    transactionId: transactionId || undefined,
    razorpayOrderId: razorpayOrder?.id,
    status: paymentMethod === "upi_manual" ? "submitted" : "pending"
  });
  await order.save();
  logRequestEvent("payment", "manual_book_payment_started", req, { orderId: order._id, provider: paymentMethod, amount: order.amount });
  if (paymentMethod === "upi_manual") await sendAdminPaymentProofEmail(req, order);
  res.json({
    message: paymentMethod === "upi_manual" ? "Your order has been submitted successfully and is pending verification." : "",
    order: withoutPaymentProofData(order),
    razorpay: razorpayOrder
      ? { keyId: getRazorpayKeyId(), orderId: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency }
      : null
  });
}

export async function createManualBookOrder(req, res) {
  const selections = parseBookSelections(req.body.items, req.body.bookIds);
  if (!selections) return res.status(422).json({ message: `Select valid books and quantities up to ${MAX_BOOK_QUANTITY} copies.` });
  const ids = selections.map((selection) => selection.bookId);
  const paymentMethod = req.body.paymentMethod === "razorpay" ? "razorpay" : "upi_manual";
  const customerDetails = manualCustomerDetails(req.body);
  const customerDetailsError = validateManualCustomerDetails(customerDetails);
  if (customerDetailsError) return res.status(422).json({ message: customerDetailsError });
  if (!ids.length) return res.status(422).json({ message: "Select at least one book." });
  const transactionId = String(req.body.transactionId || "").trim();
  if (paymentMethod === "upi_manual" && !req.file) return res.status(422).json({ message: "Upload payment screenshot for verification." });
  if (paymentMethod === "upi_manual" && !transactionId) return res.status(422).json({ message: "Enter transaction ID." });
  if (transactionId.length > 120) return res.status(422).json({ message: "Transaction ID is too long." });
  if (paymentMethod === "upi_manual") {
    const duplicate = await Order.findOne({
      provider: "upi_manual",
      transactionId,
      status: { $in: ["submitted", "success", "confirmed", "completed"] }
    }).select("_id");
    if (duplicate) {
      logRequestEvent("payment", "duplicate_manual_transaction_blocked", req, { duplicateOrderId: duplicate._id });
      return res.status(409).json({ message: "This transaction ID has already been submitted" });
    }
  }

  const books = await Book.find({ _id: { $in: ids }, isActive: true });
  if (books.length !== ids.length) return res.status(422).json({ message: "One or more selected books are unavailable." });

  const booksById = new Map(books.map((book) => [String(book._id), book]));
  const settings = await paymentSettings();
  const bookTotal = selections.reduce((sum, selection) => sum + orderBookPrice(booksById.get(selection.bookId)) * selection.quantity, 0);
  const extraCharge = normalizedExtraCharge(settings.orderBookExtraCharge) + paymentMethodExtraCharge(settings, paymentMethod);
  const amount = bookTotal + extraCharge;
  let razorpayOrder = null;
  if (paymentMethod === "razorpay") {
    const razorpay = getRazorpay();
    if (!razorpay) return res.status(422).json({ message: "Razorpay is not configured yet. Please use Manual UPI." });
    const amountInPaise = Math.round(amount * 100);
    if (amountInPaise < MIN_RAZORPAY_AMOUNT) return res.status(422).json({ message: "Minimum online payment amount is Rs. 1." });
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: process.env.RAZORPAY_CURRENCY || "INR",
        receipt: `book_${Date.now()}`
      });
    } catch (error) {
      return razorpayErrorResponse(error, res);
    }
  }
  const order = await Order.create({
    user: req.user._id,
    items: selections.map(({ bookId, quantity }) => {
      const book = booksById.get(bookId);
      return { book: book._id, title: book.title, price: orderBookPrice(book), quantity };
    }),
    amount,
    bookTotal,
    extraCharge,
    currency: "INR",
    orderType: "manual_book",
    customerDetails,
    provider: paymentMethod,
    paymentProof: req.file?.path,
    paymentProofData: req.file ? await fs.promises.readFile(req.file.path) : undefined,
    paymentProofMimeType: req.file?.mimetype,
    paymentNote: transactionId || undefined,
    transactionId: transactionId || undefined,
    razorpayOrderId: razorpayOrder?.id,
    status: paymentMethod === "upi_manual" ? "submitted" : "pending"
  });
  logRequestEvent("payment", "manual_book_order_created", req, { orderId: order._id, provider: paymentMethod, amount });
  if (paymentMethod === "upi_manual") await sendAdminPaymentProofEmail(req, order);
  res.status(201).json({
    message: paymentMethod === "upi_manual" ? "Your order has been submitted successfully and is pending verification." : "",
    order: withoutPaymentProofData(order),
    razorpay: razorpayOrder
      ? {
          keyId: getRazorpayKeyId(),
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency
        }
      : null
  });
}

export async function createOrder(req, res) {
  let stage = "start";
  try {
  stage = "read_request";
  const submittedIds = Array.isArray(req.body.bookIds) ? req.body.bookIds : [];
  if (submittedIds.some((id) => typeof id !== "string" || !mongoose.isValidObjectId(id))) {
    return res.status(422).json({ message: "One or more books are invalid" });
  }
  const ids = [...new Set(submittedIds)];
  const paymentMethod = req.body.paymentMethod || "auto";
  if (!ids.length) return res.status(422).json({ message: "Cart is empty" });
  stage = "load_books";
  let books;
  let usedClientBookFallback = false;
  try {
    books = await loadCheckoutBooks(ids, req);
  } catch (error) {
    usedClientBookFallback = true;
    books = clientCheckoutBooks(ids, req.body.books);
    logRequestEvent("payment", "checkout_book_lookup_fallback_used", req, {
      error: error.message,
      name: error.name,
      bookCount: books.length
    });
  }
  if (!usedClientBookFallback) {
    if (books.length !== ids.length) return res.status(422).json({ message: "One or more books are unavailable" });
    if (books.some((book) => !hasOwnerUploadedPdf(book))) {
      return res.status(422).json({ message: "Not uploaded by owner" });
    }
  }

  const bookTotal = books.length * PDF_SALE_PRICE;
  const currency = paymentCurrency();
  stage = "load_payment_settings";
  const settings = await safePaymentSettings(req);
  let razorpay = null;
  try {
    razorpay = getRazorpay();
  } catch (error) {
    logRequestEvent("payment", "razorpay_client_init_failed", req, { error: error.message });
  }
  let razorpayOrder = null;
  let provider = razorpay && paymentMethod !== "upi_manual" ? "razorpay" : "upi_manual";
  let paymentWarning = "";
  let extraCharge = paymentMethodExtraCharge(settings, provider);
  let amount = bookTotal + extraCharge;

  if (paymentMethod === "razorpay" && !razorpay) {
    paymentWarning = "Online payment is temporarily unavailable. Please use Manual UPI for this order.";
  }

  if (razorpay && paymentMethod !== "upi_manual") {
    provider = "razorpay";
    const amountInPaise = Math.round(amount * 100);
    if (amountInPaise < MIN_RAZORPAY_AMOUNT) return res.status(422).json({ message: "Minimum online payment amount is Rs. 1" });
    try {
      stage = "create_razorpay_order";
      razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency,
        receipt: `order_${Date.now()}`
      });
    } catch (error) {
      logRequestEvent("payment", "razorpay_order_create_failed", req, {
        statusCode: error.statusCode,
        code: error.error?.code,
        description: error.error?.description || error.message
      });
      paymentWarning = isRazorpayAuthError(error)
        ? "Razorpay keys are not valid. Please use Manual UPI for this order."
        : "Razorpay is temporarily unavailable. Please use Manual UPI for this order.";
      provider = "upi_manual";
      extraCharge = paymentMethodExtraCharge(settings, provider);
      amount = bookTotal + extraCharge;
    }
  }

  stage = "save_order";
  const order = await Order.create({
    user: req.user._id,
    items: books.map((book) => ({ book: book._id, title: book.title, price: PDF_SALE_PRICE })),
    amount,
    bookTotal,
    extraCharge,
    currency,
    provider,
    razorpayOrderId: razorpayOrder?.id,
    paymentNote: usedClientBookFallback ? "Created after checkout book lookup fallback" : undefined
  });
  stage = "log_order_created";
  logRequestEvent("payment", "digital_order_created", req, { orderId: order._id, provider, amount });

  stage = "prepare_upi";
  const upiNote = `PDF Book Store order ${order._id}`;
  const upiUri = upiPaymentUri({
    upiId: settings.upiId || "your-upi-id@bank",
    payeeName: settings.payeeName,
    amount,
    note: upiNote
  });
  let upiQrDataUrl = null;
  if (!razorpayOrder) {
    try {
      stage = "create_upi_qr";
      upiQrDataUrl = await QRCode.toDataURL(upiUri, { width: 320, margin: 2 });
    } catch (error) {
      logRequestEvent("payment", "upi_qr_create_failed", req, { orderId: order._id, error: error.message });
    }
  }

  stage = "send_response";
  res.status(201).json({
    message: paymentWarning,
    order,
    razorpay: razorpayOrder
      ? { keyId: getRazorpayKeyId(), orderId: razorpayOrder.id, amount: razorpayOrder.amount, currency }
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
  } catch (error) {
    logRequestEvent("payment", "digital_order_create_unhandled", req, {
      stage,
      error: error.message,
      name: error.name
    });
    const retryable = stage === "load_books" || Boolean(error.retryable || isTransientDatabaseError(error));
    res.status(retryable ? 503 : 422).json({
      message: stage === "load_books"
        ? "We could not load the selected book details. Please refresh the cart and try again."
        : `Payment could not start right now (${stage}). Please try again in a moment.`,
      code: "PAYMENT_CREATE_FAILED",
      stage,
      retryable
    });
  }
}

export async function confirmManualPayment(req, res) {
  if (!mongoose.isValidObjectId(req.body.orderId)) return res.status(404).json({ message: "Order not found" });
  const order = await Order.findOne({ _id: req.body.orderId, user: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.provider !== "upi_manual") return res.status(422).json({ message: "This order is not a UPI manual order" });
  if (!["pending", "failed"].includes(order.status)) return res.status(409).json({ message: "This payment proof has already been submitted or verified" });
  if (!req.file) return res.status(422).json({ message: "Upload payment screenshot for verification" });
  const paymentNote = String(req.body.paymentNote || "").trim();
  if (paymentNote) {
    const duplicate = await Order.findOne({
      _id: { $ne: order._id },
      provider: "upi_manual",
      transactionId: paymentNote,
      status: { $in: ["submitted", "success", "confirmed", "completed"] }
    }).select("_id");
    if (duplicate) {
      logRequestEvent("payment", "duplicate_manual_transaction_blocked", req, { orderId: order._id, duplicateOrderId: duplicate._id });
      return res.status(409).json({ message: "This transaction ID has already been submitted" });
    }
  }
  order.status = "submitted";
  order.paymentProof = req.file.path;
  order.paymentProofData = await fs.promises.readFile(req.file.path);
  order.paymentProofMimeType = req.file.mimetype;
  order.paymentNote = paymentNote;
  order.transactionId = paymentNote || order.transactionId;
  await order.save();
  logRequestEvent("payment", "manual_payment_submitted", req, { orderId: order._id });
  await lockBooks(order);
  await sendAdminPaymentProofEmail(req, order);
  res.json({ message: "Payment proof submitted. Admin will verify and unlock your PDFs.", order: withoutPaymentProofData(order) });
}

export async function verifyPayment(req, res) {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing Razorpay verification fields" });
  }
  const keySecret = getRazorpayKeySecret();
  if (!keySecret) return res.status(422).json({ message: "Razorpay is not configured" });

  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (isVerifiedDigitalOrder(order) || (order.orderType === "manual_book" && ["confirmed", "completed"].includes(order.status))) {
    if (order.razorpayOrderId === razorpay_order_id && (!order.razorpayPaymentId || order.razorpayPaymentId === razorpay_payment_id)) {
      await grantDigitalOrderAccess(order, { paymentId: razorpay_payment_id, signature: razorpay_signature });
      logRequestEvent("payment", "razorpay_payment_access_repaired", req, { orderId: order._id, razorpayPaymentId: razorpay_payment_id });
      return res.json({ message: order.orderType === "manual_book" ? "Payment verified. Your book order is confirmed." : "Payment verified", order: publicOrderResponse(req, order) });
    }
    return res.status(409).json({ message: "This order has already been processed" });
  }
  const duplicatePayment = await Order.findOne({
    _id: { $ne: order._id },
    razorpayPaymentId: razorpay_payment_id
  });
  if (duplicatePayment) {
    if (String(duplicatePayment.user) === String(req.user._id)) {
      await grantDigitalOrderAccess(duplicatePayment, { paymentId: razorpay_payment_id, signature: razorpay_signature });
      logRequestEvent("payment", "duplicate_razorpay_payment_recovered", req, { orderId: order._id, duplicateOrderId: duplicatePayment._id });
      return res.json({ message: "Payment verified", order: publicOrderResponse(req, duplicatePayment) });
    }
    logRequestEvent("payment", "duplicate_razorpay_payment_blocked", req, { orderId: order._id, duplicateOrderId: duplicatePayment._id });
    return res.status(409).json({ message: "This payment has already been processed" });
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (!signaturesMatch(expected, razorpay_signature) || order.razorpayOrderId !== razorpay_order_id) {
    order.status = order.orderType === "manual_book" ? "rejected" : "failed";
    await order.save();
    logRequestEvent("payment", "razorpay_signature_failed", req, { orderId: order._id, razorpayOrderId: razorpay_order_id });
    if (order.orderType !== "manual_book") await sendPaymentStatusEmail(order);
    return res.status(400).json({ message: "Payment verification failed" });
  }
  try {
    const payment = await fetchRazorpayPayment(razorpay_payment_id);
    if (payment && (payment.order_id !== razorpay_order_id || !["captured", "authorized"].includes(payment.status))) {
      logRequestEvent("payment", "razorpay_status_failed", req, { orderId: order._id, razorpayPaymentId: razorpay_payment_id, status: payment.status });
    }
  } catch (error) {
    logRequestEvent("payment", "razorpay_status_fetch_failed", req, { orderId: order._id, error: error.message });
  }

  await grantDigitalOrderAccess(order, { paymentId: razorpay_payment_id, signature: razorpay_signature });
  logRequestEvent("payment", "razorpay_payment_verified", req, { orderId: order._id, razorpayPaymentId: razorpay_payment_id });
  if (order.orderType !== "manual_book") {
    await sendPaymentStatusEmail(order);
  }
  res.json({ message: order.orderType === "manual_book" ? "Payment verified. Your book order is confirmed." : "Payment verified", order: publicOrderResponse(req, order) });
}

export async function razorpayWebhook(req, res) {
  const secret = getRazorpayWebhookSecret();
  if (!secret) return res.status(501).json({ message: "Razorpay webhook is not configured" });

  const signature = req.headers["x-razorpay-signature"];
  const expected = crypto.createHmac("sha256", secret).update(req.body).digest("hex");
  if (!signaturesMatch(expected, signature)) return res.status(400).json({ message: "Invalid webhook signature" });

  const event = JSON.parse(req.body.toString("utf8"));
  if (event.event !== "payment.captured") return res.json({ received: true });

  const payment = event.payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id;
  if (!razorpayOrderId) return res.json({ received: true });

  const order = await Order.findOne({ razorpayOrderId });
  if (!order) return res.json({ received: true });
  if (isVerifiedDigitalOrder(order) || (order.orderType === "manual_book" && ["confirmed", "completed"].includes(order.status))) {
    await grantDigitalOrderAccess(order, { paymentId: payment.id });
    logEvent("payment", "webhook_access_repaired", { orderId: order._id, razorpayPaymentId: payment.id });
    return res.json({ received: true });
  }
  const duplicatePayment = await Order.findOne({ _id: { $ne: order._id }, razorpayPaymentId: payment.id }).select("_id");
  if (duplicatePayment) {
    logEvent("payment", "duplicate_webhook_payment_ignored", { orderId: order._id, duplicateOrderId: duplicatePayment._id, razorpayPaymentId: payment.id });
    return res.json({ received: true });
  }
  if (payment.status !== "captured") {
    logEvent("payment", "webhook_payment_not_captured", { orderId: order._id, razorpayPaymentId: payment.id, status: payment.status });
    return res.json({ received: true });
  }

  await grantDigitalOrderAccess(order, { paymentId: payment.id });
  logEvent("payment", "webhook_payment_captured", { orderId: order._id, razorpayPaymentId: payment.id });
  if (order.orderType !== "manual_book") {
    await sendPaymentStatusEmail(order);
  }
  res.json({ received: true });
}

export async function myOrders(req, res) {
  await reconcileUserRazorpayOrders(req);
  await repairDigitalEntitlements(req.user._id);
  // Do not hide abandoned, cancelled, or legacy orders. A signed-in customer
  // must always see their complete history.
  const orders = await Order.find({ user: req.user._id })
    .populate("items.book")
    .sort({ createdAt: -1, _id: -1 });
  res.json({ orders: orders.map((order) => publicOrderResponse(req, order)) });
}

export async function myLibrary(req, res) {
  await reconcileUserRazorpayOrders(req);
  const repairedOrders = await repairDigitalEntitlements(req.user._id);
  const orders = await Order.find({ _id: { $in: repairedOrders.map((order) => order._id) } })
    .populate({ path: "items.book", populate: "category" });
  const uniqueBooks = new Map();
  orders.forEach((order) => {
    order.items.forEach((item) => {
      const accessExpiresAt = digitalAccessExpiry(order, item);
      if (item.book && accessExpiresAt.getTime() > Date.now()) {
        const key = String(item.book._id);
        const current = uniqueBooks.get(key);
        if (!current || accessExpiresAt > current.accessExpiresAt) uniqueBooks.set(key, {
          book: item.book,
          accessExpiresAt
        });
      }
    });
  });
  const freshUser = await User.findById(req.user._id).select("purchasedBooks").lean();
  const purchasedBookIds = (freshUser?.purchasedBooks || []).map((bookId) => String(bookId));
  if (purchasedBookIds.length) {
    // A past purchase remains available even when its book is no longer shown
    // in the public catalogue.
    const purchasedBooks = await Book.find({ _id: { $in: purchasedBookIds } }).populate("category");
    purchasedBooks.forEach((book) => {
      const key = String(book._id);
      if (!uniqueBooks.has(key)) {
        uniqueBooks.set(key, {
          book,
          accessExpiresAt: LIFETIME_DIGITAL_ACCESS_EXPIRES_AT
        });
      }
    });
  }
  res.json({ books: [...uniqueBooks.values()].map(({ book, accessExpiresAt }) => ({ ...publicBook(req, book), accessExpiresAt })) });
}

export async function myLibraryBook(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Book not found" });
  await reconcileUserRazorpayOrders(req);
  const orders = await Order.find({
    user: req.user._id,
    status: { $in: VERIFIED_DIGITAL_ORDER_STATUSES },
    orderType: { $ne: "manual_book" },
    "items.book": req.params.id
  });
  let owns = orders.some((order) => order.items.some((item) =>
    String(item.book) === req.params.id && digitalAccessExpiry(order, item).getTime() > Date.now()
  ));
  if (!owns) {
    await syncPurchasedBooksFromOrders(req.user._id, orders);
    const freshUser = await User.findById(req.user._id).select("purchasedBooks").lean();
    owns = (freshUser?.purchasedBooks || []).some((bookId) => String(bookId) === req.params.id);
  }
  if (!owns) return res.status(403).json({ message: "Purchase required or access expired for this PDF" });
  const book = await Book.findById(req.params.id).populate("category");
  if (!book) return res.status(404).json({ message: "Book not found" });
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.json({ book: publicBook(req, book) });
}

export async function updateOrderStatus(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  const manualBookOrder = order.orderType === "manual_book";
  const allowedStatuses = manualBookOrder ? MANUAL_BOOK_ORDER_STATUSES : DIGITAL_ORDER_STATUSES;
  if (!allowedStatuses.has(req.body.status)) return res.status(422).json({ message: "Invalid order status" });
  const previousStatus = order.status;
  order.status = req.body.status;
  if (!manualBookOrder && isVerifiedDigitalOrder(order)) initializeDigitalAccess(order);
  await order.save();
  if (manualBookOrder) {
    logRequestEvent("payment", "admin_order_status_updated", req, { orderId: order._id, previousStatus, status: order.status });
    return res.json({ order });
  }
  if (isVerifiedDigitalOrder(order)) await unlockBooks(order);
  else await lockBooks(order);
  if (["success", "failed"].includes(order.status) && previousStatus !== order.status) {
    await sendPaymentStatusEmail(order);
  }
  logRequestEvent("payment", "admin_order_status_updated", req, { orderId: order._id, previousStatus, status: order.status });
  res.json({ order: publicOrderResponse(req, order) });
}

export async function updateDigitalAccess(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (!isVerifiedDigitalOrder(order)) {
    return res.status(422).json({ message: "Access duration can only be updated for successful PDF purchases" });
  }
  const item = order.items.find((orderItem) => String(orderItem.book) === String(req.body.bookId));
  if (!item) return res.status(404).json({ message: "Purchased book not found in this order" });
  const accessExpiresAt = new Date(req.body.accessExpiresAt);
  if (Number.isNaN(accessExpiresAt.getTime())) return res.status(422).json({ message: "Enter a valid access expiry date and time" });
  item.accessExpiresAt = accessExpiresAt;
  await order.save();
  res.json({ order, bookId: item.book, accessExpiresAt: item.accessExpiresAt });
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
      orderBookExtraCharge: normalizedExtraCharge(req.body.orderBookExtraCharge),
      manualPaymentExtraCharge: normalizedExtraCharge(req.body.manualPaymentExtraCharge),
      razorpayPaymentExtraCharge: normalizedExtraCharge(req.body.razorpayPaymentExtraCharge),
      instructions: req.body.instructions || "",
      ...(req.file ? { qrImage: req.file.path } : {})
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  clearPublicResponseCache("/api/payments/order-book-settings");
  res.json({ settings: { ...settings.toObject(), qrImage: fileUrl(req, settings.qrImage) } });
}
