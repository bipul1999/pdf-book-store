import { logRequestEvent } from "../utils/logger.js";

const blockedUploadExtensions = new Set([
  ".bat", ".cmd", ".com", ".dll", ".exe", ".hta", ".jar", ".js", ".jse",
  ".msi", ".ps1", ".scr", ".sh", ".vbs", ".wsf"
]);

function hasUnsafeKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasUnsafeKey);
  return Object.entries(value).some(([key, nested]) =>
    key.startsWith("$") || key.includes(".") || hasUnsafeKey(nested)
  );
}

export function rejectNoSqlOperators(req, res, next) {
  if (hasUnsafeKey(req.body) || hasUnsafeKey(req.query) || hasUnsafeKey(req.params)) {
    logRequestEvent("security", "blocked_nosql_operator", req);
    return res.status(400).json({ message: "Invalid request" });
  }
  next();
}

export function blockPdfDirectAccess(req, res, next) {
  const path = req.path.replaceAll("\\", "/").toLowerCase();
  if (path.startsWith("/uploads/pdfs/") || path.includes("/../uploads/pdfs/")) {
    logRequestEvent("security", "blocked_direct_pdf_access", req);
    return res.status(404).json({ message: "Not found" });
  }
  next();
}

export function blockExecutableUploadNames(req, res, next) {
  if (!["POST", "PUT", "PATCH"].includes(req.method)) return next();

  const contentDisposition = String(req.headers["content-disposition"] || "").toLowerCase();
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  const isMultipartUpload = contentType.startsWith("multipart/form-data");
  const hasTopLevelFilename = /filename\*?=/.test(contentDisposition);
  if (!isMultipartUpload && !hasTopLevelFilename) return next();

  const suspiciousFilename = [...blockedUploadExtensions].some((ext) =>
    new RegExp(`filename\\*?=[^;]*\\${ext}(?:"|;|$)`).test(contentDisposition)
  );
  const suspiciousContentType = [
    "application/x-msdownload",
    "application/javascript",
    "application/x-javascript",
    "application/ecmascript",
    "application/x-sh",
    "application/x-csh",
    "application/x-msdos-program",
    "application/x-executable"
  ].some((blockedType) => contentType.startsWith(blockedType));
  if (suspiciousFilename || suspiciousContentType) {
    logRequestEvent("security", "blocked_executable_upload_hint", req);
    return res.status(422).json({ message: "Executable uploads are not allowed" });
  }
  next();
}

export function auditAdminActivity(req, res, next) {
  if (req.user?.role === "admin" && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    res.on("finish", () => {
      logRequestEvent("admin", "admin_activity", req, { statusCode: res.statusCode });
    });
  }
  next();
}
