"use client"

import { useState } from "react"
import { updateInvoiceSettings } from "@/actions/company"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { TemplateSelector } from "./template-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function InvoiceSettingsForm({ initialData }: { initialData?: any }) {
  const [prefix, setPrefix] = useState(initialData?.invoicePrefix || "INV")
  const [template, setTemplate] = useState(initialData?.invoiceTemplate || "modern")
  const [removeWatermark, setRemoveWatermark] = useState(initialData?.removeWatermark || false)
  const [autoFreezeMonths, setAutoFreezeMonths] = useState<string>(
    initialData?.autoFreezeMonths ? initialData.autoFreezeMonths.toString() : "0"
  )
  const [isSaving, setIsSaving] = useState(false)

  const isPro = initialData?.subscriptionTier === "PRO" || initialData?.subscriptionTier === "ENTERPRISE"

  const handleSave = async () => {
    setIsSaving(true)
    const parsedFreeze = parseInt(autoFreezeMonths)
    const res = await updateInvoiceSettings({
      invoicePrefix: prefix,
      invoiceTemplate: template,
      removeWatermark: removeWatermark,
      autoFreezeMonths: parsedFreeze > 0 ? parsedFreeze : null
    })
    setIsSaving(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Invoice settings updated successfully")
    }
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-8">
      {/* Invoice Prefix */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-foreground">Invoice Number Prefix</h3>
          <p className="text-sm text-muted-foreground">Customize the prefix for your auto-generated invoice numbers.</p>
        </div>
        <div className="flex items-center gap-3">
          <Input 
            value={prefix} 
            onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9-/]/g, ''))}
            placeholder="e.g. INV or GST/24-25/"
            className="max-w-[200px]"
          />
        </div>
        <div className="p-3 bg-muted/50 rounded-md border text-sm text-muted-foreground w-max">
          Preview next invoice: <span className="font-mono text-foreground font-medium">{prefix || "INV"}-{currentYear}-0001</span>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Template Selector */}
      <TemplateSelector 
        value={template} 
        onChange={setTemplate} 
        isPro={isPro} 
      />

      {/* Remove Watermark */}
      <div className="flex flex-row items-center justify-between rounded-lg border bg-card p-4">
        <div className="space-y-0.5">
          <label className="text-base font-medium text-foreground flex items-center gap-2">
            Hide Company Watermark
            {!isPro && (
              <span className="text-[10px] text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Pro Only
              </span>
            )}
          </label>
          <p className="text-sm text-muted-foreground">
            Removes the "Powered by" watermark from all your invoices and quotations.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={removeWatermark} 
            onChange={(e) => setRemoveWatermark(e.target.checked)}
            disabled={!isPro} 
          />
          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 peer-disabled:opacity-50"></div>
        </label>
      </div>

      <div className="border-t border-border" />

      {/* Auto Freeze Invoices */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-foreground">Auto-Freeze Old Invoices</h3>
          <p className="text-sm text-muted-foreground">Automatically freeze invoices older than the specified time to prevent accidental edits during closing. Only Admins can unfreeze them.</p>
        </div>
        <Select value={autoFreezeMonths} onValueChange={(val) => setAutoFreezeMonths(val || "0")}>
          <SelectTrigger className="max-w-[300px]">
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Disabled</SelectItem>
            <SelectItem value="1">1 Month</SelectItem>
            <SelectItem value="2">2 Months</SelectItem>
            <SelectItem value="3">3 Months</SelectItem>
            <SelectItem value="6">6 Months</SelectItem>
            <SelectItem value="12">1 Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border-t border-border pt-4 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !prefix.trim()}>
          {isSaving ? "Saving Settings..." : "Save All Settings"}
        </Button>
      </div>
    </div>
  )
}
