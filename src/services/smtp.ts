import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"

function buildEmailLayout(title: string, bodyContent: string) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Open Invoice"
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px 20px; -webkit-font-smoothing: antialiased; line-height: 1.6; color: #111827;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 48px; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
    
    <!-- Header Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h2 style="margin: 0; font-size: 28px; font-weight: 800; color: #111827; display: inline-flex; align-items: center; gap: 8px;">
        <span style="color: #4f46e5; font-size: 24px;">&#9632;</span> ${appName}
      </h2>
    </div>
    
    <!-- Title -->
    <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 700; text-align: center; color: #111827;">
      ${title}
    </h1>

    <!-- Body -->
    <div style="font-size: 15px; color: #4b5563; text-align: center;">
      ${bodyContent}
    </div>

    <!-- Footer -->
    <div style="margin-top: 48px; text-align: center;">
      <hr style="border: none; border-top: 1px solid #e5e7eb; width: 80%; margin: 0 auto 32px auto;" />
      <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">${appName}, an effortless solution with all the features you need.</p>
      <p style="margin: 0; color: #9ca3af; font-size: 13px;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

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
    connectionTimeout: 5000, // 5 seconds
    greetingTimeout: 5000,
    socketTimeout: 5000,
  })

  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Open Invoice"

  await transporter.sendMail({
    from,
    to,
    subject: "Verify your email address",
    html: buildEmailLayout(`Verify your ${appName} sign-up`, `
      <p style="margin: 0 0 24px; line-height: 1.6;">We have received a sign-up attempt with the following code. Please enter it in the browser window where you started signing up for ${appName}.</p>
      <div style="background-color: #f3f4f6; border-radius: 12px; padding: 32px; font-size: 36px; font-weight: 700; color: #111827; letter-spacing: 4px; margin: 0 0 24px;">
        ${otp}
      </div>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">If you did not attempt to sign up but received this email, please disregard it. The code will remain active for 24 hours.</p>
    `),
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
    subject: "Reset your password",
    html: buildEmailLayout(`Reset your password`, `
      <p style="margin: 0 0 24px; line-height: 1.6;">We received a request to reset your password. Please use the following code to set a new password.</p>
      <div style="background-color: #f3f4f6; border-radius: 12px; padding: 32px; font-size: 36px; font-weight: 700; color: #111827; letter-spacing: 4px; margin: 0 0 24px;">
        ${otp}
      </div>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">If you didn't request this, you can safely disregard this email. This code will remain active for 1 hour.</p>
    `),
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
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  })

  await transporter.sendMail({
    from,
    to,
    subject: "Password reset successful",
    html: buildEmailLayout("Password Reset Successful", `
      <p style="margin: 0 0 24px; line-height: 1.6;">Your password has been successfully reset. You can now log in using your new password.</p>
      <div style="background-color: #ecfdf5; border-radius: 12px; padding: 24px; font-size: 16px; font-weight: 500; color: #065f46; margin: 0 0 24px; text-align: center;">
        Your account is fully secure.
      </div>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">If you did not make this change, please contact our support team immediately.</p>
    `),
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

  const password = decrypt(settings.passwordEncrypted, companyId)
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
    subject: "✅ SMTP Test Email",
    html: buildEmailLayout("SMTP Connection Verified", `
      <p style="margin: 0 0 24px; line-height: 1.6;">Hello ${settings.fromName ?? "Admin"},<br/>Your SMTP settings have been successfully verified.</p>
      
      <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; text-align: left; margin: 0 0 24px;">
        <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #4b5563;">Connection Details</h3>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 12px;">
          <span style="color: #6b7280; font-size: 14px;">SMTP Host</span>
          <span style="font-weight: 500; color: #111827; font-size: 14px;">${settings.host}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 12px;">
          <span style="color: #6b7280; font-size: 14px;">Port</span>
          <span style="font-weight: 500; color: #111827; font-size: 14px;">${settings.port}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #6b7280; font-size: 14px;">Sender</span>
          <span style="font-weight: 500; color: #111827; font-size: 14px;">${from.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
        </div>
      </div>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">You are now ready to send invoices and quotations directly from the platform.</p>
    `),
  })
}

