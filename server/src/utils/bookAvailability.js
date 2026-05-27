import fs from "fs";
import path from "path";

const DEMO_PDF_FILENAMES = new Set([
  "digital-product-playbook.pdf",
  "node-api-blueprint.pdf",
  "react-quick-start-pdf.pdf",
  "ux-patterns-for-web-apps.pdf"
]);

export function hasOwnerUploadedPdf(pdfPath) {
  if (!pdfPath) return false;
  const normalizedPath = String(pdfPath).replaceAll("\\", "/");
  if (DEMO_PDF_FILENAMES.has(path.basename(normalizedPath))) return false;

  const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "uploads");
  const absolutePath = path.resolve(normalizedPath);
  return absolutePath.startsWith(`${uploadRoot}${path.sep}`) && fs.existsSync(absolutePath);
}
