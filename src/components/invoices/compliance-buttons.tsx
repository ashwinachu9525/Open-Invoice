"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { exportEInvoiceJSON, exportEWayBillJSON } from "@/actions/compliance"
import { toast } from "sonner"
import { FileJson, Loader2 } from "lucide-react"

interface ComplianceButtonsProps {
  invoiceId: string
  showEInvoice: boolean
  showEWayBill: boolean
}

export function ComplianceButtons({ invoiceId, showEInvoice, showEWayBill }: ComplianceButtonsProps) {
  const [loadingType, setLoadingType] = useState<"einvoice" | "ewaybill" | null>(null)

  async function handleExportEInvoice() {
    setLoadingType("einvoice")
    try {
      const res = await exportEInvoiceJSON(invoiceId)
      if (res.success && res.json && res.filename) {
        const blob = new Blob([res.json], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = res.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("E-Invoice JSON exported!")
      } else {
        toast.error(res.error || "Failed to export E-Invoice")
      }
    } catch {
      toast.error("Error exporting E-Invoice")
    } finally {
      setLoadingType(null)
    }
  }

  async function handleExportEWayBill() {
    setLoadingType("ewaybill")
    try {
      const res = await exportEWayBillJSON(invoiceId)
      if (res.success && res.json && res.filename) {
        const blob = new Blob([res.json], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = res.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("E-Way Bill JSON exported!")
      } else {
        toast.error(res.error || "Failed to export E-Way Bill")
      }
    } catch {
      toast.error("Error exporting E-Way Bill")
    } finally {
      setLoadingType(null)
    }
  }

  return (
    <>
      {showEInvoice && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportEInvoice}
          disabled={loadingType !== null}
          className="glass border-white/10 hover:bg-white/8 gap-1.5 text-xs"
        >
          {loadingType === "einvoice" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileJson className="h-3.5 w-3.5 text-violet-400" />
          )}
          E-Invoice JSON
        </Button>
      )}
      {showEWayBill && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportEWayBill}
          disabled={loadingType !== null}
          className="glass border-white/10 hover:bg-white/8 gap-1.5 text-xs"
        >
          {loadingType === "ewaybill" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileJson className="h-3.5 w-3.5 text-cyan-400" />
          )}
          E-Way Bill JSON
        </Button>
      )}
    </>
  )
}
