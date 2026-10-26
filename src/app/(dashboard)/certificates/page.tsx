import { Metadata } from "next"
import Link from "next/link"
import { getTestCertificates } from "@/actions/test-certificates"
import { CertificateListClient } from "@/components/certificates/certificate-list-client"
import { Button } from "@/components/ui/button"
import { Award, Plus } from "lucide-react"

export const metadata: Metadata = {
  title: "Test Certificates & COA | Open-Invoice",
  description: "Generate and manage test certificates, batch inspections, and certificates of analysis.",
}

export default async function CertificatesPage() {
  const result = await getTestCertificates()
  const certificates = result.certificates || []

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-white">
            <Award className="h-6 w-6 text-blue-400" />
            Test Certificates
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create quality test certificates, certificates of analysis (COA), and inspection reports
          </p>
        </div>

        <Link href="/certificates/new">
          <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Certificate</span>
          </Button>
        </Link>
      </div>

      {/* ── Client View ── */}
      <CertificateListClient certificates={certificates} />
    </div>
  )
}
