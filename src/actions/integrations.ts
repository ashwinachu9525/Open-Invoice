"use server"

import { prisma } from "@/lib/prisma"
import { getTenantDb } from "@/lib/tenant-db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { getWhatsAppProvider } from "@/services/whatsapp/factory";
import { WhatsAppSendOpts, WhatsAppMessageOpts } from "@/services/whatsapp/provider";

async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) return null
  return await prisma.user.findUnique({ where: { id: session.user.id } })
}

export async function debugWhatsAppConnection() {
  try {
    const user = await requireUser()
    if (!user?.companyId) return { error: "Unauthorized" }

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { id: true, openWaEnabled: true, openWaUrl: true, openWaToken: true },
    })

    if (!company?.openWaUrl) return { error: "No URL configured" }

    const gatewayUrl = company.openWaUrl.replace(/\/$/, "")
    const token = company.openWaToken

    // Test 1: raw fetch to /api/sessions
    let sessionsRaw: any = null
    let sessionsStatus: number | null = null
    try {
      const res = await fetch(`${gatewayUrl}/api/sessions`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-API-Key": token } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })
      sessionsStatus = res.status
      sessionsRaw = await res.json().catch(() => null)
    } catch (e: any) {
      sessionsRaw = `FETCH_ERROR: ${e.message}`
    }

    return {
      companyId: company.id,
      gatewayUrl,
      tokenPrefix: token ? token.substring(0, 12) + "..." : "none",
      sessionsHttpStatus: sessionsStatus,
      sessionsResponse: sessionsRaw,
    }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function updateOpenWaSettings(data: {
  enabled: boolean
  url?: string
  token?: string
}) {
  try {
    const user = await requireUser()
    if (!user?.companyId) return { error: "Unauthorized" }

    // Trim whitespace to avoid silent auth failures from copy-paste artifacts
    const cleanUrl = data.url?.trim()
    const cleanToken = data.token?.trim()
    data = { ...data, url: cleanUrl, token: cleanToken }

    let finalToken = data.token || null
    // Note: We intentionally skip auto-scoped key creation as it can produce
    // restricted keys that cannot list or access existing sessions.
    // Always store the token exactly as provided by the user.

    await prisma.company.update({
      where: { id: user.companyId },
      data: {
        openWaEnabled: data.enabled,
        openWaUrl: data.url || null,
        openWaToken: finalToken,
      },
    })

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Failed to update integrations settings:", error)
    return { error: "Failed to update settings" }
  }
}

async function findSessionIdByName(gatewayUrl: string, name: string, token: string | null): Promise<string | null> {
  try {
    const res = await fetch(`${gatewayUrl}/api/sessions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-API-Key": token } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.error(`[WhatsApp] GET /api/sessions failed: HTTP ${res.status} ${res.statusText}`)
      return null
    }
    const sessions = await res.json()
    console.log(`[WhatsApp] Sessions from gateway:`, JSON.stringify(sessions))
    if (Array.isArray(sessions)) {
      // First try exact match by company ID name
      const matched = sessions.find((s: any) => s.name === name)
      if (matched) return matched.id

      // Fallback: if only one session exists, use it regardless of name
      if (sessions.length === 1) {
        console.log(`[WhatsApp] No session named "${name}", falling back to only session: "${sessions[0].name}"`)
        return sessions[0].id
      }

      // Fallback: try common default session names
      const fallback = sessions.find((s: any) => s.name === "default" || s.name === "session" || s.name === "main")
      if (fallback) {
        console.log(`[WhatsApp] No session named "${name}", falling back to session: "${fallback.name}"`)
        return fallback.id
      }
    }
  } catch (e) {
    console.error("Failed to find session by name:", e)
  }
  return null
}

export async function getWhatsAppStatus() {
  try {
    const user = await requireUser()
    if (!user?.companyId) return { status: "UNAUTHORIZED" }

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
    })

    if (!company || !company.openWaEnabled || !company.openWaUrl) {
      return { status: "DISABLED" }
    }

    const gatewayUrl = company.openWaUrl.replace(/\/$/, "")
    const token = company.openWaToken
    const sessionName = company.id

    // Resolve dynamic session UUID by its name
    let sessionId = await findSessionIdByName(gatewayUrl, sessionName, token)

    if (!sessionId) {
      // Session does not exist in OpenWA. Create it!
      await createWahaSession(gatewayUrl, sessionName, token)
      return { status: "STARTING", sessionId: null }
    }

    // Check status by calling GET /api/sessions/{sessionId}
    let response: Response
    try {
      response = await fetch(`${gatewayUrl}/api/sessions/${sessionId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-API-Key": token } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })
    } catch (e: any) {
      return { status: "DOWN", error: `Gateway unreachable: ${e.message || String(e)}`, sessionId }
    }

    if (response.status === 404 || response.status === 422) {
      // Session does not exist. Create it!
      await createWahaSession(gatewayUrl, sessionName, token)
      return { status: "STARTING", sessionId: null }
    }

    if (!response.ok) {
      return { status: "FAILED", error: `Server responded with ${response.status}`, sessionId }
    }

    const sessionInfo = await response.json()
    const rawStatus = (sessionInfo.status || "UNKNOWN").toUpperCase()

    if (
      rawStatus === "CREATED" ||
      rawStatus === "STOPPED" ||
      rawStatus === "FAILED" ||
      rawStatus === "DISCONNECTED" ||
      rawStatus === "INITIALIZING" ||
      rawStatus === "CONNECTING"
    ) {
      // Try to start it
      await startWahaSession(gatewayUrl, sessionId, token)
      return { status: "STARTING", sessionId }
    }

    if (rawStatus === "SCAN_QR" || rawStatus === "QR_READY") {
      // Get the QR code base64
      const qrRes = await fetch(`${gatewayUrl}/api/sessions/${sessionId}/qr`, {
        method: "GET",
        headers: {
          ...(token ? { "X-API-Key": token } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })

      if (qrRes.ok) {
        const qrData = await qrRes.json()
        const qrImage = qrData.image || qrData.qrCode || qrData.code
        if (qrImage) {
          let base64 = qrImage
          let mimetype = "image/png"

          if (qrImage.startsWith("data:")) {
            const parts = qrImage.split(",", 2)
            mimetype = parts[0].replace("data:", "").replace(";base64", "")
            base64 = parts[1]
          }

          return {
            status: "QR_READY",
            qrBase64: base64,
            qrMimetype: mimetype,
            sessionId,
          }
        }
      }

      // QR Code not yet fully ready, keep polling as starting
      return { status: "STARTING", sessionId }
    }

    const isConnected = rawStatus === "CONNECTED" || rawStatus === "WORKING" || rawStatus === "READY"

    let phoneNum = sessionInfo.phoneNumber || sessionInfo.phone || null
    if (phoneNum && phoneNum.includes("@")) {
      phoneNum = phoneNum.split("@")[0]
    }

    return {
      status: rawStatus,
      connected: isConnected,
      phone: phoneNum,
      pushName: sessionInfo.pushName || null,
      sessionId,
    }
  } catch (error: any) {
    console.error("Failed to get WhatsApp status:", error)
    return { status: "FAILED", error: error.message || "An unexpected error occurred", sessionId: null }
  }
}

export async function disconnectWhatsApp() {
  try {
    const user = await requireUser()
    if (!user?.companyId) return { error: "Unauthorized" }

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
    })

    if (!company || !company.openWaUrl) return { error: "No settings found" }

    const gatewayUrl = company.openWaUrl.replace(/\/$/, "")
    const token = company.openWaToken
    const sessionName = company.id

    const sessionId = await findSessionIdByName(gatewayUrl, sessionName, token)
    if (sessionId) {
      // Call logout and delete session on OpenWA using UUID
      await fetch(`${gatewayUrl}/api/sessions/${sessionId}/logout`, {
        method: "POST",
        headers: {
          ...(token ? { "X-API-Key": token } : {}),
        },
      }).catch(() => {})

      await fetch(`${gatewayUrl}/api/sessions/${sessionId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { "X-API-Key": token } : {}),
        },
      }).catch(() => {})
    }

    revalidatePath("/settings")
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Failed to disconnect session" }
  }
}

export async function restartWhatsAppSession() {
  try {
    const user = await requireUser()
    if (!user?.companyId) return { error: "Unauthorized" }

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
    })

    if (!company || !company.openWaUrl) return { error: "No settings found" }

    const gatewayUrl = company.openWaUrl.replace(/\/$/, "")
    const token = company.openWaToken
    const sessionName = company.id

    const sessionId = await findSessionIdByName(gatewayUrl, sessionName, token)
    if (sessionId) {
      const response = await fetch(`${gatewayUrl}/api/sessions/${sessionId}/restart`, {
        method: "POST",
        headers: {
          ...(token ? { "X-API-Key": token } : {}),
        },
      })

      if (!response.ok) {
        // Fallback: Logout and delete, next status poll will recreate it
        await fetch(`${gatewayUrl}/api/sessions/${sessionId}/logout`, {
          method: "POST",
          headers: {
            ...(token ? { "X-API-Key": token } : {}),
          },
        }).catch(() => {})

        await fetch(`${gatewayUrl}/api/sessions/${sessionId}`, {
          method: "DELETE",
          headers: {
            ...(token ? { "X-API-Key": token } : {}),
          },
        }).catch(() => {})
      }
    }

    revalidatePath("/settings")
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Failed to restart session" }
  }
}

async function createWahaSession(gatewayUrl: string, name: string, token: string | null) {
  try {
    const response = await fetch(`${gatewayUrl}/api/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-API-Key": token } : {}),
      },
      body: JSON.stringify({ name }),
      signal: AbortSignal.timeout(10000),
    })
    if (response.ok) {
      const data = await response.json()
      if (data.id) {
        await startWahaSession(gatewayUrl, data.id, token)
      }
    }
  } catch (e) {
    console.error("Failed to create OpenWA session:", e)
  }
}

async function startWahaSession(gatewayUrl: string, sessionId: string, token: string | null) {
  try {
    await fetch(`${gatewayUrl}/api/sessions/${sessionId}/start`, {
      method: "POST",
      headers: {
        ...(token ? { "X-API-Key": token } : {}),
      },
      signal: AbortSignal.timeout(5000),
    }).catch(() => {})
  } catch (e) {
    console.error("Failed to start OpenWA session:", e)
  }
}

export async function sendWhatsAppMessage(customerId: string, message: string) {
  try {
    const user = await requireUser()
    if (!user?.companyId) return { error: "Unauthorized" }

    const provider = await getWhatsAppProvider(user.companyId)
    const db = await getTenantDb(user.companyId)
    const customer = await db.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    })

    if (!customer) return { error: "Customer not found" }
    if (!customer.phone) return { error: "Customer has no phone number" }

    const chatId = `${customer.phone.replace(/\D/g, "")}@c.us`;
    const result = await provider.sendMessage({
      chatId,
      message,
      extra: { companyId: user.companyId },
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    await db.customerInteraction.create({
      data: {
        customerId,
        type: "WHATSAPP",
        content: result.success ? `Message sent to ${customer.phone}` : `Failed: ${result.error}`,
      },
    });

    revalidatePath(`/customers/${customerId}`);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error("Failed to send WhatsApp message:", error)
    return { error: error.message || "Failed to send WhatsApp message" }
  }
}

export async function sendWhatsAppTestMessage(data: {
  recipientType: "personal" | "group"
  recipient: string
  messageType: "text" | "image" | "video" | "audio" | "document"
  content: string
  caption?: string
  filename?: string
}) {
  try {
    const user = await requireUser()
    if (!user?.companyId) return { error: "Unauthorized" }

    const provider = await getWhatsAppProvider(user.companyId)
    const cleanPhone = data.recipient.replace(/\D/g, "")
    const chatId = `${cleanPhone}@c.us`

    if (data.messageType === "document") {
      const rawBase64 = data.content.includes("base64,")
        ? data.content.split("base64,")[1]
        : data.content
      return await provider.sendDocument({
        chatId,
        filename: data.filename || "document.pdf",
        base64: rawBase64,
        mimetype: "application/pdf",
        caption: data.caption,
        extra: { companyId: user.companyId },
      })
    }

    return await provider.sendMessage({
      chatId,
      message: data.content,
      extra: { companyId: user.companyId },
    })
  } catch (error: any) {
    console.error("Test message failed:", error)
    return { error: error.message || "Failed to execute API call" }
  }
}

export async function sendWhatsAppDocument(
  customerId: string,
  base64Data: string,
  filename: string,
  caption?: string
) {
  try {
    const user = await requireUser()
    if (!user?.companyId) return { error: "Unauthorized" }

    const provider = await getWhatsAppProvider(user.companyId)
    const db = await getTenantDb(user.companyId)
    const customer = await db.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    })

    if (!customer) return { error: "Customer not found" }
    if (!customer.phone) return { error: "Customer has no phone number" }

    const chatId = `${customer.phone.replace(/\D/g, "")}@c.us`
    const rawBase64 = base64Data.includes("base64,")
      ? base64Data.split("base64,")[1]
      : base64Data

    const result = await provider.sendDocument({
      chatId,
      filename,
      base64: rawBase64,
      mimetype: "application/pdf",
      caption,
      extra: { companyId: user.companyId },
    })

    if (!result.success) {
      throw new Error(result.error)
    }

    await db.customerInteraction.create({
      data: {
        customerId,
        type: "WHATSAPP",
        content: `Document "${filename}" sent to ${customer.phone}`,
      },
    })

    revalidatePath(`/customers/${customerId}`)
    return { success: true, messageId: result.messageId }
  } catch (error: any) {
    console.error("Failed to send WhatsApp document:", error)
    return { error: error.message || "Failed to send WhatsApp document" }
  }
}
