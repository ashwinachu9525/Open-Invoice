import { inngest } from "./client"
import { prisma } from "@/lib/prisma"
import { InvoiceStatus, RecurringFrequency, ScheduleStatus } from "@prisma/client"
import { generateInvoicePdf } from "@/services/pdf"
import { sendInvoiceEmail, sendTrialReminderEmail } from "@/services/smtp"
import { sendWhatsAppMessage } from "@/actions/integrations"


function getNextRunDate(frequency: RecurringFrequency, from: Date): Date {
  const next = new Date(from)
  // Ensure we keep the same hour and minute that was originally configured
  // The 'from' date is the old nextRunAt, so it already has the correct hour/minute.
  switch (frequency) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7)
      break
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1)
      break
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3)
      break
    case "HALF_YEARLY":
      next.setMonth(next.getMonth() + 6)
      break
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1)
      break
  }
  return next
}

import { getCompanyNow } from "@/lib/date-utils"

export const processRecurringInvoices = inngest.createFunction(
  { id: "process-recurring-invoices", triggers: [{ cron: "0 * * * *" }] },
  async () => {
    const schedules = await prisma.recurringSchedule.findMany({
      where: {
        status: ScheduleStatus.ACTIVE,
      },
      include: {
        invoice: { include: { items: true, customer: true, company: { include: { users: true } } } },
      },
    })

    for (const schedule of schedules) {
      const source = schedule.invoice
      const company = source.company
      const now = await getCompanyNow(prisma, company.baseCurrency)

      if (schedule.nextRunAt > now) {
        continue
      }

      const count = await prisma.invoice.count({ where: { companyId: source.companyId } })
      const prefix = company.invoicePrefix || "INV"
      const invoiceNumber = `${prefix}-${now.getFullYear()}-${String(count + 1).padStart(4, "0")}`

      const dueDate = new Date(now)
      dueDate.setDate(dueDate.getDate() + 30)

      const newInvoice = await prisma.invoice.create({
        data: {
          companyId: source.companyId,
          customerId: source.customerId,
          invoiceNumber,
          date: now,
          dueDate,
          currency: source.currency,
          notes: source.notes,
          terms: source.terms,
          status: InvoiceStatus.DRAFT,
          subTotal: source.subTotal,
          totalDiscount: source.totalDiscount,
          totalTax: source.totalTax,
          cgstAmount: source.cgstAmount,
          sgstAmount: source.sgstAmount,
          igstAmount: source.igstAmount,
          tdsPercentage: source.tdsPercentage,
          tdsAmount: source.tdsAmount,
          finalAmount: source.finalAmount,
          balanceDue: source.finalAmount,
          items: {
            create: source.items.map((item) => ({
              description: item.description,
              hsnSac: item.hsnSac,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              taxPercentage: item.taxPercentage,
              taxableAmount: item.taxableAmount,
              taxAmount: item.taxAmount,
              total: item.total,
            })),
          },
        },
      })

      if (schedule.autoSend && source.customer.email) {
        const pdf = await generateInvoicePdf(newInvoice.id)
        await sendInvoiceEmail({
          companyId: source.companyId,
          to: source.customer.email,
          subject: `Invoice ${invoiceNumber} from ${source.company.name}`,
          html: `<p>Please find attached invoice ${invoiceNumber}.</p>`,
          attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdf }],
        })
        await prisma.invoice.update({
          where: { id: newInvoice.id },
          data: { status: InvoiceStatus.SENT },
        })

        // Send WhatsApp if enabled
        if (source.company.openWaEnabled && source.customer.phone) {
          try {
            const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
            const waMessage = `Hi ${source.customer.name}, please find your auto-generated invoice ${invoiceNumber} for amount ₹${newInvoice.finalAmount.toLocaleString("en-IN")}. You can view and pay online here: ${appUrl}/invoices/${newInvoice.id}`
            await sendWhatsAppMessage(source.customerId, waMessage)
          } catch (e) {
            console.error("Failed to send recurring invoice WhatsApp reminder:", e)
          }
        }
      }

      await prisma.recurringSchedule.update({
        where: { id: schedule.id },
        data: { nextRunAt: getNextRunDate(schedule.frequency, schedule.nextRunAt) },
      })

      // Send push notification
      import("@/lib/push").then(({ sendPushNotification }) => {
        source.company.users.forEach((u: any) => {
          sendPushNotification(u.id, {
            title: "Recurring Invoice Generated",
            body: `Invoice ${invoiceNumber} has been automatically generated.`,
            url: `/invoices/${newInvoice.id}`,
          })
        })
      })
    }

    return { processed: schedules.length }
  }
)

