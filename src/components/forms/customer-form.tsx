"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { customerSchema, CustomerFormValues } from "@/validations/customer"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { createCustomer, updateCustomer } from "@/actions/customer"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Building2, User, MapPin, Receipt, Loader2 } from "lucide-react"
import { toast } from "sonner"

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep","Puducherry",
]

interface CustomerFormProps {
  mode?: "create" | "edit"
  customerId?: string
  defaultValues?: Partial<CustomerFormValues>
}

export function CustomerForm({ mode = "create", customerId, defaultValues }: CustomerFormProps) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const [isGstinLoading, setIsGstinLoading] = useState(false)

  async function handleGstinLookup() {
    const gstinVal = form.getValues("gstin")
    if (!gstinVal || gstinVal.length !== 15) return

    setIsGstinLoading(true)
    try {
      const { lookupGstin } = await import("@/actions/gstin")
      const result = await lookupGstin(gstinVal)
      if (result.error) {
        toast.error(result.error)
      } else if (result.success && result.legalName) {
        form.setValue("companyName", result.legalName)
        if (result.pan) {
          form.setValue("pan", result.pan)
        } else {
          form.setValue("pan", gstinVal.substring(2, 12))
        }
        if (result.address) {
          form.setValue("address", result.address)
        }
        if (result.state) {
          const matchedState = INDIAN_STATES.find(
            s => s.toLowerCase() === result.state?.toLowerCase()
          )
          if (matchedState) {
            form.setValue("state", matchedState)
          } else {
            form.setValue("state", result.state)
          }
        }
        toast.success("Customer details autofilled from GSTIN portal!")
      }
    } catch {
      toast.error("Failed to lookup GSTIN details")
    } finally {
      setIsGstinLoading(false)
    }
  }

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      companyName: "",
      gstin: "",
      pan: "",
      email: "",
      phone: "",
      address: "",
      state: "",
      country: "India",
      ...defaultValues,
    },
  })

  async function onSubmit(data: CustomerFormValues) {
    setIsPending(true)
    setError("")
    let result: { error?: string } | undefined

    if (mode === "edit" && customerId) {
      result = await updateCustomer(customerId, data) ?? undefined
    } else {
      result = await createCustomer(data) ?? undefined
    }
    setIsPending(false)
    if (result?.error) setError(result.error)
  }

  const inputClass = "glass border-white/10 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
  const selectClass = "flex h-9 w-full rounded-md border border-white/10 bg-transparent px-3 py-1 text-sm backdrop-blur-sm focus:outline-none focus:border-primary/50 transition-all"

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert className="border-red-500/30 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* ── Contact Info ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Contact Information
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Contact Person <span className="text-red-400">*</span></FormLabel>
                  <FormControl><Input className={inputClass} placeholder="John Doe" {...field} /></FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Company Name</FormLabel>
                  <FormControl><Input className={inputClass} placeholder="Client Company Pvt Ltd" {...field} /></FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Email</FormLabel>
                  <FormControl><Input type="email" className={inputClass} placeholder="client@example.com" {...field} /></FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Phone</FormLabel>
                  <FormControl><Input className={inputClass} placeholder="+91 9876543210" {...field} /></FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator className="bg-white/8" />

        {/* ── Tax Info ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Tax Details
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="gstin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium flex items-center justify-between">
                    <span>GSTIN</span>
                    {field.value && field.value.length === 15 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isGstinLoading}
                        onClick={handleGstinLookup}
                        className="h-6 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2 gap-1"
                      >
                        {isGstinLoading ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Autofilling...
                          </>
                        ) : (
                          "🔍 Verify & Autofill"
                        )}
                      </Button>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className={inputClass}
                      placeholder="22AAAAA0000A1Z5"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">PAN Number</FormLabel>
                  <FormControl>
                    <Input
                      className={inputClass}
                      placeholder="ABCDE1234F"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator className="bg-white/8" />

        {/* ── Address ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Address
          </p>
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Billing Address</FormLabel>
                <FormControl>
                  <Input className={inputClass} placeholder="123 Client Street, City, PIN 400001" {...field} />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">State <span className="text-xs text-orange-400">(Important for GST)</span></FormLabel>
                  <FormControl>
                    <select className={selectClass} {...field}>
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Country</FormLabel>
                  <FormControl><Input className={inputClass} placeholder="India" {...field} /></FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-lg"
          >
            {isPending
              ? (mode === "edit" ? "Saving..." : "Creating...")
              : (mode === "edit" ? "Save Changes" : "Add Customer")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="glass border-white/10 hover:bg-white/8"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}
