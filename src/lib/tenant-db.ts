import "server-only"
import { prisma, createPostgresClient } from "./prisma"
import { PrismaClient } from "@prisma/client"
import { decrypt, decryptAndMigrate } from "./encryption"

interface CachedTenantClient {
  client: PrismaClient
  lastUsedAt: number
}

// Global cache map to persist Prisma Clients across hot-reloads and requests
const globalForTenantClients = globalThis as unknown as {
  tenantClientsCache: Map<string, CachedTenantClient> | undefined
}

const tenantClientsCache = globalForTenantClients.tenantClientsCache ?? new Map<string, CachedTenantClient>()
if (process.env.NODE_ENV !== "production") {
  globalForTenantClients.tenantClientsCache = tenantClientsCache
}

// Instantiate or retrieve a cached client for a custom database URL
function getOrCreateCustomClient(companyId: string, url: string): PrismaClient {
  let entry = tenantClientsCache.get(companyId)
  if (!entry) {
    const client = createPostgresClient(url, process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"])
    entry = { client, lastUsedAt: Date.now() }
    tenantClientsCache.set(companyId, entry)
  } else {
    entry.lastUsedAt = Date.now()
  }
  return entry.client
}

const REAPER_INTERVAL_MS = 2 * 60 * 1000 // 2 minutes
const MAX_IDLE_AGE_MS = 5 * 60 * 1000 // 5 minutes

function runCacheReaper() {
  const now = Date.now()
  for (const [companyId, entry] of tenantClientsCache.entries()) {
    if (now - entry.lastUsedAt > MAX_IDLE_AGE_MS) {
      console.log(`[TenantDB Reaper] Disconnecting idle database client for company: ${companyId}`)
      tenantClientsCache.delete(companyId)
      entry.client.$disconnect().catch((err) => {
        console.error(`[TenantDB Reaper] Error disconnecting client for company: ${companyId}`, err)
      })
    }
  }
}

const globalForReaper = globalThis as unknown as {
  reaperIntervalId: NodeJS.Timeout | undefined
}

if (!globalForReaper.reaperIntervalId) {
  globalForReaper.reaperIntervalId = setInterval(runCacheReaper, REAPER_INTERVAL_MS)
  if (globalForReaper.reaperIntervalId.unref) {
    globalForReaper.reaperIntervalId.unref()
  }
}

import { getCompanyTimezone, getDbNow } from "./date-utils"

const companyTimezoneCache = new Map<string, string>()

async function getCachedCompanyTimezone(companyId: string): Promise<string> {
  let tz = companyTimezoneCache.get(companyId)
  if (!tz) {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { baseCurrency: true }
      })
      tz = getCompanyTimezone(company?.baseCurrency)
      companyTimezoneCache.set(companyId, tz)
    } catch {
      tz = "Asia/Kolkata"
    }
  }
  return tz ?? "Asia/Kolkata"
}

const MODEL_DATE_FIELDS: Record<string, { hasCreatedAt: boolean; hasUpdatedAt: boolean }> = {
  User: { hasCreatedAt: true, hasUpdatedAt: true },
  Company: { hasCreatedAt: true, hasUpdatedAt: true },
  Customer: { hasCreatedAt: true, hasUpdatedAt: true },
  CustomerInteraction: { hasCreatedAt: true, hasUpdatedAt: false },
  Invoice: { hasCreatedAt: true, hasUpdatedAt: true },
  InvoiceStatusHistory: { hasCreatedAt: true, hasUpdatedAt: false },
  RecurringSchedule: { hasCreatedAt: true, hasUpdatedAt: true },
  EmailSetting: { hasCreatedAt: true, hasUpdatedAt: true },
  AuditLog: { hasCreatedAt: true, hasUpdatedAt: false },
  BankAccount: { hasCreatedAt: true, hasUpdatedAt: true },
  AISettings: { hasCreatedAt: true, hasUpdatedAt: true },
  AIChatSession: { hasCreatedAt: true, hasUpdatedAt: true },
  AIChatMessage: { hasCreatedAt: true, hasUpdatedAt: false },
  ProductCatalog: { hasCreatedAt: true, hasUpdatedAt: true },
  Expense: { hasCreatedAt: true, hasUpdatedAt: true },
  Quotation: { hasCreatedAt: true, hasUpdatedAt: true },
  PushSubscription: { hasCreatedAt: true, hasUpdatedAt: false },
  UserFeedback: { hasCreatedAt: true, hasUpdatedAt: false },
  TeamInvitation: { hasCreatedAt: true, hasUpdatedAt: false },
  AppError: { hasCreatedAt: true, hasUpdatedAt: false },
  PublicFeedback: { hasCreatedAt: true, hasUpdatedAt: false },
  ApiKey: { hasCreatedAt: true, hasUpdatedAt: false },
  ReferralRedemption: { hasCreatedAt: true, hasUpdatedAt: false },
  Webhook: { hasCreatedAt: true, hasUpdatedAt: false },
  WebhookLog: { hasCreatedAt: true, hasUpdatedAt: false },
  PasswordResetToken: { hasCreatedAt: true, hasUpdatedAt: false },
  SystemConfig: { hasCreatedAt: false, hasUpdatedAt: true },
  ExchangeRate: { hasCreatedAt: false, hasUpdatedAt: true },
}

