import fs from "fs";
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";

function pdfBucket() {
  if (!mongoose.connection.db) throw new Error("Database not connected");
  return new GridFSBucket(mongoose.connection.db, { bucketName: "bookPdfs" });
}

export function storePdfFile(file) {
  const bucket = pdfBucket();
  return new Promise((resolve, reject) => {
    const upload = bucket.openUploadStream(file.filename || file.originalname, {
      contentType: file.mimetype || "application/pdf",
      metadata: {
        originalName: file.originalname,
        path: file.path
      }
    });

    fs.createReadStream(file.path)
      .on("error", reject)
      .pipe(upload)
      .on("error", reject)
      .on("finish", () => resolve(upload.id));
  });
}

export function openStoredPdf(fileId) {
  return pdfBucket().openDownloadStream(new mongoose.Types.ObjectId(fileId));
}

export async function deleteStoredPdf(fileId) {
  if (!fileId) return;
  try {
    await pdfBucket().delete(new mongoose.Types.ObjectId(fileId));
  } catch (error) {
    if (error?.code !== "ENOENT") console.error(`PDF GridFS cleanup failed for ${fileId}:`, error.message);
  }
}
