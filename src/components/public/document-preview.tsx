"use client"

import { useEffect, useState } from "react"
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer"
import { PublicDocumentTemplate } from "@/pdf/public-document-template"
import { PublicInvoiceData } from "@/lib/public-invoice-schema"
import { Button } from "@/components/ui/button"
import { Download, FileWarning, Loader2 } from "lucide-react"
import { LoginPromptModal } from "@/components/modals/login-prompt-modal"
import { UpgradeModal } from "@/components/modals/upgrade-modal"
import { toast } from "sonner"

export default function DocumentPreview({ data, onDownload }: { data: PublicInvoiceData, onDownload: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [canDownload, setCanDownload] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [modalReason, setModalReason] = useState("")

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleGenerate = async () => {
    setIsChecking(true)
    try {
      const res = await fetch("/api/usage/check?feature=document_generation")
      const usage = await res.json()

      if (!usage.allowed) {
        setModalReason(usage.reason || "Limit reached.")
        if (usage.reason?.toLowerCase().includes("login")) {
          setShowLoginModal(true)
        } else {
          setShowUpgradeModal(true)
        }
        return
      }

      // Record the usage immediately since they are allowed
      await fetch("/api/usage/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature: "document_generation" })
      })

      setCanDownload(true)
      toast.success("PDF Generated successfully! Click Download to save.")
    } catch (error) {
      toast.error("Failed to verify usage. Please try again.")
    } finally {
      setIsChecking(false)
    }
  }

  if (!mounted) return <div className="h-full min-h-[500px] w-full bg-muted/20 animate-pulse rounded-xl" />

  return (
    <div className="flex flex-col h-full gap-4">
      <LoginPromptModal open={showLoginModal} onOpenChange={setShowLoginModal} reason={modalReason} />
      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} reason={modalReason} />
      
      <div className="flex-1 bg-muted/20 rounded-xl overflow-hidden border border-border/50 hidden md:block">
        <PDFViewer style={{ width: "100%", height: "100%" }} showToolbar={false}>
          <PublicDocumentTemplate data={data} />
        </PDFViewer>
      </div>
      
      <div className="flex gap-4">
        {!canDownload ? (
          <Button 
            className="w-full text-lg h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg" 
            onClick={handleGenerate}
            disabled={isChecking}
          >
            {isChecking ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
            {isChecking ? "Verifying..." : "Generate PDF"}
          </Button>
        ) : (
          <PDFDownloadLink
            document={<PublicDocumentTemplate data={data} />}
            fileName={`${data.documentType}-${data.documentNumber}.pdf`}
            className="w-full"
          >
            {({ loading }) => (
              <Button 
                className="w-full text-lg h-12 bg-green-600 hover:bg-green-500 text-white rounded-xl shadow-lg" 
                disabled={loading}
                onClick={onDownload}
              >
                <Download className="mr-2 h-5 w-5" />
                {loading ? "Preparing Download..." : "Download Now"}
              </Button>
            )}
          </PDFDownloadLink>
        )}
      </div>
    </div>
  )
}
