import User from "../models/User.js";
import Order from "../models/Order.js";
import Book from "../models/Book.js";
import Category from "../models/Category.js";

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
      paymentProof: order.paymentProof?.startsWith("uploads")
        ? `${_req.protocol}://${_req.get("host")}/${order.paymentProof.replaceAll("\\", "/")}`
        : order.paymentProof
    }))
  });
}
