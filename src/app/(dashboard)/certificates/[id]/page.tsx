import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTestCertificate } from "@/actions/test-certificates"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Award,
  ArrowLeft,
  Download,
  Calendar,
  Building,
  FileText,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react"

interface CertificateDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CertificateDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const res = await getTestCertificate(id)
  if (!res.success || !res.certificate) {
    return { title: "Certificate Not Found | Open-Invoice" }
  }
  return {
    title: `Certificate ${res.certificate.certificateNumber} | Open-Invoice`,
    description: `Test Certificate for ${res.certificate.productName}`,
  }
}

export default async function CertificateDetailPage({ params }: CertificateDetailPageProps) {
  const { id } = await params
  const res = await getTestCertificate(id)

  if (!res.success || !res.certificate) {
    notFound()
  }

  const cert = res.certificate
  const paramsList = Array.isArray(cert.testedParameters) ? cert.testedParameters : []
  const dateStr = new Date(cert.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/certificates"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Certificates
        </Link>

        <div className="flex items-center gap-2">
          <a
            href={`/api/test-certificates/${cert.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg gap-2 text-sm">
              <Download className="w-4 h-4" />
              Download Official PDF
            </Button>
          </a>
        </div>
      </div>

      {/* ── Certificate Preview Card ── */}
      <Card className="glass border-white/10 overflow-hidden shadow-2xl">
        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Certificate of Analysis / Quality Test
              </div>
              <h2 className="text-2xl font-bold text-white font-mono">{cert.certificateNumber}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Issued on {dateStr}
              </p>
            </div>

            <div className="text-right sm:text-right">
              <p className="font-bold text-white text-base">{cert.company?.name || "Company"}</p>
              {cert.company?.address && (
                <p className="text-xs text-muted-foreground max-w-xs">{cert.company.address}</p>
              )}
              {cert.company?.gstNumber && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  GSTIN: {cert.company.gstNumber}
                </p>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Customer / Consignee</p>
              <p className="text-sm font-bold text-white mt-1">
                {cert.customer?.companyName || cert.customer?.name}
              </p>
              {cert.customer?.companyName && cert.customer?.name && (
                <p className="text-xs text-muted-foreground">Attn: {cert.customer.name}</p>
              )}
              {cert.customer?.gstin && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  GSTIN: {cert.customer.gstin}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Product & Dispatch</p>
              <p className="text-sm font-bold text-emerald-400 mt-1">{cert.productName}</p>
              {cert.batchNumber && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Batch / Lot: <span className="text-white">{cert.batchNumber}</span>
                </p>
              )}
              {cert.invoice && (
                <p className="text-xs text-muted-foreground mt-1">
                  Invoice Ref:{" "}
                  <Link
                    href={`/invoices/${cert.invoice.id}`}
                    className="text-blue-400 hover:underline font-mono inline-flex items-center gap-1"
                  >
                    {cert.invoice.invoiceNumber}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Test Results Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              Observed Test Results
            </h3>

            <div className="border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 text-xs text-muted-foreground border-b border-white/10">
                    <th className="text-left py-2.5 px-4 font-semibold">Test Parameter / Property</th>
                    <th className="text-left py-2.5 px-4 font-semibold">Observed Result</th>
                    <th className="text-left py-2.5 px-4 font-semibold">Specified Standard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paramsList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-muted-foreground text-xs">
                        No parameters listed.
                      </td>
                    </tr>
                  ) : (
                    paramsList.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 font-medium text-white">{p.parameter}</td>
                        <td className="py-2.5 px-4 font-semibold text-emerald-400 font-mono">
                          {p.result}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 font-mono">{p.standard}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remarks & Signatory */}
          <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              {cert.remarks && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Remarks</p>
                  <p className="text-xs text-slate-300 mt-1 italic">{cert.remarks}</p>
                </div>
              )}
            </div>

            <div className="sm:text-right">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Authorized Signatory</p>
              <p className="text-sm font-bold text-white mt-1">
                {cert.authorizedSignatory || "Authorized Signatory"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cert.company?.name || "Open-Invoice Verified"}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