export const markOverdueInvoices = inngest.createFunction(
  { id: "mark-overdue-invoices", triggers: [{ cron: "0 0 * * *" }] },
  async () => {
    const overdue = await prisma.invoice.updateMany({
      where: {
        dueDate: { lt: new Date() },
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.PARTIALLY_PAID] },
        balanceDue: { gt: 0 },
      },
      data: { status: InvoiceStatus.OVERDUE },
    })

    // Also notify users about overdue invoices
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        dueDate: { lt: new Date() },
        status: InvoiceStatus.OVERDUE,
        balanceDue: { gt: 0 },
      },
      include: { company: { include: { users: true } } }
    })

    import("@/lib/push").then(({ sendPushNotification }) => {
      overdueInvoices.forEach(inv => {
        inv.company.users.forEach(u => {
          sendPushNotification(u.id, {
            title: "Invoice Overdue",
            body: `Invoice ${inv.invoiceNumber} is now overdue.`,
            url: `/invoices/${inv.id}`,
          })
        })
      })
    })

    return { marked: overdue.count }
  }
)

export const sendPaymentReminders = inngest.createFunction(
  { id: "send-payment-reminders", triggers: [{ cron: "0 9 * * *" }] }, // Runs daily at 9am
  async () => {
    // We only process invoices that are not paid or cancelled, and have a non-zero balance
    const eligibleInvoices = await prisma.invoice.findMany({
      where: {
        status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] },
        balanceDue: { gt: 0 },
        deletedAt: null,
      },
      include: {
        customer: true,
        company: { include: { reminderConfig: true, users: true } },
      },
    })

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    let remindersSent = 0

    for (const invoice of eligibleInvoices) {
      if (!invoice.customer.email) continue
      const config = invoice.company.reminderConfig
      if (!config) continue

      const dueDate = new Date(invoice.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      
      const diffTime = now.getTime() - dueDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      let shouldSend = false
      let messageType = ""

      if (diffDays === 0 && config.day0Enabled) {
        shouldSend = true
        messageType = "Due Today"
      } else if (diffDays === 7 && config.day7Enabled) {
        shouldSend = true
        messageType = "7 Days Overdue"
      } else if (diffDays === 15 && config.day15Enabled) {
        shouldSend = true
        messageType = "15 Days Overdue"
      }

      if (shouldSend) {
        try {
          const pdf = await generateInvoicePdf(invoice.id)
          const customMsg = config.customMessage ? `<p>${config.customMessage}</p>` : ""
          
          await sendInvoiceEmail({
            companyId: invoice.companyId,
            invoiceId: invoice.id,
            to: invoice.customer.email,
            subject: `Payment Reminder: Invoice ${invoice.invoiceNumber} is ${messageType}`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                <h2 style="color:#f59e0b;">Payment Reminder: ${messageType}</h2>
                <p>Hello ${invoice.customer.name},</p>
                <p>This is a friendly reminder regarding Invoice <strong>${invoice.invoiceNumber}</strong> for <strong>₹${invoice.balanceDue.toLocaleString("en-IN")}</strong>.</p>
                ${customMsg}
                <p>Please find the invoice attached to this email. We appreciate your prompt payment.</p>
              </div>
            `,
            attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdf }],
          })
          remindersSent++

          // Send WhatsApp payment reminder if enabled
          if (invoice.company.openWaEnabled && invoice.customer.phone) {
            try {
              const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
              const waMessage = `Hi ${invoice.customer.name}, this is a payment reminder for invoice ${invoice.invoiceNumber}. The outstanding balance is ₹${invoice.balanceDue.toLocaleString("en-IN")} (${messageType}). You can view and pay here: ${appUrl}/invoices/${invoice.id}`
              await sendWhatsAppMessage(invoice.customerId, waMessage)
            } catch (e) {
              console.error("Failed to send WhatsApp payment reminder:", e)
            }
          }

          import("@/lib/push").then(({ sendPushNotification }) => {
            invoice.company.users?.forEach(u => {
              sendPushNotification(u.id, {
                title: "Payment Reminder Sent",
                body: `Reminder sent to ${invoice.customer.name} for ${invoice.invoiceNumber}.`,
                url: `/invoices/${invoice.id}`,
              })
            })
          })
        } catch (e) {
          console.error(`Failed to send reminder for invoice ${invoice.id}`, e)
        }
      }
    }

    return { sent: remindersSent }
  }
)

export const cleanupDeletedAccounts = inngest.createFunction(
  { id: "cleanup-deleted-accounts", triggers: [{ cron: "0 2 * * *" }] }, // Run daily at 2 AM
  async () => {
    // 30 days ago
    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() - 30)

    const deletedUsers = await prisma.user.findMany({
      where: {
        deletedAt: {
          not: null,
          lt: thresholdDate
        }
      }
    })

    let deletedCount = 0

    for (const user of deletedUsers) {
      try {
        // First delete the user (this cascades to accounts, sessions, etc.)
        await prisma.user.delete({
          where: { id: user.id }
        })

        // Then clean up their company if they had one
        // (assuming 1-to-1 relationship where they are the sole owner for this SAAS)
        if (user.companyId) {
          const remainingUsers = await prisma.user.count({
            where: { companyId: user.companyId }
          })
          
          if (remainingUsers === 0) {
            await prisma.company.delete({
              where: { id: user.companyId }
            }).catch(e => console.error(`Failed to delete company ${user.companyId}:`, e))
          }
        }
        deletedCount++
      } catch (e) {
        console.error(`Failed to delete user ${user.id}:`, e)
      }
    }

    return { deletedCount }
  }
)

export const checkTrialReminders = inngest.createFunction(
  { id: "check-trial-reminders", triggers: [{ cron: "0 8 * * *" }] },
  async () => {
    const now = new Date()
    const companies = await prisma.company.findMany({
      where: {
        trialStartsAt: { not: null },
        trialEndsAt: { gt: now },
        trialReminderSent: null,
      },
      include: {
        users: true,
      },
    })

    let emailsSentCount = 0

    for (const company of companies) {
      if (!company.trialEndsAt) continue

      const diffTime = company.trialEndsAt.getTime() - now.getTime()
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // If 5 days or less remaining (meaning day 25 onwards)
      if (daysRemaining <= 5) {
        for (const user of company.users) {
          if (!user.email) continue
          try {
            await sendTrialReminderEmail(user.email, company.name || "your company", daysRemaining)
            emailsSentCount++
          } catch (e) {
            console.error(`Failed to send trial reminder email to ${user.email} for company ${company.id}`, e)
          }
        }

        await prisma.company.update({
          where: { id: company.id },
          data: { trialReminderSent: new Date() },
        })
      }
    }

    return { companiesChecked: companies.length, emailsSent: emailsSentCount }
  }
)

import crypto from "crypto"

export const dispatchWebhook = inngest.createFunction(
  { id: "dispatch-webhook", triggers: [{ event: "webhook.dispatch" }] },
  async ({ event }: { event: any }) => {
    const { companyId, webhookEvent, payload } = event.data

    const webhooks = await prisma.webhook.findMany({
      where: {
        companyId,
        isActive: true,
      },
    })

    const dispatched = []

    for (const hook of webhooks) {
      const eventsList = hook.events.split(",").map((e) => e.trim())
      if (!eventsList.includes(webhookEvent)) {
        continue
      }

      const bodyString = JSON.stringify({
        id: crypto.randomUUID(),
        event: webhookEvent,
        timestamp: new Date().toISOString(),
        data: payload,
      })

      const signature = crypto
        .createHmac("sha256", companyId)
        .update(bodyString)
        .digest("hex")

      let statusCode: number | null = null
      let responseBody: string | null = null
      let success = false

      try {
        const response = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-signature": signature,
            "x-webhook-event": webhookEvent,
          },
          body: bodyString,
        })
        statusCode = response.status
        success = response.ok
        try {
          responseBody = await response.text()
        } catch {}
        dispatched.push({ url: hook.url, status: statusCode, success })
      } catch (err: any) {
        console.error(`Failed to dispatch webhook to ${hook.url}:`, err)
        responseBody = err.message || "Fetch failed"
        dispatched.push({ url: hook.url, error: responseBody, success: false })
      }

      try {
        await prisma.webhookLog.create({
          data: {
            webhookId: hook.id,
            event: webhookEvent,
            url: hook.url,
            statusCode,
            requestBody: bodyString,
            responseBody,
            success,
          }
        })
      } catch (logErr) {
        console.error("Failed to write webhook log:", logErr)
      }
    }

    return { dispatchedCount: dispatched.length, details: dispatched }
  }
)

export const syncExchangeRates = inngest.createFunction(
  { id: "sync-exchange-rates", triggers: [{ cron: "0 1 * * *" }] },
  async () => {
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/INR")
      if (!response.ok) {
        throw new Error(`Failed to fetch rates: ${response.statusText}`)
      }
      const data = await response.json()
      const rates = data.rates
      if (!rates) throw new Error("No rates returned in API response")

      const targetCurrencies = ["USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD"]
      const updated = []

      for (const cur of targetCurrencies) {
        const rateInInr = rates[cur] ? 1 / rates[cur] : null
        if (rateInInr) {
          const record = await prisma.exchangeRate.upsert({
            where: { from_to: { from: cur, to: "INR" } },
            update: { rate: rateInInr },
            create: { from: cur, to: "INR", rate: rateInInr }
          })
          updated.push({ currency: cur, rate: rateInInr })
        }
      }

      return { success: true, updated }
    } catch (err: any) {
      console.error("Exchange rate sync failed:", err)
      return { success: false, error: err.message || "Failed to sync exchange rates" }
    }
  }
)

export const inngestFunctions = [
  processRecurringInvoices,
  markOverdueInvoices,
  sendPaymentReminders,
  cleanupDeletedAccounts,
  checkTrialReminders,
  dispatchWebhook,
  syncExchangeRates,
]
