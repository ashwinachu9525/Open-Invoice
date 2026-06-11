"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { sendQuotationToClient } from "@/actions/quotation"
import { Send, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface SendEmailButtonProps {
  quotationId: string
}

export function SendEmailButton({ quotationId }: SendEmailButtonProps) {
  const [isSending, setIsSending] = useState(false)

  async function handleSendEmail() {
    setIsSending(true)
    try {
      const result = await sendQuotationToClient(quotationId)
      if (result.success) {
        toast.success("Quotation email sent successfully.")
      } else {
        toast.error(result.error || "Failed to send quotation email. Please try again.")
      }
    } catch (e) {
      toast.error("Failed to send quotation email. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="glass border-white/10 hover:bg-white/8 gap-1.5"
      onClick={handleSendEmail}
      disabled={isSending}
    >
      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      {isSending ? "Sending..." : "Send Email"}
    </Button>
  )
}
