"use client"

import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { invoiceSchema, InvoiceFormValues } from "@/validations/invoice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { createInvoice, updateInvoice } from "@/actions/invoice"
import { calculateInvoiceTax, formatINR, TDS_RATES } from "@/services/tax-engine"
import { useState, useMemo, useEffect } from "react"
import { Plus, Trash2, AlertCircle, TrendingDown, Receipt, Percent } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BankAccount } from "@prisma/client"

interface InvoiceFormProps {
  customers: { id: string; name: string; state?: string | null }[]
  defaultInvoiceNumber: string
  sellerState?: string | null
  bankAccounts?: BankAccount[]
  initialData?: InvoiceFormValues
  invoiceId?: string
}

export function InvoiceForm({ customers, defaultInvoiceNumber, sellerState, bankAccounts = [], initialData, invoiceId }: InvoiceFormProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState("")

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: initialData || {
      customerId: "",
      invoiceNumber: defaultInvoiceNumber,
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency: "INR",
      tdsPercentage: 0,
      items: [{ description: "", quantity: 1, unitPrice: 0, discount: 0, taxPercentage: 18 }],
      bankName: "",
      bankAccountName: "",
      bankAccountNumber: "",
      bankIfscCode: "",
      bankAccountType: "",
    },
  })

  // Autofill default bank account if available
  useEffect(() => {
    if (initialData) return // Do not override if editing
    const defaultAccount = bankAccounts.find(a => a.isDefault)
    if (defaultAccount) {
      form.setValue("bankName", defaultAccount.bankName)
      form.setValue("bankAccountName", defaultAccount.accountName)
      form.setValue("bankAccountNumber", defaultAccount.accountNumber)
      form.setValue("bankIfscCode", defaultAccount.ifscCode)
      if (defaultAccount.accountType) form.setValue("bankAccountType", defaultAccount.accountType)
    }
  }, [bankAccounts, form, initialData])

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" })
  const watched = form.watch()

  const taxPreview = useMemo(() => {
    const customer = customers.find((c) => c.id === watched.customerId)
    try {
      return calculateInvoiceTax({
        items: watched.items,
        sellerState,
        buyerState: customer?.state,
        tdsPercentage: watched.tdsPercentage,
      })
    } catch {
      return null
    }
  }, [watched, customers, sellerState])

  async function onSubmit(data: InvoiceFormValues) {
    setIsPending(true)
    setError("")
    
    const result = invoiceId 
      ? await updateInvoice(invoiceId, data)
      : await createInvoice(data)
      
    setIsPending(false)
    if (result.error) {
      setError(result.error)
    } else if ("invoiceId" in result && result.invoiceId) {
      router.push(`/invoices/${result.invoiceId}`)
    } else if (invoiceId && result.success) {
      router.push(`/invoices/${invoiceId}`)
    }
  }

  const inputClass = "glass border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
  const selectClass = "flex h-9 w-full rounded-md border border-white/10 bg-transparent px-3 py-1 text-sm backdrop-blur-sm focus:outline-none focus:border-primary/50 transition-all"

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert className="border-red-500/30 bg-red-500/10 animate-in fade-in duration-300">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* ── Section: Invoice Details ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoice Details</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Customer <span className="text-red-400">*</span>
                  </FormLabel>
                  <FormControl>
                    <select className={selectClass} {...field}>
                      <option value="">Select customer</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Invoice # <span className="text-red-400">*</span>
                  </FormLabel>
                  <FormControl><Input className={inputClass} {...field} /></FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Date <span className="text-red-400">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className={inputClass}
                      value={field.value instanceof Date ? field.value.toISOString().split("T")[0] : field.value}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Due Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className={inputClass}
                      value={field.value instanceof Date ? field.value.toISOString().split("T")[0] : field.value}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator className="bg-white/8" />

        {/* ── Section: Line Items ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" />
              Line Items <span className="text-red-400 normal-case tracking-normal font-normal text-[10px] ml-1">(at least 1 required)</span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: "", quantity: 1, unitPrice: 0, discount: 0, taxPercentage: 18 })}
              className="glass border-white/10 hover:bg-white/8 gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="glass glass-card border-white/10 p-4 pt-10 md:pt-4 rounded-xl grid grid-cols-2 md:grid-cols-6 gap-3 items-end group relative"
              >
                <FormField
                  control={form.control}
                  name={`items.${index}.description`}
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-xs text-muted-foreground">Description *</FormLabel>
                      <FormControl><Input className={inputClass} placeholder="Service / Product" {...field} /></FormControl>
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.hsnSac`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">HSN/SAC</FormLabel>
                      <FormControl><Input className={inputClass} placeholder="e.g. 998314" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Qty *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className={inputClass}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.unitPrice`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Rate *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className={inputClass}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.taxPercentage`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">GST %</FormLabel>
                      <FormControl>
                        <select
                          className={selectClass}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        >
                          {[0, 5, 12, 18, 28].map((r) => (
                            <option key={r} value={r}>{r}%</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="absolute top-2 right-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-400 h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Items validation error */}
          {form.formState.errors.items?.root?.message && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {form.formState.errors.items.root.message}
            </p>
          )}
        </div>

        <Separator className="bg-white/8" />

        {/* ── Section: TDS ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-orange-400" />
            TDS Configuration
          </p>
          <FormField
            control={form.control}
            name="tdsPercentage"
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-orange-400" />
                  TDS Rate
                </FormLabel>
                <FormControl>
                  <select
                    className={selectClass}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    <option value={0}>No TDS (0%)</option>
                    <option value={1}>1% — Sec 194C (Contractor)</option>
                    <option value={2}>2% — Sec 194C / 194J (Technical)</option>
                    <option value={5}>5% — Sec 194H (Commission)</option>
                    <option value={10}>10% — Sec 194J (Professional)</option>
                    {TDS_RATES.filter((r) => ![0, 1, 2, 5, 10].includes(r)).map((rate) => (
                      <option key={rate} value={rate}>{rate}%</option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
        </div>
        
        <Separator className="bg-white/8" />

        {/* ── Section: Customization & Details ── */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank Details</p>
            {bankAccounts.length > 0 ? (
              <div className="flex items-center gap-2">
                <select
                  className={`${selectClass} w-auto text-xs py-0 h-7 border-white/20`}
                  onChange={(e) => {
                    const acc = bankAccounts.find(a => a.id === e.target.value)
                    if (acc) {
                      form.setValue("bankName", acc.bankName)
                      form.setValue("bankAccountName", acc.accountName)
                      form.setValue("bankAccountNumber", acc.accountNumber)
                      form.setValue("bankIfscCode", acc.ifscCode)
                      form.setValue("bankAccountType", acc.accountType || "")
                    }
                  }}
                >
                  <option value="">Auto-fill from saved...</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNumber.slice(-4)}</option>
                  ))}
                </select>
                <Link href="/settings" className="text-[10px] text-blue-400 hover:underline">Manage</Link>
              </div>
            ) : (
              <Link href="/settings" className="text-xs text-blue-400 hover:underline">Save bank accounts in Settings</Link>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Bank Name</FormLabel>
                  <FormControl><Input className={inputClass} placeholder="e.g. State Bank of India" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankAccountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Account Name</FormLabel>
                  <FormControl><Input className={inputClass} placeholder="Account Holder Name" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankAccountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Account Number</FormLabel>
                  <FormControl><Input className={inputClass} placeholder="Account Number" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankIfscCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">IFSC Code</FormLabel>
                  <FormControl><Input className={inputClass} placeholder="e.g. SBIN0071207" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankAccountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Account Type</FormLabel>
                  <FormControl><Input className={inputClass} placeholder="e.g. Current or Savings" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator className="bg-white/8" />

        {/* ── Section: Customization ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoice Design</p>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="themeColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Theme Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        className="h-10 w-20 p-1 border-white/10 bg-transparent rounded cursor-pointer"
                        value={field.value ?? "#1e40af"}
                        onChange={field.onChange}
                      />
                      <Input
                        type="text"
                        className={inputClass}
                        value={field.value ?? "#1e40af"}
                        onChange={field.onChange}
                        placeholder="#1e40af"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="themeFont"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Theme Font</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value ?? "Helvetica"}
                      onChange={field.onChange}
                    >
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times-Roman">Times New Roman</option>
                      <option value="Courier">Courier</option>
                    </select>
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ── Tax Preview ── */}
        {taxPreview && (
          <div className="glass glass-card border-white/10 p-4 rounded-xl space-y-2 text-sm animate-in fade-in duration-300">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Tax Preview</p>
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatINR(taxPreview.subTotal)}</span>
            </div>
            {taxPreview.cgstAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>CGST</span>
                <span>{formatINR(taxPreview.cgstAmount)}</span>
              </div>
            )}
            {taxPreview.sgstAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>SGST</span>
                <span>{formatINR(taxPreview.sgstAmount)}</span>
              </div>
            )}
            {taxPreview.igstAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>IGST {taxPreview.isInterState ? "(Inter-state)" : ""}</span>
                <span>{formatINR(taxPreview.igstAmount)}</span>
              </div>
            )}
            {taxPreview.tdsAmount > 0 && (
              <div className="flex justify-between text-orange-400">
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3.5 w-3.5" />
                  TDS ({taxPreview.tdsPercentage}%)
                </span>
                <span>-{formatINR(taxPreview.tdsAmount)}</span>
              </div>
            )}
            <Separator className="bg-white/10 my-1" />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-primary">{formatINR(taxPreview.finalAmount)}</span>
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all w-full sm:w-auto px-8"
        >
          {isPending 
            ? (invoiceId ? "Saving..." : "Creating Invoice...") 
            : (invoiceId ? "Save Changes →" : "Create Invoice →")}
        </Button>
      </form>
    </Form>
  )
}
