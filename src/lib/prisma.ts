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
  const { PrismaLibSql } = require("@prisma/adapter-libsql") as typeof import("@prisma/adapter-libsql")
  const adapter = new PrismaLibSql({ url: `file:${SQLITE_DB_PATH}` })
  return new PrismaClient({ adapter, log })
}

function createPostgresClient(databaseUrl: string, log: ("error" | "warn")[]): PrismaClient {
  if (databaseUrl.startsWith("prisma+postgres://") || databaseUrl.startsWith("prisma://")) {
    return new PrismaClient({ accelerateUrl: databaseUrl, log })
  }

  const { PrismaPg } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg")
  const { Pool } = require("pg") as typeof import("pg")

  // Strip ?sslmode=... from the URL — we handle SSL directly on the Pool object instead.
  // This avoids the "self-signed certificate in certificate chain" error that the pg
  // driver throws when it tries to validate cloud provider certs (Aiven, Supabase, Neon, etc.)
  const cleanUrl = databaseUrl.replace(/[?&]sslmode=[^&]*/g, "").replace(/\?$/, "")
  const requiresSsl = databaseUrl.includes("sslmode=require") || databaseUrl.includes("sslmode=no-verify") || databaseUrl.includes("sslmode=prefer")

  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
  })

  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter, log })
}

function createPrismaClient(): PrismaClient {
  const provider = getActiveProvider()
  const databaseUrl = getDatabaseUrl()
  const log: ("error" | "warn")[] =
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured")
  }

  if (provider === "sqlite") {
    return createSqliteClient(log)
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
