import { NextRequest, NextResponse } from "next/server"
import { requireCompany } from "@/lib/auth-helpers"
import { getServerBackup } from "@/lib/backup/backup-service"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { company } = await requireCompany()
    const { id } = await params

    const backup = await getServerBackup(company.id, id)
    const fileName = id.endsWith(".json") ? id : `${id}.json`

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    console.error("[BackupDownload API Error]:", error)
    return NextResponse.json(
      { error: error.message || "Failed to download backup" },
      { status: error.message?.includes("denied") ? 403 : 500 }
    )
  }
}
