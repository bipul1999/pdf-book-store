import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Book from "../models/Book.js";
import { storePdfFile } from "./pdfStorage.js";
import { hasOwnerUploadedPdf } from "./bookAvailability.js";

const dryRun = process.argv.includes("--dry-run");

function localPdfPath(pdfPath) {
  if (!pdfPath) return "";
  const normalized = String(pdfPath).replaceAll("\\", "/");
  const uploadIndex = normalized.lastIndexOf("uploads/");
  const relative = uploadIndex >= 0 ? normalized.slice(uploadIndex + "uploads/".length) : "";
  const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "uploads");
  const candidates = [
    path.resolve(pdfPath),
    relative ? path.resolve(uploadRoot, relative) : "",
    path.resolve(uploadRoot, "pdfs", path.basename(normalized))
  ].filter(Boolean);
  return [...new Set(candidates)].find((candidate) =>
    candidate.startsWith(`${uploadRoot}${path.sep}`) && fs.existsSync(candidate)
  ) || "";
}

await mongoose.connect(process.env.MONGO_URI);

const books = await Book.find({
  pdfPath: { $exists: true, $ne: "" },
  $or: [{ pdfFileId: { $exists: false } }, { pdfFileId: null }]
}).select("+pdfPath +pdfFileId +pdfStored +pdfMimeType");

const result = { migrated: [], missing: [], skipped: [] };
for (const book of books) {
  if (!hasOwnerUploadedPdf(book)) {
    result.skipped.push({ id: String(book._id), title: book.title, reason: "no owner-uploaded PDF" });
    continue;
  }
  const source = localPdfPath(book.pdfPath);
  if (!source) {
    result.missing.push({ id: String(book._id), title: book.title });
    continue;
  }
  if (dryRun) {
    result.skipped.push({ id: String(book._id), title: book.title, source });
    continue;
  }
  const fileId = await storePdfFile({
    path: source,
    filename: path.basename(source),
    originalname: path.basename(source),
    mimetype: book.pdfMimeType || "application/pdf"
  });
  book.pdfFileId = fileId;
  book.pdfStored = true;
  await book.save();
  result.migrated.push({ id: String(book._id), title: book.title, fileId: String(fileId) });
}

console.log(JSON.stringify(result, null, 2));
await mongoose.disconnect();
