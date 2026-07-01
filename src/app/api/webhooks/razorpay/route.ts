import { NextResponse } from "next/server"
import crypto from "crypto"
import { getTenantDb } from "@/lib/tenant-db"
import { verifyAndRecordRazorpayPayment } from "@/actions/razorpay"

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const payload = JSON.parse(rawBody)

    const signature = request.headers.get("x-razorpay-signature")
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    // Check payload details
    const paymentEntity = payload.payload?.payment?.entity
    const notes = paymentEntity?.notes
    const companyId = notes?.companyId
    const invoiceId = notes?.invoiceId

    if (!companyId || !invoiceId) {
      return NextResponse.json({ success: true, message: "Ignored: Missing metadata notes" })
    }

    const db = await getTenantDb(companyId)
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { razorpayWebhookSecret: true }
    })

    const webhookSecret = company?.razorpayWebhookSecret
      ? (await import("@/lib/encryption")).decrypt(company.razorpayWebhookSecret)
      : process.env.RAZORPAY_WEBHOOK_SECRET

    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 400 })
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex")

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const event = payload.event
    if (event === "payment.captured" || event === "order.paid") {
      const amountInPaisa = paymentEntity.amount
      const amount = amountInPaisa / 100 // Convert paisa to rupees
      const paymentMethod = paymentEntity.method || "ONLINE"
      const transactionId = paymentEntity.id

      await verifyAndRecordRazorpayPayment(invoiceId, {
        razorpayPaymentId: transactionId,
        amount: amount,
        method: paymentMethod
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Razorpay webhook error:", error)
    return NextResponse.json({ error: error.message || "Webhook processing failed" }, { status: 500 })
  }
}
