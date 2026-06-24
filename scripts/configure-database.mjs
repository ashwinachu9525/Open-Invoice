import { execSync } from "child_process"
import { existsSync, readFileSync, writeFileSync } from "fs"
import path from "path"
import {
  ROOT,
  CONFIG_PATH,
  getDatabaseConfig,
  getDatabaseUrl,
  saveDatabaseConfig,
} from "./database-config.mjs"

const args = process.argv.slice(2)
const providerArg = args.find((a) => a.startsWith("--provider="))?.split("=")[1]

if (providerArg === "sqlite" || providerArg === "postgresql") {
  const existing = getDatabaseConfig()
  saveDatabaseConfig({
    provider: providerArg,
    postgresqlUrl: existing.postgresqlUrl,
  })
}

const config = getDatabaseConfig()
const databaseUrl = getDatabaseUrl(config)
const schemaPath = path.join(ROOT, "prisma", "schema.prisma")

let schema = readFileSync(schemaPath, "utf-8")
const datasource =
  config.provider === "sqlite"
    ? 'datasource db {\n  provider = "sqlite"\n}'
    : 'datasource db {\n  provider = "postgresql"\n}'

schema = schema.replace(/datasource db \{[^}]+\}/s, datasource)
writeFileSync(schemaPath, schema)

console.log(`Database provider: ${config.provider}`)
console.log(`Database URL: ${databaseUrl}`)

execSync("npx prisma generate", {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
})

if (config.provider === "sqlite") {
  console.log("Generating secondary PostgreSQL client for BYODB support...")
  const pgSchemaPath = path.join(ROOT, "prisma", "schema.postgres.prisma")
  let pgSchema = schema.replace(/datasource db \{[^}]+\}/s, 'datasource db {\n  provider = "postgresql"\n}')
  pgSchema = pgSchema.replace(/generator client \{/g, 'generator client {\n  output = "../node_modules/@prisma/client-postgres"')
  writeFileSync(pgSchemaPath, pgSchema)
  try {
    execSync("npx prisma generate --schema=prisma/schema.postgres.prisma", {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/postgres" },
    })
  } catch (err) {
    console.warn("Failed to generate secondary PostgreSQL client:", err.message)
  } finally {
    try {
      if (existsSync(pgSchemaPath)) {
        import("fs").then((fs) => {
          if (fs.existsSync(pgSchemaPath)) {
            fs.unlinkSync(pgSchemaPath)
          }
        })
      }
    } catch {}
  }
}

try {
  execSync("npx prisma db push", {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  })
} catch {
  console.warn("db push skipped or failed — run manually if needed")
}

if (!existsSync(CONFIG_PATH)) {
  saveDatabaseConfig(config)
}
