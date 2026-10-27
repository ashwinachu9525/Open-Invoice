"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath, revalidateTag } from "next/cache"
import { getSystemConfig as getDbSystemConfig } from "@/lib/system-config"
import { getNextRunDate } from "@/lib/date-utils"
import fs from "fs"
import path from "path"
import os from "os"


type LlmProvider = "openai" | "gemini" | "nvidia"

export async function verifyLlmKey(provider: LlmProvider, key: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }

  if (!key || key.trim() === "") {
    return { success: false, error: "API key is required." }
  }

  try {
    let response;

    switch (provider) {
      case "openai":
        // Check standard models endpoint
        response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${key.trim()}` },
        })
        break

      case "gemini":
        // Check Gemini models endpoint
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key.trim()}`)
        break

      case "nvidia":
        // Check Nvidia NIM endpoints
        response = await fetch("https://integrate.api.nvidia.com/v1/models", {
          headers: { Authorization: `Bearer ${key.trim()}` },
        })
        break
        
      default:
        return { success: false, error: "Invalid provider selected." }
    }

    if (response.ok) {
      return { success: true, message: `Successfully connected to ${provider.toUpperCase()}. The key is valid and active.` }
    } else {
      const errorText = await response.text()
      console.error(`LLM verification failed for ${provider}:`, errorText)
      return { success: false, error: `Invalid key. Server responded with status: ${response.status}` }
    }
  } catch (error: any) {
    console.error(`LLM verification exception for ${provider}:`, error)
    return { success: false, error: `Connection failed: ${error.message}` }
  }
}

export async function getReferralRedemptions() {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized")
  }

  const redemptions = await prisma.referralRedemption.findMany({
    include: {
      referrer: {
        select: {
          id: true,
          name: true,
          email: true,
          companyId: true,
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  // Since referredUserId doesn't have a direct relation in schema, query the referred users manually
  const referredUserIds = redemptions.map(r => r.referredUserId)
  const referredUsers = await prisma.user.findMany({
    where: { id: { in: referredUserIds } },
    select: {
      id: true,
      name: true,
      email: true,
      companyId: true,
    }
  })

  // Map to create a simple array with both referrer and referred user information
  const mapped = redemptions.map(redemption => {
    const referredUser = referredUsers.find(u => u.id === redemption.referredUserId)
    return {
      id: redemption.id,
      referralCode: redemption.referralCode,
      rewardGranted: redemption.rewardGranted,
      proGrantedAt: redemption.proGrantedAt,
      createdAt: redemption.createdAt,
      referrer: redemption.referrer,
      referredUser: referredUser || {
        id: redemption.referredUserId,
        name: "Unknown User",
        email: "unknown@example.com",
        companyId: null,
      }
    }
  })

  return mapped
}

export async function revokeReferralRedemption(redemptionId: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const redemption = await prisma.referralRedemption.findUnique({
      where: { id: redemptionId },
      include: {
        referrer: true,
      }
    })

    if (!redemption) {
      return { success: false, error: "Redemption record not found." }
    }

    const updates: any[] = []

    // 1. Check & Revoke Pro status for referred user
    const referredUser = await prisma.user.findUnique({
      where: { id: redemption.referredUserId },
    })

    if (referredUser) {
      updates.push(
        prisma.user.update({
          where: { id: redemption.referredUserId },
          data: {
            isPro: false,
            proExpiry: null,
            referredBy: null, // clear referred status so they can use it again if needed
          }
        })
      )

      // 2. Revoke company subscription for referred user
      if (referredUser.companyId) {
        const referredCompany = await prisma.company.findUnique({
          where: { id: referredUser.companyId }
        })
        if (referredCompany) {
          updates.push(
            prisma.company.update({
              where: { id: referredUser.companyId },
              data: {
                subscriptionTier: "FREE",
                trialStartsAt: null,
                trialEndsAt: null,
              }
            })
          )
        }
      }
    }

    // 3. Check & Revoke Pro status for referrer
    const referrer = await prisma.user.findUnique({
      where: { id: redemption.referrerId },
    })

    if (referrer) {
      updates.push(
        prisma.user.update({
          where: { id: redemption.referrerId },
          data: {
            isPro: false,
            proExpiry: null,
            referralRewardClaimed: false,
          }
        })
      )

      // 4. Revoke company subscription for referrer
      if (referrer.companyId) {
        const referrerCompany = await prisma.company.findUnique({
          where: { id: referrer.companyId }
        })
        if (referrerCompany) {
          updates.push(
            prisma.company.update({
              where: { id: referrer.companyId },
              data: {
                subscriptionTier: "FREE",
                trialStartsAt: null,
                trialEndsAt: null,
              }
            })
          )
        }
      }
    }

    // 5. Delete the redemption record
    updates.push(
      prisma.referralRedemption.delete({
        where: { id: redemptionId }
      })
    )

    await prisma.$transaction(updates)

    revalidatePath("/admin/tools")
    return { success: true, message: "Referral reward successfully revoked." }
  } catch (error: any) {
    console.error("Failed to revoke referral redemption:", error)
    return { success: false, error: error.message || "Failed to revoke referral reward." }
  }
}

export async function executeAdminSqlQuery(query: string, passwordSecret: string, isDml: boolean = false) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }

  const adminPassword = process.env.ADMIN_SQL_PASSWORD
  if (!adminPassword || passwordSecret !== adminPassword) {
    return { success: false, error: "Incorrect SQL Admin Secret Password" }
  }

  if (!query || query.trim() === "") {
    return { success: false, error: "SQL query is required." }
  }

  try {
    if (isDml) {
      const affectedRows = await prisma.$executeRawUnsafe(query)
      return { 
        success: true, 
        columns: ["Affected Rows"], 
        rows: [{ "Affected Rows": affectedRows }] 
      }
    } else {
      const rawResult = await prisma.$queryRawUnsafe(query)
      
      let rows: any[] = []
      let columns: string[] = []

      if (Array.isArray(rawResult)) {
        rows = rawResult
        if (rawResult.length > 0) {
          columns = Object.keys(rawResult[0])
        }
      } else {
        rows = [rawResult]
        columns = ["Result"]
      }

      return { success: true, columns, rows }
    }
  } catch (error: any) {
    console.error("Raw SQL Execution failed:", error)
    return { success: false, error: error.message || "SQL statement failed to execute." }
  }
}

export async function changeUserRole(userId: string, newRole: string, passwordSecret: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }
  const adminPassword = process.env.ADMIN_SQL_PASSWORD
  if (!adminPassword || passwordSecret !== adminPassword) {
    return { success: false, error: "Incorrect Admin Secret Password" }
  }
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole as any }
    })
    revalidatePath("/admin/users")
    return { success: true, message: "User role updated successfully." }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update user role." }
  }
}

