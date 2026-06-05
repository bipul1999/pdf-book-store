import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    description: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5 },
    price: { type: Number, required: true, min: 0 },
    listPrice: { type: Number, min: 0, default: 149 },
    orderBookPrice: { type: Number, min: 0 },
    orderBookListPrice: { type: Number, min: 0 },
    coverImage: { type: String, required: true },
    pdfPath: { type: String, default: "", select: false },
    pdfFileId: { type: mongoose.Schema.Types.ObjectId, select: false },
    pdfData: { type: Buffer, select: false },
    pdfMimeType: { type: String, default: "application/pdf", select: false },
    pdfStored: { type: Boolean, default: false, select: false },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

bookSchema.index({ title: "text", author: "text", description: "text" });
bookSchema.index({ isActive: 1, createdAt: -1 });
bookSchema.index({ isActive: 1, featured: 1, createdAt: -1 });
bookSchema.index({ isActive: 1, category: 1, createdAt: -1 });

export default mongoose.model("Book", bookSchema);
