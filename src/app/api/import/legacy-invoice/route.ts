import { NextRequest, NextResponse } from "next/server"
import { requireCompany } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/encryption"
import { parseInvoiceViaOcr } from "@/lib/import/ocr-parser"
import { parseInvoiceXml, parseInvoiceJson } from "@/lib/import/json-parser"
import type { InvoiceImportDraft } from "@/lib/import/types"

/**
 * POST /api/import/legacy-invoice
 * Body: multipart/form-data
 *   - file: image (JPG/PNG) | XML | JSON
 *
 * Returns an InvoiceImportDraft for the user to review before creation.
 */
export async function POST(req: NextRequest) {
  try {
    const { company } = await requireCompany()

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const fileName   = file.name.toLowerCase()
    const mimeType   = file.type.toLowerCase()
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    let draft: InvoiceImportDraft

    // ── XML ────────────────────────────────────────────────────────────────
    if (mimeType.includes("xml") || fileName.endsWith(".xml")) {
      const text = fileBuffer.toString("utf-8")
      draft = parseInvoiceXml(text)
    }
    // ── JSON ───────────────────────────────────────────────────────────────
    else if (mimeType.includes("json") || fileName.endsWith(".json")) {
      const text = fileBuffer.toString("utf-8")
      draft = parseInvoiceJson(text)
    }
    // ── Image / PDF → OCR ─────────────────────────────────────────────────
    else if (
      mimeType.startsWith("image/") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".png") ||
      fileName.endsWith(".webp") ||
      fileName.endsWith(".pdf")
    ) {
      // Resolve Gemini API key from AI settings
      const aiSettings = await prisma.aISettings.findUnique({
        where: { companyId: company.id },
      })

      if (!aiSettings?.geminiKey) {
        return NextResponse.json(
          { error: "Gemini API key not configured. Please add your Gemini key under Settings → AI Tools to enable OCR." },
          { status: 422 }
        )
      }

      let geminiKey: string
      try {
        geminiKey = decrypt(aiSettings.geminiKey, company.id)
      } catch {
        return NextResponse.json({ error: "Failed to decrypt Gemini API key" }, { status: 500 })
      }

      // For PDF we take the raw bytes and send as application/pdf
      const effectiveMime = mimeType || (fileName.endsWith(".pdf") ? "application/pdf" : "image/jpeg")
      draft = await parseInvoiceViaOcr(fileBuffer, effectiveMime, geminiKey)
    } else {
      return NextResponse.json(
        { error: `Unsupported file type "${file.type}". Upload an image (JPG/PNG), PDF, XML, or JSON file.` },
        { status: 400 }
      )
    }

    return NextResponse.json({ draft })
  } catch (error) {
    console.error("[import/legacy-invoice] error:", error)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  }
}

