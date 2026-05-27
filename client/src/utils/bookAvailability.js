const SEEDED_WITHOUT_OWNER_PDF = new Set([
  "कावर टाइम्स",
  "कावर टाईम्स",
  "ग्रामसभा से लोकसभा: रामजीवन सिंह",
  "नील से नीलहे तक",
  "जयमंगला गढ़ का इतिहास व अध्यात्म"
]);

export function isBookPdfAvailable(book) {
  if (!book) return false;
  if (typeof book.pdfAvailable === "boolean") return book.pdfAvailable;
  return !SEEDED_WITHOUT_OWNER_PDF.has(book.title);
}

export const ownerUploadMessage = "Not uploaded by owner";
