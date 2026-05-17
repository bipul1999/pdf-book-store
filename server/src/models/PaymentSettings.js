import mongoose from "mongoose";

const paymentSettingsSchema = new mongoose.Schema(
  {
    upiId: { type: String, default: "" },
    payeeName: { type: String, default: "PDF Book Store" },
    qrImage: { type: String, default: "" },
    instructions: { type: String, default: "Pay the exact amount and upload the payment screenshot for admin verification." }
  },
  { timestamps: true }
);

export default mongoose.model("PaymentSettings", paymentSettingsSchema);
