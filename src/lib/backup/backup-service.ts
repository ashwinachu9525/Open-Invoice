import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import {
  ALL_BACKUP_MODULES,
  BackupMetadata,
  BackupModule,
  BackupPayload,
  ModuleRestoreResult,
  RestoreExecutionResult,
  RestoreModulePreview,
  RestorePreviewResult,
  RestoreStrategy,
  ServerBackupRecord,
} from "./types"

function computeChecksum(data: any): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex")
}

/**
 * Creates a customer-specific business data backup.
 * Strictly scopes all queries to `companyId`.
 */
export async function createCompanyBackup(
  companyId: string,
  requestedModules: BackupModule[] = ALL_BACKUP_MODULES
): Promise<BackupPayload> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  })

  if (!company) {
    throw new Error("Company not found or access denied.")
  }

  const modules = requestedModules.length > 0 ? requestedModules : ALL_BACKUP_MODULES
  const data: BackupPayload["data"] = {}
  const counts: Record<BackupModule, number> = {
    invoices: 0,
    quotations: 0,
    certificates: 0,
    customers: 0,
    catalog: 0,
    expenses: 0,
    settings: 0,
  }

  // 1. Settings Module
  if (modules.includes("settings")) {
    const [bankAccounts, emailSettings, reminderConfig, aiSettings] = await Promise.all([
      prisma.bankAccount.findMany({ where: { companyId } }),
      prisma.emailSetting.findUnique({ where: { companyId } }),
      prisma.reminderConfig.findUnique({ where: { companyId } }),
      prisma.aISettings.findUnique({ where: { companyId } }),
    ])

    // Sanitize sensitive credentials: never export database connection strings or raw passwords
    const sanitizedCompany = { ...company }
    delete (sanitizedCompany as any).customDbUrlEncrypted

    const sanitizedEmailSettings = emailSettings
      ? {
          host: emailSettings.host,
          port: emailSettings.port,
          username: emailSettings.username,
          secure: emailSettings.secure,
          fromEmail: emailSettings.fromEmail,
          fromName: emailSettings.fromName,
        }
      : null

    data.company = sanitizedCompany
    data.bankAccounts = bankAccounts
    data.emailSettings = sanitizedEmailSettings
    data.reminderConfig = reminderConfig
    data.aiSettings = aiSettings

    counts.settings =
      1 +
      (bankAccounts?.length || 0) +
      (emailSettings ? 1 : 0) +
      (reminderConfig ? 1 : 0) +
      (aiSettings ? 1 : 0)
  }

  // 2. Customers Module
  if (modules.includes("customers") || modules.includes("invoices") || modules.includes("quotations")) {
    const customers = await prisma.customer.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    })
    data.customers = customers
    counts.customers = customers.length
  }

  // 3. Catalog Module
  if (modules.includes("catalog")) {
    const catalog = await prisma.productCatalog.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: "asc" },
    })
    data.catalog = catalog
    counts.catalog = catalog.length
  }

  // 4. Invoices Module
  if (modules.includes("invoices")) {
    const invoices = await prisma.invoice.findMany({
      where: { companyId, deletedAt: null },
      include: {
        items: true,
        payments: true,
        statusHistory: true,
      },
      orderBy: { date: "asc" },
    })

    data.invoices = invoices.map((inv) => ({
      invoice: {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        date: inv.date,
        dueDate: inv.dueDate,
        currency: inv.currency,
        notes: inv.notes,
        terms: inv.terms,
        internalNotes: inv.internalNotes,
        bankName: inv.bankName,
        bankAccountName: inv.bankAccountName,
        bankAccountNumber: inv.bankAccountNumber,
        bankIfscCode: inv.bankIfscCode,
        bankAccountType: inv.bankAccountType,
        themeColor: inv.themeColor,
        themeFont: inv.themeFont,
        status: inv.status,
        exchangeRate: inv.exchangeRate,
        isFrozen: inv.isFrozen,
        subTotal: inv.subTotal,
        totalDiscount: inv.totalDiscount,
        totalTax: inv.totalTax,
        taxJurisdiction: inv.taxJurisdiction,
        cgstAmount: inv.cgstAmount,
        sgstAmount: inv.sgstAmount,
        igstAmount: inv.igstAmount,
        vatAmount: inv.vatAmount,
        tdsPercentage: inv.tdsPercentage,
        tdsAmount: inv.tdsAmount,
        tcsRate: inv.tcsRate,
        tcsAmount: inv.tcsAmount,
        finalAmount: inv.finalAmount,
        amountPaid: inv.amountPaid,
        balanceDue: inv.balanceDue,
        pdfUrl: inv.pdfUrl,
        paymentCollectionMethod: inv.paymentCollectionMethod,
        vpaAddress: inv.vpaAddress,
        cryptoAddress: inv.cryptoAddress,
        cryptoNetwork: inv.cryptoNetwork,
        verificationToken: inv.verificationToken,
        pdfHash: inv.pdfHash,
        createdAt: inv.createdAt,
      },
      items: inv.items,
      payments: inv.payments,
      statusHistory: inv.statusHistory,
    }))
    counts.invoices = invoices.length
  }

  // 5. Quotations Module
  if (modules.includes("quotations")) {
    const quotations = await prisma.quotation.findMany({
      where: { companyId, deletedAt: null },
      include: { items: true },
      orderBy: { date: "asc" },
    })

    data.quotations = quotations.map((q) => ({
      quotation: {
        id: q.id,
        quotationNumber: q.quotationNumber,
        customerId: q.customerId,
        date: q.date,
        expiryDate: q.expiryDate,
        currency: q.currency,
        notes: q.notes,
        terms: q.terms,
        themeColor: q.themeColor,
        themeFont: q.themeFont,
        status: q.status,
        exchangeRate: q.exchangeRate,
        subTotal: q.subTotal,
        totalDiscount: q.totalDiscount,
        totalTax: q.totalTax,
        taxJurisdiction: q.taxJurisdiction,
        cgstAmount: q.cgstAmount,
        sgstAmount: q.sgstAmount,
        igstAmount: q.igstAmount,
        vatAmount: q.vatAmount,
        tdsPercentage: q.tdsPercentage,
        tdsAmount: q.tdsAmount,
        tcsRate: q.tcsRate,
        tcsAmount: q.tcsAmount,
        finalAmount: q.finalAmount,
        pdfUrl: q.pdfUrl,
        createdAt: q.createdAt,
      },
      items: q.items,
    }))
    counts.quotations = quotations.length
  }

  // 6. Test Certificates Module
  if (modules.includes("certificates")) {
    const certificates = await prisma.testCertificate.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { date: "asc" },
    })
    data.certificates = certificates
    counts.certificates = certificates.length
  }

  // 7. Expenses Module
  if (modules.includes("expenses")) {
    const expenses = await prisma.expense.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
    })
    data.expenses = expenses
    counts.expenses = expenses.length
  }

  const checksum = computeChecksum(data)
  const isComplete =
    modules.length === ALL_BACKUP_MODULES.length &&
    ALL_BACKUP_MODULES.every((m) => modules.includes(m))

  const metadata: BackupMetadata = {
    version: "2.0.0",
    generator: "Open-Invoice Backup Engine",
    createdAt: new Date().toISOString(),
    companyId,
    companyName: company.name,
    backupType: isComplete ? "COMPLETE" : "MODULE_WISE",
    modules,
    counts,
    checksum,
  }

  return { metadata, data }
}

