function normalizeIndianPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return "";
}

export function isSmsConfigured() {
  return Boolean(process.env.FAST2SMS_API_KEY);
}

export async function sendOtpSms({ phone, code }) {
  if (!isSmsConfigured()) return false;

  const number = normalizeIndianPhone(phone);
  if (!number) return false;

  const body = new URLSearchParams({
    variables_values: code,
    route: "otp",
    numbers: number
  });

  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: process.env.FAST2SMS_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    signal: AbortSignal.timeout(10000)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.return === false) {
    throw new Error(data.message || `SMS provider failed with ${response.status}`);
  }

  return true;
}
