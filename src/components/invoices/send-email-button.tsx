"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { sendInvoiceToClient } from "@/actions/invoice"
import { Send, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface SendEmailButtonProps {
  invoiceId: string
}

export function SendEmailButton({ invoiceId }: SendEmailButtonProps) {
  const [isSending, setIsSending] = useState(false)

  async function handleSendEmail() {
    setIsSending(true)
    try {
      const result = await sendInvoiceToClient(invoiceId)
      if (result.success) {
        toast.success("Invoice email sent successfully.")
      } else {
        toast.error(result.error || "Failed to send invoice email. Please try again.")
      }
    } catch (e) {
      toast.error("Failed to send invoice email. Please try again.")
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
