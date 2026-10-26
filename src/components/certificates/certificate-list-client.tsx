"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FileText,
  Search,
  Plus,
  Download,
  Eye,
  Trash2,
  Calendar,
  Layers,
  Building,
  CheckCircle2,
  ClipboardList,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { deleteTestCertificate } from "@/actions/test-certificates"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CertificateItem {
  id: string
  certificateNumber: string
  productName: string
  batchNumber?: string | null
  date: Date | string
  testedParameters: any
  remarks?: string | null
  authorizedSignatory?: string | null
  createdAt: Date | string
  customer?: {
    name: string
    companyName?: string | null
  } | null
  invoice?: {
    invoiceNumber: string
  } | null
}

interface CertificateListClientProps {
  certificates: CertificateItem[]
}

export function CertificateListClient({ certificates: initialCertificates }: CertificateListClientProps) {
  const router = useRouter()
  const [certificates, setCertificates] = useState<CertificateItem[]>(initialCertificates)
  const [search, setSearch] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filtered certificates
  const filtered = certificates.filter((cert) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    const certNum = cert.certificateNumber?.toLowerCase() || ""
    const prodName = cert.productName?.toLowerCase() || ""
    const batch = cert.batchNumber?.toLowerCase() || ""
    const custName = cert.customer?.name?.toLowerCase() || ""
    const compName = cert.customer?.companyName?.toLowerCase() || ""
    const invNum = cert.invoice?.invoiceNumber?.toLowerCase() || ""

    return (
      certNum.includes(q) ||
      prodName.includes(q) ||
      batch.includes(q) ||
      custName.includes(q) ||
      compName.includes(q) ||
      invNum.includes(q)
    )
  })

  // Delete handler
  async function handleDeleteConfirm() {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const res = await deleteTestCertificate(deleteId)
      if (res.success) {
        setCertificates((prev) => prev.filter((c) => c.id !== deleteId))
        toast.success("Certificate deleted successfully.")
      } else {
        toast.error(res.error || "Failed to delete certificate.")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete certificate.")
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  // Summary counts
  const totalCount = certificates.length
  const attachedToInvoices = certificates.filter((c) => c.invoice?.invoiceNumber).length
  const totalParameters = certificates.reduce((acc, c) => {
    const params = Array.isArray(c.testedParameters) ? c.testedParameters : []
    return acc + params.length
  }, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Total Certificates</p>
              <p className="text-2xl font-bold mt-1 text-white">{totalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ClipboardList className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Linked to Invoices</p>
              <p className="text-2xl font-bold mt-1 text-emerald-400">{attachedToInvoices}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Quality Tests Logged</p>
              <p className="text-2xl font-bold mt-1 text-purple-400">{totalParameters}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by cert #, product, client, batch..."
            className="pl-9 bg-white/5 border-white/10 focus:border-blue-500 text-sm"
          />
        </div>

        <Link href="/certificates/new">
          <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg gap-2">
            <Plus className="w-4 h-4" />
            New Certificate
          </Button>
        </Link>
      </div>

      {/* ── Certificates Table / Cards ── */}
      {filtered.length === 0 ? (
        <Card className="glass border-white/10 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4 text-blue-400">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white">No certificates found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
            {search
              ? "No certificates matched your search criteria. Try a different keyword."
              : "Generate professional test certificates, COA (Certificate of Analysis), and quality inspection sheets for your products."}
          </p>
          <Link href="/certificates/new">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white gap-2">
              <Plus className="w-4 h-4" />
              Generate First Certificate
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((cert) => {
            const params = Array.isArray(cert.testedParameters) ? cert.testedParameters : []
            const dateStr = new Date(cert.date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })

            return (
              <Card
                key={cert.id}
                className="glass border-white/10 hover:border-blue-500/30 transition-all duration-200"
              >
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white text-base font-mono">
                        {cert.certificateNumber}
                      </span>
                      {cert.batchNumber && (
                        <Badge variant="outline" className="bg-white/5 border-white/10 text-xs text-muted-foreground font-mono">
                          Batch: {cert.batchNumber}
                        </Badge>
                      )}
                      {cert.invoice?.invoiceNumber && (
                        <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-xs">
                          Inv: {cert.invoice.invoiceNumber}
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm text-slate-300 font-medium truncate">
                      {cert.productName}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" />
                        {cert.customer?.name || cert.customer?.companyName || "No Client"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {dateStr}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        {params.length} parameters tested
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Link href={`/certificates/${cert.id}`}>
                      <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/10 gap-1.5 text-xs">
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Button>
                    </Link>

                    <a
                      href={`/api/test-certificates/${cert.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/10 gap-1.5 text-xs text-blue-400">
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </Button>
                    </a>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 h-8 w-8 p-0"
                      onClick={() => setDeleteId(cert.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="glass-card border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              Delete Test Certificate?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this certificate? This action will remove it from the active list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete Certificate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
