"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function EditInvoiceButton({ invoiceId, status, isFrozen, userRole }: { invoiceId: string; status: string; isFrozen?: boolean; userRole?: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  if (isFrozen && userRole !== "BUSINESS_OWNER" && userRole !== "ADMIN") {
    return null
  }

  const handleEditClick = () => {
    if (status === "PAID") {
      setOpen(true)
    } else {
      router.push(`/invoices/${invoiceId}/edit`)
    }
  }

  const handleConfirmEdit = () => {
    setOpen(false)
    router.push(`/invoices/${invoiceId}/edit`)
  }

  return (
    <>
      <Button variant="outline" size="sm" className="glass border-white/10 hover:bg-white/8 gap-1.5" onClick={handleEditClick}>
        Edit
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Paid Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This invoice has already been marked as PAID. Editing a paid invoice may alter its totals and invalidate any existing receipts or accounting records. Are you sure you want to edit it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEdit} className="bg-amber-600 hover:bg-amber-700 text-white">
              Yes, Edit Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
