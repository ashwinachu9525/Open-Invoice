import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  testSmtpDiagnostic,
  dispatchAdminCronTask,
  getDatabaseTableMetrics,
  purgeOldSystemLogs,
  checkDomainDnsHealth,
} from "@/actions/admin-tools"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Mock Auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { count: vi.fn().mockResolvedValue(12) },
    company: {
      count: vi.fn().mockResolvedValue(8),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    invoice: {
      count: vi.fn().mockResolvedValue(45),
      create: vi.fn().mockResolvedValue({ id: "inv_123" }),
      updateMany: vi.fn().mockResolvedValue({ count: 5 }),
    },
    invoiceItem: { count: vi.fn().mockResolvedValue(120) },
    quotation: { count: vi.fn().mockResolvedValue(15) },
    payment: { count: vi.fn().mockResolvedValue(30) },
    customer: { count: vi.fn().mockResolvedValue(22) },
    auditLog: {
      count: vi.fn().mockResolvedValue(150),
      deleteMany: vi.fn().mockResolvedValue({ count: 40 }),
    },
    emailLog: { count: vi.fn().mockResolvedValue(88) },
    appError: {
      count: vi.fn().mockResolvedValue(25),
      deleteMany: vi.fn().mockResolvedValue({ count: 10 }),
    },
    webhook: { count: vi.fn().mockResolvedValue(4) },
    session: {
      count: vi.fn().mockResolvedValue(14),
      deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
    userFeedback: { count: vi.fn().mockResolvedValue(7) },
    recurringSchedule: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

// Mock Redis
vi.mock("@/lib/redis", () => ({
  flushValkeyCache: vi.fn().mockResolvedValue({ success: true, count: 5 }),
}))

// Mock Nodemailer
vi.mock("nodemailer", () => {
  return {
    default: {
      createTransport: vi.fn(() => ({
        verify: vi.fn().mockResolvedValue(true),
        sendMail: vi.fn().mockResolvedValue({ messageId: "msg_test_12345" }),
      })),
    },
  }
})

describe("Admin Tools Suite", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, ADMIN_SQL_PASSWORD: "secret_admin_pass" }
  })

  describe("Authentication Guard", () => {
    it("should reject non-super-admin users", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "u1", role: "MEMBER" },
      } as any)

      const res = await testSmtpDiagnostic({ host: "smtp.mail.com", user: "u", pass: "p" })
      expect(res.success).toBe(false)
      expect(res.error).toBe("Unauthorized")
    })
  })

  describe("SMTP Diagnostic Tester", () => {
    it("should successfully verify SMTP connection and measure latency", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "admin_1", role: "SUPER_ADMIN" },
      } as any)

      const res = await testSmtpDiagnostic({
        host: "smtp.postmarkapp.com",
        port: 587,
        user: "test-user",
        pass: "test-pass",
      })

      expect(res.success).toBe(true)
      expect(res.host).toBe("smtp.postmarkapp.com")
      expect(res.port).toBe(587)
      expect(res.handshakeDurationMs).toBeGreaterThanOrEqual(0)
      expect(res.mailSent).toBe(false)
    })

    it("should send a diagnostic email when toEmail is specified", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "admin_1", role: "SUPER_ADMIN" },
      } as any)

      const res = await testSmtpDiagnostic({
        host: "smtp.sendgrid.net",
        port: 465,
        user: "apikey",
        pass: "SG.12345",
        secure: true,
        toEmail: "recipient@company.com",
      })

      expect(res.success).toBe(true)
      expect(res.mailSent).toBe(true)
      expect(res.messageId).toBe("msg_test_12345")
    })
  })

  describe("Cron Dispatcher", () => {
    it("should reject invalid admin password", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "admin_1", role: "SUPER_ADMIN" },
      } as any)

      const res = await dispatchAdminCronTask("recurring_invoices", "wrong_pass")
      expect(res.success).toBe(false)
      expect(res.error).toBe("Incorrect Admin Secret Password")
    })

    it("should execute temp_cleanup task successfully", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "admin_1", role: "SUPER_ADMIN" },
      } as any)

      const res = await dispatchAdminCronTask("temp_cleanup", "secret_admin_pass")
      expect(res.success).toBe(true)
      expect(res.task).toBe("temp_cleanup")
      expect(res.result?.deletedSessionsCount).toBe(3)
      expect(res.result?.cacheCleared).toBe(true)
    })

    it("should execute auto_freeze task for compliant companies", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "admin_1", role: "SUPER_ADMIN" },
      } as any)

      vi.mocked(prisma.company.findMany).mockResolvedValueOnce([
        { id: "c1", name: "Alpha Corp", autoFreezeMonths: 3 } as any,
      ])

      const res = await dispatchAdminCronTask("auto_freeze", "secret_admin_pass")
      expect(res.success).toBe(true)
      expect(res.task).toBe("auto_freeze")
      expect(res.result?.evaluatedCompanies).toBe(1)
      expect(res.result?.frozenInvoices).toBe(5)
    })
  })

  describe("Database Table Footprint Inspector", () => {
    it("should return row counts for core models", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "admin_1", role: "SUPER_ADMIN" },
      } as any)

      const res = await getDatabaseTableMetrics()
      expect(res.success).toBe(true)
      expect(res.tables).toBeDefined()
      expect(res.tables?.length).toBeGreaterThan(5)
      expect(res.totalRecords).toBeGreaterThan(0)
    })
  })

  describe("Stale Log Purge Utility", () => {
    it("should enforce minimum 7-day retention threshold", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "admin_1", role: "SUPER_ADMIN" },
      } as any)

      const res = await purgeOldSystemLogs("all", 3, true, "secret_admin_pass")
      expect(res.success).toBe(false)
      expect(res.error).toContain("Retention threshold must be at least 7 days")
    })

    it("should perform dry-run count estimate without deleting records", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "admin_1", role: "SUPER_ADMIN" },
      } as any)

      const res = await purgeOldSystemLogs("all", 30, true, "secret_admin_pass")
      expect(res.success).toBe(true)
      expect(res.dryRun).toBe(true)
      expect(prisma.appError.deleteMany).not.toHaveBeenCalled()
      expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled()
    })

    it("should delete stale records when not in dry-run mode", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "admin_1", role: "SUPER_ADMIN" },
      } as any)

      const res = await purgeOldSystemLogs("all", 30, false, "secret_admin_pass")
      expect(res.success).toBe(true)
      expect(res.dryRun).toBe(false)
      expect(prisma.appError.deleteMany).toHaveBeenCalled()
      expect(prisma.auditLog.deleteMany).toHaveBeenCalled()
    })
  })

  describe("Custom Domain & DNS Inspector", () => {
    it("should clean and resolve domain DNS", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "admin_1", role: "SUPER_ADMIN" },
      } as any)

      const res = await checkDomainDnsHealth("https://example.com/path")
      expect(res.success).toBe(true)
      expect(res.domain).toBe("example.com")
      expect(res.records).toBeDefined()
    })
  })
})
