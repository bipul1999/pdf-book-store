import fs from "fs";
import mongoose from "mongoose";
import path from "path";
import Book from "../models/Book.js";
import Order from "../models/Order.js";
import { clearPublicResponseCache } from "../middleware/publicResponseCache.js";
import { hasOwnerUploadedPdf } from "../utils/bookAvailability.js";

const DEFAULT_DIGITAL_ACCESS_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function coverUrl(req, filePath) {
  if (!filePath?.startsWith("uploads")) return filePath;
  const normalized = filePath.replaceAll("\\", "/").replace("uploads/covers/", "");
  return `${req.protocol}://${req.get("host")}/uploads/covers/${normalized}`;
}

function serializeBook(req, book) {
  const plain = book.toObject ? book.toObject() : book;
  const pdfAvailable = hasOwnerUploadedPdf(plain);
  const publicBook = { ...plain };
  delete publicBook.pdfPath;
  delete publicBook.pdfData;
  delete publicBook.pdfMimeType;
  delete publicBook.pdfStored;
  return { ...publicBook, coverImage: coverUrl(req, plain.coverImage), pdfAvailable };
}

async function pdfFields(file) {
  return {
    pdfPath: file.path,
    pdfData: await fs.promises.readFile(file.path),
    pdfMimeType: file.mimetype || "application/pdf",
    pdfStored: true
  };
}

export async function listBooks(req, res) {
  const { q, category, featured, min, max } = req.query;
  const filter = { isActive: true };
  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (featured) filter.featured = featured === "true";
  if (min || max) filter.price = { ...(min ? { $gte: Number(min) } : {}), ...(max ? { $lte: Number(max) } : {}) };
  const books = await Book.find(filter).select("+pdfPath +pdfStored").populate("category").sort("-createdAt").lean();
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json({ books: books.map((book) => serializeBook(req, book)) });
}

export async function getBook(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Book not found" });
  const book = await Book.findOne({ _id: req.params.id, isActive: true }).select("+pdfPath +pdfStored").populate("category").lean();
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
    ...(await pdfFields(pdf))
  });
  clearPublicResponseCache("/api/books");
  res.status(201).json({ book: serializeBook(req, await book.populate("category")) });
}

export async function updateBook(req, res) {
  const book = await Book.findById(req.params.id).select("+pdfPath +pdfStored");
  if (!book) return res.status(404).json({ message: "Book not found" });
  ["title", "author", "description"].forEach((field) => {
    if (req.body[field] !== undefined) book[field] = req.body[field];
  });
  if (req.body.price !== undefined) book.price = Number(req.body.price);
  if (req.body.featured !== undefined) book.featured = req.body.featured === "true" || req.body.featured === true;
  if (req.body.isActive !== undefined) book.isActive = req.body.isActive === "true" || req.body.isActive === true;
  if (req.files?.cover?.[0]) book.coverImage = req.files.cover[0].path;
  if (req.files?.pdf?.[0]) Object.assign(book, await pdfFields(req.files.pdf[0]));
  await book.save();
  clearPublicResponseCache("/api/books");
  res.json({ book: serializeBook(req, await book.populate("category")) });
}

export async function deleteBook(req, res) {
  const book = await Book.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!book) return res.status(404).json({ message: "Book not found" });
  clearPublicResponseCache("/api/books");
  res.json({ message: "Book archived" });
}

export async function downloadBook(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Book not found" });
  const book = await Book.findById(req.params.id).select("+pdfPath +pdfData +pdfMimeType");
  if (!book) return res.status(404).json({ message: "Book not found" });
  if (!hasOwnerUploadedPdf(book)) {
    return res.status(404).json({ message: "Not uploaded by owner" });
  }
  let owns = req.user.role === "admin";
  if (!owns) {
    const successfulOrders = await Order.find({
      user: req.user._id,
      status: "success",
      orderType: { $ne: "manual_book" },
      "items.book": book._id
    }).select("items updatedAt");
    owns = successfulOrders.some((order) => {
      const item = order.items.find((orderItem) => String(orderItem.book) === String(book._id));
      const expiry = item?.accessExpiresAt || new Date(order.updatedAt.getTime() + DEFAULT_DIGITAL_ACCESS_DAYS * DAY_MS);
      return Boolean(item) && expiry.getTime() > Date.now();
    });
  }
  if (!owns) return res.status(403).json({ message: "Purchase required or access expired for this PDF" });
  const absolute = path.resolve(book.pdfPath);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(book.title)}.pdf"`);
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (book.pdfData?.length) return res.send(Buffer.from(book.pdfData));
  res.sendFile(absolute);
}