export async function sendInvoiceEmail(params: {
  companyId: string
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
  invoiceId?: string
}) {
  const transporter = await getEmailTransporter(params.companyId)
  const settings = await prisma.emailSetting.findUnique({
    where: { companyId: params.companyId },
  })
  if (!transporter || !settings) throw new Error("SMTP not configured")

  let status = "sent"
  let errorMessage: string | undefined = undefined

  try {
    await transporter.sendMail({
      from: settings.fromEmail
        ? `"${settings.fromName ?? "Invoice"}" <${settings.fromEmail}>`
        : settings.username,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    })
  } catch (error) {
    status = "failed"
    errorMessage = error instanceof Error ? error.message : String(error)
    throw error // Re-throw so caller knows it failed
  } finally {
    // Write to EmailLog
    await prisma.emailLog.create({
      data: {
        companyId: params.companyId,
        invoiceId: params.invoiceId,
        to: params.to,
        subject: params.subject,
        status,
        error: errorMessage,
      }
    })
  }
}

export async function sendQuotationEmail(params: {
  companyId: string
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
  quotationId?: string
}) {
  const transporter = await getEmailTransporter(params.companyId)
  const settings = await prisma.emailSetting.findUnique({
    where: { companyId: params.companyId },
  })
  if (!transporter || !settings) throw new Error("SMTP not configured")

  let status = "sent"
  let errorMessage: string | undefined = undefined

  try {
    await transporter.sendMail({
      from: settings.fromEmail
        ? `"${settings.fromName ?? "Quotation"}" <${settings.fromEmail}>`
        : settings.username,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    })
  } catch (error) {
    status = "failed"
    errorMessage = error instanceof Error ? error.message : String(error)
    throw error // Re-throw so caller knows it failed
  } finally {
    // Note: We don't have quotationId in EmailLog schema currently. If we want to log it, we could add it to schema, 
    // or log without linking directly. The schema only has invoiceId. We will just create it without invoiceId or quotationId.
    await prisma.emailLog.create({
      data: {
        companyId: params.companyId,
        to: params.to,
        subject: params.subject,
        status,
        error: errorMessage,
      }
    })
  }
}

export async function sendWelcomeEmail(to: string, name: string) {
  const host = process.env.APP_SMTP_HOST
  const port = Number(process.env.APP_SMTP_PORT) || 587
  const user = process.env.APP_SMTP_USER
  const pass = process.env.APP_SMTP_PASS
  const from = process.env.APP_SMTP_FROM || user

  if (!host || !user || !pass) {
    console.warn("APP_SMTP environment variables are not configured. Cannot send welcome email.")
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  })

  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Open Invoice"

  await transporter.sendMail({
    from,
    to,
    subject: `Welcome to ${appName}!`,
    html: buildEmailLayout(`Welcome, ${name}!`, `
      <p style="margin: 0 0 24px; line-height: 1.6;">We're thrilled to have you on board! ${appName} makes it incredibly simple to manage your invoices, quotations, and customers in one unified workspace.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard" style="background-color: #111827; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 16px;">Go to Dashboard</a>
      </div>

      <p style="margin: 0 0 16px; font-size: 14px; color: #6b7280;">If you need help getting started, our support team is just an email away.</p>
    `),
  })
}

