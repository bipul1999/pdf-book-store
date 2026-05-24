import fs from "fs";
import mongoose from "mongoose";
import path from "path";
import Book from "../models/Book.js";
import Order from "../models/Order.js";

function coverUrl(req, filePath) {
  if (!filePath?.startsWith("uploads")) return filePath;
  const normalized = filePath.replaceAll("\\", "/").replace("uploads/covers/", "");
  return `${req.protocol}://${req.get("host")}/uploads/covers/${normalized}`;
}

function serializeBook(req, book) {
  const plain = book.toObject ? book.toObject() : book;
  return { ...plain, coverImage: coverUrl(req, plain.coverImage) };
}

export async function listBooks(req, res) {
  const { q, category, featured, min, max } = req.query;
  const filter = { isActive: true };
  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (featured) filter.featured = featured === "true";
  if (min || max) filter.price = { ...(min ? { $gte: Number(min) } : {}), ...(max ? { $lte: Number(max) } : {}) };
  const books = await Book.find(filter).populate("category").sort("-createdAt").lean();
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json({ books: books.map((book) => serializeBook(req, book)) });
}

export async function getBook(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Book not found" });
  const book = await Book.findOne({ _id: req.params.id, isActive: true }).populate("category").lean();
  if (!book) return res.status(404).json({ message: "Book not found" });
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json({ book: serializeBook(req, book) });
}

export async function createBook(req, res) {
  const cover = req.files?.cover?.[0];
  const pdf = req.files?.pdf?.[0];
  if (!cover || !pdf) return res.status(422).json({ message: "Cover image and PDF are required" });
  const book = await Book.create({
    title: req.body.title,
    author: req.body.author,
    description: req.body.description,
    price: Number(req.body.price),
    featured: req.body.featured === "true" || req.body.featured === true,
    coverImage: cover.path,
    pdfPath: pdf.path
  });
  res.status(201).json({ book: serializeBook(req, await book.populate("category")) });
}

export async function updateBook(req, res) {
  const book = await Book.findById(req.params.id).select("+pdfPath");
  if (!book) return res.status(404).json({ message: "Book not found" });
  ["title", "author", "description"].forEach((field) => {
    if (req.body[field] !== undefined) book[field] = req.body[field];
  });
  if (req.body.price !== undefined) book.price = Number(req.body.price);
  if (req.body.featured !== undefined) book.featured = req.body.featured === "true" || req.body.featured === true;
  if (req.body.isActive !== undefined) book.isActive = req.body.isActive === "true" || req.body.isActive === true;
  if (req.files?.cover?.[0]) book.coverImage = req.files.cover[0].path;
  if (req.files?.pdf?.[0]) book.pdfPath = req.files.pdf[0].path;
  await book.save();
  res.json({ book: serializeBook(req, await book.populate("category")) });
}

export async function deleteBook(req, res) {
  const book = await Book.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!book) return res.status(404).json({ message: "Book not found" });
  res.json({ message: "Book archived" });
}

export async function downloadBook(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Book not found" });
  const book = await Book.findById(req.params.id).select("+pdfPath");
  if (!book) return res.status(404).json({ message: "Book not found" });
  const accessWindowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const successfulOrder = req.user.role === "admin"
    ? true
    : await Order.exists({ user: req.user._id, status: "success", updatedAt: { $gte: accessWindowStart }, "items.book": book._id });
  const owns = Boolean(successfulOrder);
  if (!owns) return res.status(403).json({ message: "Purchase required or access expired for this PDF" });
  const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "uploads");
  const absolute = path.resolve(book.pdfPath);
  if (!absolute.startsWith(`${uploadRoot}${path.sep}`) || !fs.existsSync(absolute)) {
    return res.status(404).json({ message: "PDF file missing" });
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(book.title)}.pdf"`);
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.sendFile(absolute);
}
