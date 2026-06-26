import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashToken } from "@/lib/crypto"

export async function authenticateApiKey(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key")
  if (!apiKey) {
    return { error: "API key is missing in x-api-key header", status: 401 }
  }

  try {
    const keyHash = hashToken(apiKey)
    const keyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { company: true },
    })

    if (!keyRecord || !keyRecord.isActive) {
      return { error: "Invalid or inactive API key", status: 401 }
    }

    // Check expiration if set
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return { error: "API key has expired", status: 401 }
    }

    return { company: keyRecord.company }
  } catch (error) {
    console.error("API Key authentication error:", error)
    return { error: "Authentication failed", status: 500 }
  }
}
