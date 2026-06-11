import "server-only"
import { PrismaClient } from "@prisma/client"
import { existsSync, mkdirSync } from "fs"
import path from "path"
import { getActiveProvider, getDatabaseUrl, SQLITE_DB_PATH } from "@/lib/database-config"

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

function createPostgresClient(databaseUrl: string, log: ("error" | "warn")[]): PrismaClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg") as typeof import("pg")

  // Cloud providers (Aiven, Supabase, Neon, etc.) require SSL but use custom certificates.
  // We MUST strip sslmode from the URL and configure ssl on the Pool object directly —
  // otherwise the pg driver's URL parser fights with our ssl config and rejects the cert.
  const cleanUrl = databaseUrl
    .replace(/[?&]sslmode=[^&]*/g, "")
    .replace(/[?&]supa=[^&]*/g, "")
    .replace(/[?&]pool_mode=[^&]*/g, "")
    .replace(/[?&]pgbouncer=[^&]*/g, "")
    .replace(/\?$/, "")
    .replace(/&$/, "")

  const needsSsl = /^postgres(ql)?s?:\/\//i.test(databaseUrl) ||
    databaseUrl.includes("sslmode=require") ||
    databaseUrl.includes("sslmode=prefer") ||
    databaseUrl.includes("aivencloud.com") ||
    databaseUrl.includes("supabase.com") ||
    databaseUrl.includes("neon.tech") ||
    databaseUrl.includes("aiven.io")

  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    // Serverless-friendly tuning: reduce max connections per instance and close idle connections aggressively
    max: process.env.NODE_ENV === "production" ? 2 : 10,
    idleTimeoutMillis: 5000, 
    connectionTimeoutMillis: 5000,
  })

  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter, log })
}

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

  return createPostgresClient(databaseUrl, log)
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

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaProvider = currentProvider
}
