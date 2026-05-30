import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Order from "../models/Order.js";

const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "uploads");

function findProofFile(filePath) {
  const normalizedPath = String(filePath || "").replaceAll("\\", "/");
  const uploadIndex = normalizedPath.lastIndexOf("uploads/");
  const uploadRelativePath = uploadIndex >= 0 ? normalizedPath.slice(uploadIndex + "uploads/".length) : "";
  const candidates = [
    path.resolve(normalizedPath),
    uploadRelativePath ? path.resolve(uploadRoot, uploadRelativePath) : "",
    path.resolve(uploadRoot, "payment-proofs", path.basename(normalizedPath)),
    path.resolve(uploadRoot, "payments", path.basename(normalizedPath))
  ].filter(Boolean);

  return [...new Set(candidates)].find((candidate) =>
    candidate.startsWith(`${uploadRoot}${path.sep}`) && fs.existsSync(candidate)
  );
}

function mimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  return "image/jpeg";
}

async function migratePaymentProofs() {
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || undefined
  });

  const orders = await Order.find({
    paymentProof: { $exists: true, $ne: "" },
    $or: [
      { paymentProofData: { $exists: false } },
      { paymentProofData: null }
    ]
  }).select("paymentProof paymentProofMimeType +paymentProofData");

  let migrated = 0;
  let missing = 0;
  for (const order of orders) {
    const absolute = findProofFile(order.paymentProof);
    if (!absolute) {
      missing += 1;
      console.warn(`Missing payment proof for order ${order._id}`);
      continue;
    }
    order.paymentProofData = await fs.promises.readFile(absolute);
    order.paymentProofMimeType ||= mimeType(absolute);
    await order.save();
    migrated += 1;
    console.log(`Migrated payment proof for order ${order._id}`);
  }

  console.log(`Payment proof migration complete: ${migrated} migrated, ${missing} missing`);
  await mongoose.disconnect();
}

migratePaymentProofs().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
