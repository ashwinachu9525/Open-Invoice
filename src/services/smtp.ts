import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"

export async function sendVerificationEmail(to: string, otp: string) {
  const host = process.env.APP_SMTP_HOST
  const port = Number(process.env.APP_SMTP_PORT) || 587
  const user = process.env.APP_SMTP_USER
  const pass = process.env.APP_SMTP_PASS
  const from = process.env.APP_SMTP_FROM || user

  if (!host || !user || !pass) {
    console.warn("APP_SMTP environment variables are not configured. Cannot send verification email.")
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  await transporter.sendMail({
    from,
    to,
    subject: "Verify Your Email Address",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8fafc;color:#0f172a;border-radius:12px;border:1px solid #e2e8f0">
        <h2 style="color:#4f46e5;margin:0 0 16px;text-align:center;">Email Verification</h2>
        <p style="margin:0 0 16px;font-size:16px;">Please use the following 6-digit OTP to verify your email address:</p>
        <div style="background:#fff;border:1px solid #e2e8f0;padding:16px;border-radius:8px;text-align:center;font-size:24px;letter-spacing:4px;font-weight:bold;color:#1e293b;margin:0 0 16px;">
          ${otp}
        </div>
        <p style="margin:0;font-size:14px;color:#64748b;">This code will expire in 24 hours.</p>
      </div>
    `,
  })
}
export async function sendPasswordResetEmail(to: string, otp: string) {
  const host = process.env.APP_SMTP_HOST
  const port = Number(process.env.APP_SMTP_PORT) || 587
  const user = process.env.APP_SMTP_USER
  const pass = process.env.APP_SMTP_PASS
  const from = process.env.APP_SMTP_FROM || user

  if (!host || !user || !pass) {
    console.warn("APP_SMTP environment variables are not configured. Cannot send password reset email.")
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  await transporter.sendMail({
    from,
    to,
    subject: "Reset Your Password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8fafc;color:#0f172a;border-radius:12px;border:1px solid #e2e8f0">
        <h2 style="color:#4f46e5;margin:0 0 16px;text-align:center;">Password Reset</h2>
        <p style="margin:0 0 16px;font-size:16px;">We received a request to reset your password. Use the following 6-digit OTP to set a new password:</p>
        <div style="background:#fff;border:1px solid #e2e8f0;padding:16px;border-radius:8px;text-align:center;font-size:24px;letter-spacing:4px;font-weight:bold;color:#1e293b;margin:0 0 16px;">
          ${otp}
        </div>
        <p style="margin:0;font-size:14px;color:#64748b;">If you didn't request this, you can safely ignore this email.</p>
        <p style="margin:8px 0 0;font-size:14px;color:#64748b;">This OTP will expire in 1 hour.</p>
      </div>
    `,
  })
}

export async function sendPasswordResetSuccessEmail(to: string) {
  const host = process.env.APP_SMTP_HOST
  const port = Number(process.env.APP_SMTP_PORT) || 587
  const user = process.env.APP_SMTP_USER
  const pass = process.env.APP_SMTP_PASS
  const from = process.env.APP_SMTP_FROM || user

  if (!host || !user || !pass) {
    console.warn("APP_SMTP environment variables are not configured. Cannot send password reset success email.")
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  await transporter.sendMail({
    from,
    to,
    subject: "Password Reset Successful",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8fafc;color:#0f172a;border-radius:12px;border:1px solid #e2e8f0">
        <h2 style="color:#10b981;margin:0 0 16px;text-align:center;">Password Reset Successful</h2>
        <p style="margin:0 0 16px;font-size:16px;">Hello,</p>
        <p style="margin:0 0 16px;font-size:16px;">This email is to confirm that the password for your account has been successfully reset.</p>
        <p style="margin:0 0 16px;font-size:16px;">If you did not make this change, please contact our support team immediately to secure your account.</p>
        <p style="margin:0;font-size:14px;color:#64748b;">Thank you.</p>
      </div>
    `,
  })
}

export async function saveEmailSettings(
  companyId: string,
  data: {
    host: string
    port: number
    username: string
    passwordEncrypted: string
    secure: boolean
    fromEmail?: string
    fromName?: string
  }
) {
  await prisma.emailSetting.upsert({
    where: { companyId },
    create: {
      companyId,
      host: data.host,
      port: data.port,
      username: data.username,
      passwordEncrypted: data.passwordEncrypted,
      secure: data.secure,
      fromEmail: data.fromEmail,
      fromName: data.fromName,
    },
    update: {
      host: data.host,
      port: data.port,
      username: data.username,
      passwordEncrypted: data.passwordEncrypted,
      secure: data.secure,
      fromEmail: data.fromEmail,
      fromName: data.fromName,
    },
  })
}

export async function getEmailTransporter(companyId: string) {
  const settings = await prisma.emailSetting.findUnique({ where: { companyId } })
  if (!settings) return null

  const password = decrypt(settings.passwordEncrypted)
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: { user: settings.username, pass: password },
  })
}

export async function testSmtpConnection(
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  const transporter = await getEmailTransporter(companyId)
  if (!transporter) return { success: false, error: "No SMTP settings found — save settings first" }
  try {
    await transporter.verify()
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: msg }
  }
}

export async function sendSmtpTestEmail(
  companyId: string,
  toEmail: string
): Promise<void> {
  const transporter = await getEmailTransporter(companyId)
  const settings = await prisma.emailSetting.findUnique({ where: { companyId } })
  if (!transporter || !settings) throw new Error("No SMTP settings found — save settings first")

  const from = settings.fromEmail
    ? `"${settings.fromName ?? "InvoiceAI"}" <${settings.fromEmail}>`
    : settings.username

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: "✅ InvoiceAI — SMTP Test Email",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f0f1a;color:#e2e8f0;border-radius:12px">
        <h2 style="color:#8b5cf6;margin:0 0 8px">SMTP Connection Verified ✓</h2>
        <p style="color:#94a3b8;margin:0 0 16px">Your SMTP settings are working correctly.</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr><td style="padding:6px 0;color:#64748b">SMTP Host</td><td style="color:#e2e8f0">${settings.host}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Port</td><td style="color:#e2e8f0">${settings.port}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Sender</td><td style="color:#e2e8f0">${from}</td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#475569">Sent from InvoiceAI at ${new Date().toLocaleString("en-IN")}</p>
      </div>
    `,
  })
}

export async function sendInvoiceEmail(params: {
  companyId: string
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
}) {
  const transporter = await getEmailTransporter(params.companyId)
  const settings = await prisma.emailSetting.findUnique({
    where: { companyId: params.companyId },
  })
  if (!transporter || !settings) throw new Error("SMTP not configured")

  await transporter.sendMail({
    from: settings.fromEmail
      ? `"${settings.fromName ?? "Invoice"}" <${settings.fromEmail}>`
      : settings.username,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments,
  })
}