export async function sendTrialReminderEmail(to: string, companyName: string, daysLeft: number) {
  const host = process.env.APP_SMTP_HOST
  const port = Number(process.env.APP_SMTP_PORT) || 587
  const user = process.env.APP_SMTP_USER
  const pass = process.env.APP_SMTP_PASS
  const from = process.env.APP_SMTP_FROM || user

  if (!host || !user || !pass) {
    console.warn("APP_SMTP environment variables are not configured. Cannot send trial reminder email.")
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  })

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

  await transporter.sendMail({
    from,
    to,
    subject: `Your Free Trial Expires in ${daysLeft} ${daysLeft === 1 ? 'Day' : 'Days'}`,
    html: buildEmailLayout("Trial Expiration Reminder", `
      <p style="margin: 0 0 24px; line-height: 1.6;">This is a friendly reminder that the 30-day Free Trial for <strong>${companyName}</strong> will expire in <strong>${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}</strong>.</p>
      
      <div style="background-color: #fef3c7; border-radius: 12px; padding: 24px; color: #92400e; margin: 0 0 32px; text-align: center; font-size: 15px;">
        To keep enjoying unlimited invoice creation, AI assistant insights, and team collaboration, please upgrade to the Pro plan before your trial ends.
      </div>

      <div style="text-align: center; margin: 0 0 32px;">
        <a href="${appUrl}/settings" style="background-color: #111827; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 16px;">Upgrade to Pro</a>
      </div>

      <p style="margin: 0; font-size: 14px; color: #6b7280;">If you have any questions, feel free to reply to this email.</p>
    `),
  })
}

/**
 * Sends a team invitation email to the invitee.
 * Uses the COMPANY's own SMTP settings (Settings → Email/SMTP) — same as invoice emails.
 * Throws if company SMTP is not configured.
 */
export async function sendTeamInviteEmail(params: {
  companyId: string
  to: string
  companyName: string
  inviterName: string
  role: string
  inviteToken: string
}) {
  const transporter = await getEmailTransporter(params.companyId)
  const settings = await prisma.emailSetting.findUnique({ where: { companyId: params.companyId } })

  if (!transporter || !settings) {
    throw new Error(
      "Company SMTP is not configured. Go to Settings → Email / SMTP to set it up before inviting team members."
    )
  }

  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Open Invoice"
  const inviteUrl = `${appUrl}/invite?token=${params.inviteToken}`
  const roleLabel = params.role === "ADMIN" ? "Admin (Full Access)" : "Staff (Invoices Only)"

  const from = settings.fromEmail
    ? `"${settings.fromName ?? params.companyName}" <${settings.fromEmail}>`
    : settings.username

  await transporter.sendMail({
    from,
    to: params.to,
    subject: `You're invited to join ${params.companyName} on ${appName}`,
    html: buildEmailLayout(`Join ${params.companyName}`, `
      <p style="margin: 0 0 16px; line-height: 1.6;">
        <strong>${params.inviterName}</strong> has invited you to join
        <strong>${params.companyName}</strong> on ${appName} as
        <strong>${roleLabel}</strong>.
      </p>

      <p style="margin: 0 0 32px; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Click the button below to accept your invitation. You'll be asked to sign in or
        create a free account if you don't have one yet.
      </p>

      <div style="text-align: center; margin: 0 0 32px;">
        <a href="${inviteUrl}"
          style="background-color: #4f46e5; color: #ffffff; padding: 16px 40px; border-radius: 8px;
                 text-decoration: none; font-weight: 700; display: inline-block; font-size: 16px;
                 letter-spacing: 0.3px;">
          Accept Invitation
        </a>
      </div>

      <div style="background-color: #f9fafb; border-radius: 10px; padding: 20px; text-align: left; margin: 0 0 24px;">
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.8px;">Details</p>
        <table style="width: 100%; font-size: 14px; color: #4b5563; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #9ca3af; width: 40%;">Company</td>
            <td style="padding: 6px 0; font-weight: 500; color: #111827;">${params.companyName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #9ca3af;">Your Role</td>
            <td style="padding: 6px 0; font-weight: 500; color: #111827;">${roleLabel}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #9ca3af;">Invited by</td>
            <td style="padding: 6px 0; font-weight: 500; color: #111827;">${params.inviterName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #9ca3af;">Expires</td>
            <td style="padding: 6px 0; font-weight: 500; color: #111827;">7 days from now</td>
          </tr>
        </table>
      </div>

      <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.6;">
        If you weren't expecting this invitation, you can safely ignore this email.<br/>
        Or copy this link manually: <span style="color: #4f46e5;">${inviteUrl}</span>
      </p>
    `),
  })
}


