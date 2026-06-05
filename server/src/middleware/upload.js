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

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const pdfMimeTypes = new Set(["application/pdf", "application/x-pdf", "application/octet-stream"]);
const executableExtensions = new Set([".bat", ".cmd", ".com", ".dll", ".exe", ".hta", ".jar", ".js", ".jse", ".msi", ".ps1", ".scr", ".sh", ".vbs", ".wsf"]);
const maxFiles = 3;
const imageUploadLimit = 2 * 1024 * 1024;
const bookUploadLimit = 150 * 1024 * 1024;

function hasAllowedImageType(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (executableExtensions.has(ext)) return false;
  return imageExtensions.has(ext) && imageMimeTypes.has(file.mimetype);
}

function hasAllowedPdfType(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (executableExtensions.has(ext)) return false;
  return ext === ".pdf" && pdfMimeTypes.has(file.mimetype);
}

function readHeader(file) {
  const descriptor = fs.openSync(file.path, "r");
  try {
    const header = Buffer.alloc(12);
    fs.readSync(descriptor, header, 0, header.length, 0);
    return header;
  } finally {
    fs.closeSync(descriptor);
  }
}

function hasAllowedImageSignature(file) {
  if (file.size > imageUploadLimit) return false;
  const header = readHeader(file);
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = header.subarray(0, 4).toString("ascii") === "RIFF" && header.subarray(8, 12).toString("ascii") === "WEBP";
  return isJpeg || isPng || isWebp;
}

function hasAllowedPdfSignature(file) {
  return readHeader(file).subarray(0, 5).toString("ascii") === "%PDF-";
}

function removeFiles(files) {
  files.forEach((file) => {
    try {
      fs.unlinkSync(file.path);
    } catch {
      // The upload may already have been removed by the platform.
    }
  });
}

function validateUploadedFiles(upload, checks, message) {
  return (req, res, next) => upload(req, res, (error) => {
    if (error) return next(error);
    const files = [
      ...(req.file ? [req.file] : []),
      ...Object.values(req.files || {}).flat()
    ];
    try {
      const invalid = files.find((file) => !checks[file.fieldname]?.(file));
      if (!invalid) return next();
    } catch {
      removeFiles(files);
      const validationError = new Error(message);
      validationError.statusCode = 422;
      return next(validationError);
    }
    removeFiles(files);
    const validationError = new Error(message);
    validationError.statusCode = 422;
    return next(validationError);
  });
}

const bookFilesUpload = multer({
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

const paymentProofUpload = multer({
  storage,
  limits: { fileSize: imageUploadLimit, files: 1, fields: 5, parts: maxFiles + 5 },
  fileFilter: (_req, file, cb) => {
    if (!hasAllowedImageType(file)) return cb(new Error("Payment proof image required"));
    cb(null, true);
  }
}).single("proof");

const orderBookProofUpload = multer({
  storage,
  limits: { fileSize: imageUploadLimit, files: 1, fields: 12, parts: 14 },
  fileFilter: (_req, file, cb) => {
    if (!hasAllowedImageType(file)) return cb(new Error("Payment proof image required"));
    cb(null, true);
  }
}).single("proof");

const paymentQrUpload = multer({
  storage,
  limits: { fileSize: imageUploadLimit, files: 1, fields: 10, parts: 12 },
  fileFilter: (_req, file, cb) => {
    if (!hasAllowedImageType(file)) return cb(new Error("QR image required"));
    cb(null, true);
  }
}).single("qr");

const quoteImageUpload = multer({
  storage,
  limits: { fileSize: imageUploadLimit, files: 1, fields: 5, parts: maxFiles + 5 },
  fileFilter: (_req, file, cb) => {
    if (!hasAllowedImageType(file)) return cb(new Error("Author image required"));
    cb(null, true);
  }
}).single("authorImage");

export const uploadBookFiles = validateUploadedFiles(bookFilesUpload, {
  cover: hasAllowedImageSignature,
  pdf: hasAllowedPdfSignature
}, "Upload a valid cover image and PDF file");
export const uploadPaymentProof = validateUploadedFiles(paymentProofUpload, { proof: hasAllowedImageSignature }, "Upload a valid payment proof image");
export const uploadOrderBookProof = validateUploadedFiles(orderBookProofUpload, { proof: hasAllowedImageSignature }, "Upload a valid payment proof image");
export const uploadPaymentQr = validateUploadedFiles(paymentQrUpload, { qr: hasAllowedImageSignature }, "Upload a valid QR image");
export const uploadQuoteImage = validateUploadedFiles(quoteImageUpload, { authorImage: hasAllowedImageSignature }, "Upload a valid author image");
