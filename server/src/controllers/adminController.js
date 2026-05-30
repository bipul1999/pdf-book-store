import User from "../models/User.js";
import Order from "../models/Order.js";
import Book from "../models/Book.js";
import Category from "../models/Category.js";
import fs from "fs";
import path from "path";

const DEFAULT_DIGITAL_ACCESS_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function dashboardStats(_req, res) {
  const [users, books, orders, categories, revenue] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Book.countDocuments({ isActive: true }),
    Order.countDocuments(),
    Category.countDocuments(),
    Order.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }])
  ]);
  res.json({ users, books, orders, categories, revenue: revenue[0]?.total || 0 });
}

export async function listUsers(_req, res) {
  const users = await User.find().select("-password").sort("-createdAt");
  res.json({ users });
}

export async function listOrders(_req, res) {
  const orders = await Order.find().populate("user", "name email phone").populate("items.book").sort("-createdAt");
  res.json({
    orders: orders.map((order) => ({
      ...order.toObject(),
      items: order.items.map((item) => ({
        ...item.toObject(),
        accessExpiresAt: order.orderType !== "manual_book" && order.status === "success"
          ? item.accessExpiresAt || new Date(order.updatedAt.getTime() + DEFAULT_DIGITAL_ACCESS_DAYS * DAY_MS)
          : item.accessExpiresAt
      })),
      paymentProof: order.paymentProof ? `/api/admin/orders/${order._id}/proof` : ""
    }))
  });
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
