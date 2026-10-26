import "dotenv/config"
import { defineConfig } from "prisma/config"
import { existsSync, mkdirSync, readFileSync } from "fs"
import path from "path"

function getDatabaseUrl(): string {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma")
  const schemaContent = existsSync(schemaPath) ? readFileSync(schemaPath, "utf-8") : ""
  const isPostgresSchema = schemaContent.includes('provider = "postgresql"')

  if (isPostgresSchema) {
    return (
      process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL ||
      "postgresql://postgres:postgres@localhost:5432/invoice_saas"
    )
  }

  // SQLite schema
  const dataDir = path.join(process.cwd(), "data")
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  return process.env.DATABASE_URL || `file:${path.join(dataDir, "invoice.db")}`
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDatabaseUrl(),
  },
})
