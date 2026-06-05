import Visitor from "../models/Visitor.js";

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || "";
}

export async function trackVisit(req, res) {
  const visitorId = String(req.body.visitorId || "").trim().slice(0, 120);
  const page = String(req.body.page || req.originalUrl || "").trim().slice(0, 300);
  if (!visitorId || !page) return res.status(422).json({ message: "Visitor id and page are required" });

  await Visitor.create({
    visitorId,
    user: req.user?._id,
    ip: clientIp(req),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
    page,
    referrer: String(req.body.referrer || "").slice(0, 500),
    screen: String(req.body.screen || "").slice(0, 40),
    language: String(req.body.language || "").slice(0, 80)
  });

  res.setHeader("X-Privacy-Policy-Version", process.env.PRIVACY_POLICY_VERSION || "draft");
  res.status(201).json({ ok: true });
}
