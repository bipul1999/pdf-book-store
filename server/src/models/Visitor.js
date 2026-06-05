import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema(
  {
    visitorId: { type: String, required: true, trim: true, maxlength: 120 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ip: { type: String, trim: true, maxlength: 80 },
    userAgent: { type: String, trim: true, maxlength: 500 },
    page: { type: String, trim: true, maxlength: 300 },
    referrer: { type: String, trim: true, maxlength: 500 },
    screen: { type: String, trim: true, maxlength: 40 },
    language: { type: String, trim: true, maxlength: 80 }
  },
  { timestamps: true }
);

visitorSchema.index({ createdAt: -1 });
visitorSchema.index({ visitorId: 1, createdAt: -1 });
visitorSchema.index({ user: 1, createdAt: -1 }, { sparse: true });

export default mongoose.model("Visitor", visitorSchema);
