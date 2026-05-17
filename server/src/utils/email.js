import nodemailer from "nodemailer";

export function isEmailConfigured() {
  const required = [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASS];
  if (required.some((value) => !value)) return false;
  if (process.env.SMTP_USER === "yourgmail@gmail.com") return false;
  if (process.env.SMTP_PASS === "your-gmail-app-password") return false;
  return true;
}

export async function sendEmail({ to, subject, html }) {
  if (!isEmailConfigured()) {
    console.log(`Email skipped for ${to}: ${subject}`);
    console.log(html);
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html
  });
  return true;
}
