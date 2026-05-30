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
    if (process.env.NODE_ENV !== "production") console.log(html);
    return false;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS.replace(/\s+/g, "");
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || smtpUser,
    to,
    subject,
    html
  });
  return true;
}
