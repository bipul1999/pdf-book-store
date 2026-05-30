import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, trim: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 20 },
    category: {
      type: String,
      enum: ["website", "book", "purchase", "payment", "problem", "suggestion"],
      required: true
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    message: { type: String, trim: true, minlength: 5, maxlength: 2000, required: true },
    status: { type: String, enum: ["new", "reviewed"], default: "new" }
  },
  { timestamps: true }
);

feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ category: 1, createdAt: -1 });

export default mongoose.model("Feedback", feedbackSchema);
