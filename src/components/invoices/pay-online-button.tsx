"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { verifyAndRecordRazorpayPayment } from "@/actions/razorpay"
import { toast } from "sonner"
import { CreditCard, Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

interface PayOnlineButtonProps {
  invoiceId: string
  amount: number
  invoiceNumber: string
  currency: string
  companyName: string
  companyLogo: string | null
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  razorpayKeyId: string
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function PayOnlineButton({
  invoiceId,
  amount,
  invoiceNumber,
  currency = "INR",
  companyName,
  companyLogo,
  customerName,
  customerEmail,
  customerPhone,
  razorpayKeyId
}: PayOnlineButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const shouldAutoPay = searchParams?.get("pay") === "true"
    if (shouldAutoPay && razorpayKeyId && amount > 0) {
      // Delay slightly to allow page elements to mount and avoid document body race conditions
      const timer = setTimeout(() => {
        handlePayment()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [searchParams, razorpayKeyId, amount])

  async function handlePayment() {
    if (!razorpayKeyId) {
      toast.error("Razorpay is not fully configured by the vendor.")
      return
    }

    setLoading(true)
    const scriptLoaded = await loadRazorpayScript()
    if (!scriptLoaded) {
      toast.error("Failed to load payment portal. Please check your internet connection.")
      setLoading(false)
      return
    }

    const options = {
      key: razorpayKeyId,
      amount: Math.round(amount * 100), // in paisa
      currency: currency,
      name: companyName,
      description: `Payment for Invoice ${invoiceNumber}`,
      image: companyLogo || undefined,
      handler: async function (response: any) {
        setLoading(true)
        try {
          const res = await verifyAndRecordRazorpayPayment(invoiceId, {
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            amount: amount,
            method: "RAZORPAY"
          })

          if (res.success) {
            toast.success("Payment successful! Receipt generated and emailed.")
            router.refresh()
          } else {
            toast.error(res.error || "Failed to confirm payment")
          }
        } catch {
          toast.error("Error confirming payment details")
        } finally {
          setLoading(false)
        }
      },
      prefill: {
        name: customerName,
        email: customerEmail || undefined,
        contact: customerPhone || undefined,
      },
      theme: {
        color: "#6366f1",
      },
    }

    const rzp = new (window as any).Razorpay(options)
    rzp.on("payment.failed", function (resp: any) {
      toast.error(`Payment failed: ${resp.error.description}`)
    })
    rzp.open()
    setLoading(false)
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={loading}
      className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all gap-1.5"
      size="sm"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="h-4 w-4" />
      )}
      Pay Online (₹{amount.toLocaleString("en-IN")})
    </Button>
  )
}
