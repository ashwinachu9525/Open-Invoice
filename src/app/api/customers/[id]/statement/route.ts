import { requireCompany } from "@/lib/auth-helpers"
import { generateStatementPdf } from "@/services/pdf"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { company } = await requireCompany()
    const { id } = await params

    const customer = await prisma.customer.findUnique({
      where: { id, companyId: company.id },
    })

    if (!customer) {
      return new Response("Customer not found", { status: 404 })
    }

    const buffer = await generateStatementPdf(id, company.id)

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Statement_${customer.name.replace(/\s+/g, "_")}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Statement generation error:", error)
    return new Response("Failed to generate statement", { status: 500 })
  }
}
