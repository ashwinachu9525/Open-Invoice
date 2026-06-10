import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateInvoicePdf } from "@/services/pdf"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isPublic = request.nextUrl.searchParams.get("public") === "true"
  const session = await auth()
  
  if (!isPublic && !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  
  const whereClause = isPublic 
    ? { id } 
    : { id, company: { users: { some: { id: session?.user?.id } } } }

  const invoice = await prisma.invoice.findFirst({
    where: whereClause,
  })

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const pdf = await generateInvoicePdf(id)

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    },
  })
}
