import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

const { mockDb, mockLead } = vi.hoisted(() => {
  const mockLead = {
    id: "lead_123",
    companyId: "comp_456",
    name: "Rajesh Sharma",
    companyName: "Sharma Textiles Ltd",
    email: "rajesh@sharmatextiles.com",
    phone: "+91 98765 43210",
    status: "QUALIFIED",
    score: 45,
    estimatedValue: 150000,
    region: "Bengaluru",
    assignedTo: { id: "user_789", name: "Aswin Kumar", email: "aswin@rcssoft.com" },
  }

  const mockDb = {
    crmLead: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    crmActivity: {
      create: vi.fn(),
    },
  }

  return { mockDb, mockLead }
})

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: "user_789",
      name: "Aswin Kumar",
      email: "aswin@rcssoft.com",
      role: "ADMIN",
      companyId: "comp_456",
    },
  }),
}))

vi.mock("@/lib/tenant-db", () => ({
  getTenantDb: vi.fn().mockResolvedValue(mockDb),
}))

vi.mock("@/lib/db-pool", () => ({
  withDbRetry: vi.fn((fn) => fn()),
  getSharedPool: vi.fn().mockReturnValue({}),
  drainPool: vi.fn(),
  getPoolMetrics: vi.fn(),
}))

vi.mock("@/services/audit", () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
}))

import { deleteLead, restoreLead } from "@/actions/crm"
import { createAuditLog } from "@/services/audit"

describe("CRM Lead Deletion with Security Audit Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should soft-delete lead and record audit log with user and lead details", async () => {
    mockDb.crmLead.findUnique.mockResolvedValue(mockLead)
    mockDb.crmLead.update.mockResolvedValue({ ...mockLead, deletedAt: new Date() })

    const result = await deleteLead("lead_123", "Duplicate prospect entered by mistake")

    expect(result.success).toBe(true)
    expect(result.leadName).toBe("Rajesh Sharma")

    // 1. Soft-delete in database
    expect(mockDb.crmLead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead_123" },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      })
    )

    // 2. Audit log creation with details
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "comp_456",
        userId: "user_789",
        action: "LEAD_DELETE",
        entity: "CrmLead",
        entityId: "lead_123",
        details: expect.objectContaining({
          leadName: "Rajesh Sharma",
          companyName: "Sharma Textiles Ltd",
          email: "rajesh@sharmatextiles.com",
          reason: "Duplicate prospect entered by mistake",
        }),
      })
    )

    // 3. Activity timeline entry
    expect(mockDb.crmActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "NOTE",
          title: "Lead Deleted: Rajesh Sharma",
          leadId: "lead_123",
        }),
      })
    )
  })

  it("should restore lead and record LEAD_RESTORE audit log", async () => {
    mockDb.crmLead.findUnique.mockResolvedValue({ ...mockLead, deletedAt: new Date() })
    mockDb.crmLead.update.mockResolvedValue({ ...mockLead, deletedAt: null })

    const result = await restoreLead("lead_123")

    expect(result.success).toBe(true)
    expect(mockDb.crmLead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead_123" },
        data: { deletedAt: null },
      })
    )

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "comp_456",
        userId: "user_789",
        action: "LEAD_RESTORE",
        entity: "CrmLead",
        entityId: "lead_123",
      })
    )
  })

  it("should return error if lead does not exist", async () => {
    mockDb.crmLead.findUnique.mockResolvedValue(null)

    const result = await deleteLead("invalid_id")

    expect(result.error).toBe("Lead not found.")
    expect(mockDb.crmLead.update).not.toHaveBeenCalled()
    expect(createAuditLog).not.toHaveBeenCalled()
  })
})
