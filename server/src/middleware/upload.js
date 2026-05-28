import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const uploadRoot = process.env.UPLOAD_DIR || "uploads";
const coverDir = path.join(uploadRoot, "covers");
const pdfDir = path.join(uploadRoot, "pdfs");
const paymentDir = path.join(uploadRoot, "payments");
const paymentProofDir = path.join(uploadRoot, "payment-proofs");
const paymentQrDir = path.join(uploadRoot, "payment-qrs");
const quoteDir = path.join(uploadRoot, "quotes");
fs.mkdirSync(coverDir, { recursive: true });
fs.mkdirSync(pdfDir, { recursive: true });
fs.mkdirSync(paymentDir, { recursive: true });
fs.mkdirSync(paymentProofDir, { recursive: true });
fs.mkdirSync(paymentQrDir, { recursive: true });
fs.mkdirSync(quoteDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, file, cb) => cb(null, file.fieldname === "pdf" ? pdfDir : file.fieldname === "proof" ? paymentProofDir : file.fieldname === "qr" ? paymentQrDir : file.fieldname === "authorImage" ? quoteDir : coverDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${ext}`);
  }
});

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const pdfMimeTypes = new Set(["application/pdf", "application/x-pdf", "application/octet-stream"]);
const maxFiles = 3;
const bookUploadLimit = 150 * 1024 * 1024;

function hasAllowedImageType(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  return imageExtensions.has(ext) && imageMimeTypes.has(file.mimetype);
}

function hasAllowedPdfType(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  return ext === ".pdf" && pdfMimeTypes.has(file.mimetype);
}

export const uploadBookFiles = multer({
  storage,
  limits: { fileSize: bookUploadLimit, files: 2, fields: 20, parts: 24 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === "pdf" && !hasAllowedPdfType(file)) return cb(new Error("PDF file required"));
    if (file.fieldname === "cover" && !hasAllowedImageType(file)) return cb(new Error("Image cover required"));
    cb(null, true);
  }
}).fields([
  { name: "cover", maxCount: 1 },
  { name: "pdf", maxCount: 1 }
]);

export const uploadPaymentProof = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5, parts: maxFiles + 5 },
  fileFilter: (_req, file, cb) => {
    if (!hasAllowedImageType(file)) return cb(new Error("Payment proof image required"));
    cb(null, true);
  }
}).single("proof");

export const uploadOrderBookProof = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 12, parts: 14 },
  fileFilter: (_req, file, cb) => {
    if (!hasAllowedImageType(file)) return cb(new Error("Payment proof image required"));
    cb(null, true);
  }
}).single("proof");

export const uploadPaymentQr = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5, parts: maxFiles + 5 },
  fileFilter: (_req, file, cb) => {
    if (!hasAllowedImageType(file)) return cb(new Error("QR image required"));
    cb(null, true);
  }
}).single("qr");

export const uploadQuoteImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5, parts: maxFiles + 5 },
  fileFilter: (_req, file, cb) => {
    if (!hasAllowedImageType(file)) return cb(new Error("Author image required"));
    cb(null, true);
  }
}).single("authorImage");
