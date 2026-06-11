"use client"

import { Button } from "@/components/ui/button"
import { updateQuotationStatus, deleteQuotation } from "@/actions/quotation"
import { QuotationStatus } from "@prisma/client"
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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { CheckCircle, XCircle, Trash2 } from "lucide-react"

interface QuotationActionsProps {
  quotationId: string
  quotationNumber: string
  status: QuotationStatus
}

export function QuotationActions({
  quotationId,
  quotationNumber,
  status,
}: QuotationActionsProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  
  // Delete Dialog State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleStatus(newStatus: QuotationStatus) {
    setIsPending(true)
    await updateQuotationStatus(quotationId, newStatus)
    setIsPending(false)
    router.refresh()
  }

  async function handleDelete() {
    if (deleteConfirmation !== `delete ${quotationNumber}`) {
      setErrors({ delete: `Please type 'delete ${quotationNumber}' exactly.` })
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteQuotation(quotationId)
      if (result.error) {
        setErrors({ delete: result.error })
        setIsDeleting(false)
      } else {
        router.push("/quotations")
      }
    } catch {
      setErrors({ delete: "Failed to delete quotation" })
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
        {["SENT", "VIEWED"].includes(status) && (
          <>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => handleStatus("ACCEPTED")}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => handleStatus("REJECTED")}
              className="glass border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Reject
            </Button>
          </>
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

      {/* ── Delete Dialog ── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md glass border-white/10 shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-lg text-red-500">
              <Trash2 className="h-5 w-5" />
              Delete Quotation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete quotation <strong>{quotationNumber}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Type <strong className="select-none">delete {quotationNumber}</strong> to confirm
              </Label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={`delete ${quotationNumber}`}
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
              disabled={isDeleting || deleteConfirmation !== `delete ${quotationNumber}`}
              className="bg-red-500 hover:bg-red-600 flex-1"
            >
              {isDeleting ? "Deleting..." : "Delete Quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
