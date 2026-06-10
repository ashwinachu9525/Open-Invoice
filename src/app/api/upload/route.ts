import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { uploadFile } from "@/services/storage"
import { requireCompany } from "@/lib/auth-helpers"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { company } = await requireCompany()

    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const key = `uploads/${company.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    
    const url = await uploadFile(key, buffer, file.type)

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Upload failed", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
