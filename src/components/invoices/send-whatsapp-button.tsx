"use client"

import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"

interface SendWhatsappButtonProps {
  invoiceNumber: string
  customerPhone?: string | null
  customerName: string
  companyName: string
  pdfUrl: string
}

export function SendWhatsappButton({
  invoiceNumber,
  customerPhone,
  customerName,
  companyName,
  pdfUrl
}: SendWhatsappButtonProps) {

  function handleSendWhatsapp() {
    const text = `Hi ${customerName},

Please find the details for invoice *${invoiceNumber}* from ${companyName} attached below.

View / Download Invoice:
${pdfUrl}

Thank you for your business!
${companyName}`

    // Remove any non-numeric characters from the phone number
    const formattedPhone = customerPhone ? customerPhone.replace(/\D/g, "") : ""
    
    // Construct the wa.me URL
    const baseUrl = formattedPhone ? `https://wa.me/${formattedPhone}` : "https://wa.me/"
    const url = `${baseUrl}?text=${encodeURIComponent(text)}`
    
    window.open(url, "_blank")
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="glass border-white/10 hover:bg-white/8 gap-1.5"
      onClick={handleSendWhatsapp}
    >
      <MessageCircle className="h-4 w-4" />
      Send WhatsApp
    </Button>
  )
}
