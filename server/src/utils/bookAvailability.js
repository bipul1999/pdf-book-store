import fs from "fs";
import path from "path";

const DEMO_PDF_FILENAMES = new Set([
  "digital-product-playbook.pdf",
  "node-api-blueprint.pdf",
  "react-quick-start-pdf.pdf",
  "ux-patterns-for-web-apps.pdf"
]);

export function hasOwnerUploadedPdf(bookOrPath) {
  const pdfPath = typeof bookOrPath === "object" ? bookOrPath?.pdfPath : bookOrPath;
  if (!pdfPath) return false;
  const normalizedPath = String(pdfPath).replaceAll("\\", "/");
  if (typeof bookOrPath === "object" && (bookOrPath?.pdfFileId || bookOrPath?.pdfStored || bookOrPath?.pdfData?.length)) return true;
  if (DEMO_PDF_FILENAMES.has(path.basename(normalizedPath))) return false;

  const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "uploads");
  const uploadIndex = normalizedPath.lastIndexOf("uploads/");
  const uploadRelativePath = uploadIndex >= 0 ? normalizedPath.slice(uploadIndex + "uploads/".length) : "";
  const candidatePaths = [
    path.resolve(normalizedPath),
    uploadRelativePath ? path.resolve(uploadRoot, uploadRelativePath) : "",
    path.resolve(uploadRoot, "pdfs", path.basename(normalizedPath))
  ].filter(Boolean);

  return [...new Set(candidatePaths)].some((absolutePath) =>
    absolutePath.startsWith(`${uploadRoot}${path.sep}`) && fs.existsSync(absolutePath)
  );
}