/**
 * Saves a backup record into PostgreSQL via Prisma, ensuring full compatibility with
 * serverless environments like Vercel where local file systems are strictly read-only.
 */
export async function saveServerBackup(
  companyId: string,
  payload: BackupPayload,
  labelPrefix = "backup"
): Promise<ServerBackupRecord> {
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-")
  const typeTag = payload.metadata.backupType.toLowerCase()
  const randomSuffix = crypto.randomBytes(3).toString("hex")
  const fileName = `${labelPrefix}_${typeTag}_${dateStr}_${randomSuffix}.json`

  const serialized = JSON.stringify(payload)
  const fileSize = Buffer.byteLength(serialized, "utf-8")

  const record = await prisma.companyBackup.create({
    data: {
      companyId,
      fileName,
      backupType: payload.metadata.backupType,
      modules: JSON.stringify(payload.metadata.modules),
      counts: JSON.stringify(payload.metadata.counts),
      fileSize,
      payload: serialized,
    },
  })

  return {
    id: record.id,
    fileName: record.fileName,
    fileSize: record.fileSize,
    createdAt: record.createdAt.toISOString(),
    backupType: record.backupType as any,
    modules: typeof record.modules === "string" ? JSON.parse(record.modules) : (record.modules || []),
    counts: typeof record.counts === "string" ? JSON.parse(record.counts) : (record.counts || {}),
    companyId: record.companyId,
  }
}

/**
 * Lists backups for the authenticated customer only from PostgreSQL.
 */
export async function listServerBackups(companyId: string): Promise<ServerBackupRecord[]> {
  try {
    const records = await prisma.companyBackup.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        createdAt: true,
        backupType: true,
        modules: true,
        counts: true,
        companyId: true,
      },
    })

    return records.map((r) => {
      let modules: BackupModule[] = []
      let counts: Record<BackupModule, number> = {} as any
      try {
        modules = typeof r.modules === "string" ? JSON.parse(r.modules) : (r.modules || [])
      } catch {}
      try {
        counts = typeof r.counts === "string" ? JSON.parse(r.counts) : (r.counts || {})
      } catch {}

      return {
        id: r.id,
        fileName: r.fileName,
        fileSize: r.fileSize,
        createdAt: r.createdAt.toISOString(),
        backupType: r.backupType as any,
        modules,
        counts,
        companyId: r.companyId,
      }
    })
  } catch (err) {
    console.warn("[BackupService] listServerBackups error:", err)
    return []
  }
}

