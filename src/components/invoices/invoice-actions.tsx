"use client"

import { Button } from "@/components/ui/button"
import { updateInvoiceStatus, deleteInvoice } from "@/actions/invoice"
import { InvoiceStatus } from "@prisma/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { CheckCircle, AlertTriangle, IndianRupee, Percent, Info, Trash2 } from "lucide-react"

const TDS_SECTION_OPTIONS = [
  { label: "No TDS", value: "0", section: "" },
  { label: "1% — Sec 194C (Contractor)", value: "1", section: "194C" },
  { label: "2% — Sec 194C (Sub-contractor)", value: "2", section: "194C" },
  { label: "5% — Sec 194H (Commission)", value: "5", section: "194H" },
  { label: "10% — Sec 194J (Professional)", value: "10", section: "194J" },
  { label: "2% — Sec 194J (Technical)", value: "2", section: "194J" },
]

interface InvoiceActionsProps {
  invoiceId: string
  invoiceNumber: string
  status: InvoiceStatus
  finalAmount?: number
  tdsPercentage?: number
}

export function InvoiceActions({
  invoiceId,
  invoiceNumber,
  status,
  finalAmount = 0,
  tdsPercentage = 0,
}: InvoiceActionsProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  
  // Paid Dialog State
  const [showPaidDialog, setShowPaidDialog] = useState(false)
  const [amountPaid, setAmountPaid] = useState("")
  const [tdsOverride, setTdsOverride] = useState(String(tdsPercentage ?? 0))
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [paymentRef, setPaymentRef] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  // Delete Dialog State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleStatus(newStatus: InvoiceStatus) {
    setIsPending(true)
    await updateInvoiceStatus(invoiceId, newStatus)
    setIsPending(false)
    router.refresh()
  }

  function validatePaidForm() {
    const errs: Record<string, string> = {}
    const paid = parseFloat(amountPaid)
    const tds = parseFloat(tdsOverride)

    if (!amountPaid || isNaN(paid) || paid <= 0) {
      errs.amountPaid = "Enter a valid payment amount greater than 0"
    } else if (paid > finalAmount) {
      errs.amountPaid = `Amount cannot exceed invoice total of ₹${finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
    }

    if (isNaN(tds) || tds < 0 || tds > 100) {
      errs.tdsOverride = "TDS must be between 0% and 100%"
    }

    if (!paymentDate) {
      errs.paymentDate = "Payment date is required"
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleMarkAsPaid() {
    if (!validatePaidForm()) return

    const paid = parseFloat(amountPaid)
    const tds = parseFloat(tdsOverride)
    const isPartial = paid < finalAmount
    const newStatus: InvoiceStatus = isPartial ? "PARTIALLY_PAID" : "PAID"
    const noteLines = [
      `Payment received: ₹${paid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `Payment date: ${paymentDate}`,
      tds > 0 ? `TDS deducted: ${tds}%` : null,
      paymentRef ? `Ref: ${paymentRef}` : null,
    ]
      .filter(Boolean)
      .join(" | ")

    setIsPending(true)
    await updateInvoiceStatus(invoiceId, newStatus, noteLines)
    setIsPending(false)
    setSuccess(true)
    setTimeout(() => {
      setShowPaidDialog(false)
      setSuccess(false)
      router.refresh()
    }, 1200)
  }

  const tdsAmount =
    parseFloat(amountPaid) > 0 && parseFloat(tdsOverride) > 0
      ? (parseFloat(amountPaid) * parseFloat(tdsOverride)) / 100
      : 0

  const netReceivable =
    parseFloat(amountPaid) > 0
      ? parseFloat(amountPaid) - tdsAmount
      : 0

  async function handleDelete() {
    if (deleteConfirmation !== `delete ${invoiceNumber}`) {
      setErrors({ delete: `Please type 'delete ${invoiceNumber}' exactly.` })
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteInvoice(invoiceId)
      if (result.error) {
        setErrors({ delete: result.error })
        setIsDeleting(false)
      } else {
        router.push("/invoices")
      }
    } catch {
      setErrors({ delete: "Failed to delete invoice" })
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        {status === "DRAFT" && (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => handleStatus("SENT")}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            Mark as Sent
          </Button>
        )}
        {["SENT", "VIEWED", "PARTIALLY_PAID"].includes(status) && (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => setShowPaidDialog(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            <CheckCircle className="h-4 w-4 mr-1.5" />
            Mark as Paid
          </Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          className="glass border-red-500/30 hover:bg-red-500/20 shadow-md hover:shadow-lg transition-all"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Delete
        </Button>
      </div>

      {/* ── Mark as Paid Dialog ── */}
      <Dialog open={showPaidDialog} onOpenChange={setShowPaidDialog}>
        <DialogContent className="sm:max-w-md glass border-white/10 shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-500">
                <CheckCircle className="h-4 w-4" />
              </div>
              Record Payment
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Confirm payment details including TDS deduction (mandatory if applicable).
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="py-6 flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                <CheckCircle className="h-8 w-8" />
              </div>
              <p className="font-semibold text-emerald-500">Payment Recorded!</p>
            </div>
          ) : (
            <div className="space-y-4 py-1">
              {/* Invoice Total Info */}
              <Alert className="glass border-white/10">
                <Info className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-sm">
                  Invoice total:{" "}
                  <span className="font-semibold">
                    ₹{finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </AlertDescription>
              </Alert>

              {/* Amount Paid */}
              <div className="space-y-1.5">
                <Label htmlFor="amount-paid" className="text-sm font-medium">
                  Amount Received <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount-paid"
                    type="number"
                    placeholder="0.00"
                    className="pl-9 glass border-white/10"
                    value={amountPaid}
                    onChange={(e) => {
                      setAmountPaid(e.target.value)
                      if (errors.amountPaid) setErrors((p) => ({ ...p, amountPaid: "" }))
                    }}
                  />
                </div>
                {errors.amountPaid && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.amountPaid}
                  </p>
                )}
              </div>

              {/* TDS Section */}
              <div className="space-y-1.5">
                <Label htmlFor="tds-rate" className="text-sm font-medium flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-orange-400" />
                  TDS Rate (if applicable)
                </Label>
                <select
                  id="tds-rate"
                  className="flex h-9 w-full rounded-md border border-white/10 glass px-3 py-1 text-sm bg-transparent"
                  value={tdsOverride}
                  onChange={(e) => {
                    setTdsOverride(e.target.value)
                    if (errors.tdsOverride) setErrors((p) => ({ ...p, tdsOverride: "" }))
                  }}
                >
                  {TDS_SECTION_OPTIONS.map((opt) => (
                    <option key={`${opt.value}-${opt.section}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {/* Custom TDS input */}
                {!TDS_SECTION_OPTIONS.some((o) => o.value === tdsOverride) && (
                  <div className="relative mt-1">
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Custom TDS %"
                      className="pr-9 glass border-white/10"
                      value={tdsOverride}
                      min={0}
                      max={100}
                      onChange={(e) => {
                        setTdsOverride(e.target.value)
                        if (errors.tdsOverride) setErrors((p) => ({ ...p, tdsOverride: "" }))
                      }}
                    />
                  </div>
                )}
                {errors.tdsOverride && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.tdsOverride}
                  </p>
                )}
              </div>

              {/* Payment Date */}
              <div className="space-y-1.5">
                <Label htmlFor="payment-date" className="text-sm font-medium">
                  Payment Date <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="payment-date"
                  type="date"
                  className="glass border-white/10"
                  value={paymentDate}
                  onChange={(e) => {
                    setPaymentDate(e.target.value)
                    if (errors.paymentDate) setErrors((p) => ({ ...p, paymentDate: "" }))
                  }}
                />
                {errors.paymentDate && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.paymentDate}
                  </p>
                )}
              </div>

              {/* Payment Reference */}
              <div className="space-y-1.5">
                <Label htmlFor="payment-ref" className="text-sm font-medium">
                  Transaction Reference <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="payment-ref"
                  placeholder="UTR / NEFT Ref / Cheque No."
                  className="glass border-white/10"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                />
              </div>

              {/* TDS Summary */}
              {parseFloat(amountPaid) > 0 && (
                <div className="rounded-xl border border-white/10 glass p-3 space-y-1.5 text-sm">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment Summary</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Received</span>
                    <span className="font-medium">₹{parseFloat(amountPaid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {tdsAmount > 0 && (
                    <div className="flex justify-between text-orange-400">
                      <span>TDS Deducted ({tdsOverride}%)</span>
                      <span>-₹{tdsAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t border-white/10 pt-1.5 text-emerald-400">
                    <span>Net Receivable</span>
                    <span>₹{netReceivable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {parseFloat(amountPaid) < finalAmount && (
                    <Alert className="mt-2 border-yellow-500/30 bg-yellow-500/10">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
                      <AlertDescription className="text-xs text-yellow-400">
                        Partial payment — invoice will be marked as <strong>Partially Paid</strong>.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}

          {!success && (
            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowPaidDialog(false)}
                disabled={isPending}
                className="glass border-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMarkAsPaid}
                disabled={isPending}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white flex-1"
              >
                {isPending ? "Recording..." : "Confirm Payment"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md glass border-white/10 shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-lg text-red-500">
              <Trash2 className="h-5 w-5" />
              Delete Invoice
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice <strong>{invoiceNumber}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Type <strong className="select-none">delete {invoiceNumber}</strong> to confirm
              </Label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={`delete ${invoiceNumber}`}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              {errors.delete && (
                <p className="text-xs text-red-400 mt-1">{errors.delete}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteConfirmation("")
                setErrors({})
              }}
              disabled={isDeleting}
              className="glass border-white/10"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirmation !== `delete ${invoiceNumber}`}
              className="bg-red-500 hover:bg-red-600 flex-1"
            >
              {isDeleting ? "Deleting..." : "Delete Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
