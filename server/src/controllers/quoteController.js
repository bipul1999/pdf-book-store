import QuoteSetting from "../models/QuoteSetting.js";

function fileUrl(req, filePath) {
  if (!filePath?.startsWith("uploads")) return filePath;
  const normalized = filePath.replaceAll("\\", "/").replace("uploads/quotes/", "");
  return `${req.protocol}://${req.get("host")}/uploads/quotes/${normalized}`;
}

function defaultQuote() {
  return {
    quote: "किताबें केवल शब्द नहीं होतीं, वे जीवन को समझने की एक शांत रोशनी होती हैं।",
    authorName: "महेश भारती",
    authorImage: "",
    isActive: true
  };
}

export async function getQuoteSetting(req, res) {
  const setting = await QuoteSetting.findOne({ isActive: true }).sort("-updatedAt");
  const quote = setting ? setting.toObject() : defaultQuote();
  res.json({ quote: { ...quote, authorImage: fileUrl(req, quote.authorImage) } });
}

export async function updateQuoteSetting(req, res) {
  const setting = await QuoteSetting.findOneAndUpdate(
    {},
    {
      quote: req.body.quote || defaultQuote().quote,
      authorName: req.body.authorName || defaultQuote().authorName,
      isActive: req.body.isActive === undefined ? true : req.body.isActive === "true" || req.body.isActive === true,
      ...(req.file ? { authorImage: req.file.path } : {})
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ quote: { ...setting.toObject(), authorImage: fileUrl(req, setting.authorImage) } });
}
