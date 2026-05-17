import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    title: String,
    price: Number
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    provider: { type: String, enum: ["razorpay", "upi_manual"], default: "razorpay" },
    paymentProof: String,
    paymentNote: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    status: { type: String, enum: ["pending", "submitted", "success", "failed"], default: "pending" }
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
