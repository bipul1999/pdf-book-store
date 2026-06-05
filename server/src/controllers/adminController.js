import User from "../models/User.js";
import Order from "../models/Order.js";
import Book from "../models/Book.js";
import Category from "../models/Category.js";
import Visitor from "../models/Visitor.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const DEFAULT_DIGITAL_ACCESS_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function dashboardStats(_req, res) {
  const [users, books, orders, categories, visitors, revenue] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Book.countDocuments({ isActive: true }),
    Order.countDocuments(),
    Category.countDocuments(),
    Visitor.distinct("visitorId").then((ids) => ids.length),
    Order.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }])
  ]);
  res.json({ users, books, orders, categories, visitors, revenue: revenue[0]?.total || 0 });
}

export async function listUsers(_req, res) {
  const users = await User.find().select("-password -activeSessionId").sort("-createdAt");
  res.json({ users });
}

function orderAccessExpiry(order, item) {
  if (order.orderType === "manual_book" || order.status !== "success") return item.accessExpiresAt;
  return item.accessExpiresAt || new Date(order.updatedAt.getTime() + DEFAULT_DIGITAL_ACCESS_DAYS * DAY_MS);
}

function transactionLabel(order) {
  return order.transactionId || order.paymentNote || order.razorpayPaymentId || order.razorpayOrderId || "";
}

function publicOrder(order) {
  const safeOrder = withoutRazorpaySignature(order);
  return {
    ...safeOrder,
    transaction: transactionLabel(safeOrder),
    paymentProof: order.paymentProof ? `/admin/orders/${order._id}/proof` : "",
    items: order.items.map((item) => ({
      ...item.toObject(),
      accessExpiresAt: orderAccessExpiry(order, item)
    }))
  };
}

export async function getUserProfile(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "User not found" });
  const user = await User.findById(req.params.id).select("-password -activeSessionId").lean();
  if (!user) return res.status(404).json({ message: "User not found" });

  const orders = await Order.find({ user: user._id }).populate("items.book").sort({ createdAt: -1, _id: -1 });
  const paidOrderStatuses = new Set(["success", "confirmed", "completed"]);
  const pdfPurchases = orders.flatMap((order) => {
    if (order.orderType === "manual_book" || order.status !== "success") return [];
    return order.items.map((item) => ({
      orderId: order._id,
      bookId: item.book?._id || item.book,
      title: item.title || item.book?.title || "PDF book",
      amount: item.price,
      purchasedAt: order.updatedAt,
      accessExpiresAt: orderAccessExpiry(order, item),
      transaction: transactionLabel(order)
    }));
  });

  const transactions = orders
    .filter((order) => transactionLabel(order) || paidOrderStatuses.has(order.status))
    .map((order) => ({
      orderId: order._id,
      orderType: order.orderType,
      provider: order.provider,
      status: order.status,
      amount: order.amount,
      transaction: transactionLabel(order),
      razorpayPaymentId: order.razorpayPaymentId,
      razorpayOrderId: order.razorpayOrderId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

  res.json({
    user,
    summary: {
      totalOrders: orders.length,
      successfulOrders: orders.filter((order) => paidOrderStatuses.has(order.status)).length,
      pdfPurchases: pdfPurchases.length,
      totalPaid: orders
        .filter((order) => paidOrderStatuses.has(order.status))
        .reduce((sum, order) => sum + (Number(order.amount) || 0), 0)
    },
    orders: orders.map(publicOrder),
    transactions,
    pdfPurchases
  });
}

export async function listOrders(_req, res) {
  const orders = await Order.find().populate("user", "name email phone").populate("items.book").sort("-createdAt");
  res.json({
    orders: orders.map(publicOrder)
  });
}

export async function listVisitors(_req, res) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [visits, totalVisits, uniqueVisitors, todayVisits, todayUnique] = await Promise.all([
    Visitor.find().populate("user", "name email phone").sort("-createdAt").limit(300),
    Visitor.countDocuments(),
    Visitor.distinct("visitorId").then((ids) => ids.length),
    Visitor.countDocuments({ createdAt: { $gte: startOfToday } }),
    Visitor.distinct("visitorId", { createdAt: { $gte: startOfToday } }).then((ids) => ids.length)
  ]);

  res.json({
    summary: { totalVisits, uniqueVisitors, todayVisits, todayUnique },
    visits
  });
}

function withoutRazorpaySignature(order) {
  const safeOrder = order.toObject();
  delete safeOrder.razorpaySignature;
  return safeOrder;
}

export async function viewOrderProof(req, res) {
  const order = await Order.findById(req.params.id).select("+paymentProofData");
  if (!order) return res.status(404).json({ message: "Payment proof not found" });
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Content-Disposition", "inline");
  if (order.paymentProofData?.length) {
    res.type(order.paymentProofMimeType || "image/jpeg");
    return res.send(Buffer.from(order.paymentProofData));
  }
  if (!order.paymentProof) return res.status(404).json({ message: "Payment proof not found" });
  const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "uploads");
  const normalizedPath = order.paymentProof.replaceAll("\\", "/");
  const uploadIndex = normalizedPath.lastIndexOf("uploads/");
  const uploadRelativePath = uploadIndex >= 0 ? normalizedPath.slice(uploadIndex + "uploads/".length) : "";
  const candidatePaths = [
    path.resolve(normalizedPath),
    uploadRelativePath ? path.resolve(uploadRoot, uploadRelativePath) : "",
    path.resolve(uploadRoot, "payment-proofs", path.basename(normalizedPath)),
    path.resolve(uploadRoot, "payments", path.basename(normalizedPath))
  ].filter(Boolean);
  const absolute = [...new Set(candidatePaths)].find((candidate) =>
    candidate.startsWith(`${uploadRoot}${path.sep}`) && fs.existsSync(candidate)
  );
  if (!absolute) return res.status(404).json({ message: "Payment proof file missing. Please ask the customer to upload it again." });
  return res.sendFile(absolute);
}
