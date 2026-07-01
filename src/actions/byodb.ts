"use server"

import { prisma, createPostgresClient } from "@/lib/prisma"
import { requireCompany } from "@/lib/auth-helpers"
import { encrypt, decrypt } from "@/lib/encryption"
import { revalidatePath } from "next/cache"
import { PrismaClient } from "@prisma/client"
import dns from "dns"

// Check if a resolved IP address belongs to local, loopback, or private ranges
function isPrivateIp(ip: string): boolean {
  // IPv4 Loopback (127.0.0.0/8)
  if (ip.startsWith("127.")) return true
  // IPv4 Private (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  if (ip.startsWith("10.")) return true
  if (ip.startsWith("192.168.")) return true
  if (ip.startsWith("172.")) {
    const parts = ip.split(".")
    if (parts.length >= 2) {
      const secondOctet = parseInt(parts[1], 10)
      if (secondOctet >= 16 && secondOctet <= 31) return true
    }
  }
  // IPv4 Link-Local (169.254.0.0/16)
  if (ip.startsWith("169.254.")) return true
  // IPv4 Unspecified
  if (ip === "0.0.0.0") return true

  // IPv6 Loopback
  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") return true
  // IPv6 Unspecified
  if (ip === "::" || ip === "0:0:0:0:0:0:0:0") return true
  // IPv6 Link-Local (fe80::/10)
  if (ip.toLowerCase().startsWith("fe8")) return true
  if (ip.toLowerCase().startsWith("fe9")) return true
  if (ip.toLowerCase().startsWith("fea")) return true
  if (ip.toLowerCase().startsWith("feb")) return true
  // IPv6 Unique Local Address (fc00::/7)
  if (ip.toLowerCase().startsWith("fc")) return true
  if (ip.toLowerCase().startsWith("fd")) return true

  return false
}

// Perform DNS resolution and check for SSRF
async function validateHostForSsrf(host: string): Promise<{ valid: boolean; error?: string }> {
  const cleanHost = host.trim().toLowerCase()
  if (["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(cleanHost)) {
    return { valid: false, error: "Loopback and localhost addresses are forbidden for security reasons (SSRF Protection)." }
  }

  return new Promise((resolve) => {
    dns.lookup(host, (err, address) => {
      if (err) {
        resolve({ valid: false, error: `Failed to resolve database host: ${err.message}` })
        return
      }

      if (isPrivateIp(address)) {
        resolve({
          valid: false,
          error: "Connection attempts to private/internal network addresses are blocked for security reasons.",
        })
      } else {
        resolve({ valid: true })
      }
    })
  })
}

export async function getCustomDbSettings() {
  try {
    const { company } = await requireCompany()
    const encryptedUrl = company.customDbUrlEncrypted

    if (!encryptedUrl) {
      return { url: null }
    }

    const decrypted = decrypt(encryptedUrl, company.id)
    
    // Mask password and sensitive info in the connection string for UI exposure
    let maskedUrl = decrypted
    try {
      const parsedUrl = new URL(decrypted)
      if (parsedUrl.password) {
        parsedUrl.password = "******"
      }
      maskedUrl = parsedUrl.toString()
    } catch {
      // Fallback simple regex masking if URL parser fails on postgresql:// scheme in node
      maskedUrl = decrypted.replace(/:([^:@]+)@/, ":******@")
    }

    return { url: maskedUrl, isConfigured: true }
  } catch (error) {
    console.error("Failed to load custom DB settings:", error)
    return { error: "Failed to load settings" }
  }
}

export async function saveCustomDbSettings(postgresqlUrl: string | null) {
  try {
    const { company } = await requireCompany()

    if (postgresqlUrl && company.subscriptionTier !== "PRO" && company.subscriptionTier !== "ENTERPRISE") {
      return { error: "Pro subscription required to configure a custom database." }
    }

    // 1. If null, disable BYODB and fall back to global SQLite/PostgreSQL (.env)
    if (!postgresqlUrl || postgresqlUrl.trim().length === 0) {
      await prisma.company.update({
        where: { id: company.id },
        data: { customDbUrlEncrypted: null },
      })
      revalidatePath("/settings/developer")
      return { success: true, message: "Custom database disabled. Successfully fell back to main database." }
    }

    const trimmedUrl = postgresqlUrl.trim()

    // 2. Validate URL protocol
    if (!trimmedUrl.startsWith("postgresql://") && !trimmedUrl.startsWith("postgres://")) {
      return { error: "Invalid protocol. Connection string must start with 'postgresql://' or 'postgres://'." }
    }

    // 3. Extract Host for SSRF protection
    let host = ""
    try {
      const match = trimmedUrl.match(/@([^/?:#]+)/)
      if (match && match[1]) {
        // Handle port suffix if present
        host = match[1].split(":")[0]
      } else {
        return { error: "Could not parse host from connection string. Ensure format is: postgresql://user:pass@host:port/dbname" }
      }
    } catch {
      return { error: "Invalid connection string format." }
    }

    const ssrfCheck = await validateHostForSsrf(host)
    if (!ssrfCheck.valid) {
      return { error: ssrfCheck.error }
    }

    // 4. Test connection to the target database
    let testClient: PrismaClient | null = null
    try {
      // Append a query timeout parameters to prevent blocking the thread
      const connectionUrlObj = new URL(trimmedUrl)
      connectionUrlObj.searchParams.set("connect_timeout", "5")
      const testUrl = connectionUrlObj.toString()

      testClient = createPostgresClient(testUrl, ["error"])

      // Run a simple query to confirm reachability
      await testClient.$queryRawUnsafe("SELECT 1")
    } catch (dbErr: any) {
      console.error("Custom database connection test failed:", dbErr)
      return {
        error: `Database connection test failed. Make sure the database is online and accessible. Details: ${
          dbErr.message || "Timeout or credentials rejected"
        }`,
      }
    } finally {
      if (testClient) {
        await testClient.$disconnect()
      }
    }

    // 4.5. Run db push programmatically to migrate tables to the custom database
    try {
      const { execSync } = require("child_process")
      const path = require("path")
      const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma")
      
      // We push the schema using the custom PostgreSQL URL
      execSync(`npx prisma db push --schema="${schemaPath}"`, {
        env: {
          ...process.env,
          DATABASE_URL: trimmedUrl,
        },
        timeout: 30000, // 30 seconds timeout limit
      })
    } catch (migErr: any) {
      console.error("Custom database migration failed:", migErr)
      return {
        error: `Database connected, but table migration failed. Please ensure the connection URL has schema creation privileges. Details: ${
          migErr.message || "Prisma migration timed out or failed"
        }`,
      }
    }

    // 5. Encrypt and save to SaaS database
    const encrypted = encrypt(trimmedUrl, company.id)
    await prisma.company.update({
      where: { id: company.id },
      data: { customDbUrlEncrypted: encrypted },
    })

    revalidatePath("/settings/developer")
    return { success: true, message: "Custom database settings verified and saved successfully!" }
  } catch (error) {
    console.error("Failed to save custom DB settings:", error)
    return { error: "An unexpected error occurred while saving configuration" }
  }
}