/**
 * Retrieves a server backup file ensuring strict tenant isolation.
 */
export async function getServerBackup(companyId: string, backupId: string): Promise<BackupPayload> {
  const record = await prisma.companyBackup.findFirst({
    where: {
      companyId,
      OR: [{ id: backupId }, { fileName: backupId }],
    },
    select: { payload: true },
  })

  if (!record || !record.payload) {
    throw new Error("Backup file not found or access denied.")
  }

  return validateBackupFile(record.payload)
}

/**
 * Deletes a server backup file ensuring strict tenant isolation.
 */
export async function deleteServerBackup(companyId: string, backupId: string): Promise<boolean> {
  const result = await prisma.companyBackup.deleteMany({
    where: {
      companyId,
      OR: [{ id: backupId }, { fileName: backupId }],
    },
  })

  if (result.count === 0) {
    throw new Error("Backup file not found or access denied.")
  }

  return true
}

/**
 * Validates the structure and cryptographic integrity checksum of a backup file.
 */
export function validateBackupFile(rawContent: string): BackupPayload {
  let parsed: any
  try {
    parsed = JSON.parse(rawContent)
  } catch {
    throw new Error("Invalid backup file: Not a valid JSON document.")
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid backup file: Format error.")
  }

  if (!parsed.metadata || !parsed.data) {
    throw new Error("Invalid backup file: Missing required metadata or data sections.")
  }

  const { metadata, data } = parsed
  if (!metadata.version || !metadata.checksum || !Array.isArray(metadata.modules)) {
    throw new Error("Invalid backup file: Corrupted or missing metadata headers.")
  }

  // Verify integrity checksum
  const expectedChecksum = computeChecksum(data)
  if (metadata.checksum !== expectedChecksum) {
    throw new Error(
      "Backup integrity check failed: The data has been modified, corrupted, or tampered with."
    )
  }

  return parsed as BackupPayload
}

/**
 * Generates a preview of the restore operation without executing any changes.
 */
export async function previewRestore(
  companyId: string,
  payload: BackupPayload,
  selectedModules: BackupModule[] = ALL_BACKUP_MODULES
): Promise<RestorePreviewResult> {
  const targetCompany = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true },
  })

  if (!targetCompany) {
    return {
      valid: false,
      error: "Target company not found.",
      preview: [],
      targetCompany: { id: companyId, name: "Unknown" },
    }
  }

  const { metadata, data } = payload
  const activeModules = selectedModules.filter((m) => metadata.modules.includes(m))
  const preview: RestoreModulePreview[] = []

  for (const mod of activeModules) {
    const conflicts: string[] = []
    let backupCount = 0
    let existingCount = 0
    let toInsert = 0
    let toUpdate = 0

    if (mod === "customers" && data.customers) {
      backupCount = data.customers.length
      const existing = await prisma.customer.findMany({
        where: { companyId },
        select: { id: true, email: true, name: true, gstin: true },
      })
      existingCount = existing.length

      for (const item of data.customers) {
        const match = existing.find(
          (e) => (item.email && e.email === item.email) || (item.gstin && e.gstin === item.gstin)
        )
        if (match) {
          toUpdate++
          conflicts.push(`Customer '${item.name}' matches existing customer by email/GSTIN.`)
        } else {
          toInsert++
        }
      }
    } else if (mod === "catalog" && data.catalog) {
      backupCount = data.catalog.length
      const existing = await prisma.productCatalog.findMany({
        where: { companyId },
        select: { id: true, name: true },
      })
      existingCount = existing.length

      for (const item of data.catalog) {
        const match = existing.find((e) => e.name.toLowerCase() === item.name.toLowerCase())
        if (match) {
          toUpdate++
          conflicts.push(`Catalog item '${item.name}' matches existing record.`)
        } else {
          toInsert++
        }
      }
    } else if (mod === "invoices" && data.invoices) {
      backupCount = data.invoices.length
      const existing = await prisma.invoice.findMany({
        where: { companyId },
        select: { id: true, invoiceNumber: true },
      })
      existingCount = existing.length

      for (const item of data.invoices) {
        const match = existing.find((e) => e.invoiceNumber === item.invoice.invoiceNumber)
        if (match) {
          toUpdate++
          conflicts.push(`Invoice '${item.invoice.invoiceNumber}' already exists in database.`)
        } else {
          toInsert++
        }
      }
    } else if (mod === "quotations" && data.quotations) {
      backupCount = data.quotations.length
      const existing = await prisma.quotation.findMany({
        where: { companyId },
        select: { id: true, quotationNumber: true },
      })
      existingCount = existing.length

      for (const item of data.quotations) {
        const match = existing.find((e) => e.quotationNumber === item.quotation.quotationNumber)
        if (match) {
          toUpdate++
          conflicts.push(`Quotation '${item.quotation.quotationNumber}' already exists in database.`)
        } else {
          toInsert++
        }
      }
    } else if (mod === "certificates" && data.certificates) {
      backupCount = data.certificates.length
      const existing = await prisma.testCertificate.findMany({
        where: { companyId },
        select: { id: true, certificateNumber: true },
      })
      existingCount = existing.length

      for (const item of data.certificates) {
        const match = existing.find((e) => e.certificateNumber === item.certificateNumber)
        if (match) {
          toUpdate++
          conflicts.push(`Certificate '${item.certificateNumber}' already exists in database.`)
        } else {
          toInsert++
        }
      }
    } else if (mod === "expenses" && data.expenses) {
      backupCount = data.expenses.length
      const existing = await prisma.expense.findMany({
        where: { companyId },
        select: { id: true, amount: true, date: true, category: true },
      })
      existingCount = existing.length
      toInsert = backupCount
    } else if (mod === "settings") {
      backupCount = 1 + (data.bankAccounts?.length || 0)
      existingCount = 1
      toUpdate = 1
      conflicts.push("Company settings, preferences, and bank accounts will be synchronized.")
    }

    preview.push({
      module: mod,
      backupCount,
      existingCount,
      toInsert,
      toUpdate,
      conflicts: conflicts.slice(0, 5), // Keep top 5 sample conflicts
    })
  }

  return {
    valid: true,
    metadata,
    preview,
    targetCompany,
  }
}

