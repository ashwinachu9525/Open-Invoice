import "server-only"
import { prisma, createPostgresClient } from "./prisma"
import { PrismaClient } from "@prisma/client"
import { decrypt } from "./encryption"

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

// Extends a PrismaClient to automatically scope all data operations to a specific companyId
function scopeClientToCompany(client: any, companyId: string) {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
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
      const decryptedUrl = decrypt(company.customDbUrlEncrypted, companyId)
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
