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
import { calculateInvoiceTax, formatINR, formatCurrency, TDS_RATES } from "@/services/tax-engine"
import { getExchangeRates } from "@/services/currency"
import { COMMON_CURRENCIES } from "@/lib/currencies"
import { useState, useMemo, useEffect } from "react"
import { Plus, Trash2, AlertCircle, TrendingDown, Receipt, Percent, Package } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BankAccount, ProductCatalog } from "@prisma/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
import { PastInvoiceModal } from "./past-invoice-modal"

interface InvoiceFormProps {
  customers: { id: string; name: string; state?: string | null }[]
  defaultInvoiceNumber: string
  sellerState?: string | null
  bankAccounts?: BankAccount[]
  initialData?: InvoiceFormValues
  invoiceId?: string
  catalogItems?: ProductCatalog[]
  pastInvoices?: any[]
}

export function InvoiceForm({ customers, defaultInvoiceNumber, sellerState, bankAccounts = [], initialData, invoiceId, catalogItems = [], pastInvoices = [] }: InvoiceFormProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [error, setError] = useState("")

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: initialData || {
      customerId: "",
      invoiceNumber: defaultInvoiceNumber,
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency: "INR",
      exchangeRate: 1,
      taxJurisdiction: "INDIA_GST",
      tdsPercentage: 0,
      items: [{ description: "", quantity: 1, unitPrice: 0, discount: 0, taxPercentage: 18 }],
      bankName: "",
      bankAccountName: "",
      bankAccountNumber: "",
      bankIfscCode: "",
      bankAccountType: "",
    },
  })

  const [catalogSearch, setCatalogSearch] = useState("")
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)

  const filteredCatalog = catalogItems.filter(item => 
    item.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
    (item.hsnSac && item.hsnSac.toLowerCase().includes(catalogSearch.toLowerCase()))
  )

  const handleAddFromCatalog = (item: ProductCatalog) => {
    append({
      description: item.name + (item.description ? ` - ${item.description}` : ""),
      hsnSac: item.hsnSac || "",
      quantity: 1,
      unitPrice: item.unitPrice,
      discount: 0,
      taxPercentage: item.taxPercentage
    })
    setIsCatalogOpen(false)
    setCatalogSearch("")
  }

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

  const [isFetchingRate, setIsFetchingRate] = useState(false)
  useEffect(() => {
    if (watched.currency && watched.currency !== "INR") {
      setIsFetchingRate(true)
      getExchangeRates("INR").then(rates => {
        const rateToInr = rates[watched.currency]
        if (rateToInr) {
          // If 1 INR = 0.012 USD, then 1 USD = 1/0.012 INR = 83.33 INR
          const rate = parseFloat((1 / rateToInr).toFixed(2))
          form.setValue("exchangeRate", rate)
        }
      }).finally(() => setIsFetchingRate(false))
    } else {
      form.setValue("exchangeRate", 1)
    }
  }, [watched.currency, form])

  const taxPreview = useMemo(() => {
    const customer = customers.find((c) => c.id === watched.customerId)
    try {
      return calculateInvoiceTax({
        items: watched.items,
        sellerState,
        buyerState: customer?.state,
        tdsPercentage: watched.tdsPercentage,
        taxJurisdiction: watched.taxJurisdiction,
      })
    } catch {
      return null
    }
  }, [watched, customers, sellerState])

  const handlePastInvoiceSelect = async (pastInvoice: any, aiInstructions?: string) => {
    form.setValue("customerId", pastInvoice.customerId)
    form.setValue("currency", pastInvoice.currency)
    form.setValue("exchangeRate", pastInvoice.exchangeRate)
    form.setValue("taxJurisdiction", pastInvoice.taxJurisdiction || "INDIA_GST")
    form.setValue("tdsPercentage", pastInvoice.tdsPercentage)
    form.setValue("notes", pastInvoice.notes || "")
    form.setValue("terms", pastInvoice.terms || "")
    form.setValue("bankName", pastInvoice.bankName || "")
    form.setValue("bankAccountName", pastInvoice.bankAccountName || "")
    form.setValue("bankAccountNumber", pastInvoice.bankAccountNumber || "")
    form.setValue("bankIfscCode", pastInvoice.bankIfscCode || "")
    form.setValue("bankAccountType", pastInvoice.bankAccountType || "")
    form.setValue("themeColor", pastInvoice.themeColor || "#1e40af")
    form.setValue("themeFont", pastInvoice.themeFont || "Helvetica")

    if (!aiInstructions) {
      // Just clone items
      form.setValue("items", pastInvoice.items.map((i: any) => ({
        description: i.description,
        hsnSac: i.hsnSac || "",
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        taxPercentage: i.taxPercentage
      })))
      return
    }

    // Call AI
    setIsAiLoading(true)
    setError("")
    try {
      const res = await fetch("/api/ai/invoice-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceData: pastInvoice, instructions: aiInstructions })
      })

      if (!res.ok) {
        throw new Error("Failed to get AI suggestions")
      }

      const data = await res.json()
      if (data.items && Array.isArray(data.items)) {
        form.setValue("items", data.items.map((i: any) => ({
          description: i.description || "",
          hsnSac: i.hsnSac || "",
          quantity: i.quantity || 1,
          unitPrice: i.unitPrice || 0,
          discount: i.discount || 0,
          taxPercentage: i.taxPercentage || 18
        })))
      }
      if (data.notes) form.setValue("notes", data.notes)
    } catch (err: any) {
      setError(err.message || "Failed to get AI suggestions")
    } finally {
      setIsAiLoading(false)
    }
  }

  async function onSubmit(data: InvoiceFormValues) {
    setIsPending(true)
    setError("")
    
    const result = invoiceId 
      ? await updateInvoice(invoiceId, data)
      : await createInvoice(data)
      
    setIsPending(false)
    if (result.error === "FREE_LIMIT_REACHED") {
      setError("You have reached the maximum limit of 5 invoices on the Free plan. Please upgrade to Pro.")
      setIsPending(false)
      return
    }

    if (result.error) {
      setError(result.error)
      setIsPending(false)
      return
    }

    if ("invoiceId" in result && result.invoiceId) {
      router.push(`/invoices/${result.invoiceId}`)
    } else if (invoiceId && result.success) {
      router.push(`/invoices/${invoiceId}`)
    }
  }

  const inputClass = "glass border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
  const selectClass = "flex h-9 w-full rounded-md border border-white/10 bg-transparent px-3 py-1 text-sm backdrop-blur-sm focus:outline-none focus:border-primary/50 transition-all"

  return (
    <>
      {!invoiceId && pastInvoices.length > 0 && (
        <PastInvoiceModal pastInvoices={pastInvoices} onSelect={handlePastInvoiceSelect} />
      )}
      
      {isAiLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 glass rounded-2xl border-white/10 max-w-sm text-center">
            <div className="h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            <div>
              <p className="font-semibold">AI is analyzing & cloning...</p>
              <p className="text-sm text-muted-foreground">This may take a few seconds.</p>
            </div>
          </div>
        </div>
      )}

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
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Currency</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <select className={selectClass} {...field}>
                        {COMMON_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                        ))}
                      </select>
                      {isFetchingRate && <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />}
                    </div>
                  </FormControl>
                  {watched.currency !== "INR" && watched.exchangeRate !== 1 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      1 {watched.currency} ≈ {watched.exchangeRate} INR
                    </p>
                  )}
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taxJurisdiction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Tax Region</FormLabel>
                  <FormControl>
                    <select className={selectClass} {...field}>
                      <option value="INDIA_GST">India (GST)</option>
                      <option value="EU_VAT">EU/Global (VAT/Tax)</option>
                      <option value="US_SALES_TAX">US (Sales Tax)</option>
                      <option value="NONE">No Tax</option>
                    </select>
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
            <div className="flex items-center gap-2">
              {catalogItems.length > 0 && (
                <Dialog open={isCatalogOpen} onOpenChange={setIsCatalogOpen}>
                  {/* @ts-ignore */}
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="glass border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 gap-1.5 text-xs">
                      <Package className="h-3.5 w-3.5" /> From Catalog
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] bg-black/90 border-white/10 text-white backdrop-blur-xl">
                    <DialogHeader>
                      <DialogTitle>Add from Catalog</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Input 
                        placeholder="Search products/services..." 
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        className="bg-white/5 border-white/10"
                      />
                      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {filteredCatalog.length === 0 ? (
                          <p className="text-center text-sm text-muted-foreground py-4">No items found.</p>
                        ) : (
                          filteredCatalog.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                              <div>
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatCurrency(item.unitPrice, watched.currency)} {item.unit ? `per ${item.unit}` : ''} 
                                  {item.hsnSac ? ` • HSN/SAC: ${item.hsnSac}` : ''}
                                  ` • Tax: ${item.taxPercentage}%`
                                </p>
                              </div>
                              <Button type="button" size="sm" onClick={() => handleAddFromCatalog(item)} className="bg-indigo-600 hover:bg-indigo-700 h-8">
                                Add
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ description: "", quantity: 1, unitPrice: 0, discount: 0, taxPercentage: 18 })}
                className="glass border-white/10 hover:bg-white/8 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add Custom Item
              </Button>
            </div>
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

        {/* ── Section: Notes & Terms ── */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Additional Information</p>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Customer Notes</FormLabel>
                  <FormControl>
                    <textarea 
                      className={`${inputClass} min-h-[80px] py-2 resize-y`} 
                      placeholder="Thank you for your business!" 
                      {...field} 
                      value={field.value ?? ""} 
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Terms & Conditions</FormLabel>
                  <FormControl>
                    <textarea 
                      className={`${inputClass} min-h-[80px] py-2 resize-y`} 
                      placeholder="Payment due within 30 days..." 
                      {...field} 
                      value={field.value ?? ""} 
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="internalNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium flex items-center gap-2">
                  Internal Memo
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">Not shown on PDF</span>
                </FormLabel>
                <FormControl>
                  <textarea 
                    className={`${inputClass} min-h-[60px] py-2 resize-y border-blue-500/20 focus:border-blue-500/50 bg-blue-500/5`} 
                    placeholder="Private notes about this invoice or customer..." 
                    {...field} 
                    value={field.value ?? ""} 
                  />
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
              <span>{formatCurrency(taxPreview.subTotal, watched.currency)}</span>
            </div>
            {taxPreview.cgstAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>CGST</span>
                <span>{formatCurrency(taxPreview.cgstAmount, watched.currency)}</span>
              </div>
            )}
            {taxPreview.sgstAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>SGST</span>
                <span>{formatCurrency(taxPreview.sgstAmount, watched.currency)}</span>
              </div>
            )}
            {taxPreview.igstAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>IGST {taxPreview.isInterState ? "(Inter-state)" : ""}</span>
                <span>{formatCurrency(taxPreview.igstAmount, watched.currency)}</span>
              </div>
            )}
            {taxPreview.vatAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>VAT/Tax</span>
                <span>{formatCurrency(taxPreview.vatAmount, watched.currency)}</span>
              </div>
            )}
            {taxPreview.tdsAmount > 0 && (
              <div className="flex justify-between text-orange-400">
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3.5 w-3.5" />
                  TDS ({taxPreview.tdsPercentage}%)
                </span>
                <span>-{formatCurrency(taxPreview.tdsAmount, watched.currency)}</span>
              </div>
            )}
            <Separator className="bg-white/10 my-1" />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(taxPreview.finalAmount, watched.currency)}</span>
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
    </>
  )
}