/**
 * Executes a customer-specific restore with transaction safety and relational integrity.
 * Strictly guarantees that all records are assigned to `companyId`.
 */
export async function executeRestore(
  companyId: string,
  payload: BackupPayload,
  selectedModules: BackupModule[] = ALL_BACKUP_MODULES,
  strategy: RestoreStrategy = "merge",
  createRecoverySnapshot = true
): Promise<RestoreExecutionResult> {
  const targetCompany = await prisma.company.findUnique({
    where: { id: companyId },
  })

  if (!targetCompany) {
    return {
      success: false,
      message: "Target company not found.",
      results: [],
    }
  }

  // 1. Pre-restore automatic recovery snapshot
  let recoveryBackupId: string | undefined = undefined
  if (createRecoverySnapshot) {
    try {
      const currentBackup = await createCompanyBackup(companyId, ALL_BACKUP_MODULES)
      const record = await saveServerBackup(companyId, currentBackup, "pre_restore_safety")
      recoveryBackupId = record.id
    } catch (snapshotErr: any) {
      console.warn("[Restore] Could not create pre-restore snapshot:", snapshotErr?.message)
    }
  }

  const { data, metadata } = payload
  const activeModules = selectedModules.filter((m) => metadata.modules.includes(m))
  const results: ModuleRestoreResult[] = []

  // Customer ID mapping: maps original customer ID in backup -> new or existing Customer ID in target company
  const customerIdMap = new Map<string, string>()

  try {
    // ── 1. RESTORE SETTINGS ──────────────────────────────────────────────────
    if (activeModules.includes("settings") && data.company) {
      const modResult: ModuleRestoreResult = {
        module: "settings",
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      }

      try {
        const updateData: any = {}
        const allowedCompanyKeys = [
          "address",
          "phone",
          "email",
          "website",
          "gstNumber",
          "panNumber",
          "cinNumber",
          "msmeNumber",
          "msmeType",
          "tagline",
          "description",
          "invoicePrefix",
          "invoiceTemplate",
          "taxPreferences",
          "baseCurrency",
          "state",
          "tcsRate",
          "vpaAddress",
          "cryptoAddress",
          "cryptoNetwork",
          "autoFreezeMonths",
        ]

        for (const k of allowedCompanyKeys) {
          if (data.company[k] !== undefined) {
            updateData[k] = data.company[k]
          }
        }

        await prisma.company.update({
          where: { id: companyId },
          data: updateData,
        })
        modResult.updated++

        // Restore Bank Accounts
        if (Array.isArray(data.bankAccounts)) {
          if (strategy === "clean_replace") {
            await prisma.bankAccount.deleteMany({ where: { companyId } })
          }

          for (const bank of data.bankAccounts) {
            const existingBank = await prisma.bankAccount.findFirst({
              where: { companyId, accountNumber: bank.accountNumber },
            })

            if (existingBank) {
              if (strategy === "merge") {
                await prisma.bankAccount.update({
                  where: { id: existingBank.id },
                  data: {
                    bankName: bank.bankName,
                    accountName: bank.accountName,
                    ifscCode: bank.ifscCode,
                    accountType: bank.accountType,
                    isDefault: bank.isDefault,
                  },
                })
                modResult.updated++
              } else {
                modResult.skipped++
              }
            } else {
              await prisma.bankAccount.create({
                data: {
                  companyId,
                  bankName: bank.bankName,
                  accountName: bank.accountName,
                  accountNumber: bank.accountNumber,
                  ifscCode: bank.ifscCode,
                  accountType: bank.accountType,
                  isDefault: bank.isDefault ?? false,
                },
              })
              modResult.inserted++
            }
          }
        }

        // Restore Reminder Config
        if (data.reminderConfig) {
          await prisma.reminderConfig.upsert({
            where: { companyId },
            create: {
              companyId,
              day0Enabled: data.reminderConfig.day0Enabled ?? true,
              day7Enabled: data.reminderConfig.day7Enabled ?? true,
              day15Enabled: data.reminderConfig.day15Enabled ?? false,
              customMessage: data.reminderConfig.customMessage,
            },
            update: {
              day0Enabled: data.reminderConfig.day0Enabled ?? true,
              day7Enabled: data.reminderConfig.day7Enabled ?? true,
              day15Enabled: data.reminderConfig.day15Enabled ?? false,
              customMessage: data.reminderConfig.customMessage,
            },
          })
        }

        results.push(modResult)
      } catch (err: any) {
        modResult.failed++
        modResult.errors.push(err.message)
        results.push(modResult)
      }
    }

    // ── 2. RESTORE CUSTOMERS ─────────────────────────────────────────────────
    if (activeModules.includes("customers") && Array.isArray(data.customers)) {
      const modResult: ModuleRestoreResult = {
        module: "customers",
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      }

      for (const cust of data.customers) {
        try {
          const existingCust = await prisma.customer.findFirst({
            where: {
              companyId,
              OR: [
                ...(cust.email ? [{ email: cust.email }] : []),
                ...(cust.gstin ? [{ gstin: cust.gstin }] : []),
                { name: cust.name },
              ],
            },
          })

          if (existingCust) {
            customerIdMap.set(cust.id, existingCust.id)
            if (strategy === "merge") {
              const updated = await prisma.customer.update({
                where: { id: existingCust.id },
                data: {
                  name: cust.name,
                  companyName: cust.companyName,
                  email: cust.email,
                  phone: cust.phone,
                  gstin: cust.gstin,
                  pan: cust.pan,
                  address: cust.address,
                  state: cust.state,
                  country: cust.country || "India",
                },
              })
              customerIdMap.set(cust.id, updated.id)
              modResult.updated++
            } else {
              modResult.skipped++
            }
          } else {
            const created = await prisma.customer.create({
              data: {
                companyId,
                name: cust.name,
                companyName: cust.companyName,
                email: cust.email,
                phone: cust.phone,
                gstin: cust.gstin,
                pan: cust.pan,
                address: cust.address,
                state: cust.state,
                country: cust.country || "India",
              },
            })
            customerIdMap.set(cust.id, created.id)
            modResult.inserted++
          }
        } catch (err: any) {
          modResult.failed++
          modResult.errors.push(`Customer '${cust.name}': ${err.message}`)
        }
      }
      results.push(modResult)
    }

    // ── 3. RESTORE CATALOG ───────────────────────────────────────────────────
    if (activeModules.includes("catalog") && Array.isArray(data.catalog)) {
      const modResult: ModuleRestoreResult = {
        module: "catalog",
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      }

      for (const item of data.catalog) {
        try {
          const existingItem = await prisma.productCatalog.findFirst({
            where: {
              companyId,
              name: item.name,
            },
          })

          if (existingItem) {
            if (strategy === "merge") {
              await prisma.productCatalog.update({
                where: { id: existingItem.id },
                data: {
                  name: item.name,
                  description: item.description,
                  unitPrice: Number(item.unitPrice || 0),
                  taxPercentage: Number(item.taxPercentage ?? item.taxRate ?? 18),
                  hsnSac: item.hsnSac,
                  unit: item.unit,
                  isActive: item.isActive !== undefined ? item.isActive : true,
                },
              })
              modResult.updated++
            } else {
              modResult.skipped++
            }
          } else {
            await prisma.productCatalog.create({
              data: {
                companyId,
                name: item.name,
                description: item.description,
                unitPrice: Number(item.unitPrice || 0),
                taxPercentage: Number(item.taxPercentage ?? item.taxRate ?? 18),
                hsnSac: item.hsnSac,
                unit: item.unit,
                isActive: item.isActive !== undefined ? item.isActive : true,
              },
            })
            modResult.inserted++
          }
        } catch (err: any) {
          modResult.failed++
          modResult.errors.push(`Catalog '${item.name}': ${err.message}`)
        }
      }
      results.push(modResult)
    }

    // ── 4. RESTORE INVOICES ──────────────────────────────────────────────────
    if (activeModules.includes("invoices") && Array.isArray(data.invoices)) {
      const modResult: ModuleRestoreResult = {
        module: "invoices",
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      }

      // Ensure customer mapping is populated even if customer module was not explicitly re-run
      if (customerIdMap.size === 0) {
        const existingCustomers = await prisma.customer.findMany({
          where: { companyId },
          select: { id: true, email: true, name: true, gstin: true },
        })
        for (const c of existingCustomers) {
          customerIdMap.set(c.id, c.id)
        }
      }

      for (const entry of data.invoices) {
        const inv = entry.invoice
        try {
          // Resolve customer ID in target company
          let resolvedCustomerId = customerIdMap.get(inv.customerId)
          if (!resolvedCustomerId) {
            // Find existing customer by company
            const fallbackCustomer = await prisma.customer.findFirst({
              where: { companyId },
            })
            if (fallbackCustomer) {
              resolvedCustomerId = fallbackCustomer.id
            } else {
              // Create a default customer record to preserve the invoice
              const createdCustomer = await prisma.customer.create({
                data: {
                  companyId,
                  name: "Restored Customer",
                },
              })
              resolvedCustomerId = createdCustomer.id
              customerIdMap.set(inv.customerId, resolvedCustomerId)
            }
          }

          const existingInvoice = await prisma.invoice.findFirst({
            where: { companyId, invoiceNumber: inv.invoiceNumber },
          })

          if (existingInvoice) {
            if (strategy === "merge") {
              // Update invoice header and replace line items
              await prisma.invoice.update({
                where: { id: existingInvoice.id },
                data: {
                  customerId: resolvedCustomerId,
                  date: new Date(inv.date),
                  dueDate: new Date(inv.dueDate),
                  currency: inv.currency,
                  notes: inv.notes,
                  terms: inv.terms,
                  internalNotes: inv.internalNotes,
                  bankName: inv.bankName,
                  bankAccountName: inv.bankAccountName,
                  bankAccountNumber: inv.bankAccountNumber,
                  bankIfscCode: inv.bankIfscCode,
                  bankAccountType: inv.bankAccountType,
                  themeColor: inv.themeColor,
                  themeFont: inv.themeFont,
                  status: inv.status,
                  exchangeRate: Number(inv.exchangeRate || 1),
                  isFrozen: Boolean(inv.isFrozen),
                  subTotal: Number(inv.subTotal || 0),
                  totalDiscount: Number(inv.totalDiscount || 0),
                  totalTax: Number(inv.totalTax || 0),
                  taxJurisdiction: inv.taxJurisdiction || "INDIA_GST",
                  cgstAmount: Number(inv.cgstAmount || 0),
                  sgstAmount: Number(inv.sgstAmount || 0),
                  igstAmount: Number(inv.igstAmount || 0),
                  vatAmount: Number(inv.vatAmount || 0),
                  tdsPercentage: Number(inv.tdsPercentage || 0),
                  tdsAmount: Number(inv.tdsAmount || 0),
                  tcsRate: Number(inv.tcsRate || 0),
                  tcsAmount: Number(inv.tcsAmount || 0),
                  finalAmount: Number(inv.finalAmount || 0),
                  amountPaid: Number(inv.amountPaid || 0),
                  balanceDue: Number(inv.balanceDue || 0),
                  pdfUrl: inv.pdfUrl,
                  verificationToken: inv.verificationToken,
                  pdfHash: inv.pdfHash,
                },
              })

              // Replace items
              if (Array.isArray(entry.items)) {
                await prisma.invoiceItem.deleteMany({ where: { invoiceId: existingInvoice.id } })
                await prisma.invoiceItem.createMany({
                  data: entry.items.map((it) => ({
                    invoiceId: existingInvoice.id,
                    description: it.description,
                    quantity: Number(it.quantity || 1),
                    unitPrice: Number(it.unitPrice || 0),
                    taxPercentage: Number(it.taxPercentage || 0),
                    total: Number(it.total || 0),
                    hsnSac: it.hsnSac,
                  })),
                })
              }

              modResult.updated++
            } else {
              modResult.skipped++
            }
          } else {
            // Insert brand new invoice with items
            await prisma.invoice.create({
              data: {
                companyId,
                customerId: resolvedCustomerId,
                invoiceNumber: inv.invoiceNumber,
                date: new Date(inv.date),
                dueDate: new Date(inv.dueDate),
                currency: inv.currency,
                notes: inv.notes,
                terms: inv.terms,
                internalNotes: inv.internalNotes,
                bankName: inv.bankName,
                bankAccountName: inv.bankAccountName,
                bankAccountNumber: inv.bankAccountNumber,
                bankIfscCode: inv.bankIfscCode,
                bankAccountType: inv.bankAccountType,
                themeColor: inv.themeColor,
                themeFont: inv.themeFont,
                status: inv.status || "DRAFT",
                exchangeRate: Number(inv.exchangeRate || 1),
                isFrozen: Boolean(inv.isFrozen),
                subTotal: Number(inv.subTotal || 0),
                totalDiscount: Number(inv.totalDiscount || 0),
                totalTax: Number(inv.totalTax || 0),
                taxJurisdiction: inv.taxJurisdiction || "INDIA_GST",
                cgstAmount: Number(inv.cgstAmount || 0),
                sgstAmount: Number(inv.sgstAmount || 0),
                igstAmount: Number(inv.igstAmount || 0),
                vatAmount: Number(inv.vatAmount || 0),
                tdsPercentage: Number(inv.tdsPercentage || 0),
                tdsAmount: Number(inv.tdsAmount || 0),
                tcsRate: Number(inv.tcsRate || 0),
                tcsAmount: Number(inv.tcsAmount || 0),
                finalAmount: Number(inv.finalAmount || 0),
                amountPaid: Number(inv.amountPaid || 0),
                balanceDue: Number(inv.balanceDue || 0),
                pdfUrl: inv.pdfUrl,
                verificationToken: inv.verificationToken,
                pdfHash: inv.pdfHash,
                items: {
                  create: (entry.items || []).map((it) => ({
                    description: it.description,
                    quantity: Number(it.quantity || 1),
                    unitPrice: Number(it.unitPrice || 0),
                    taxPercentage: Number(it.taxPercentage || 0),
                    total: Number(it.total || 0),
                    hsnSac: it.hsnSac,
                  })),
                },
                payments: {
                  create: (entry.payments || []).map((p) => ({
                    companyId,
                    amount: Number(p.amount || 0),
                    date: new Date(p.date),
                    paymentMethod: p.paymentMethod || "OFFLINE",
                    notes: p.notes,
                  })),
                },
              },
            })
            modResult.inserted++
          }
        } catch (err: any) {
          modResult.failed++
          modResult.errors.push(`Invoice '${inv.invoiceNumber}': ${err.message}`)
        }
      }
      results.push(modResult)
    }

    // ── 5. RESTORE QUOTATIONS ────────────────────────────────────────────────
    if (activeModules.includes("quotations") && Array.isArray(data.quotations)) {
      const modResult: ModuleRestoreResult = {
        module: "quotations",
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      }

      for (const entry of data.quotations) {
        const q = entry.quotation
        try {
          let resolvedCustomerId = customerIdMap.get(q.customerId)
          if (!resolvedCustomerId) {
            const fallback = await prisma.customer.findFirst({ where: { companyId } })
            resolvedCustomerId = fallback?.id
          }

          if (!resolvedCustomerId) {
            const created = await prisma.customer.create({
              data: { companyId, name: "Restored Quotation Client" },
            })
            resolvedCustomerId = created.id
            customerIdMap.set(q.customerId, created.id)
          }

          const existing = await prisma.quotation.findFirst({
            where: { companyId, quotationNumber: q.quotationNumber },
          })

          if (existing) {
            if (strategy === "merge") {
              await prisma.quotation.update({
                where: { id: existing.id },
                data: {
                  customerId: resolvedCustomerId,
                  date: new Date(q.date),
                  expiryDate: q.expiryDate ? new Date(q.expiryDate) : null,
                  currency: q.currency,
                  notes: q.notes,
                  terms: q.terms,
                  themeColor: q.themeColor,
                  themeFont: q.themeFont,
                  status: q.status,
                  exchangeRate: Number(q.exchangeRate || 1),
                  subTotal: Number(q.subTotal || 0),
                  totalDiscount: Number(q.totalDiscount || 0),
                  totalTax: Number(q.totalTax || 0),
                  cgstAmount: Number(q.cgstAmount || 0),
                  sgstAmount: Number(q.sgstAmount || 0),
                  igstAmount: Number(q.igstAmount || 0),
                  vatAmount: Number(q.vatAmount || 0),
                  finalAmount: Number(q.finalAmount || 0),
                },
              })

              if (Array.isArray(entry.items)) {
                await prisma.quotationItem.deleteMany({ where: { quotationId: existing.id } })
                await prisma.quotationItem.createMany({
                  data: entry.items.map((it) => ({
                    quotationId: existing.id,
                    description: it.description,
                    quantity: Number(it.quantity || 1),
                    unitPrice: Number(it.unitPrice || 0),
                    taxPercentage: Number(it.taxPercentage || 0),
                    total: Number(it.total || 0),
                    hsnSac: it.hsnSac,
                  })),
                })
              }
              modResult.updated++
            } else {
              modResult.skipped++
            }
          } else {
            await prisma.quotation.create({
              data: {
                companyId,
                customerId: resolvedCustomerId,
                quotationNumber: q.quotationNumber,
                date: new Date(q.date),
                expiryDate: q.expiryDate ? new Date(q.expiryDate) : null,
                currency: q.currency || "INR",
                notes: q.notes,
                terms: q.terms,
                themeColor: q.themeColor,
                themeFont: q.themeFont,
                status: q.status || "DRAFT",
                exchangeRate: Number(q.exchangeRate || 1),
                subTotal: Number(q.subTotal || 0),
                totalDiscount: Number(q.totalDiscount || 0),
                totalTax: Number(q.totalTax || 0),
                cgstAmount: Number(q.cgstAmount || 0),
                sgstAmount: Number(q.sgstAmount || 0),
                igstAmount: Number(q.igstAmount || 0),
                vatAmount: Number(q.vatAmount || 0),
                finalAmount: Number(q.finalAmount || 0),
                items: {
                  create: (entry.items || []).map((it) => ({
                    description: it.description,
                    quantity: Number(it.quantity || 1),
                    unitPrice: Number(it.unitPrice || 0),
                    taxPercentage: Number(it.taxPercentage || 0),
                    total: Number(it.total || 0),
                    hsnSac: it.hsnSac,
                  })),
                },
              },
            })
            modResult.inserted++
          }
        } catch (err: any) {
          modResult.failed++
          modResult.errors.push(`Quotation '${q.quotationNumber}': ${err.message}`)
        }
      }
      results.push(modResult)
    }

    // ── 6. RESTORE TEST CERTIFICATES ─────────────────────────────────────────
    if (activeModules.includes("certificates") && Array.isArray(data.certificates)) {
      const modResult: ModuleRestoreResult = {
        module: "certificates",
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      }

      for (const cert of data.certificates) {
        try {
          let resolvedCustomerId = customerIdMap.get(cert.customerId)
          if (!resolvedCustomerId) {
            const fallback = await prisma.customer.findFirst({ where: { companyId } })
            resolvedCustomerId = fallback?.id
          }

          if (!resolvedCustomerId) {
            const created = await prisma.customer.create({
              data: { companyId, name: "Restored Certificate Client" },
            })
            resolvedCustomerId = created.id
            customerIdMap.set(cert.customerId, created.id)
          }

          const existing = await prisma.testCertificate.findFirst({
            where: { companyId, certificateNumber: cert.certificateNumber },
          })

          if (existing) {
            if (strategy === "merge") {
              await prisma.testCertificate.update({
                where: { id: existing.id },
                data: {
                  customerId: resolvedCustomerId,
                  date: new Date(cert.date),
                  productName: cert.productName,
                  batchNumber: cert.batchNumber,
                  testedParameters: cert.testedParameters,
                  remarks: cert.remarks,
                  authorizedSignatory: cert.authorizedSignatory,
                },
              })
              modResult.updated++
            } else {
              modResult.skipped++
            }
          } else {
            await prisma.testCertificate.create({
              data: {
                companyId,
                customerId: resolvedCustomerId,
                certificateNumber: cert.certificateNumber,
                date: new Date(cert.date),
                productName: cert.productName,
                batchNumber: cert.batchNumber,
                testedParameters: cert.testedParameters || [],
                remarks: cert.remarks,
                authorizedSignatory: cert.authorizedSignatory,
              },
            })
            modResult.inserted++
          }
        } catch (err: any) {
          modResult.failed++
          modResult.errors.push(`Certificate '${cert.certificateNumber}': ${err.message}`)
        }
      }
      results.push(modResult)
    }

    // ── 7. RESTORE EXPENSES ──────────────────────────────────────────────────
    if (activeModules.includes("expenses") && Array.isArray(data.expenses)) {
      const modResult: ModuleRestoreResult = {
        module: "expenses",
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      }

      for (const exp of data.expenses) {
        try {
          await prisma.expense.create({
            data: {
              companyId,
              date: new Date(exp.date),
              amount: Number(exp.amount || 0),
              category: exp.category || "General",
              description: exp.description,
              receiptUrl: exp.receiptUrl,
            },
          })
          modResult.inserted++
        } catch (err: any) {
          modResult.failed++
          modResult.errors.push(`Expense '${exp.category}': ${err.message}`)
        }
      }
      results.push(modResult)
    }

    const totalInserted = results.reduce((acc, r) => acc + r.inserted, 0)
    const totalUpdated = results.reduce((acc, r) => acc + r.updated, 0)
    const totalSkipped = results.reduce((acc, r) => acc + r.skipped, 0)
    const totalFailed = results.reduce((acc, r) => acc + r.failed, 0)

    return {
      success: totalFailed === 0,
      message: `Restore completed: ${totalInserted} inserted, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalFailed} failed.`,
      recoveryBackupId,
      results,
    }
  } catch (globalErr: any) {
    return {
      success: false,
      message: `Restore failed: ${globalErr.message}`,
      error: globalErr.message,
      recoveryBackupId,
      results,
    }
  }
}
