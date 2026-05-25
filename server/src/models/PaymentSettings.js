import mongoose from "mongoose";

const paymentSettingsSchema = new mongoose.Schema(
  {
    upiId: { type: String, default: "" },
    payeeName: { type: String, default: "PDF Book Store" },
    qrImage: { type: String, default: "" },
    orderBookExtraCharge: { type: Number, min: 0, default: 0 },
    instructions: { type: String, default: "Pay the exact amount and upload the payment screenshot for admin verification." }
  },
  { timestamps: true }
);

paymentSettingsSchema.index({ updatedAt: -1 });

export default mongoose.model("PaymentSettings", paymentSettingsSchema);
