import "server-only"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import path from "path"
import type { DatabaseConfig, DatabaseProvider } from "@/types/database"

export type { DatabaseConfig, DatabaseProvider } from "@/types/database"

const DATA_DIR = path.join(process.cwd(), "data")
export const CONFIG_PATH = path.join(DATA_DIR, "database.config.json")
export const SQLITE_DB_PATH = path.join(DATA_DIR, "invoice.db")

export function getDatabaseConfig(): DatabaseConfig {
  if (existsSync(CONFIG_PATH)) {
    const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as DatabaseConfig
    return {
      provider: config.provider === "postgresql" ? "postgresql" : "sqlite",
      postgresqlUrl: config.postgresqlUrl,
    }
  }

  const envProvider = process.env.DATABASE_PROVIDER
  if (envProvider === "postgresql" || envProvider === "sqlite") {
    return {
      provider: envProvider,
      postgresqlUrl: process.env.DATABASE_URL,
    }
  }

  return { provider: "sqlite" }
}

export function saveDatabaseConfig(config: DatabaseConfig): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }

  writeFileSync(
    CONFIG_PATH,
    JSON.stringify(
      {
        provider: config.provider,
        ...(config.provider === "postgresql" && config.postgresqlUrl
          ? { postgresqlUrl: config.postgresqlUrl }
          : {}),
      },
      null,
      2
    )
  )
}

export function getDatabaseUrl(config: DatabaseConfig = getDatabaseConfig()): string {
  if (config.provider === "sqlite") {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }
    return `file:${SQLITE_DB_PATH}`
  }

  return (
    config.postgresqlUrl ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/invoice_saas"
  )
}

export function getActiveProvider(): DatabaseProvider {
  return getDatabaseConfig().provider
}

export function getDatabaseDisplayInfo() {
  const config = getDatabaseConfig()
  const url = getDatabaseUrl(config)

  return {
    provider: config.provider,
    url: config.provider === "sqlite" ? "data/invoice.db (local package storage)" : url,
    sqlitePath: SQLITE_DB_PATH,
    isSqlite: config.provider === "sqlite",
  }
}
