import "server-only"
import { PrismaClient } from "@prisma/client"
import { existsSync, mkdirSync } from "fs"
import path from "path"
import { getActiveProvider, getDatabaseUrl, SQLITE_DB_PATH } from "@/lib/database-config"
import {
  getSharedPool,
  createNewPool,
  getMaxPoolConnections,
  getPoolMetrics,
  checkDatabaseHealth,
  query,
  withTransaction,
  withDbRetry,
} from "@/lib/db-pool"

export {
  getSharedPool,
  getPoolMetrics,
  checkDatabaseHealth,
  query,
  withTransaction,
  withDbRetry,
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaProvider: string | undefined
}

function createSqliteClient(log: ("error" | "warn")[]): PrismaClient {
  const dataDir = path.dirname(SQLITE_DB_PATH)
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  // Lazy require avoids Turbopack bundling native better-sqlite3
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaLibSql } = require("@prisma/adapter-libsql") as typeof import("@prisma/adapter-libsql")
  const adapter = new PrismaLibSql({ url: `file:${SQLITE_DB_PATH}` })
  return new PrismaClient({ adapter, log })
}

/**
 * Creates a Prisma client backed by a dedicated PostgreSQL pool.
 * Used for custom tenant databases and connection tests.
 * Guarantees that calling client.$disconnect() will also drain and close the underlying pg.Pool.
 */
export function createPostgresClient(
  databaseUrl: string,
  log: ("error" | "warn")[],
  defaultMaxConnections = 2
): PrismaClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg")
  
  const pool = createNewPool(databaseUrl, defaultMaxConnections)
  const adapter = new PrismaPg(pool)
  const provider = getActiveProvider()
  let PrismaClientClass;

  if (provider === "sqlite") {
    // Hide from Vercel's strict Turbopack static analysis
    const getPrisma = new Function("return require('@prisma/client-postgres').PrismaClient")
    PrismaClientClass = getPrisma()
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    PrismaClientClass = require("@prisma/client").PrismaClient
  }

  const client = new PrismaClientClass({ adapter, log }) as any

  // Attach pool reference and wrap $disconnect to prevent pool leaks
  client.__pgPool = pool
  const originalDisconnect = client.$disconnect.bind(client)
  client.$disconnect = async () => {
    try {
      await originalDisconnect()
    } finally {
      await pool.end().catch((err: any) => {
        console.warn("[PostgreSQL Pool] Error closing tenant pool:", err?.message)
      })
    }
  }

  return client
}

/**
 * Creates the primary application Prisma client backed by the process-wide shared pool.
 * Enforces max 2 connections by default for Aiven Cloud Free PostgreSQL.
 */
function createPrismaClient(): PrismaClient {
  const provider = getActiveProvider()
  const databaseUrl = getDatabaseUrl()
  const log: ("error" | "warn")[] =
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]

  if (provider === "sqlite") {
    return createSqliteClient(log)
  }

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured. Set DATABASE_URL in your environment variables.")
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg")
  
  // Reuse the single shared pool (max 2 connections by default)
  const sharedPool = getSharedPool(databaseUrl)
  const adapter = new PrismaPg(sharedPool)

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient: PrismaClientClass } = require("@prisma/client")
  const client = new PrismaClientClass({ adapter, log }) as any

  // Attach shared pool reference
  client.__pgPool = sharedPool

  return client
}

const currentProvider = getActiveProvider()

if (
  globalForPrisma.prisma &&
  globalForPrisma.prismaProvider &&
  globalForPrisma.prismaProvider !== currentProvider
) {
  globalForPrisma.prisma = undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Persist prisma singleton on globalThis across all environments (including warm serverless lambdas)
globalForPrisma.prisma = prisma
globalForPrisma.prismaProvider = currentProvider
