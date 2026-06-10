import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.join(__dirname, "..")
export const DATA_DIR = path.join(ROOT, "data")
export const CONFIG_PATH = path.join(DATA_DIR, "database.config.json")
export const SQLITE_DB_PATH = path.join(DATA_DIR, "invoice.db")

/** @typedef {'sqlite' | 'postgresql'} DatabaseProvider */

/**
 * @returns {{ provider: DatabaseProvider, postgresqlUrl?: string }}
 */
export function getDatabaseConfig() {
  if (existsSync(CONFIG_PATH)) {
    const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"))
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

/**
 * @param {{ provider: DatabaseProvider, postgresqlUrl?: string }} config
 */
export function saveDatabaseConfig(config) {
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

export function getDatabaseUrl(config = getDatabaseConfig()) {
  if (config.provider === "sqlite") {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }
    return `file:${SQLITE_DB_PATH}`
  }

  const url =
    config.postgresqlUrl ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/invoice_saas"

  return url
}

export function getActiveProvider(config = getDatabaseConfig()) {
  return config.provider
}
