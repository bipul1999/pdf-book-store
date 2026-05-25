import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    title: String,
    price: Number,
    quantity: { type: Number, min: 1, max: 20, default: 1 },
    accessExpiresAt: Date
  },
  { _id: false }
);

const customerDetailsSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true, maxlength: 120 },
    mobileNumber: { type: String, trim: true, maxlength: 16 },
    email: { type: String, trim: true, lowercase: true, maxlength: 180 },
    address: { type: String, trim: true, maxlength: 500 },
    city: { type: String, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 100 },
    pincode: { type: String, trim: true, maxlength: 10 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    amount: { type: Number, required: true },
    bookTotal: Number,
    extraCharge: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    orderType: { type: String, enum: ["digital", "manual_book"], default: "digital" },
    customerDetails: customerDetailsSchema,
    provider: { type: String, enum: ["razorpay", "upi_manual"], default: "razorpay" },
    paymentProof: String,
    paymentProofData: { type: Buffer, select: false },
    paymentProofMimeType: { type: String, enum: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
    paymentNote: String,
    transactionId: { type: String, trim: true, maxlength: 120 },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    status: { type: String, enum: ["pending", "submitted", "success", "failed", "confirmed", "completed", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
