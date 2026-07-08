import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getExpenseById } from "@/actions/expense"
import { getSignedDownloadUrl } from "@/services/storage"
import { requireCompany } from "@/lib/auth-helpers"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { company } = await requireCompany()

    const { id } = await params
    const expense = await getExpenseById(id)

    if (!expense) {
      return new NextResponse("Not Found", { status: 404 })
    }

    if (expense.companyId !== company.id) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    if (!expense.receiptUrl) {
      return new NextResponse("No receipt attached", { status: 404 })
    }

    const signedUrl = await getSignedDownloadUrl(expense.receiptUrl)

    return NextResponse.redirect(signedUrl)
  } catch (error) {
    console.error("Failed to get receipt URL:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
