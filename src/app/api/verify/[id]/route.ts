import { NextRequest, NextResponse } from "next/server"
import { verifyInvoiceRecord } from "@/lib/invoice-verification"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sig = request.nextUrl.searchParams.get("sig")

    const result = await verifyInvoiceRecord(id, sig)

    const statusCode = result.status === "NOT_FOUND" ? 404 : 200
    return NextResponse.json(result, { status: statusCode })
  } catch (error) {
    console.error("Verification API error:", error)
    return NextResponse.json(
      { error: "Internal verification error" },
      { status: 500 }
    )
  }
}