// Extends a PrismaClient to automatically scope all data operations to a specific companyId
function scopeClientToCompany(client: any, companyId: string) {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          // Automatic Date Injections
          const fields = MODEL_DATE_FIELDS[model]
          const isWrite = ["create", "createMany", "update", "updateMany", "upsert"].includes(operation)
          
          if (isWrite) {
            const tz = await getCachedCompanyTimezone(companyId)
            const dbNow = await getDbNow(client, tz)
            const typedArgs = args as any

            if (operation === "create") {
              typedArgs.data = typedArgs.data || {}
              if (fields?.hasCreatedAt && !typedArgs.data.createdAt) typedArgs.data.createdAt = dbNow
              if (fields?.hasUpdatedAt && !typedArgs.data.updatedAt) typedArgs.data.updatedAt = dbNow
              if (model === "Payment" && !typedArgs.data.date) typedArgs.data.date = dbNow
              if (model === "EmailLog" && !typedArgs.data.sentAt) typedArgs.data.sentAt = dbNow
            } 
            else if (operation === "createMany") {
              if (Array.isArray(typedArgs.data)) {
                typedArgs.data = typedArgs.data.map((item: any) => {
                  const updated = { ...item }
                  if (fields?.hasCreatedAt && !updated.createdAt) updated.createdAt = dbNow
                  if (fields?.hasUpdatedAt && !updated.updatedAt) updated.updatedAt = dbNow
                  if (model === "Payment" && !updated.date) updated.date = dbNow
                  if (model === "EmailLog" && !updated.sentAt) updated.sentAt = dbNow
                  return updated
                })
              } else if (typedArgs.data) {
                if (fields?.hasCreatedAt && !typedArgs.data.createdAt) typedArgs.data.createdAt = dbNow
                if (fields?.hasUpdatedAt && !typedArgs.data.updatedAt) typedArgs.data.updatedAt = dbNow
                if (model === "Payment" && !typedArgs.data.date) typedArgs.data.date = dbNow
                if (model === "EmailLog" && !typedArgs.data.sentAt) typedArgs.data.sentAt = dbNow
              }
            } 
            else if (operation === "update") {
              typedArgs.data = typedArgs.data || {}
              if (fields?.hasUpdatedAt && !typedArgs.data.updatedAt) typedArgs.data.updatedAt = dbNow
            } 
            else if (operation === "updateMany") {
              typedArgs.data = typedArgs.data || {}
              if (fields?.hasUpdatedAt && !typedArgs.data.updatedAt) typedArgs.data.updatedAt = dbNow
            } 
            else if (operation === "upsert") {
              typedArgs.create = typedArgs.create || {}
              typedArgs.update = typedArgs.update || {}
              if (fields?.hasCreatedAt && !typedArgs.create.createdAt) typedArgs.create.createdAt = dbNow
              if (fields?.hasUpdatedAt && !typedArgs.create.updatedAt) typedArgs.create.updatedAt = dbNow
              if (fields?.hasUpdatedAt && !typedArgs.update.updatedAt) typedArgs.update.updatedAt = dbNow
              if (model === "Payment" && !typedArgs.create.date) typedArgs.create.date = dbNow
              if (model === "EmailLog" && !typedArgs.create.sentAt) typedArgs.create.sentAt = dbNow
            }
          }

          // List of models that should NOT be tenant-scoped
          const globalModels = [
            "User",
            "Account",
            "Session",
            "VerificationToken",
            "Authenticator",
            "PasswordResetToken",
            "Company",
            "TeamInvitation",
            "CustomerInteraction",
            "InvoiceStatusHistory",
            "QuotationStatusHistory",
            "InvoiceItem",
            "QuotationItem",
            "AIChatMessage",
            "RecurringSchedule",
            "WebhookLog",
            "ExchangeRate",
          ]

          if (globalModels.includes(model)) {
            return query(args)
          }

          const typedArgs = args as any

          // Scope READ/UPDATE/DELETE operations
          if (
            [
              "findUnique",
              "findFirst",
              "findMany",
              "update",
              "updateMany",
              "delete",
              "deleteMany",
              "count",
              "aggregate",
              "groupBy",
            ].includes(operation)
          ) {
            typedArgs.where = { ...typedArgs.where, companyId }
          }

          // Scope CREATE operations
          if (["create", "createMany"].includes(operation)) {
            if (operation === "create") {
              typedArgs.data = { ...typedArgs.data, companyId }
            } else if (operation === "createMany") {
              if (Array.isArray(typedArgs.data)) {
                typedArgs.data = typedArgs.data.map((d: any) => ({
                  ...d,
                  companyId,
                }))
              } else {
                typedArgs.data = { ...typedArgs.data, companyId }
              }
            }
          }

          // Scope UPSERT operations
          if (["upsert"].includes(operation)) {
            typedArgs.where = { ...typedArgs.where, companyId }
            typedArgs.create = { ...typedArgs.create, companyId }
          }

          return query(typedArgs)
        },
      },
    },
  })
}

/**
 * Creates or retrieves a strictly isolated Prisma Client for a specific tenant (Company).
 * Resolves the tenant's custom database if configured, falling back to the default database.
 */
export async function getTenantDb(companyId: string) {
  let targetClient: any = prisma

  try {
    // Fetch custom connection details from the main database
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { customDbUrlEncrypted: true },
    })

    if (company?.customDbUrlEncrypted) {
      const decryptedUrl = await decryptAndMigrate(
        company.customDbUrlEncrypted,
        companyId,
        async (newCipherText) => {
          await prisma.company.update({
            where: { id: companyId },
            data: { customDbUrlEncrypted: newCipherText }
          })
          console.log(`[Key Rotation] Automatically migrated database connection URL for company: ${companyId}`)
        }
      )
      if (decryptedUrl) {
        targetClient = getOrCreateCustomClient(companyId, decryptedUrl)
      }
    }
  } catch (error) {
    console.error(`Failed to resolve tenant database client for company ${companyId}. Falling back to default database.`, error)
  }

  // Return the client wrapped with multi-tenant query row security
  return scopeClientToCompany(targetClient, companyId)
}
