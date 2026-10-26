import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  createCompanyBackup,
  validateBackupFile,
  previewRestore,
  executeRestore,
  saveServerBackup,
  listServerBackups,
  getServerBackup,
  deleteServerBackup,
} from "@/lib/backup/backup-service"
import { BackupModule, BackupPayload } from "@/lib/backup/types"
import { prisma } from "@/lib/prisma"

// Mock prisma for isolated unit & tenant boundary testing
vi.mock("@/lib/prisma", () => ({
  prisma: {
    company: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    customer: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    invoiceItem: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    quotation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    quotationItem: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    testCertificate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    productCatalog: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    expense: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    bankAccount: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    emailSetting: {
      findUnique: vi.fn(),
    },
    reminderConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    aISettings: {
      findUnique: vi.fn(),
    },
  },
}))

describe("Customer-Specific Backup & Restore Engine", () => {
  const companyAId = "comp_tenant_alpha_123"
  const companyBId = "comp_tenant_beta_456"

  const mockCompanyA = {
    id: companyAId,
    name: "Alpha Corp",
    email: "billing@alpha.com",
    gstNumber: "29AAAAA1111A1Z1",
    baseCurrency: "INR",
  }

  const mockCustomersA = [
    {
      id: "cust_1",
      companyId: companyAId,
      name: "Acme Client",
      email: "client@acme.com",
      gstin: "29BBBBB2222B2Z2",
    },
  ]

  const mockInvoicesA = [
    {
      id: "inv_1",
      companyId: companyAId,
      customerId: "cust_1",
      invoiceNumber: "INV-2026-001",
      date: new Date("2026-10-01"),
      dueDate: new Date("2026-10-15"),
      currency: "INR",
      subTotal: 1000,
      totalTax: 180,
      finalAmount: 1180,
      items: [
        {
          id: "item_1",
          description: "Consulting",
          quantity: 1,
          unitPrice: 1000,
          taxPercentage: 18,
          total: 1000,
        },
      ],
      payments: [],
      statusHistory: [],
    },
  ]

  const mockQuotationsA = [
    {
      id: "quot_1",
      companyId: companyAId,
      customerId: "cust_1",
      quotationNumber: "QUO-2026-001",
      date: new Date("2026-10-01"),
      currency: "INR",
      subTotal: 500,
      totalTax: 90,
      finalAmount: 590,
      items: [],
    },
  ]

  const mockCertificatesA = [
    {
      id: "cert_1",
      companyId: companyAId,
      customerId: "cust_1",
      certificateNumber: "CERT-2026-001",
      productName: "Industrial Widget",
      date: new Date("2026-10-01"),
      testedParameters: [{ param: "Tensile", result: "Pass" }],
    },
  ]

  const mockCatalogA = [
    {
      id: "cat_1",
      companyId: companyAId,
      name: "Standard Service",
      unitPrice: 500,
      taxRate: 18,
      sku: "SKU-001",
    },
  ]

  const mockExpensesA = [
    {
      id: "exp_1",
      companyId: companyAId,
      date: new Date("2026-10-05"),
      amount: 250,
      category: "Office Supplies",
      description: "Stationery",
    },
  ]

  const mockBankAccountsA = [
    {
      id: "bank_1",
      companyId: companyAId,
      bankName: "HDFC Bank",
      accountName: "Alpha Corp",
      accountNumber: "1234567890",
      ifscCode: "HDFC0001234",
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Default company lookup
    ;(prisma.company.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === companyAId) return Promise.resolve(mockCompanyA)
      return Promise.resolve(null)
    })

    // Scoped entities
    ;(prisma.customer.findMany as any).mockImplementation(({ where }: any) => {
      if (where.companyId === companyAId) return Promise.resolve(mockCustomersA)
      return Promise.resolve([])
    })
    ;(prisma.invoice.findMany as any).mockImplementation(({ where }: any) => {
      if (where.companyId === companyAId) return Promise.resolve(mockInvoicesA)
      return Promise.resolve([])
    })
    ;(prisma.quotation.findMany as any).mockImplementation(({ where }: any) => {
      if (where.companyId === companyAId) return Promise.resolve(mockQuotationsA)
      return Promise.resolve([])
    })
    ;(prisma.testCertificate.findMany as any).mockImplementation(({ where }: any) => {
      if (where.companyId === companyAId) return Promise.resolve(mockCertificatesA)
      return Promise.resolve([])
    })
    ;(prisma.productCatalog.findMany as any).mockImplementation(({ where }: any) => {
      if (where.companyId === companyAId) return Promise.resolve(mockCatalogA)
      return Promise.resolve([])
    })
    ;(prisma.expense.findMany as any).mockImplementation(({ where }: any) => {
      if (where.companyId === companyAId) return Promise.resolve(mockExpensesA)
      return Promise.resolve([])
    })
    ;(prisma.bankAccount.findMany as any).mockImplementation(({ where }: any) => {
      if (where.companyId === companyAId) return Promise.resolve(mockBankAccountsA)
      return Promise.resolve([])
    })
  })

  // ── 1. Complete Backup Tests ────────────────────────────────────────────────
  it("should generate a complete business backup containing all 7 modules for the authenticated tenant", async () => {
    const backup = await createCompanyBackup(companyAId)

    expect(backup.metadata.version).toBe("2.0.0")
    expect(backup.metadata.companyId).toBe(companyAId)
    expect(backup.metadata.companyName).toBe("Alpha Corp")
    expect(backup.metadata.backupType).toBe("COMPLETE")
    expect(backup.metadata.checksum).toBeDefined()

    expect(backup.data.customers).toHaveLength(1)
    expect(backup.data.invoices).toHaveLength(1)
    expect(backup.data.quotations).toHaveLength(1)
    expect(backup.data.certificates).toHaveLength(1)
    expect(backup.data.catalog).toHaveLength(1)
    expect(backup.data.expenses).toHaveLength(1)
    expect(backup.data.company).toBeDefined()
    expect(backup.data.bankAccounts).toHaveLength(1)

    // Ensure database queries strictly scoped by companyId
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: companyAId }),
      })
    )
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: companyAId }),
      })
    )
  })

  // ── 2. Module-Wise Backup Tests ─────────────────────────────────────────────
  it("should generate selective module-wise backup when specific modules are requested", async () => {
    const requested: BackupModule[] = ["invoices", "catalog"]
    const backup = await createCompanyBackup(companyAId, requested)

    expect(backup.metadata.backupType).toBe("MODULE_WISE")
    expect(backup.metadata.modules).toEqual(["invoices", "catalog"])
    expect(backup.data.invoices).toBeDefined()
    expect(backup.data.catalog).toBeDefined()
    expect(backup.data.expenses).toBeUndefined()
    expect(backup.data.certificates).toBeUndefined()
  })

  // ── 3. Data Integrity & Checksum Verification ────────────────────────────────
  it("should validate intact backup files and detect payload tampering", async () => {
    const backup = await createCompanyBackup(companyAId)
    const validJson = JSON.stringify(backup, null, 2)

    // Intact file passes validation
    const validated = validateBackupFile(validJson)
    expect(validated.metadata.companyId).toBe(companyAId)

    // Tampered payload fails checksum check
    const tampered = JSON.parse(validJson)
    tampered.data.invoices[0].invoice.finalAmount = 999999
    const tamperedJson = JSON.stringify(tampered)

    expect(() => validateBackupFile(tamperedJson)).toThrow("Backup integrity check failed")
  })

  // ── 4. Restore Preview ──────────────────────────────────────────────────────
  it("should preview restore operations and identify matching existing records", async () => {
    const backup = await createCompanyBackup(companyAId)

    ;(prisma.invoice.findMany as any).mockResolvedValueOnce([
      { id: "inv_1", invoiceNumber: "INV-2026-001" },
    ])

    const preview = await previewRestore(companyAId, backup, ["invoices"])

    expect(preview.valid).toBe(true)
    const invPreview = preview.preview.find((p) => p.module === "invoices")
    expect(invPreview).toBeDefined()
    expect(invPreview?.toUpdate).toBe(1)
    expect(invPreview?.conflicts.length).toBeGreaterThan(0)
  })

  // ── 5. Restore Execution & Tenant Re-Parenting ────────────────────────────────
  it("should execute restore into target company, re-parenting all records to the authenticated tenant", async () => {
    const backup = await createCompanyBackup(companyAId)

    // Simulate restoring into company B (e.g. data migration or new branch)
    ;(prisma.company.findUnique as any).mockResolvedValue({
      id: companyBId,
      name: "Beta Corp",
    })
    ;(prisma.customer.findFirst as any).mockResolvedValue(null)
    ;(prisma.customer.create as any).mockResolvedValue({
      id: "new_cust_beta",
      companyId: companyBId,
      name: "Acme Client",
    })
    ;(prisma.invoice.findFirst as any).mockResolvedValue(null)
    ;(prisma.invoice.create as any).mockResolvedValue({
      id: "new_inv_beta",
      companyId: companyBId,
      invoiceNumber: "INV-2026-001",
    })

    const res = await executeRestore(
      companyBId,
      backup,
      ["customers", "invoices"],
      "merge",
      false
    )

    expect(res.success).toBe(true)

    // Customer created strictly under companyBId
    expect(prisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyId: companyBId }),
      })
    )

    // Invoice created strictly under companyBId
    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyId: companyBId }),
      })
    )
  })

  // ── 6. Restore Strategy: Skip Existing ──────────────────────────────────────
  it("should skip existing records without modifying them when strategy is skip_existing", async () => {
    const backup = await createCompanyBackup(companyAId)

    ;(prisma.customer.findFirst as any).mockResolvedValue({
      id: "cust_1",
      email: "client@acme.com",
      name: "Existing Client",
    })

    const res = await executeRestore(companyAId, backup, ["customers"], "skip_existing", false)

    expect(res.success).toBe(true)
    const custResult = res.results.find((r) => r.module === "customers")
    expect(custResult?.skipped).toBe(1)
    expect(prisma.customer.update).not.toHaveBeenCalled()
  })

  // ── 7. Path Traversal & Security Isolation ──────────────────────────────────
  it("should prevent path traversal when requesting server backups", async () => {
    await expect(getServerBackup(companyAId, "../../etc/passwd")).rejects.toThrow()
    await expect(deleteServerBackup(companyAId, "../../../config")).rejects.toThrow()
  })
})
