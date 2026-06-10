"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createExpense } from "@/actions/expense"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Save, ArrowLeft, Upload } from "lucide-react"

const expenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

export function ExpenseForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      amount: 0,
      category: "",
      description: "",
    },
  })

  async function onSubmit(data: ExpenseFormValues) {
    setIsSubmitting(true)
    let receiptUrl = ""

    if (receiptFile) {
      const formData = new FormData()
      formData.append("file", receiptFile)
      
      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        const uploadData = await uploadRes.json()
        if (uploadData.url) {
          receiptUrl = uploadData.url
        } else {
          toast.error("Failed to upload receipt")
          setIsSubmitting(false)
          return
        }
      } catch (err) {
        toast.error("Error uploading receipt")
        setIsSubmitting(false)
        return
      }
    }

    const res = await createExpense({
      date: new Date(data.date),
      amount: data.amount,
      category: data.category,
      description: data.description,
      receiptUrl: receiptUrl || undefined,
    })
    
    if (res.error) {
      toast.error(res.error)
      setIsSubmitting(false)
    } else {
      toast.success("Expense recorded")
      router.push("/expenses")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input type="date" className="bg-black/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" className="bg-black/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category (e.g. Travel, Office, Software) <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Type a category" className="bg-black/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description / Notes</FormLabel>
                <FormControl>
                  <Input placeholder="Optional notes about this expense" className="bg-black/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormItem className="md:col-span-2">
            <FormLabel>Receipt Image/PDF</FormLabel>
            <FormControl>
              <div className="flex items-center gap-4">
                <Button type="button" variant="outline" className="glass border-white/10" onClick={() => document.getElementById("receipt-upload")?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Select File
                </Button>
                <span className="text-sm text-slate-400">
                  {receiptFile ? receiptFile.name : "No file selected"}
                </span>
                <input 
                  id="receipt-upload" 
                  type="file" 
                  accept="image/*,.pdf" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReceiptFile(e.target.files[0])
                    }
                  }} 
                />
              </div>
            </FormControl>
          </FormItem>

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
            {isSubmitting ? "Saving..." : "Save Expense"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
