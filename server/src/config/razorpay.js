import Razorpay from "razorpay";

function cleanSecret(value) {
  return String(value || "").replace(/\s+/g, "");
}

export function getRazorpayKeyId() {
  return cleanSecret(process.env.RAZORPAY_KEY_ID);
}

export function getRazorpayKeySecret() {
  return cleanSecret(process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayWebhookSecret() {
  return cleanSecret(process.env.RAZORPAY_WEBHOOK_SECRET);
}

export function getRazorpay() {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  if (!keyId || !keySecret) return null;
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
}
