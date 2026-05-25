import mongoose from "mongoose";

const quoteSettingSchema = new mongoose.Schema(
  {
    quote: {
      type: String,
      default: "किताबें केवल शब्द नहीं होतीं, वे जीवन को समझने की एक शांत रोशनी होती हैं।"
    },
    authorName: { type: String, default: "महेश भारती" },
    authorImage: { type: String, default: "" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

quoteSettingSchema.index({ isActive: 1, updatedAt: -1 });

export default mongoose.model("QuoteSetting", quoteSettingSchema);
