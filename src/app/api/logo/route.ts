import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { requireCompany } from "@/lib/auth-helpers"
import { getSignedDownloadUrl } from "@/services/storage"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { company } = await requireCompany()

    if (!company.logo) {
      return NextResponse.json({ error: "No logo found" }, { status: 404 })
    }

    // If the logo is already a full URL (e.g. external URL), redirect directly
    if (company.logo.startsWith("http://") || company.logo.startsWith("https://")) {
      return NextResponse.redirect(company.logo)
    }

    // Otherwise it's an S3 key — generate a signed URL
    const signedUrl = await getSignedDownloadUrl(company.logo, 3600)
    return NextResponse.json({ url: signedUrl })
  } catch (error) {
    console.error("Logo fetch failed:", error)
    return NextResponse.json({ error: "Failed to fetch logo" }, { status: 500 })
  }
}
