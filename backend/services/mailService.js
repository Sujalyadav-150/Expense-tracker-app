const RESET_SUBJECT = "Reset your Expense Tracker password";

function envValue(name) {
  const raw = process.env[name];
  return raw === undefined || raw === null ? "" : String(raw).trim();
}

function getSmtpConfiguration() {
  const host = envValue("SMTP_HOST");
  if (!host) return null;

  const port = Number(envValue("SMTP_PORT") || 587);
  const safePort = Number.isFinite(port) && port > 0 ? port : 587;
  const user = envValue("SMTP_USER");
  const pass = envValue("SMTP_PASS");

  return {
    host,
    port: safePort,
    secure: envValue("SMTP_SECURE").toLowerCase() === "true" || safePort === 465,
    auth: user ? { user, pass } : undefined
  };
}

function getTransporter() {
  const config = getSmtpConfiguration();
  if (!config) return null;

  const nodemailer = require("nodemailer");
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildResetEmail({ name, resetUrl, expiresInMinutes = 15 }) {
  const safeName = String(name || "there").trim() || "there";
  const safeUrl = String(resetUrl || "");
  const minutes = Number(expiresInMinutes) > 0 ? Number(expiresInMinutes) : 15;
  const text = [
    `Hello ${safeName},`,
    "",
    "We received a request to reset the password for your Expense Tracker account.",
    `Open the link below within ${minutes} minutes to choose a new password:`,
    "",
    safeUrl,
    "",
    "This link can be used only once. If you did not request a password reset,",
    "you can safely ignore this email; your password will stay unchanged."
  ].join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6">
    <p>Hello ${escapeHtml(safeName)},</p>
    <p>We received a request to reset the password for your Expense Tracker account.</p>
    <p><a href="${escapeHtml(safeUrl)}">Reset my password</a></p>
    <p>This link expires in ${minutes} minutes and can be used only once.</p>
    <p>If you did not request a password reset, you can safely ignore this email.</p>
  </body>
</html>`;

  return { subject: RESET_SUBJECT, text, html };
}

async function sendPasswordResetEmail({ to, name, resetUrl, expiresInMinutes = 15 }) {
  const recipient = String(to || "").trim().toLowerCase();
  if (!recipient || !resetUrl) return { delivered: false };

  try {
    const transporter = getTransporter();
    if (!transporter) return { delivered: false };

    const { subject, text, html } = buildResetEmail({ name, resetUrl, expiresInMinutes });
    await transporter.sendMail({
      from: envValue("MAIL_FROM") || envValue("SMTP_USER") || "no-reply@expense-tracker.local",
      to: recipient,
      subject,
      text,
      html
    });
    return { delivered: true };
  } catch (error) {
    console.error("[mailService] Password reset email delivery failed.");
    return { delivered: false };
  }
}

module.exports = { sendPasswordResetEmail, buildResetEmail };