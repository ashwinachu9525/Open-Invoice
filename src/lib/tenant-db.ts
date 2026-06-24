import "server-only"
import { prisma, createPostgresClient } from "./prisma"
import { PrismaClient } from "@prisma/client"
import { decrypt } from "./encryption"

// Global cache map to persist Prisma Clients across hot-reloads and requests
const globalForTenantClients = globalThis as unknown as {
  tenantClientsCache: Map<string, PrismaClient> | undefined
}

const tenantClientsCache = globalForTenantClients.tenantClientsCache ?? new Map<string, PrismaClient>()
if (process.env.NODE_ENV !== "production") {
  globalForTenantClients.tenantClientsCache = tenantClientsCache
}

// Instantiate or retrieve a cached client for a custom database URL
function getOrCreateCustomClient(companyId: string, url: string): PrismaClient {
  let client = tenantClientsCache.get(companyId)
  if (!client) {
    client = createPostgresClient(url, process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"])
    tenantClientsCache.set(companyId, client)
  }
  return client
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
      const decryptedUrl = decrypt(company.customDbUrlEncrypted)
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
