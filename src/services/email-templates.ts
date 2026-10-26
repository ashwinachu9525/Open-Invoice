/**
 * Modern, Responsive Email Templates for Open Invoice
 * Bulletproof HTML/CSS compatible with Gmail, Apple Mail, Outlook, and mobile clients.
 */

// Format currency for email with fallback
export function formatEmailCurrency(
  amount: number | null | undefined,
  currency: string = "INR"
): string {
  const val = Number(amount) || 0
  const curr = (currency || "INR").toUpperCase()
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 2,
    }).format(val)
  } catch {
    const symbol = curr === "INR" ? "₹" : curr === "USD" ? "$" : curr === "EUR" ? "€" : curr === "GBP" ? "£" : curr
    return `${symbol} ${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

// Format date for email
export function formatEmailDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// Sanitize HTML text
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Global Modern Email Shell
 * Provides the sleek outer wrapper, top gradient bar, company header, card container, and footer.
 */
export function buildModernEmailShell(params: {
  title: string
  previewText?: string
  badgeText?: string
  badgeColor?: "indigo" | "emerald" | "amber" | "rose" | "slate"
  companyName?: string
  companyLogo?: string | null
  contentHtml: string
  footerNote?: string
  appName?: string
  appUrl?: string
}): string {
  const appName = params.appName || process.env.NEXT_PUBLIC_APP_NAME || "Open Invoice"
  const companyName = params.companyName || appName
  const badgeText = params.badgeText
  const badgeColor = params.badgeColor || "indigo"

  // Badge styles
  const badgeStyles: Record<string, { bg: string; text: string; border: string }> = {
    indigo: { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
    emerald: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
    amber: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
    rose: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
    slate: { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" },
  }
  const currentBadge = badgeStyles[badgeColor] || badgeStyles.indigo

  // Initial for company avatar monogram
  const firstLetter = (companyName.charAt(0) || "O").toUpperCase()

  const logoOrMonogram = params.companyLogo
    ? `<img src="${escapeHtml(params.companyLogo)}" alt="${escapeHtml(companyName)}" height="34" style="max-height: 34px; max-width: 140px; display: block; border: 0; outline: none; object-fit: contain;" />`
    : `
      <table cellpadding="0" cellspacing="0" border="0" style="display: inline-table;">
        <tr>
          <td style="width: 36px; height: 36px; background-color: #4f46e5; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); border-radius: 10px; text-align: center; vertical-align: middle; color: #ffffff; font-weight: 800; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${escapeHtml(firstLetter)}
          </td>
        </tr>
      </table>
    `

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(params.title)}</title>
  ${params.previewText ? `<div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">${escapeHtml(params.previewText)}</div>` : ""}
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      height: 100% !important;
      width: 100% !important;
      background-color: #f8fafc;
    }
    * {
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
      box-sizing: border-box;
    }
    table, td {
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
    }
    table {
      border-spacing: 0 !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      margin: 0 auto !important;
    }
    a {
      text-decoration: none;
    }
    img {
      -ms-interpolation-mode: bicubic;
    }
    @media only screen and (max-width: 620px) {
      .email-container {
        width: 100% !important;
        margin: auto !important;
        border-radius: 0 !important;
        border-left: none !important;
        border-right: none !important;
      }
      .email-body {
        padding: 24px 20px !important;
      }
      .mobile-stack {
        display: block !important;
        width: 100% !important;
      }
      .mobile-space {
        margin-bottom: 12px !important;
      }
    }
  </style>
