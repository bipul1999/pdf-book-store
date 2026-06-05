import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isVerified: { type: Boolean, default: false },
    activeSessionId: { type: String, default: "" },
    firstLoginAt: Date,
    lastLoginAt: Date,
    loginCount: { type: Number, default: 0 },
    lastLoginIp: { type: String, default: "" },
    lastLoginUserAgent: { type: String, default: "" },
    purchasedBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }]
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("User", userSchema);
