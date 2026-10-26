import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getTenantDb } from "@/lib/tenant-db"
import { InvoiceStatus, ScheduleStatus } from "@prisma/client"
import { generateInvoicePdf } from "@/services/pdf"
import { sendInvoiceEmail, buildModernInvoiceEmailHtml } from "@/services/smtp"
import { sendWhatsAppMessage } from "@/actions/integrations"
import { getNextRunDate, getCompanyNow } from "@/lib/date-utils"
import { createAuditLog } from "@/services/audit"
import { invalidateCachePattern } from "@/lib/redis"
import { withDbRetry } from "@/lib/db-pool"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  return handleCron(request)
}

export async function POST(request: Request) {
  return handleCron(request)
}

async function handleCron(request: Request) {
  try {
    const url = new URL(request.url)
    const querySecret = url.searchParams.get("secret") || url.searchParams.get("key")
    const queryInvoiceId = url.searchParams.get("invoiceId")
    const queryForce = url.searchParams.get("force") === "true"

    let bodyInvoiceId: string | null = null
    let bodyForce = false
    if (request.method === "POST") {
      try {
        const body = await request.json()
        bodyInvoiceId = body?.invoiceId || null
        bodyForce = Boolean(body?.force)
      } catch {
        // Body might be empty
      }
    }

    const targetInvoiceId = queryInvoiceId || bodyInvoiceId
    const isForce = queryForce || bodyForce

    // Optional cron secret protection if configured (unless authenticated or local)
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && !targetInvoiceId) {
      const authHeader = request.headers.get("authorization") || ""
      const customHeader = request.headers.get("x-cron-secret") || ""
      const isBearerMatch = authHeader.toLowerCase().startsWith("bearer ") && authHeader.slice(7).trim() === cronSecret
      const isRawMatch = authHeader.trim() === cronSecret
      const isCustomMatch = customHeader.trim() === cronSecret
      const isQueryMatch = querySecret === cronSecret

      if (!isBearerMatch && !isRawMatch && !isCustomMatch && !isQueryMatch) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "Missing or invalid cron secret. Provide Authorization: Bearer <secret> header or ?secret=<secret> parameter.",
            timestamp: new Date().toISOString()
          },
          { status: 401 }
        )
      }
    }

    const whereClause: any = { status: ScheduleStatus.ACTIVE }
    if (targetInvoiceId) {
      whereClause.invoiceId = targetInvoiceId
    }

    const schedules = await withDbRetry(() =>
      prisma.recurringSchedule.findMany({
        where: whereClause,
        include: {
          invoice: { include: { items: true, customer: true, company: { include: { users: true } } } },
        },
      })
    )

    if (schedules.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active recurring schedules found.",
        totalActiveSchedules: 0,
        processed: 0,
        generatedInvoices: [],
        timestamp: new Date().toISOString(),
      })
    }

    let processedCount = 0
    const generatedInvoices: Array<{ invoiceId: string; invoiceNumber: string; customer: string }> = []
    const failedSchedules: Array<{ invoiceId: string; error: string }> = []

    for (const schedule of schedules) {
      try {
        const source = schedule.invoice
        if (!source) continue
        const company = source.company
        if (!company) continue

        const tenantDb = await getTenantDb(source.companyId)
        const now = await getCompanyNow(tenantDb, company.baseCurrency)

        if (!isForce && schedule.nextRunAt > now) {
          continue
        }

        const count = await withDbRetry<number>(() => tenantDb.invoice.count({ where: { companyId: source.companyId } }))
        const prefix = company.invoicePrefix || "INV"
        let seq = count + 1
        let invoiceNumber = `${prefix}-${now.getFullYear()}-${String(seq).padStart(4, "0")}`
        while (await withDbRetry<any>(() => tenantDb.invoice.findFirst({ where: { companyId: source.companyId, invoiceNumber } }))) {
          seq++
          invoiceNumber = `${prefix}-${now.getFullYear()}-${String(seq).padStart(4, "0")}`
        }

        let durationDays = 30
        if (source.dueDate && source.date) {
          const diff = Math.round((new Date(source.dueDate).getTime() - new Date(source.date).getTime()) / (1000 * 60 * 60 * 24))
          if (diff >= 0 && diff <= 365) durationDays = diff
        }
        const dueDate = new Date(now)
        dueDate.setDate(dueDate.getDate() + durationDays)

        const newInvoice: any = await withDbRetry<any>(() =>
          tenantDb.invoice.create({
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
                create: source.items.map((item: any) => ({
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
        )

        if (schedule.autoSend && source.customer?.email) {
          try {
            const pdf = await generateInvoicePdf(newInvoice.id)
            const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
            const html = buildModernInvoiceEmailHtml({
              invoice: newInvoice,
              company: source.company,
              customer: source.customer,
              appUrl,
              customMessage: "This recurring invoice was automatically generated based on your billing schedule.",
            })

            await sendInvoiceEmail({
              companyId: source.companyId,
              invoiceId: newInvoice.id,
              to: source.customer.email,
              subject: `Invoice ${invoiceNumber} from ${source.company.name}`,
              html,
              attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdf }],
            })
            await withDbRetry(() =>
              tenantDb.invoice.update({
                where: { id: newInvoice.id },
                data: { status: InvoiceStatus.SENT },
              })
            )
          } catch (err) {
            console.error("Failed to auto-send recurring invoice email:", err)
          }

          if (source.company.openWaEnabled && source.customer?.phone) {
            try {
              const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
              const waMessage = `Hi ${source.customer.name}, please find your auto-generated invoice ${invoiceNumber} for amount ₹${newInvoice.finalAmount.toLocaleString("en-IN")}. You can view and pay online here: ${appUrl}/invoices/${newInvoice.id}`
              await sendWhatsAppMessage(source.customerId, waMessage)
            } catch (e) {
              console.error("Failed to send recurring invoice WhatsApp reminder:", e)
            }
          }
        }

        let nextRun = getNextRunDate(schedule.frequency, schedule.nextRunAt)
        while (nextRun <= now) {
          nextRun = getNextRunDate(schedule.frequency, nextRun)
        }

        await withDbRetry(() =>
          tenantDb.recurringSchedule.update({
            where: { id: schedule.id },
            data: { nextRunAt: nextRun },
          })
        )

        // Keep Audit Log
        const systemUser = source.company.users?.[0]
        if (systemUser) {
          await createAuditLog({
            companyId: source.companyId,
            userId: systemUser.id,
            action: "RECURRING_INVOICE_GENERATE",
            entity: "Invoice",
            entityId: newInvoice.id,
            details: {
              invoiceNumber,
              templateInvoiceId: source.id,
              frequency: schedule.frequency,
              trigger: targetInvoiceId || isForce ? "API_ENDPOINT_MANUAL" : "AUTOMATED_CRON",
            },
            db: tenantDb,
          })
        }

        await invalidateCachePattern(`invoices:${source.companyId}:*`)

        processedCount++
        generatedInvoices.push({
          invoiceId: newInvoice.id,
          invoiceNumber,
          customer: source.customer?.name || "Customer",
        })
      } catch (scheduleErr: any) {
        console.error(`Failed to process schedule for invoice ${schedule.invoiceId}:`, scheduleErr)
        failedSchedules.push({
          invoiceId: schedule.invoiceId,
          error: scheduleErr?.message || "Unknown error processing schedule",
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: processedCount > 0
        ? `Successfully generated ${processedCount} recurring invoice(s).`
        : "Recurring check completed. No invoices were due at this time.",
      totalActiveSchedules: schedules.length,
      processed: processedCount,
      generatedInvoices,
      failedSchedules: failedSchedules.length > 0 ? failedSchedules : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error("Cron recurring execution failed:", err)
    return NextResponse.json({ error: err.message || "Execution failed", timestamp: new Date().toISOString() }, { status: 500 })
  }
}
