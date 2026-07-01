import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

import { NextResponse } from "next/server"

/**
 * GET /api/public/verify-domain
 * Query param: ?domain=billing.company.com
 *
 * Called by Caddy (or other dynamic TLS proxies) using on_demand_tls
 * to check if SSL should be issued for this custom domain.
 */
export async function GET(request: NextRequest) {
  try {
    const domain = request.nextUrl.searchParams.get("domain")?.trim().toLowerCase()
    if (!domain) {
      return NextResponse.json({ error: "Missing domain parameter" }, { status: 400 })
    }

    const company = await prisma.company.findFirst({
      where: {
        customDomain: domain,
        deletedAt: null,
        subscriptionTier: { in: ["PRO", "ENTERPRISE"] },
      },
    })

    if (!company) {
      return NextResponse.json(
        { error: "Domain not registered or company not in Pro/Enterprise tier" },
        { status: 404 }
      )
    }

    return NextResponse.json({ allowed: true, companyId: company.id }, { status: 200 })
  } catch (error) {
    console.error("verify-domain api error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