export async function toggleUserBlock(userId: string, currentStatus: boolean, passwordSecret: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }
  const adminPassword = process.env.ADMIN_SQL_PASSWORD
  if (!adminPassword || passwordSecret !== adminPassword) {
    return { success: false, error: "Incorrect Admin Secret Password" }
  }
  try {
    const nextStatus = !currentStatus
    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: nextStatus }
    })
    await prisma.auditLog.create({
      data: {
        companyId: "system",
        userId: session.user.id!,
        action: nextStatus ? "USER_BLOCKED" : "USER_UNBLOCKED",
        entity: "User",
        entityId: userId,
      }
    }).catch(() => {})
    revalidatePath("/admin/users")
    return { success: true, message: `User successfully ${nextStatus ? "blocked" : "unblocked"}.` }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update block status." }
  }
}

export async function toggleUserPro(userId: string, currentStatus: boolean, passwordSecret: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }
  const adminPassword = process.env.ADMIN_SQL_PASSWORD
  if (!adminPassword || passwordSecret !== adminPassword) {
    return { success: false, error: "Incorrect Admin Secret Password" }
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    })
    const nextStatus = !currentStatus
    const proExpiry = nextStatus ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null
    await prisma.user.update({
      where: { id: userId },
      data: { isPro: nextStatus, proExpiry }
    })
    if (user?.companyId) {
      await prisma.company.update({
        where: { id: user.companyId },
        data: {
          subscriptionTier: nextStatus ? "PRO" : "FREE",
          trialStartsAt: nextStatus ? new Date() : null,
          trialEndsAt: nextStatus ? proExpiry : null,
        }
      })
    }
    revalidatePath("/admin/users")
    return { success: true, message: `User plan successfully updated to ${nextStatus ? "PRO" : "FREE"}.` }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update Pro status." }
  }
}

