"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { publicInvoiceSchema, PublicInvoiceData } from "@/lib/public-invoice-schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Upload, GripVertical } from "lucide-react"
import dynamic from "next/dynamic"
import { UpsellModal } from "./upsell-modal"
import { format } from "date-fns"
import { toast } from "sonner"

// Dynamically import the PDF previewer to avoid SSR issues
const DocumentPreview = dynamic(() => import("./document-preview"), { ssr: false })

export function DocumentGeneratorForm({ defaultType = "invoice" }: { defaultType?: "invoice" | "quotation" | "estimate" }) {
  const [showUpsell, setShowUpsell] = useState(false)
  
  const form = useForm<any>({
    resolver: zodResolver(publicInvoiceSchema),
    defaultValues: {
      documentType: defaultType,
      documentNumber: `${defaultType.toUpperCase().substring(0,3)}-001`,
      date: new Date(),
      currency: "INR",
      companyName: "",
      customerName: "",
      items: [
        { description: "", quantity: 1, unitPrice: 0, taxPercentage: 0, discount: 0 }
      ],
      themeColor: "#1e40af",
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  })

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB")
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      form.setValue("companyLogo", event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Watch entire form for live preview
  const currentData = form.watch()

  const onDownloadClick = () => {
    // Validate form before allowing download
    form.trigger().then((isValid) => {
      if (isValid) {
        // Trigger upsell modal after a short delay
        setTimeout(() => setShowUpsell(true), 1500)
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form Section */}
      <div className="space-y-6">
        
        {/* Company Details */}
        <Card className="glass border-white/10 shadow-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Your Details (From)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex gap-4 items-start">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center relative overflow-hidden bg-muted/20 group hover:border-primary/50 transition-colors">
                {currentData.companyLogo ? (
                  <img src={currentData.companyLogo} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Upload className="w-6 h-6 mb-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Logo</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/svg+xml" 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleLogoUpload}
                />
              </div>
              <div className="flex-1 space-y-4">
                <div className="space-y-1.5">
                  <Label>Company Name *</Label>
                  <Input {...form.register("companyName")} placeholder="Your Business Name" className="bg-background/50" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input {...form.register("companyEmail")} type="email" placeholder="contact@company.com" className="bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...form.register("companyPhone")} placeholder="+91 98765 43210" className="bg-background/50" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Address</Label>
                <Textarea {...form.register("companyAddress")} placeholder="Full Business Address" rows={2} className="bg-background/50 resize-none" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>GSTIN / Tax ID (Optional)</Label>
                <Input {...form.register("companyGst")} placeholder="22AAAAA0000A1Z5" className="bg-background/50" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Details */}
        <Card className="glass border-white/10 shadow-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Client Details (To)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Client Name *</Label>
              <Input {...form.register("customerName")} placeholder="Client Business or Person Name" className="bg-background/50" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input {...form.register("customerEmail")} type="email" placeholder="client@example.com" className="bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...form.register("customerPhone")} placeholder="+91 12345 67890" className="bg-background/50" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Address</Label>
                <Textarea {...form.register("customerAddress")} placeholder="Client Address" rows={2} className="bg-background/50 resize-none" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>GSTIN / Tax ID (Optional)</Label>
                <Input {...form.register("customerGst")} placeholder="Optional" className="bg-background/50" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Details */}
        <Card className="glass border-white/10 shadow-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Document Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Number *</Label>
                <Input {...form.register("documentNumber")} className="bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input 
                  type="date" 
                  defaultValue={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => form.setValue("date", new Date(e.target.value))} 
                  className="bg-background/50" 
                />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input {...form.register("currency")} placeholder="INR, USD..." className="bg-background/50" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="glass border-white/10 shadow-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/5 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Items</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="relative group border border-border/50 rounded-xl p-4 bg-background/30 hover:border-border transition-colors">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="absolute -top-3 -right-3 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                  title="Remove Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description *</Label>
                    <Input {...form.register(`items.${index}.description` as const)} placeholder="Item or Service Description" className="bg-background/50" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty</Label>
                      <Input type="number" step="0.01" {...form.register(`items.${index}.quantity` as const, { valueAsNumber: true })} className="bg-background/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</Label>
                      <Input type="number" step="0.01" {...form.register(`items.${index}.unitPrice` as const, { valueAsNumber: true })} className="bg-background/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax %</Label>
                      <Input type="number" step="0.1" {...form.register(`items.${index}.taxPercentage` as const, { valueAsNumber: true })} className="bg-background/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disc %</Label>
                      <Input type="number" step="0.1" {...form.register(`items.${index}.discount` as const, { valueAsNumber: true })} className="bg-background/50" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => append({ description: "", quantity: 1, unitPrice: 0, taxPercentage: 0, discount: 0 })}
              className="w-full border-dashed border-2 py-6 rounded-xl hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </CardContent>
        </Card>

        {/* Notes & Terms */}
        <Card className="glass border-white/10 shadow-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...form.register("notes")} placeholder="Thank you for your business!" className="bg-background/50 resize-none" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Terms & Conditions</Label>
              <Textarea {...form.register("terms")} placeholder="Payment due within 15 days." className="bg-background/50 resize-none" rows={2} />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Preview Section */}
      <div className="lg:sticky lg:top-8 h-[calc(100vh-4rem)] min-h-[600px] flex flex-col">
        <DocumentPreview data={currentData} onDownload={onDownloadClick} />
      </div>

      <UpsellModal open={showUpsell} onOpenChange={setShowUpsell} source={`${defaultType}-generator`} />
    </div>
  )
}
