"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
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
  try {
    const configPath = path.join(process.cwd(), "src/config/system-settings.json")
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, "utf-8")
      return JSON.parse(fileContent)
    }
  } catch (err) {
    console.error("Failed to read system-settings.json:", err)
  }
  return {
    maintenanceMode: false,
    registrationOpen: true,
    systemLogLevel: "info",
    requireEmailVerification: false
  }
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
    const configPath = path.join(process.cwd(), "src/config/system-settings.json")
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8")
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


