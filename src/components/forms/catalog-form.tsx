"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createCatalogItem } from "@/actions/catalog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Save, ArrowLeft } from "lucide-react"

const catalogSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  hsnSac: z.string().optional(),
  unitPrice: z.coerce.number().min(0, "Price must be >= 0"),
  taxPercentage: z.coerce.number().min(0, "Tax must be >= 0").max(100, "Tax cannot exceed 100%"),
  unit: z.string().optional(),
})

type CatalogFormValues = z.infer<typeof catalogSchema>

export function CatalogForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CatalogFormValues>({
    resolver: zodResolver(catalogSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      hsnSac: "",
      unitPrice: 0,
      taxPercentage: 18,
      unit: "pcs",
    },
  })

  async function onSubmit(data: CatalogFormValues) {
    setIsSubmitting(true)
    const res = await createCatalogItem(data)
    
    if (res.error) {
      toast.error(res.error)
      setIsSubmitting(false)
    } else {
      toast.success("Item added to catalog")
      router.push("/catalog")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Item Name <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Web Development Service" className="bg-black/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Optional detailed description" className="bg-black/20 resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit Price (₹) <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" className="bg-black/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="taxPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GST Tax Rate (%) <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" className="bg-black/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hsnSac"
            render={({ field }) => (
              <FormItem>
                <FormLabel>HSN / SAC Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 998311" className="bg-black/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measure</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. pcs, hours, kg" className="bg-black/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-4 pt-4 border-t border-white/10">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="border-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Saving..." : "Save to Catalog"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