export async function updateCompanySubscription(companyId: string, tier: string, trialEndsAtStr: string | null, passwordSecret: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }
  const adminPassword = process.env.ADMIN_SQL_PASSWORD
  if (!adminPassword || passwordSecret !== adminPassword) {
    return { success: false, error: "Incorrect Admin Secret Password" }
  }
  try {
    const trialEndsAt = trialEndsAtStr ? new Date(trialEndsAtStr) : null
    const data: any = {
      subscriptionTier: tier,
      trialEndsAt
    }
    if (trialEndsAt) {
      data.trialStartsAt = new Date()
    } else {
      data.trialStartsAt = null
    }
    await prisma.company.update({
      where: { id: companyId },
      data
    })
    // Update users matching company's Pro/Free tier
    const isPro = tier === "PRO" || tier === "ENTERPRISE"
    const proExpiry = isPro ? (trialEndsAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) : null
    await prisma.user.updateMany({
      where: { companyId },
      data: {
        isPro,
        proExpiry
      }
    })
    revalidatePath("/admin")
    return { success: true, message: "Company subscription tier updated successfully." }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update company subscription." }
  }
}

export async function bulkImportData(type: "users" | "companies" | "invoices", data: any[], passwordSecret: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }
  const adminPassword = process.env.ADMIN_SQL_PASSWORD
  if (!adminPassword || passwordSecret !== adminPassword) {
    return { success: false, error: "Incorrect Admin Secret Password" }
  }
  if (!Array.isArray(data) || data.length === 0) {
    return { success: false, error: "No data provided to import." }
  }
  try {
    let importedCount = 0
    if (type === "users") {
      const queries = data.map(item => {
        return prisma.user.upsert({
          where: { email: item.email },
          update: {
            name: item.name || undefined,
            role: item.role as any || undefined,
            isPro: item.isPro === true || item.isPro === "true",
          },
          create: {
            email: item.email,
            name: item.name || "Imported User",
            role: item.role as any || "MEMBER",
            isPro: item.isPro === true || item.isPro === "true",
          }
        })
      })
      await prisma.$transaction(queries)
      importedCount = data.length
      revalidatePath("/admin/users")
    } else if (type === "companies") {
      const queries = data.map(item => {
        return prisma.company.create({
          data: {
            name: item.name || "Imported Company",
            subscriptionTier: item.subscriptionTier || "FREE",
          }
        })
      })
      await prisma.$transaction(queries)
      importedCount = data.length
      revalidatePath("/admin")
    } else if (type === "invoices") {
      const queries: any[] = []
      for (const item of data) {
        if (!item.companyId) {
          throw new Error("companyId is required for all imported invoices.")
        }
        let customerId = item.customerId
        if (!customerId) {
          // Find or create a default customer for this company
          const defaultCustomer = await prisma.customer.findFirst({
            where: { companyId: item.companyId }
          })
          if (defaultCustomer) {
            customerId = defaultCustomer.id
          } else {
            const newCustomer = await prisma.customer.create({
              data: {
                companyId: item.companyId,
                name: "Default Imported Customer",
                email: "imported-customer@example.com"
              }
            })
            customerId = newCustomer.id
          }
        }

        const amt = parseFloat(item.amount) || parseFloat(item.finalAmount) || 0
        queries.push(
          prisma.invoice.create({
            data: {
              invoiceNumber: item.invoiceNumber || `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              subTotal: parseFloat(item.subTotal) || amt,
              finalAmount: amt,
              balanceDue: parseFloat(item.balanceDue) || amt,
              amountPaid: parseFloat(item.amountPaid) || 0,
              totalTax: parseFloat(item.totalTax) || 0,
              status: item.status || "DRAFT",
              date: item.date ? new Date(item.date) : new Date(),
              dueDate: item.dueDate ? new Date(item.dueDate) : new Date(),
              companyId: item.companyId,
              customerId: customerId,
            }
          })
        )
      }
      await prisma.$transaction(queries)
      importedCount = data.length
      revalidatePath("/admin")
    }
    return { success: true, count: importedCount, message: `Successfully imported ${importedCount} records.` }
  } catch (error: any) {
    console.error("Bulk Import failed:", error)
    return { success: false, error: error.message || "Failed during bulk import transaction." }
  }
}

export async function executeSqlScript(script: string, passwordSecret: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }
  const adminPassword = process.env.ADMIN_SQL_PASSWORD
  if (!adminPassword || passwordSecret !== adminPassword) {
    return { success: false, error: "Incorrect SQL Admin Secret Password" }
  }
  if (!script || script.trim() === "") {
    return { success: false, error: "SQL script is empty." }
  }
  try {
    const statements = script
      .split(";")
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith("--"))
    
    let successCount = 0
    const errors: string[] = []

    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement)
        successCount++
      } catch (err: any) {
        errors.push(`Error executing statement "${statement.substring(0, 50)}...": ${err.message}`)
      }
    }

    if (errors.length > 0) {
      return { 
        success: false, 
        message: `Executed ${successCount} statements. Failed on ${errors.length} statements.`, 
        error: errors.join("\n") 
      }
    }

    return { success: true, message: `Successfully executed all ${successCount} SQL statements.` }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to execute SQL script." }
  }
}

export async function getSystemConfig() {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized")
  }
  return await getDbSystemConfig()
}

export async function updateSystemConfig(config: any, passwordSecret: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }
  const adminPassword = process.env.ADMIN_SQL_PASSWORD
  if (!adminPassword || passwordSecret !== adminPassword) {
    return { success: false, error: "Incorrect Admin Secret Password" }
  }
  try {
    await prisma.systemConfig.upsert({
      where: { id: 1 },
      update: {
        maintenanceMode: !!config.maintenanceMode,
        registrationOpen: !!config.registrationOpen,
        systemLogLevel: String(config.systemLogLevel || "info"),
        requireEmailVerification: !!config.requireEmailVerification,
      },
      create: {
        id: 1,
        maintenanceMode: !!config.maintenanceMode,
        registrationOpen: !!config.registrationOpen,
        systemLogLevel: String(config.systemLogLevel || "info"),
        requireEmailVerification: !!config.requireEmailVerification,
      },
    })
    revalidatePath("/admin/settings")
    revalidateTag("system-config", "default")
    return { success: true, message: "System settings updated successfully." }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save system settings." }
  }
}

export async function getSystemDiagnostics() {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized")
  }
  try {
    const [
      users,
      companies,
      invoices,
      quotations,
      payments,
      auditLogs,
      appErrors,
      emailLogs
    ] = await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.invoice.count(),
      prisma.quotation.count(),
      prisma.payment.count(),
      prisma.auditLog.count(),
      prisma.appError.count(),
      prisma.emailLog.count()
    ])

    const uptime = process.uptime()
    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()
    const usedMemory = totalMemory - freeMemory

    return {
      stats: {
        users,
        companies,
        invoices,
        quotations,
        payments,
        auditLogs,
        appErrors,
        emailLogs
      },
      diagnostics: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptimeSeconds: Math.floor(uptime),
        totalMemoryMB: Math.floor(totalMemory / (1024 * 1024)),
        usedMemoryMB: Math.floor(usedMemory / (1024 * 1024)),
        cpuCores: os.cpus().length,
        loadAverage: os.loadavg()
      }
    }
  } catch (error: any) {
    console.error("Failed to fetch diagnostics:", error)
    throw new Error("Failed to fetch diagnostics.")
  }
}

export async function inspectApiKeyAdmin(keyOrHint: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }
  
  if (!keyOrHint || keyOrHint.trim() === "") {
    return { success: false, error: "API Key or hint is required" }
  }

  try {
    let keyHash = ""
    let keyRecord = null
    const trimmed = keyOrHint.trim()

    try {
      const { hashToken } = await import("@/lib/crypto")
      keyHash = hashToken(trimmed)
      keyRecord = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { company: true }
      })
    } catch (e) {
      // ignore
    }

    if (!keyRecord) {
      keyRecord = await prisma.apiKey.findFirst({
        where: {
          OR: [
            { keyHint: { contains: trimmed } },
            { id: trimmed }
          ]
        },
        include: { company: true }
      })
    }

    if (!keyRecord) {
      return { success: false, error: "API Key not found by key value, hint, or ID." }
    }

    return {
      success: true,
      data: {
        id: keyRecord.id,
        name: keyRecord.name,
        keyHint: keyRecord.keyHint,
        companyName: keyRecord.company.name,
        companyId: keyRecord.companyId,
        isActive: keyRecord.isActive,
        createdAt: keyRecord.createdAt.toISOString(),
        expiresAt: keyRecord.expiresAt ? keyRecord.expiresAt.toISOString() : null
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to inspect API key." }
  }
}

export async function toggleApiKeyActiveAdmin(keyId: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }
  try {
    const existing = await prisma.apiKey.findUnique({ where: { id: keyId } })
    if (!existing) return { success: false, error: "API Key not found" }
    
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: !existing.isActive }
    })
    
    return { success: true, message: `API Key is now ${!existing.isActive ? "active" : "inactive"}.` }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update API Key." }
  }
}

export async function exportDatabaseBackup(passwordSecret: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }
  const adminPassword = process.env.ADMIN_SQL_PASSWORD
  if (!adminPassword || passwordSecret !== adminPassword) {
    return { success: false, error: "Incorrect Admin Secret Password" }
  }

  try {
    const [
      users,
      companies,
      customers,
      invoices,
      invoiceItems,
      payments,
      quotations,
      quotationItems,
      catalogs,
      expenses,
      auditLogs,
      appErrors,
      webhooks
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.company.findMany(),
      prisma.customer.findMany(),
      prisma.invoice.findMany(),
      prisma.invoiceItem.findMany(),
      prisma.payment.findMany(),
      prisma.quotation.findMany(),
      prisma.quotationItem.findMany(),
      prisma.productCatalog.findMany(),
      prisma.expense.findMany(),
      prisma.auditLog.findMany(),
      prisma.appError.findMany(),
      prisma.webhook.findMany()
    ])

    const backupData = {
      version: "1.1.0",
      timestamp: new Date().toISOString(),
      databaseProvider: process.env.DATABASE_PROVIDER || "postgresql",
      tables: {
        users,
        companies,
        customers,
        invoices,
        invoiceItems,
        payments,
        quotations,
        quotationItems,
        catalogs,
        expenses,
        auditLogs,
        appErrors,
        webhooks
      }
    }

    return { success: true, backup: JSON.stringify(backupData, null, 2) }
  } catch (error: any) {
    console.error("Backup failed:", error)
    return { success: false, error: error.message || "Failed to generate database backup." }
  }
}

export async function flushRedisCacheAdmin(pattern: string = "*") {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }
  try {
    const { flushValkeyCache } = await import("@/lib/redis")
    const res = await flushValkeyCache(pattern)
    revalidatePath("/admin/tools")
    revalidatePath("/admin/health")
    return res
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to invalidate Redis cache." }
  }
}

export async function getSystemHealthCheck() {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized")
  }

  try {
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const usedPercentage = Math.round((usedMem / totalMem) * 100)
    const procMem = process.memoryUsage()

    // Test Database Latency
    const dbStart = Date.now()
    let dbStatus = "healthy"
    let dbLatencyMs = 0
    try {
      await prisma.$queryRaw`SELECT 1`
      dbLatencyMs = Date.now() - dbStart
    } catch (e) {
      dbStatus = "error"
      dbLatencyMs = -1
    }

    // Test Redis Status & Latency
    const { redis } = await import("@/lib/redis")
    let redisStatus = "disabled"
    let redisLatencyMs = 0
    if (redis) {
      const redisStart = Date.now()
      try {
        await redis.ping()
        redisLatencyMs = Date.now() - redisStart
        redisStatus = "healthy"
      } catch (e) {
        redisStatus = "error"
      }
    }

    // Query active sessions and active user count
    const [activeSessions, totalUsers, activeUsers24h] = await Promise.all([
      prisma.session.count({
        where: { expires: { gt: new Date() } }
      }),
      prisma.user.count({
        where: { deletedAt: null }
      }),
      prisma.user.count({
        where: {
          updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      })
    ])

    const cpus = os.cpus()
    const loadAvg = os.loadavg()

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || "Generic CPU",
        speed: cpus[0]?.speed || 0,
        loadAvg,
      },
      memory: {
        totalMB: Math.floor(totalMem / (1024 * 1024)),
        freeMB: Math.floor(freeMem / (1024 * 1024)),
        usedMB: Math.floor(usedMem / (1024 * 1024)),
        usedPercentage,
        processRssMB: Math.floor(procMem.rss / (1024 * 1024)),
        heapUsedMB: Math.floor(procMem.heapUsed / (1024 * 1024)),
        heapTotalMB: Math.floor(procMem.heapTotal / (1024 * 1024)),
      },
      users: {
        activeSessions,
        activeUsers24h,
        totalUsers,
      },
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
          provider: process.env.DATABASE_PROVIDER || "sqlite",
          pool: (await import("@/lib/db-pool")).getPoolMetrics(),
        },
        redis: {
          status: redisStatus,
          latencyMs: redisLatencyMs,
          isConfigured: !!(process.env.VALKEY_URL || process.env.REDIS_URL),
        }
      }
    }
  } catch (error: any) {
    console.error("Health check error:", error)
    throw new Error(error.message || "Failed to fetch health metrics.")
  }
}

export async function testSmtpDiagnostic(params: {
  host?: string
  port?: number
  user?: string
  pass?: string
  secure?: boolean
  toEmail?: string
}) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }

  const host = params.host || process.env.APP_SMTP_HOST
  const port = params.port || Number(process.env.APP_SMTP_PORT) || 587
  const user = params.user || process.env.APP_SMTP_USER
  const pass = params.pass || process.env.APP_SMTP_PASS
  const secure = params.secure !== undefined ? params.secure : port === 465

  if (!host || !user || !pass) {
    return {
      success: false,
      error: "Missing SMTP configuration. Provide host, user, and password or configure APP_SMTP_* environment variables."
    }
  }

  const startTime = Date.now()
  try {
    const nodemailer = (await import("nodemailer")).default
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    })

    // 1. Verify connection & credentials
    await transporter.verify()
    const verifyDuration = Date.now() - startTime

    let mailSent = false
    let mailDuration = 0
    let messageId: string | null = null

    // 2. Optional test email send
    if (params.toEmail && params.toEmail.trim()) {
      const sendStart = Date.now()
      const appName = process.env.NEXT_PUBLIC_APP_NAME || "Open-Invoice"
      const info = await transporter.sendMail({
        from: `"${appName} Diagnostic" <${user}>`,
        to: params.toEmail.trim(),
        subject: `[Diagnostic Test] SMTP Connection Verified - ${appName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="display: inline-block; padding: 6px 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #059669; margin-bottom: 16px;">
              SMTP HANDSHAKE VERIFIED
            </div>
            <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px;">Open-Invoice SMTP Diagnostic Test</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
              This diagnostic email confirms that your outgoing mail server is properly connected, authenticated, and capable of delivering outbound invoices and campaign emails.
            </p>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b;">SMTP Host:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #0f172a; text-align: right;">${host}:${port}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b;">Security:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #0f172a; text-align: right;">${secure ? "SSL/TLS (Port 465)" : "STARTTLS"}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b;">Handshake Latency:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #059669; text-align: right;">${verifyDuration} ms</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Dispatched At:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #0f172a; text-align: right;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
        `
      })
      mailSent = true
      mailDuration = Date.now() - sendStart
      messageId = info.messageId
    }

    return {
      success: true,
      host,
      port,
      secure,
      user,
      handshakeDurationMs: verifyDuration,
      mailSent,
      mailDurationMs: mailDuration,
      messageId,
      message: mailSent
        ? `SMTP handshake successful (${verifyDuration}ms). Diagnostic test email delivered to ${params.toEmail} (${mailDuration}ms).`
        : `SMTP server connected and authenticated successfully in ${verifyDuration}ms.`
    }
  } catch (err: any) {
    return {
      success: false,
      host,
      port,
      user,
      error: err.message || "Failed to establish SMTP connection.",
      code: err.code || "UNKNOWN_ERROR",
      command: err.command || null,
      response: err.response || null
    }
  }
}

export async function dispatchAdminCronTask(
  task: "recurring_invoices" | "auto_freeze" | "trial_check" | "temp_cleanup",
  passwordSecret: string,
  options?: { force?: boolean }
) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }

  const adminPassword = process.env.ADMIN_SQL_PASSWORD
  if (!adminPassword || passwordSecret !== adminPassword) {
    return { success: false, error: "Incorrect Admin Secret Password" }
  }

  const startTime = Date.now()

  try {
    if (task === "recurring_invoices") {
      const isForce = Boolean(options?.force)
      const schedules = await prisma.recurringSchedule.findMany({
        where: { status: "ACTIVE" },
        include: {
          invoice: {
            include: {
              items: true,
              customer: true,
              company: { include: { users: true } },
            },
          },
        },
      })

      let generated = 0
      let skipped = 0
      const now = new Date()

      for (const schedule of schedules) {
        if (!isForce && schedule.nextRunAt > now) {
          skipped++
          continue
        }

        const source = schedule.invoice
        if (!source || !source.company) continue

        const count = await prisma.invoice.count({ where: { companyId: source.companyId } })
        const prefix = source.company.invoicePrefix || "INV"
        const invoiceNumber = `${prefix}-${now.getFullYear()}-${String(count + 1).padStart(4, "0")}`

        const dueDate = new Date(now)
        dueDate.setDate(dueDate.getDate() + 30)

        await prisma.invoice.create({
          data: {
            companyId: source.companyId,
            customerId: source.customerId,
            invoiceNumber,
            date: now,
            dueDate,
            currency: source.currency,
            notes: source.notes,
            terms: source.terms,
            status: "DRAFT",
            subTotal: source.subTotal,
            totalDiscount: source.totalDiscount,
            totalTax: source.totalTax,
            finalAmount: source.finalAmount,
            balanceDue: source.finalAmount,
            items: {
              create: source.items.map((i: any) => ({
                description: i.description,
                hsnSac: i.hsnSac,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                discount: i.discount,
                taxPercentage: i.taxPercentage,
                taxableAmount: i.taxableAmount,
                taxAmount: i.taxAmount,
                total: i.total,
              })),
            },
          },
        })

        // Advance nextRunAt
        const nextRun = getNextRunDate(schedule.frequency, now)

        await prisma.recurringSchedule.update({
          where: { id: schedule.id },
          data: { nextRunAt: nextRun },
        })

        generated++
      }

      const durationMs = Date.now() - startTime
      return {
        success: true,
        task,
        durationMs,
        result: {
          totalActiveSchedules: schedules.length,
          generated,
          skipped,
        },
        message: `Processed ${schedules.length} active recurring schedules. Generated ${generated} invoices (${skipped} skipped until scheduled date). Completed in ${durationMs}ms.`
      }
    } else if (task === "auto_freeze") {
      const companies = await prisma.company.findMany({
        where: {
          autoFreezeMonths: { not: null },
          deletedAt: null,
        },
        select: { id: true, name: true, autoFreezeMonths: true },
      })

      let totalFrozen = 0
      for (const comp of companies) {
        if (!comp.autoFreezeMonths) continue
        const cutoff = new Date()
        cutoff.setMonth(cutoff.getMonth() - comp.autoFreezeMonths)

        const res = await prisma.invoice.updateMany({
          where: {
            companyId: comp.id,
            date: { lt: cutoff },
            isFrozen: false,
            deletedAt: null,
          },
          data: { isFrozen: true },
        })
        totalFrozen += res.count
      }

      const durationMs = Date.now() - startTime
      return {
        success: true,
        task,
        durationMs,
        result: {
          evaluatedCompanies: companies.length,
          frozenInvoices: totalFrozen,
        },
        message: `Evaluated ${companies.length} compliance companies. Successfully froze ${totalFrozen} invoices older than threshold. Completed in ${durationMs}ms.`
      }
    } else if (task === "trial_check") {
      const now = new Date()
      const expiredCompanies = await prisma.company.findMany({
        where: {
          trialEndsAt: { lt: now },
          subscriptionTier: "PRO",
        },
        include: { users: true },
      })

      for (const comp of expiredCompanies) {
        await prisma.company.update({
          where: { id: comp.id },
          data: { subscriptionTier: "FREE" },
        })
        await prisma.user.updateMany({
          where: { companyId: comp.id },
          data: { isPro: false },
        })
      }

      const durationMs = Date.now() - startTime
      return {
        success: true,
        task,
        durationMs,
        result: {
          expiredCount: expiredCompanies.length,
          companies: expiredCompanies.map(c => ({ id: c.id, name: c.name, expiredAt: c.trialEndsAt })),
        },
        message: `Identified ${expiredCompanies.length} expired trial companies and downgraded accounts to FREE tier. Completed in ${durationMs}ms.`
      }
    } else if (task === "temp_cleanup") {
      const now = new Date()
      const deletedSessions = await prisma.session.deleteMany({
        where: { expires: { lt: now } },
      })

      let cacheCleared = false
      try {
        const { flushValkeyCache } = await import("@/lib/redis")
        await flushValkeyCache("*")
        cacheCleared = true
      } catch {}

      const durationMs = Date.now() - startTime
      return {
        success: true,
        task,
        durationMs,
        result: {
          deletedSessionsCount: deletedSessions.count,
          cacheCleared,
        },
        message: `Purged ${deletedSessions.count} expired sessions and cleared memory cache. Completed in ${durationMs}ms.`
      }
    }

    return { success: false, error: "Invalid task type specified." }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to execute cron task." }
  }
}

export async function getDatabaseTableMetrics() {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }
  try {
    const [
      users,
      companies,
      invoices,
      invoiceItems,
      quotations,
      payments,
      customers,
      auditLogs,
      emailLogs,
      appErrors,
      webhooks,
      sessions,
      userFeedback,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.invoice.count(),
      prisma.invoiceItem.count(),
      prisma.quotation.count(),
      prisma.payment.count(),
      prisma.customer.count(),
      prisma.auditLog.count(),
      prisma.emailLog.count(),
      prisma.appError.count(),
      prisma.webhook.count(),
      prisma.session.count(),
      prisma.userFeedback.count(),
    ])

    return {
      success: true,
      tables: [
        { name: "Invoices", count: invoices, category: "Core Business" },
        { name: "Invoice Line Items", count: invoiceItems, category: "Core Business" },
        { name: "Quotations", count: quotations, category: "Core Business" },
        { name: "Payments", count: payments, category: "Core Business" },
        { name: "Customers", count: customers, category: "CRM & Entities" },
        { name: "Companies (Tenants)", count: companies, category: "Tenants" },
        { name: "Users", count: users, category: "Access & Auth" },
        { name: "Active Sessions", count: sessions, category: "Access & Auth" },
        { name: "Audit Logs", count: auditLogs, category: "Logs & Telemetry" },
        { name: "Email Delivery Logs", count: emailLogs, category: "Logs & Telemetry" },
        { name: "Application Errors", count: appErrors, category: "Logs & Telemetry" },
        { name: "User Feedback", count: userFeedback, category: "Support" },
        { name: "Webhooks", count: webhooks, category: "Integrations" },
      ],
      totalRecords: users + companies + invoices + invoiceItems + quotations + payments + customers + auditLogs + emailLogs + appErrors + webhooks + sessions + userFeedback
    }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch table metrics" }
  }
}

export async function purgeOldSystemLogs(
  logType: "app_errors" | "audit_logs" | "all",
  daysOld: number,
  dryRun: boolean,
  passwordSecret: string
) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }
  const adminPassword = process.env.ADMIN_SQL_PASSWORD
  if (!adminPassword || passwordSecret !== adminPassword) {
    return { success: false, error: "Incorrect Admin Secret Password" }
  }
  if (daysOld < 7) {
    return { success: false, error: "Retention threshold must be at least 7 days." }
  }

  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)

  try {
    let appErrorsCount = 0
    let auditLogsCount = 0

    if (logType === "app_errors" || logType === "all") {
      if (dryRun) {
        appErrorsCount = await prisma.appError.count({
          where: { createdAt: { lt: cutoff } }
        })
      } else {
        const res = await prisma.appError.deleteMany({
          where: { createdAt: { lt: cutoff } }
        })
        appErrorsCount = res.count
      }
    }

    if (logType === "audit_logs" || logType === "all") {
      if (dryRun) {
        auditLogsCount = await prisma.auditLog.count({
          where: { createdAt: { lt: cutoff } }
        })
      } else {
        const res = await prisma.auditLog.deleteMany({
          where: { createdAt: { lt: cutoff } }
        })
        auditLogsCount = res.count
      }
    }

    return {
      success: true,
      dryRun,
      daysOld,
      cutoff: cutoff.toISOString(),
      purged: {
        appErrors: appErrorsCount,
        auditLogs: auditLogsCount,
        total: appErrorsCount + auditLogsCount
      },
      message: dryRun
        ? `Found ${appErrorsCount + auditLogsCount} records older than ${daysOld} days (${appErrorsCount} errors, ${auditLogsCount} audit logs) eligible for purge.`
        : `Successfully purged ${appErrorsCount + auditLogsCount} records older than ${daysOld} days.`
    }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to purge logs." }
  }
}

export async function checkDomainDnsHealth(domain: string) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" }
  }

  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim()
  if (!cleanDomain) {
    return { success: false, error: "Domain name is required." }
  }

  try {
    const dns = await import("dns/promises")
    let ipv4: string[] = []
    let cnames: string[] = []
    let mx: any[] = []

    try {
      ipv4 = await dns.resolve4(cleanDomain)
    } catch {}

    try {
      cnames = await dns.resolveCname(cleanDomain)
    } catch {}

    try {
      mx = await dns.resolveMx(cleanDomain)
    } catch {}

    let httpStatus = "Unknown"
    let latencyMs = -1
    const testStart = Date.now()
    try {
      const res = await fetch(`https://${cleanDomain}`, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(5000)
      })
      latencyMs = Date.now() - testStart
      httpStatus = `${res.status} ${res.statusText}`
    } catch (fetchErr: any) {
      httpStatus = `Failed: ${fetchErr.message}`
    }

    return {
      success: true,
      domain: cleanDomain,
      records: {
        a: ipv4,
        cname: cnames,
        mx: mx.map(m => `${m.exchange} (priority ${m.priority})`)
      },
      httpStatus,
      latencyMs,
      hasRecords: ipv4.length > 0 || cnames.length > 0
    }
  } catch (err: any) {
    return { success: false, error: err.message || "DNS lookup failed." }
  }
}





