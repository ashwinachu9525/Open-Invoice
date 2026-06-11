import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateText } from "@/ai/orchestrator"

import crypto from "crypto"
import { getOrSetCache } from "@/lib/redis"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { invoiceData, instructions } = await request.json()
  
  if (!invoiceData) {
    return NextResponse.json({ error: "Invoice data required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true }
  })

  if (!user?.companyId) {
    return NextResponse.json({ error: "Company not found" }, { status: 400 })
  }

  const prompt = `You are an AI assistant helping to create a new invoice based on a past invoice.
The user wants to use a past invoice as a template but may have specific modifications.

Past Invoice Context:
${JSON.stringify(invoiceData, null, 2)}

User Instructions for New Invoice:
${instructions || "Keep the same items but suggest logical updates for a new billing cycle (e.g., update months in descriptions, recalculate if necessary)."}

Return ONLY a raw JSON object matching this schema for the items to include in the new invoice:
{
  "items": [{ "description": string, "hsnSac": string?, "quantity": number, "unitPrice": number, "discount": number, "taxPercentage": number }],
  "notes": string?
}

Do not include markdown formatting or \`\`\`json tags. Only return the JSON object.`

  try {
    const promptHash = crypto.createHash("sha256").update(prompt).digest("hex")
    const cacheKey = `ai:suggest:${promptHash}`

    const parsed = await getOrSetCache(cacheKey, async () => {
      const responseText = await generateText({ companyId: user.companyId!, prompt })
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim()
      return JSON.parse(cleanJson)
    }, 86400 * 2) // Cache for 48 hours
    
    return NextResponse.json(parsed)
  } catch (error) {
    console.error("AI Invoice Suggestion Error:", error)
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }
}
