import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { InvoiceStatus } from "@prisma/client"
import { getTenantDb } from "@/lib/tenant-db"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // allow up to 5 mins on Vercel Pro if available

export async function GET(req: Request) {
  try {
    // Basic auth check if needed (e.g. cron secret)
    const authHeader = req.headers.get("authorization")
    const expectedSecret = process.env.CRON_SECRET
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Find all companies that have autoFreezeMonths enabled
    const companies = await prisma.company.findMany({
      where: {
        autoFreezeMonths: { not: null },
        deletedAt: null
      },
      select: { id: true, autoFreezeMonths: true }
    })

    let frozenCount = 0

    for (const company of companies) {
      if (!company.autoFreezeMonths) continue

      const tenantDb = await getTenantDb(company.id)

      // Calculate the cutoff date
      const cutoffDate = new Date()
      cutoffDate.setMonth(cutoffDate.getMonth() - company.autoFreezeMonths)

      // Find all invoices older than the cutoff date that are not yet frozen
      // Ignore Cancelled drafts if preferred, but usually all invoices get frozen.
      const invoicesToFreeze = await tenantDb.invoice.findMany({
        where: {
          companyId: company.id,
          date: { lt: cutoffDate },
          isFrozen: false,
          deletedAt: null
        },
        select: { id: true }
      })

      if (invoicesToFreeze.length > 0) {
        const ids = invoicesToFreeze.map((i: { id: string }) => i.id)

        // Bulk update
        await tenantDb.invoice.updateMany({
          where: { id: { in: ids } },
          data: { isFrozen: true }
        })

        frozenCount += ids.length

        // Create audit log for the bulk freeze
        const { createAuditLog } = await import("@/services/audit")
        await createAuditLog({
          companyId: company.id,
          userId: "system",
          action: "UPDATE",
          entity: "Invoice",
          entityId: "bulk-freeze",
          details: { action: `Auto-froze ${ids.length} invoices older than ${company.autoFreezeMonths} months` }
        })
      }
    }

    return NextResponse.json({ success: true, frozenCount })
  } catch (error: any) {
    console.error("Auto-freeze cron error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