</head>
<body style="background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; color: #1e293b; line-height: 1.6;">

  <!-- Outer background container -->
  <table width="100%" bgcolor="#f8fafc" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color: #f8fafc; width: 100%; margin: 0; padding: 40px 12px 48px 12px;">
    <tr>
      <td align="center" style="vertical-align: top;">
        
        <!-- Main Card Container -->
        <table class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.07), 0 2px 6px -1px rgba(15, 23, 42, 0.04);">
          
          <!-- Top Accent Gradient Line -->
          <tr>
            <td style="height: 5px; background-color: #4f46e5; background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%); line-height: 5px; font-size: 0;">
              &nbsp;
            </td>
          </tr>

          <!-- Header / Brand Bar -->
          <tr>
            <td style="padding: 28px 36px 20px 36px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          ${logoOrMonogram}
                        </td>
                        <td style="vertical-align: middle;">
                          <span style="font-size: 17px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px; display: block; line-height: 1.2;">
                            ${escapeHtml(companyName)}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  ${
                    badgeText
                      ? `
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: ${currentBadge.bg}; color: ${currentBadge.text}; border: 1px solid ${currentBadge.border}; border-radius: 9999px; padding: 4px 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase;">
                      ${escapeHtml(badgeText)}
                    </span>
                  </td>
                  `
                      : ""
                  }
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td class="email-body" style="padding: 32px 36px 36px 36px; background-color: #ffffff;">
              ${params.contentHtml}
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="padding: 24px 36px 32px 36px; background-color: #fafafa; border-top: 1px solid #f1f5f9; text-align: center;">
              ${
                params.footerNote
                  ? `<p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b; line-height: 1.5;">${params.footerNote}</p>`
                  : ""
              }
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #94a3b8; font-weight: 500;">
                Sent via <strong style="color: #64748b;">${escapeHtml(appName)}</strong> &bull; Intelligent Invoicing &amp; CRM Platform
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                &copy; ${new Date().getFullYear()} ${escapeHtml(companyName)}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Main Card Container -->

      </td>
    </tr>
  </table>

