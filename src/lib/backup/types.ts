export type BackupModule =
  | "invoices"
  | "quotations"
  | "certificates"
  | "customers"
  | "catalog"
  | "expenses"
  | "settings"

export const ALL_BACKUP_MODULES: BackupModule[] = [
  "invoices",
  "quotations",
  "certificates",
  "customers",
  "catalog",
  "expenses",
  "settings",
]

export const MODULE_LABELS: Record<BackupModule, { title: string; description: string; icon: string }> = {
  invoices: {
    title: "Invoices",
    description: "Invoices, line items, payments, status history, and payment tracking",
    icon: "FileText",
  },
  quotations: {
    title: "Quotations",
    description: "Estimates, quotations, line items, and validity periods",
    icon: "FileSpreadsheet",
  },
  certificates: {
    title: "Test Certificates",
    description: "Quality certificates, batch details, parameters, and signatures",
    icon: "Award",
  },
  customers: {
    title: "Customers",
    description: "Client directory, GSTIN, billing/shipping addresses, and contacts",
    icon: "Users",
  },
  catalog: {
    title: "Product & Service Catalog",
    description: "Items, descriptions, HSN/SAC codes, prices, units, and tax rates",
    icon: "Package",
  },
  expenses: {
    title: "Expenses",
    description: "Recorded expenses, amounts, categories, dates, and receipts",
    icon: "Receipt",
  },
  settings: {
    title: "Settings & Configuration",
    description: "Company profile, tax preferences, bank accounts, reminders, and AI setup",
    icon: "Settings",
  },
}

export interface BackupMetadata {
  version: "2.0.0"
  generator: "Open-Invoice Backup Engine"
  createdAt: string
  companyId: string
  companyName: string
  backupType: "COMPLETE" | "MODULE_WISE"
  modules: BackupModule[]
  counts: Record<BackupModule, number>
  checksum: string
}

export interface BackupPayload {
  metadata: BackupMetadata
  data: {
    company?: any
    bankAccounts?: any[]
    emailSettings?: any
    reminderConfig?: any
    aiSettings?: any
    customers?: any[]
    catalog?: any[]
    invoices?: Array<{
      invoice: any
      items: any[]
      payments: any[]
      statusHistory?: any[]
    }>
    quotations?: Array<{
      quotation: any
      items: any[]
    }>
    certificates?: any[]
    expenses?: any[]
  }
}

export type RestoreStrategy = "merge" | "skip_existing" | "clean_replace"

export interface RestoreModulePreview {
  module: BackupModule
  backupCount: number
  existingCount: number
  toInsert: number
  toUpdate: number
  conflicts: string[]
}

export interface RestorePreviewResult {
  valid: boolean
  error?: string
  metadata?: BackupMetadata
  preview: RestoreModulePreview[]
  targetCompany: {
    id: string
    name: string
  }
}

export interface ModuleRestoreResult {
  module: BackupModule
  inserted: number
  updated: number
  skipped: number
  failed: number
  errors: string[]
}

export interface RestoreExecutionResult {
  success: boolean
  message: string
  error?: string
  recoveryBackupId?: string
  results: ModuleRestoreResult[]
}

export interface ServerBackupRecord {
  id: string
  fileName: string
  fileSize: number
  createdAt: string
  backupType: "COMPLETE" | "MODULE_WISE"
  modules: BackupModule[]
  counts: Record<BackupModule, number>
  companyId: string
}
