import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 }
  },
  { _id: false, timestamps: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, trim: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 20 },
    subject: { type: String, trim: true, maxlength: 140 },
    category: {
      type: String,
      enum: ["login", "payment", "download", "book", "technical", "general"],
      default: "general"
    },
    priority: { type: String, enum: ["low", "normal", "high"], default: "normal" },
    summary: { type: String, trim: true, maxlength: 500 },
    pageUrl: { type: String, trim: true, maxlength: 500 },
    messages: [messageSchema],
    status: { type: String, enum: ["open", "in_progress", "resolved"], default: "open" }
  },
  { timestamps: true }
);

supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ email: 1, createdAt: -1 });

export default mongoose.model("SupportTicket", supportTicketSchema);