</body>
</html>
  `.trim()
}

/**
 * Builds a modern, neat, and clean Invoice Email HTML.
 */
export function buildModernInvoiceEmailHtml(params: {
  invoice: {
    id: string
    invoiceNumber: string
    date: Date | string
    dueDate: Date | string
    currency?: string | null
    subTotal?: number | null
    totalTax?: number | null
    totalDiscount?: number | null
    cgstAmount?: number | null
    sgstAmount?: number | null
    igstAmount?: number | null
    vatAmount?: number | null
    finalAmount: number
    balanceDue?: number | null
    amountPaid?: number | null
    status?: string | null
    notes?: string | null
    terms?: string | null
    razorpayPaymentLinkUrl?: string | null
    bankName?: string | null
    bankAccountName?: string | null
    bankAccountNumber?: string | null
    bankIfscCode?: string | null
  }
  company: {
    id?: string
    name: string
    logo?: string | null
    email?: string | null
    phone?: string | null
    website?: string | null
    address?: string | null
    gstNumber?: string | null
  }
  customer: {
    name: string
    email?: string | null
    phone?: string | null
    companyName?: string | null
    billingAddress?: string | null
  }
  customMessage?: string | null
  appUrl?: string
}): string {
  const { invoice, company, customer } = params
  const appUrl = (params.appUrl || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "")
  const currency = invoice.currency || "INR"

  // Dates
  const formattedIssueDate = formatEmailDate(invoice.date)
  const formattedDueDate = formatEmailDate(invoice.dueDate)

  // Financials
  const finalAmountStr = formatEmailCurrency(invoice.finalAmount, currency)
  const balanceDueVal = typeof invoice.balanceDue === "number" ? invoice.balanceDue : invoice.finalAmount
  const balanceDueStr = formatEmailCurrency(balanceDueVal, currency)
  const subTotalStr = formatEmailCurrency(invoice.subTotal || invoice.finalAmount, currency)
  const taxStr = formatEmailCurrency(invoice.totalTax || 0, currency)
  const discountStr = invoice.totalDiscount ? formatEmailCurrency(invoice.totalDiscount, currency) : null

  // Status computation
  const isPaid = invoice.status === "PAID" || balanceDueVal <= 0
  const isOverdue = !isPaid && invoice.dueDate && new Date(invoice.dueDate).getTime() < Date.now()

  let statusBadgeColor: "emerald" | "rose" | "amber" | "indigo" = "indigo"
  let statusText = "Payment Pending"
  if (isPaid) {
    statusBadgeColor = "emerald"
    statusText = "Paid in Full"
  } else if (isOverdue) {
    statusBadgeColor = "rose"
    statusText = "Payment Overdue"
  }

  // Payment Link / Portal Link
  const publicInvoiceUrl = invoice.razorpayPaymentLinkUrl || `${appUrl}/p/invoice/${invoice.id}`
  const ctaButtonText = isPaid ? "View Invoice Details" : "View & Pay Invoice Online"

  const contentHtml = `
    <!-- Greeting -->
    <div style="margin-bottom: 24px;">
      <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
        Invoice ${escapeHtml(invoice.invoiceNumber)}
      </h1>
      <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.6;">
        Hello <strong>${escapeHtml(customer.name)}</strong>, please find your invoice details below. A PDF copy has been attached to this email for your records.
      </p>
      ${
        params.customMessage
          ? `<div style="margin-top: 14px; padding: 12px 16px; background-color: #f1f5f9; border-radius: 8px; font-size: 14px; color: #334155; font-style: italic;">
              ${escapeHtml(params.customMessage)}
            </div>`
          : ""
      }
    </div>

    <!-- Hero Card: Amount Due & Status -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin: 0 0 24px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden;">
      <tr>
        <td style="padding: 24px 20px; text-align: center;">
          <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 1px; display: block; margin-bottom: 6px;">
            ${isPaid ? "TOTAL PAID" : "AMOUNT DUE"}
          </span>
          <div style="font-size: 34px; font-weight: 800; color: ${isPaid ? "#059669" : "#0f172a"}; letter-spacing: -0.5px; margin: 0 0 10px 0; line-height: 1.1;">
            ${isPaid ? finalAmountStr : balanceDueStr}
          </div>
          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin: 0 auto;">
            <tr>
              <td style="padding: 0 4px;">
                <span style="display: inline-block; background-color: ${isPaid ? "#ecfdf5" : isOverdue ? "#fef2f2" : "#eef2ff"}; color: ${isPaid ? "#065f46" : isOverdue ? "#991b1b" : "#4338ca"}; border: 1px solid ${isPaid ? "#a7f3d0" : isOverdue ? "#fecaca" : "#c7d2fe"}; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${statusText}
                </span>
              </td>
              ${
                !isPaid && formattedDueDate !== "—"
                  ? `
              <td style="padding: 0 4px;">
                <span style="display: inline-block; background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 600;">
                  Due: ${formattedDueDate}
                </span>
              </td>
              `
                  : ""
              }
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Quick Info Grid -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom: 24px;">
      <tr>
        <td class="mobile-stack" width="50%" style="padding: 14px 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px 0 0 10px; vertical-align: top;">
          <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">
            Invoice Number
          </span>
          <span style="font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace;">
            ${escapeHtml(invoice.invoiceNumber)}
          </span>

          <div style="margin-top: 10px;">
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">
              Issue Date
            </span>
            <span style="font-size: 13px; color: #334155; font-weight: 500;">
              ${formattedIssueDate}
            </span>
          </div>
        </td>
        <td class="mobile-stack" width="50%" style="padding: 14px 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-left: none; border-radius: 0 10px 10px 0; vertical-align: top;">
          <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">
            Billed To
          </span>
          <span style="font-size: 14px; font-weight: 700; color: #0f172a; display: block;">
            ${escapeHtml(customer.companyName || customer.name)}
          </span>

          <div style="margin-top: 10px;">
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">
              Due Date
            </span>
            <span style="font-size: 13px; color: ${isOverdue ? "#b91c1c" : "#334155"}; font-weight: ${isOverdue ? "700" : "500"};">
              ${formattedDueDate}
            </span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Financial Breakdown Table -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom: 28px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
      <tr>
        <td style="padding: 16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #64748b;">Subtotal</td>
              <td align="right" style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #1e293b;">${subTotalStr}</td>
            </tr>
            ${
              invoice.totalDiscount && invoice.totalDiscount > 0
                ? `
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #059669;">Discount</td>
              <td align="right" style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #059669;">-${discountStr}</td>
            </tr>
            `
                : ""
            }
            ${
              invoice.totalTax && invoice.totalTax > 0
                ? `
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #64748b;">Taxes &amp; GST</td>
              <td align="right" style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #1e293b;">+${taxStr}</td>
            </tr>
            `
                : ""
            }
            <tr>
              <td colspan="2" style="padding: 10px 0 6px 0;">
                <div style="border-top: 2px solid #e2e8f0;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 16px; font-weight: 800; color: #0f172a;">Total Invoice Amount</td>
              <td align="right" style="padding: 6px 0; font-size: 18px; font-weight: 800; color: #0f172a;">${finalAmountStr}</td>
            </tr>
            ${
              !isPaid && invoice.amountPaid && invoice.amountPaid > 0
                ? `
            <tr>
              <td style="padding: 4px 0; font-size: 13px; color: #059669;">Amount Paid</td>
              <td align="right" style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #059669;">-${formatEmailCurrency(invoice.amountPaid, currency)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 14px; font-weight: 700; color: #b91c1c;">Remaining Balance Due</td>
              <td align="right" style="padding: 4px 0; font-size: 15px; font-weight: 700; color: #b91c1c;">${balanceDueStr}</td>
            </tr>
            `
                : ""
            }
          </table>
        </td>
      </tr>
    </table>

    <!-- Call to Action Button -->
    <div style="text-align: center; margin: 32px 0 28px 0;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${publicInvoiceUrl}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="20%" stroke="f" fillcolor="#4f46e5">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${ctaButtonText} &rarr;</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${publicInvoiceUrl}" target="_blank" style="display: inline-block; background-color: #4f46e5; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff !important; padding: 15px 36px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.35); letter-spacing: 0.3px;">
        ${ctaButtonText} &nbsp;&rarr;
      </a>
      <!--<![endif]-->
    </div>

    <!-- PDF Attachment Notice Pill -->
    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; margin: 0 0 24px 0;">
      <table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%">
        <tr>
          <td width="26" style="vertical-align: middle; font-size: 16px;">
            &#128206;
          </td>
          <td style="vertical-align: middle; font-size: 13px; color: #1e40af; line-height: 1.4;">
            <strong>Attached Document:</strong> An official PDF copy (<strong>${escapeHtml(invoice.invoiceNumber)}.pdf</strong>) is attached for your records and accounting.
          </td>
        </tr>
      </table>
    </div>

    <!-- Bank Details Card (if present) -->
    ${
      invoice.bankName && invoice.bankAccountNumber
        ? `
    <div style="background-color: #fafafa; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
      <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.8px; display: block; margin-bottom: 8px;">
        Bank Transfer Details
      </span>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 3px 0; color: #64748b; width: 35%;">Bank:</td>
          <td style="padding: 3px 0; font-weight: 600; color: #0f172a;">${escapeHtml(invoice.bankName)}</td>
        </tr>
        <tr>
          <td style="padding: 3px 0; color: #64748b;">Account No:</td>
          <td style="padding: 3px 0; font-weight: 700; font-family: monospace; color: #0f172a;">${escapeHtml(invoice.bankAccountNumber)}</td>
        </tr>
        ${
          invoice.bankIfscCode
            ? `
        <tr>
          <td style="padding: 3px 0; color: #64748b;">IFSC Code:</td>
          <td style="padding: 3px 0; font-weight: 700; font-family: monospace; color: #0f172a;">${escapeHtml(invoice.bankIfscCode)}</td>
        </tr>
        `
            : ""
        }
        ${
          invoice.bankAccountName
            ? `
        <tr>
          <td style="padding: 3px 0; color: #64748b;">Beneficiary:</td>
          <td style="padding: 3px 0; font-weight: 600; color: #0f172a;">${escapeHtml(invoice.bankAccountName)}</td>
        </tr>
        `
            : ""
        }
      </table>
    </div>
    `
        : ""
    }

    <!-- Support & Contact Info -->
    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 20px; text-align: left; font-size: 13px; color: #64748b;">
      <p style="margin: 0 0 6px 0;">
        Have questions or need assistance regarding this invoice?
      </p>
      <p style="margin: 0; color: #334155;">
        ${company.email ? `<strong>Email:</strong> <a href="mailto:${escapeHtml(company.email)}" style="color: #4f46e5;">${escapeHtml(company.email)}</a> &bull; ` : ""}
        ${company.phone ? `<strong>Phone:</strong> ${escapeHtml(company.phone)}` : ""}
      </p>
    </div>
  `

  return buildModernEmailShell({
    title: `Invoice ${invoice.invoiceNumber} from ${company.name}`,
    previewText: `Invoice ${invoice.invoiceNumber} for ${finalAmountStr} is available for review and payment.`,
    badgeText: isPaid ? "INVOICE PAID" : "INVOICE DUE",
    badgeColor: statusBadgeColor,
    companyName: company.name,
    companyLogo: company.logo,
    contentHtml,
    footerNote: "This invoice email was generated automatically. Please do not reply directly if no sender mailbox is configured.",
    appUrl,
  })
}

/**
 * Builds a modern, neat, and clean Quotation Email HTML.
 */
export function buildModernQuotationEmailHtml(params: {
  quotation: {
    id: string
    quotationNumber: string
    date: Date | string
    expiryDate?: Date | string | null
    currency?: string | null
    subTotal?: number | null
    totalTax?: number | null
    totalDiscount?: number | null
    finalAmount: number
    status?: string | null
    notes?: string | null
    terms?: string | null
  }
  company: {
    id?: string
    name: string
    logo?: string | null
    email?: string | null
    phone?: string | null
    website?: string | null
    address?: string | null
  }
  customer: {
    name: string
    email?: string | null
    phone?: string | null
    companyName?: string | null
  }
  customMessage?: string | null
  appUrl?: string
}): string {
  const { quotation, company, customer } = params
  const appUrl = (params.appUrl || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "")
  const currency = quotation.currency || "INR"

  const formattedDate = formatEmailDate(quotation.date)
  const formattedExpiry = quotation.expiryDate ? formatEmailDate(quotation.expiryDate) : null
  const finalAmountStr = formatEmailCurrency(quotation.finalAmount, currency)
  const subTotalStr = formatEmailCurrency(quotation.subTotal || quotation.finalAmount, currency)
  const taxStr = formatEmailCurrency(quotation.totalTax || 0, currency)

  const contentHtml = `
    <!-- Greeting -->
    <div style="margin-bottom: 24px;">
      <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
        Quotation Proposal ${escapeHtml(quotation.quotationNumber)}
      </h1>
      <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.6;">
        Hello <strong>${escapeHtml(customer.name)}</strong>, thank you for considering our services. Please find our formal quotation details below. A complete PDF copy has been attached.
      </p>
      ${
        params.customMessage
          ? `<div style="margin-top: 14px; padding: 12px 16px; background-color: #f1f5f9; border-radius: 8px; font-size: 14px; color: #334155; font-style: italic;">
              ${escapeHtml(params.customMessage)}
            </div>`
          : ""
      }
    </div>

    <!-- Hero Card: Estimated Total -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin: 0 0 24px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden;">
      <tr>
        <td style="padding: 24px 20px; text-align: center;">
          <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 1px; display: block; margin-bottom: 6px;">
            QUOTATION ESTIMATE
          </span>
          <div style="font-size: 34px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; margin: 0 0 10px 0; line-height: 1.1;">
            ${finalAmountStr}
          </div>
          <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin: 0 auto;">
            <tr>
              <td style="padding: 0 4px;">
                <span style="display: inline-block; background-color: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                  Formal Proposal
                </span>
              </td>
              ${
                formattedExpiry
                  ? `
              <td style="padding: 0 4px;">
                <span style="display: inline-block; background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 600;">
                  Valid Until: ${formattedExpiry}
                </span>
              </td>
              `
                  : ""
              }
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Quick Info Grid -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom: 24px;">
      <tr>
        <td class="mobile-stack" width="50%" style="padding: 14px 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px 0 0 10px; vertical-align: top;">
          <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">
            Quotation Number
          </span>
          <span style="font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace;">
            ${escapeHtml(quotation.quotationNumber)}
          </span>

          <div style="margin-top: 10px;">
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">
              Date Prepared
            </span>
            <span style="font-size: 13px; color: #334155; font-weight: 500;">
              ${formattedDate}
            </span>
          </div>
        </td>
        <td class="mobile-stack" width="50%" style="padding: 14px 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-left: none; border-radius: 0 10px 10px 0; vertical-align: top;">
          <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">
            Prepared For
          </span>
          <span style="font-size: 14px; font-weight: 700; color: #0f172a; display: block;">
            ${escapeHtml(customer.companyName || customer.name)}
          </span>

          ${
            formattedExpiry
              ? `
          <div style="margin-top: 10px;">
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">
              Valid Until
            </span>
            <span style="font-size: 13px; color: #334155; font-weight: 600;">
              ${formattedExpiry}
            </span>
          </div>
          `
              : ""
          }
        </td>
      </tr>
    </table>

    <!-- Financial Breakdown Table -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom: 28px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
      <tr>
        <td style="padding: 16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #64748b;">Subtotal</td>
              <td align="right" style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #1e293b;">${subTotalStr}</td>
            </tr>
            ${
              quotation.totalTax && quotation.totalTax > 0
                ? `
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #64748b;">Taxes &amp; GST</td>
              <td align="right" style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #1e293b;">+${taxStr}</td>
            </tr>
            `
                : ""
            }
            <tr>
              <td colspan="2" style="padding: 10px 0 6px 0;">
                <div style="border-top: 2px solid #e2e8f0;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 16px; font-weight: 800; color: #0f172a;">Estimated Total</td>
              <td align="right" style="padding: 6px 0; font-size: 18px; font-weight: 800; color: #0f172a;">${finalAmountStr}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- PDF Attachment Notice Pill -->
    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; margin: 0 0 24px 0;">
      <table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%">
        <tr>
          <td width="26" style="vertical-align: middle; font-size: 16px;">
            &#128206;
          </td>
          <td style="vertical-align: middle; font-size: 13px; color: #1e40af; line-height: 1.4;">
            <strong>Attached PDF:</strong> Please review the attached quotation file (<strong>${escapeHtml(quotation.quotationNumber)}.pdf</strong>) for complete itemized specifications and terms.
          </td>
        </tr>
      </table>
    </div>

    <!-- Contact & Next Steps -->
    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: left; font-size: 13px; color: #64748b;">
      <p style="margin: 0 0 6px 0;">
        Ready to proceed or wish to discuss revisions? Reply directly to this email or reach us at:
      </p>
      <p style="margin: 0; color: #334155;">
        ${company.email ? `<strong>Email:</strong> <a href="mailto:${escapeHtml(company.email)}" style="color: #4f46e5;">${escapeHtml(company.email)}</a> &bull; ` : ""}
        ${company.phone ? `<strong>Phone:</strong> ${escapeHtml(company.phone)}` : ""}
      </p>
    </div>
  `

  return buildModernEmailShell({
    title: `Quotation ${quotation.quotationNumber} from ${company.name}`,
    previewText: `Quotation proposal ${quotation.quotationNumber} for ${finalAmountStr}`,
    badgeText: "QUOTATION",
    badgeColor: "indigo",
    companyName: company.name,
    companyLogo: company.logo,
    contentHtml,
    footerNote: "This quotation is subject to terms and conditions outlined in the attached proposal.",
    appUrl,
  })
}

/**
 * Builds a modern, neat, and clean Payment Receipt Email HTML.
 */
export function buildModernPaymentReceiptEmailHtml(params: {
  invoice: {
    id: string
    invoiceNumber: string
    currency?: string | null
    finalAmount: number
    balanceDue?: number | null
  }
  payment: {
    amount: number
    paymentDate?: Date | string
    paymentMethod?: string
    referenceNumber?: string
  }
  company: {
    id?: string
    name: string
    logo?: string | null
    email?: string | null
    phone?: string | null
  }
  customer: {
    name: string
    email?: string | null
  }
  appUrl?: string
}): string {
  const { invoice, payment, company, customer } = params
  const appUrl = (params.appUrl || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "")
  const currency = invoice.currency || "INR"

  const amountPaidStr = formatEmailCurrency(payment.amount, currency)
  const balanceDueVal = typeof invoice.balanceDue === "number" ? invoice.balanceDue : 0
  const isFullySettled = balanceDueVal <= 0
  const paymentDateStr = formatEmailDate(payment.paymentDate || new Date())

  const contentHtml = `
    <!-- Greeting -->
    <div style="margin-bottom: 24px; text-align: center;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: #065f46; letter-spacing: -0.3px;">
        Payment Confirmed!
      </h1>
      <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.6;">
        Dear <strong>${escapeHtml(customer.name)}</strong>, thank you for your payment. We have successfully processed your transaction for Invoice <strong>${escapeHtml(invoice.invoiceNumber)}</strong>.
      </p>
    </div>

    <!-- Hero Card: Amount Paid -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin: 0 0 24px 0; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 14px; overflow: hidden;">
      <tr>
        <td style="padding: 24px 20px; text-align: center;">
          <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #047857; letter-spacing: 1px; display: block; margin-bottom: 6px;">
            &#10003; AMOUNT PAID
          </span>
          <div style="font-size: 36px; font-weight: 800; color: #065f46; letter-spacing: -0.5px; margin: 0 0 8px 0; line-height: 1.1;">
            ${amountPaidStr}
          </div>
          <span style="display: inline-block; background-color: #ffffff; color: #047857; border: 1px solid #a7f3d0; border-radius: 9999px; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
            ${isFullySettled ? "Invoice Fully Settled" : `Remaining: ${formatEmailCurrency(balanceDueVal, currency)}`}
          </span>
        </td>
      </tr>
    </table>

    <!-- Receipt Details Table -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 45%;">Invoice Reference</td>
          <td style="padding: 6px 0; font-weight: 700; font-family: monospace; color: #0f172a;">${escapeHtml(invoice.invoiceNumber)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Payment Date</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${paymentDateStr}</td>
        </tr>
        ${
          payment.paymentMethod
            ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Payment Method</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${escapeHtml(payment.paymentMethod)}</td>
        </tr>
        `
            : ""
        }
        ${
          payment.referenceNumber
            ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Transaction Reference</td>
          <td style="padding: 6px 0; font-family: monospace; color: #0f172a;">${escapeHtml(payment.referenceNumber)}</td>
        </tr>
        `
            : ""
        }
      </table>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 28px 0;">
      <!--[if !mso]><!-->
      <a href="${appUrl}/p/invoice/${invoice.id}" target="_blank" style="display: inline-block; background-color: #059669; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff !important; padding: 14px 34px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; box-shadow: 0 4px 14px 0 rgba(5, 150, 105, 0.35);">
        View Official Receipt Online &nbsp;&rarr;
      </a>
      <!--<![endif]-->
    </div>

    <!-- PDF Attachment Notice -->
    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; margin: 0 0 20px 0;">
      <span style="font-size: 13px; color: #1e40af;">
        &#128206; <strong>Receipt Attached:</strong> A downloadable PDF receipt (<strong>Receipt-${escapeHtml(invoice.invoiceNumber)}.pdf</strong>) is attached to this email.
      </span>
    </div>
  `

  return buildModernEmailShell({
    title: `Payment Receipt: Invoice ${invoice.invoiceNumber}`,
    previewText: `Payment of ${amountPaidStr} successfully received for Invoice ${invoice.invoiceNumber}`,
    badgeText: "RECEIPT",
    badgeColor: "emerald",
    companyName: company.name,
    companyLogo: company.logo,
    contentHtml,
    footerNote: "Thank you for your business! Please keep this receipt for your financial records.",
    appUrl,
  })
}

/**
 * Builds a modern, neat, and clean CRM Campaign & Nurturing Email HTML.
 */
export function buildModernCampaignEmailHtml(params: {
  companyName: string
  companyLogo?: string | null
  subject: string
  content: string
  recipientName?: string | null
  buttonText?: string | null
  clickTrackingUrl?: string | null
  openTrackingUrl?: string | null
  unsubscribeUrl?: string | null
  appName?: string
}): string {
  const appName = params.appName || process.env.NEXT_PUBLIC_APP_NAME || "Open Invoice"
  const companyName = params.companyName || appName

  // Convert raw message text with line breaks into modern paragraph blocks
  const rawParagraphs = params.content.split(/\n\s*\n/)
  const formattedParagraphs = rawParagraphs
    .map((p) => {
      const trimmed = p.trim()
      if (!trimmed) return ""
      // Replace single line breaks with <br/>
      const lines = trimmed.split("\n").map((l) => escapeHtml(l)).join("<br/>")
      return `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.75; color: #334155;">${lines}</p>`
    })
    .filter(Boolean)
    .join("\n")

  // Dynamic CTA Button if provided
  const dynamicButtonHtml =
    params.buttonText && params.clickTrackingUrl
      ? `
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 32px auto 28px auto;">
      <tr>
        <td align="center" style="border-radius: 10px; background-color: #4f46e5; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${params.clickTrackingUrl}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="f" fillcolor="#4f46e5">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${escapeHtml(params.buttonText)} &rarr;</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${params.clickTrackingUrl}" target="_blank" style="display: inline-block; padding: 15px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff !important; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.35);">
            ${escapeHtml(params.buttonText)} &nbsp;&rarr;
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>
    `
      : ""

  const contentHtml = `
    <!-- Campaign Headline -->
    <div style="margin-bottom: 24px;">
      <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.35; letter-spacing: -0.3px;">
        ${escapeHtml(params.subject)}
      </h1>
      ${
        params.recipientName
          ? `<p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1e293b;">
              Dear ${escapeHtml(params.recipientName)},
            </p>`
          : ""
      }
    </div>

    <!-- Formatted Message Body -->
    <div style="font-size: 15px; color: #334155; line-height: 1.75;">
      ${formattedParagraphs}
    </div>

    <!-- Dynamic CTA Button -->
    ${dynamicButtonHtml}

    <!-- Open Tracking Pixel (Hidden) -->
    ${
      params.openTrackingUrl
        ? `<img src="${params.openTrackingUrl}" width="1" height="1" border="0" alt="" style="display:none !important; width:1px !important; height:1px !important; border:0 !important; visibility:hidden !important; overflow:hidden !important; mso-hide:all;" />`
        : ""
    }
  `

  return buildModernEmailShell({
    title: params.subject,
    previewText: params.content.slice(0, 140),
    badgeText: "UPDATE",
    badgeColor: "indigo",
    companyName: companyName,
    companyLogo: params.companyLogo,
    contentHtml,
    footerNote: `You are receiving this communication as a valued contact of ${companyName}.`,
    appName,
  })
}
