import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"
import {
  buildModernEmailShell,
  buildModernCampaignEmailHtml,
  buildModernInvoiceEmailHtml,
  buildModernQuotationEmailHtml,
  buildModernPaymentReceiptEmailHtml,
  escapeHtml,
} from "./email-templates"

export {
  buildModernEmailShell,
  buildModernCampaignEmailHtml,
  buildModernInvoiceEmailHtml,
  buildModernQuotationEmailHtml,
  buildModernPaymentReceiptEmailHtml,
}

export function buildEmailLayout(
  title: string,
  bodyContent: string,
  options?: {
    badgeText?: string
    badgeColor?: "indigo" | "emerald" | "amber" | "rose" | "slate"
    companyName?: string
  }
) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Open Invoice"
  return buildModernEmailShell({
    title,
    badgeText: options?.badgeText || "SYSTEM NOTICE",
    badgeColor: options?.badgeColor || "indigo",
    companyName: options?.companyName || appName,
    appName,
    contentHtml: `
      <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 800; color: #0f172a; text-align: center; letter-spacing: -0.3px;">
        ${escapeHtml(title)}
      </h1>
      <div style="font-size: 15px; color: #334155; line-height: 1.7; text-align: left;">
        ${bodyContent}
      </div>
    `,
  })
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
    subject: `Verify your email address - ${appName}`,
    html: buildEmailLayout(
      `Verify your ${appName} account`,
      `
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        We received a sign-up attempt for your email. Please enter the verification code below in your browser window to complete your registration.
      </p>
      
      <div style="background-color: #eef2ff; border: 1.5px dashed #6366f1; border-radius: 12px; padding: 24px 20px; font-size: 34px; font-weight: 800; color: #312e81; letter-spacing: 8px; font-family: 'SF Mono', Monaco, Consolas, monospace; text-align: center; margin: 24px 0;">
        ${otp}
      </div>

      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
        If you did not initiate this request, you can safely ignore this email. This verification code is valid for 24 hours.
      </p>
      `,
      { badgeText: "SECURITY VERIFICATION", badgeColor: "indigo" }
    ),
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
    html: buildEmailLayout(
      `Reset your password`,
      `
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        We received a request to reset your password. Please enter the secure one-time verification code below to set a new password.
      </p>
      
      <div style="background-color: #eef2ff; border: 1.5px dashed #6366f1; border-radius: 12px; padding: 24px 20px; font-size: 34px; font-weight: 800; color: #312e81; letter-spacing: 8px; font-family: 'SF Mono', Monaco, Consolas, monospace; text-align: center; margin: 24px 0;">
        ${otp}
      </div>

      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
        If you did not request a password reset, you can safely ignore this email. This code will expire in 1 hour.
      </p>
      `,
      { badgeText: "PASSWORD RESET", badgeColor: "amber" }
    ),
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
    html: buildEmailLayout(
      "Password Reset Successful",
      `
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        Your account password has been successfully reset. You can now log into your account using your new password.
      </p>
      
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px; font-size: 15px; font-weight: 600; color: #065f46; margin: 24px 0; text-align: center;">
        &#10003; Your account credentials have been updated securely.
      </div>

      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
        If you did not authorize this change, please contact our support team immediately.
      </p>
      `,
      { badgeText: "SECURITY ALERT", badgeColor: "emerald" }
    ),
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
    subject: "✅ SMTP Test Email - Connection Verified",
    html: buildEmailLayout(
      "SMTP Connection Verified",
      `
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        Hello <strong>${escapeHtml(settings.fromName ?? "Admin")}</strong>,<br/>
        Your SMTP settings have been successfully tested and verified. Outbound email delivery is fully active.
      </p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; text-align: left; margin: 20px 0;">
        <h3 style="margin: 0 0 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">Connection Details</h3>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; color: #334155;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">SMTP Host</td>
            <td align="right" style="padding: 6px 0; font-weight: 600; font-family: monospace; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${escapeHtml(settings.host)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Port</td>
            <td align="right" style="padding: 6px 0; font-weight: 600; font-family: monospace; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${settings.port}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Sender Identity</td>
            <td align="right" style="padding: 6px 0; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${escapeHtml(from)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Connection Status</td>
            <td align="right" style="padding: 6px 0; font-weight: 700; color: #059669;">&#10003; Online &amp; Authenticated</td>
          </tr>
        </table>
      </div>

      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
        You can now dispatch professional invoices, quotations, and marketing campaigns directly to your clients.
      </p>
      `,
      { badgeText: "SMTP ACTIVE", badgeColor: "emerald", companyName: settings.fromName || undefined }
    ),
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

  // Ensure HTML is wrapped in a modern shell if caller supplied an unformatted fragment
  let finalHtml = params.html
  if (!params.html.includes("<!DOCTYPE") && !params.html.includes("<html")) {
    finalHtml = buildEmailLayout(params.subject, params.html, {
      badgeText: "INVOICE",
      badgeColor: "indigo",
      companyName: settings.fromName || undefined,
    })
  }

  try {
    await transporter.sendMail({
      from: settings.fromEmail
        ? `"${settings.fromName ?? "Invoice"}" <${settings.fromEmail}>`
        : settings.username,
      to: params.to,
      subject: params.subject,
      html: finalHtml,
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

  // Ensure HTML is wrapped in a modern shell if caller supplied an unformatted fragment
  let finalHtml = params.html
  if (!params.html.includes("<!DOCTYPE") && !params.html.includes("<html")) {
    finalHtml = buildEmailLayout(params.subject, params.html, {
      badgeText: "QUOTATION",
      badgeColor: "indigo",
      companyName: settings.fromName || undefined,
    })
  }

  try {
    await transporter.sendMail({
      from: settings.fromEmail
        ? `"${settings.fromName ?? "Quotation"}" <${settings.fromEmail}>`
        : settings.username,
      to: params.to,
      subject: params.subject,
      html: finalHtml,
      attachments: params.attachments,
    })
  } catch (error) {
    status = "failed"
    errorMessage = error instanceof Error ? error.message : String(error)
    throw error // Re-throw so caller knows it failed
  } finally {
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

export async function sendCrmCampaignEmail(params: {
  companyId: string
  to: string
  recipientName?: string
  subject: string
  content: string
  buttonText?: string | null
  buttonUrl?: string | null
  campaignId?: string
  leadId?: string
  customerId?: string
}): Promise<{ success: boolean; error?: string; logId?: string }> {
  const appUrl = (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "")
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Open Invoice"

  // Resolve dynamic button & target link
  const rawButtonText = params.buttonText?.trim() || null
  const rawButtonUrl = params.buttonUrl?.trim() || null
  const resolvedTargetUrl = rawButtonUrl && rawButtonUrl.length > 0 ? rawButtonUrl : appUrl
  const resolvedButtonText = rawButtonText

  const settings = await prisma.emailSetting.findUnique({
    where: { companyId: params.companyId },
  })

  let transporter: nodemailer.Transporter | null = null
  let from = ""

  if (settings) {
    try {
      const password = decrypt(settings.passwordEncrypted, params.companyId)
      transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        auth: { user: settings.username, pass: password },
        connectionTimeout: 10000,
      })
      from = settings.fromEmail
        ? `"${settings.fromName ?? "Sales Team"}" <${settings.fromEmail}>`
        : settings.username
    } catch (e: any) {
      console.warn("Failed to initialize company SMTP transporter:", e.message)
    }
  }

  // Fallback to system APP_SMTP_* if company SMTP is not configured or failed
  if (!transporter) {
    const host = process.env.APP_SMTP_HOST
    const user = process.env.APP_SMTP_USER
    const pass = process.env.APP_SMTP_PASS
    const port = Number(process.env.APP_SMTP_PORT) || 587
    if (host && user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        connectionTimeout: 10000,
      })
      from = process.env.APP_SMTP_FROM || user
    }
  }

  if (!transporter) {
    const errMsg = "SMTP not configured. Please configure your email sender settings under Settings > Email Settings."
    try {
      const failedLog = await prisma.crmEmailLog.create({
        data: {
          companyId: params.companyId,
          campaignId: params.campaignId || null,
          leadId: params.leadId || null,
          customerId: params.customerId || null,
          toEmail: params.to,
          recipientName: params.recipientName || null,
          subject: params.subject,
          bodyPreview: params.content.slice(0, 300),
          buttonText: resolvedButtonText,
          buttonUrl: resolvedButtonText ? resolvedTargetUrl : null,
          status: "FAILED",
          error: errMsg,
        },
      })
      return { success: false, error: errMsg, logId: failedLog.id }
    } catch (logErr) {
      console.warn("Failed to write CRM email log:", logErr)
    }
    return { success: false, error: errMsg }
  }

  // Create pending CrmEmailLog first so we have the unique ID for open/click tracking
  let emailLog: any
  try {
    emailLog = await prisma.crmEmailLog.create({
      data: {
        companyId: params.companyId,
        campaignId: params.campaignId || null,
        leadId: params.leadId || null,
        customerId: params.customerId || null,
        toEmail: params.to,
        recipientName: params.recipientName || null,
        subject: params.subject,
        bodyPreview: params.content.slice(0, 300),
        buttonText: resolvedButtonText,
        buttonUrl: resolvedButtonText ? resolvedTargetUrl : null,
        status: "SENDING",
        error: null,
      },
    })
  } catch (err: any) {
    console.warn("Failed to create pre-dispatch CRM email log:", err)
    return { success: false, error: "Failed to initialize email tracking log." }
  }

  // Tracking URLs
  const openTrackingUrl = `${appUrl}/api/crm/track/open?logId=${emailLog.id}`
  const clickTrackingUrl = `${appUrl}/api/crm/track/click?logId=${emailLog.id}&target=${encodeURIComponent(resolvedTargetUrl)}`

  // Format HTML body with Modern Template, Dynamic CTA Button, and Open Tracking Pixel
  const formattedHtml = buildModernCampaignEmailHtml({
    companyName: settings?.fromName || appName,
    subject: params.subject,
    content: params.content,
    recipientName: params.recipientName,
    buttonText: resolvedButtonText,
    clickTrackingUrl: resolvedButtonText ? clickTrackingUrl : null,
    openTrackingUrl,
    appName,
  })

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.content + (resolvedButtonText ? `\n\n${resolvedButtonText}: ${resolvedTargetUrl}` : ""),
      html: formattedHtml,
    })

    await prisma.crmEmailLog.update({
      where: { id: emailLog.id },
      data: {
        status: "SENT",
        error: null,
      },
    })

    return { success: true, logId: emailLog.id }
  } catch (sendErr: any) {
    const errorDetail = sendErr?.message || String(sendErr)
    console.error("sendCrmCampaignEmail dispatch error:", sendErr)

    try {
      await prisma.crmEmailLog.update({
        where: { id: emailLog.id },
        data: {
          status: "FAILED",
          error: errorDetail,
        },
      })
    } catch (logErr) {
      console.warn("Failed to write CRM email failure log:", logErr)
    }

    return { success: false, error: errorDetail, logId: emailLog.id }
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
  const appUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "")

  await transporter.sendMail({
    from,
    to,
    subject: `Welcome to ${appName}!`,
    html: buildEmailLayout(
      `Welcome, ${escapeHtml(name)}!`,
      `
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.7;">
        We're thrilled to have you join <strong>${appName}</strong>! Your account is active and ready to streamline your invoices, track real-time payments, and run automated CRM email campaigns.
      </p>
      
      <div style="text-align: center; margin: 32px 0 28px 0;">
        <a href="${appUrl}/dashboard" style="display: inline-block; background-color: #4f46e5; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff !important; padding: 15px 36px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.35);">
          Launch Dashboard &rarr;
        </a>
      </div>

      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
        Need any assistance getting started? Our support team is here to help you configure your taxes, payment gateways, and templates.
      </p>
      `,
      { badgeText: "WELCOME ABOARD", badgeColor: "indigo" }
    ),
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

  const appUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "")

  await transporter.sendMail({
    from,
    to,
    subject: `Your Free Trial Expires in ${daysLeft} ${daysLeft === 1 ? 'Day' : 'Days'}`,
    html: buildEmailLayout(
      "Trial Expiration Notice",
      `
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        This is a friendly reminder that the 30-day Free Trial for <strong>${escapeHtml(companyName)}</strong> will expire in <strong>${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}</strong>.
      </p>
      
      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; color: #92400e; margin: 20px 0; text-align: center; font-size: 14px; line-height: 1.6;">
        To keep enjoying unlimited invoice creation, automated recurring scheduling, CRM analytics, and team collaboration, upgrade to the Pro plan today.
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${appUrl}/settings" style="display: inline-block; background-color: #4f46e5; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff !important; padding: 15px 36px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.35);">
          Upgrade to Pro &rarr;
        </a>
      </div>

      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
        If you have any questions or require custom enterprise terms, reply directly to this email.
      </p>
      `,
      { badgeText: "SUBSCRIPTION REMINDER", badgeColor: "amber", companyName }
    ),
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

  const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
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
    html: buildEmailLayout(
      `Join ${escapeHtml(params.companyName)}`,
      `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        <strong>${escapeHtml(params.inviterName)}</strong> has invited you to collaborate on
        <strong>${escapeHtml(params.companyName)}</strong> as
        <strong style="color: #4f46e5;">${escapeHtml(roleLabel)}</strong>.
      </p>

      <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.6;">
        Click the button below to accept your invitation and access the organization dashboard.
      </p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${inviteUrl}" style="display: inline-block; background-color: #4f46e5; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff !important; padding: 15px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.35);">
          Accept Invitation &rarr;
        </a>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: left; margin: 0 0 24px 0;">
        <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px;">Invitation Details</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #334155;">
          <tr>
            <td style="padding: 5px 0; color: #64748b; width: 40%;">Company</td>
            <td style="padding: 5px 0; font-weight: 600; color: #0f172a;">${escapeHtml(params.companyName)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;">Assigned Role</td>
            <td style="padding: 5px 0; font-weight: 600; color: #0f172a;">${escapeHtml(roleLabel)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;">Invited By</td>
            <td style="padding: 5px 0; font-weight: 600; color: #0f172a;">${escapeHtml(params.inviterName)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b;">Link Validity</td>
            <td style="padding: 5px 0; font-weight: 600; color: #0f172a;">7 days from issuance</td>
          </tr>
        </table>
      </div>

      <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
        If you weren't expecting this invitation, you can safely ignore this email.<br/>
        Direct Link: <a href="${inviteUrl}" style="color: #4f46e5; word-break: break-all;">${inviteUrl}</a>
      </p>
      `,
      { badgeText: "TEAM INVITATION", badgeColor: "indigo", companyName: params.companyName }
    ),
  })
}


