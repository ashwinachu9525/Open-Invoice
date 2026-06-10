"use client"

import { useState } from "react"
import { updateInvoicePrefix } from "@/actions/company"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export function InvoicePrefixForm({ initialPrefix }: { initialPrefix?: string | null }) {
  const [prefix, setPrefix] = useState(initialPrefix || "INV")
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    const res = await updateInvoicePrefix(prefix)
    setIsSaving(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Invoice prefix updated")
    }
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Invoice Number Prefix</label>
        <div className="flex items-center gap-3">
          <Input 
            value={prefix} 
            onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9-/]/g, ''))}
            placeholder="e.g. INV or GST/24-25/"
            className="max-w-[200px]"
          />
          <Button onClick={handleSave} disabled={isSaving || !prefix.trim()}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      <div className="p-3 bg-muted/50 rounded-md border text-sm text-muted-foreground">
        Preview next invoice: <span className="font-mono text-foreground font-medium">{prefix || "INV"}-{currentYear}-0001</span>
      </div>
    </div>
  )
}
