"use server"

import { requireCompany } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import {
  ALL_BACKUP_MODULES,
  BackupModule,
  BackupPayload,
  RestoreExecutionResult,
  RestorePreviewResult,
  RestoreStrategy,
  ServerBackupRecord,
} from "@/lib/backup/types"
import {
  createCompanyBackup,
  deleteServerBackup,
  executeRestore,
  listServerBackups,
  previewRestore,
  saveServerBackup,
  validateBackupFile,
} from "@/lib/backup/backup-service"

/**
 * Returns live entity counts for the authenticated customer across all modules.
 */
export async function getBackupModuleStatsAction(): Promise<{
  success: boolean
  counts?: Record<BackupModule, number>
  error?: string
}> {
  try {
    const { company } = await requireCompany()
    const companyId = company.id

    const [
      invoicesCount,
      quotationsCount,
      certificatesCount,
      customersCount,
      catalogCount,
      expensesCount,
      bankAccountsCount,
    ] = await Promise.all([
      prisma.invoice.count({ where: { companyId, deletedAt: null } }),
      prisma.quotation.count({ where: { companyId, deletedAt: null } }),
      prisma.testCertificate.count({ where: { companyId, deletedAt: null } }),
      prisma.customer.count({ where: { companyId, deletedAt: null } }),
      prisma.productCatalog.count({ where: { companyId, deletedAt: null } }),
      prisma.expense.count({ where: { companyId } }),
      prisma.bankAccount.count({ where: { companyId } }),
    ])

    return {
      success: true,
      counts: {
        invoices: invoicesCount,
        quotations: quotationsCount,
        certificates: certificatesCount,
        customers: customersCount,
        catalog: catalogCount,
        expenses: expensesCount,
        settings: 1 + bankAccountsCount,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load module statistics" }
  }
}

/**
 * Creates a complete or module-wise backup for the authenticated customer.
 */
export async function createBackupAction(
  modules: BackupModule[] = ALL_BACKUP_MODULES,
  saveOnServer = true
): Promise<{
  success: boolean
  payload?: BackupPayload
  serverRecord?: ServerBackupRecord
  error?: string
}> {
  try {
    const { company } = await requireCompany()
    const companyId = company.id

    const selected = modules.length > 0 ? modules : ALL_BACKUP_MODULES
    const payload = await createCompanyBackup(companyId, selected)

    let serverRecord: ServerBackupRecord | undefined = undefined
    if (saveOnServer) {
      serverRecord = await saveServerBackup(companyId, payload)
    }

    return {
      success: true,
      payload,
      serverRecord,
    }
  } catch (err: any) {
    console.error("[BackupAction] createBackupAction error:", err)
    return { success: false, error: err.message || "Failed to create backup" }
  }
}

/**
 * Lists server-stored backups strictly for the authenticated customer.
 */
export async function listBackupsAction(): Promise<{
  success: boolean
  backups?: ServerBackupRecord[]
  error?: string
}> {
  try {
    const { company } = await requireCompany()
    const backups = await listServerBackups(company.id)
    return { success: true, backups }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to retrieve backup history" }
  }
}

/**
 * Deletes a server-stored backup file for the authenticated customer.
 */
export async function deleteBackupAction(backupId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { company } = await requireCompany()
    await deleteServerBackup(company.id, backupId)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete backup" }
  }
}

/**
 * Previews restore operation by validating the uploaded backup.
 */
export async function previewRestoreAction(
  rawContent: string,
  selectedModules?: BackupModule[]
): Promise<RestorePreviewResult> {
  try {
    const { company } = await requireCompany()
    const payload = validateBackupFile(rawContent)

    const modules =
      selectedModules && selectedModules.length > 0
        ? selectedModules
        : payload.metadata.modules

    return await previewRestore(company.id, payload, modules)
  } catch (err: any) {
    return {
      valid: false,
      error: err.message || "Failed to validate backup file",
      preview: [],
      targetCompany: { id: "unknown", name: "Unknown" },
    }
  }
}

/**
 * Executes restoration of data into the authenticated customer's account.
 */
export async function executeRestoreAction(
  rawContent: string,
  selectedModules: BackupModule[],
  strategy: RestoreStrategy = "merge",
  createRecoverySnapshot = true
): Promise<RestoreExecutionResult> {
  try {
    const { company } = await requireCompany()
    const payload = validateBackupFile(rawContent)

    return await executeRestore(
      company.id,
      payload,
      selectedModules,
      strategy,
      createRecoverySnapshot
    )
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Restore execution failed",
      error: err.message,
      results: [],
    }
  }
}
