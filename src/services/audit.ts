import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export async function createAuditLog(params: {
  companyId: string
  userId: string
  action: string
  entity: string
  entityId: string
  details?: Record<string, unknown>
  ipAddress?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details as Prisma.InputJsonValue | undefined,
        ipAddress: params.ipAddress,
      },
    })
  } catch (error) {
    console.error("Audit log failed:", error)
  }
}
