"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle, Loader2 } from "lucide-react"
import { sendInvoiceViaWhatsApp } from "@/actions/invoice"
import { toast } from "sonner"

interface SendWhatsappButtonProps {
  invoiceId: string
  invoiceNumber: string
  customerPhone?: string | null
  customerName: string
  companyName: string
  pdfUrl: string
}

export function SendWhatsappButton({
  invoiceId,
  invoiceNumber,
  customerPhone,
  customerName,
  companyName,
  pdfUrl,
}: SendWhatsappButtonProps) {
  const [isSending, setIsSending] = useState(false)

  async function handleSendWhatsapp() {
    setIsSending(true)
    let tryFallback = false

    try {
      const result = await sendInvoiceViaWhatsApp(invoiceId)
      if (result.success) {
        toast.success("Invoice PDF sent automatically via OpenWA!")
      } else {
        tryFallback = true
      }
    } catch {
      tryFallback = true
    }

    if (tryFallback) {
      // Construct fallback wa.me URL
      const text = `Hi ${customerName},

Please find the details for invoice *${invoiceNumber}* from ${companyName} attached below.

View / Download Invoice:
${pdfUrl}

Thank you for your business!
${companyName}`

      const formattedPhone = customerPhone ? customerPhone.replace(/\D/g, "") : ""
      const baseUrl = formattedPhone ? `https://wa.me/${formattedPhone}` : "https://wa.me/"
      const url = `${baseUrl}?text=${encodeURIComponent(text)}`
      
      window.open(url, "_blank")
      toast.success("Direct WhatsApp share link opened.")
    }

    setIsSending(false)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="glass border-white/10 hover:bg-white/8 gap-1.5"
      onClick={handleSendWhatsapp}
      disabled={isSending}
    >
      {isSending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageCircle className="h-4 w-4" />
      )}
      {isSending ? "Sending..." : "Send WhatsApp"}
    </Button>
  )
}


