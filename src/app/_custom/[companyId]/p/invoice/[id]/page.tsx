import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import PublicInvoicePage from "../../../../../p/invoice/[id]/page"

interface CustomPageProps {
  params: Promise<{
    companyId: string
    id: string
  }>
}

export default async function CustomDomainInvoicePage({ params }: CustomPageProps) {
  const { companyId, id } = await params

  // Security Check: Verify invoice exists and matches this company context
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { companyId: true }
  })

  if (!invoice || invoice.companyId !== companyId) {
    notFound()
  }

  // Delegate rendering to standard public invoice page
  return <PublicInvoicePage params={Promise.resolve({ id })} />
}
