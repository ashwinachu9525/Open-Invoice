"use client"

import { useState, useEffect, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, Trash, Download, Sparkles, Building, User, FileText, Percent, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  discount: number
  taxPercentage: number
}

export default function EmbedInvoiceGenerator() {
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Customizer styling from query parameters
  const rawTheme = searchParams.get("theme") || "dark"
  const primaryColor = searchParams.get("primaryColor") || "#4f46e5"
  const apiKey = searchParams.get("apiKey") || ""
  const isPreview = searchParams.get("preview") === "true"

  const isDark = rawTheme === "dark"

  // Form states
  const [documentType, setDocumentType] = useState("invoice")
  const [companyName, setCompanyName] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")
  const [companyEmail, setCompanyEmail] = useState("")
  const [companyPhone, setCompanyPhone] = useState("")
  const [companyGst, setCompanyGst] = useState("")

  const [customerName, setCustomerName] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerGst, setCustomerGst] = useState("")

  const [documentNumber, setDocumentNumber] = useState("INV-001")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10))
  const [currency, setCurrency] = useState("INR")
  const [notes, setNotes] = useState("")
  const [terms, setTerms] = useState("")

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "Development Work", quantity: 1, unitPrice: 25000, discount: 0, taxPercentage: 18 },
  ])

  // Calculations
  const subTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const totalDiscount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.discount / 100)), 0)
  const totalTax = items.reduce((sum, item) => {
    const taxable = (item.quantity * item.unitPrice) - (item.quantity * item.unitPrice * (item.discount / 100))
    return sum + (taxable * (item.taxPercentage / 100))
  }, 0)
  const grandTotal = subTotal - totalDiscount + totalTax

  const [downloading, setDownloading] = useState(false)

  // Auto-fill some defaults if previewing
  useEffect(() => {
    if (isPreview) {
      setCompanyName("Acme Corporation")
      setCompanyAddress("123 Tech Avenue, Bengaluru, KA")
      setCompanyEmail("billing@acme.com")
      setCustomerName("Wayne Enterprises")
      setCustomerAddress("Gotham City, Plaza 5")
      setCustomerEmail("payments@wayne.com")
    }
  }, [isPreview])

  function handleAddItem() {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, discount: 0, taxPercentage: 18 }])
  }

  function handleRemoveItem(index: number) {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  function handleUpdateItem(index: number, field: keyof InvoiceItem, value: any) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName || !customerName) {
      alert("Please fill in Company Name and Client Name at minimum.")
      return
    }

    setDownloading(true)

    const payload = {
      documentType,
      companyName,
      companyAddress,
      companyEmail,
      companyPhone,
      companyGst,
      documentNumber,
      date,
      dueDate,
      customerName,
      customerAddress,
      customerEmail,
      customerPhone,
      customerGst,
      currency,
      themeColor: primaryColor,
      notes,
      terms,
      items,
    }

    try {
      // 1. If an API key is provided and we are NOT in preview, try saving the invoice in the SaaS backend database first
      if (apiKey && !isPreview) {
        try {
          // Find or create customer under the company via api first, then write the invoice. 
          // For simplicity, we directly POST the invoice structure. If customers need to be resolved, we can expose guest customer resolver inside the route
          const dbResponse = await fetch("/api/v1/invoices", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
            },
            body: JSON.stringify({
              // We match schema validations:
              invoiceNumber: documentNumber,
              date: new Date(date).toISOString(),
              dueDate: new Date(dueDate).toISOString(),
              currency,
              exchangeRate: 1,
              notes,
              terms,
              customerId: "mock_or_resolve", // handled programmatically or as API guest
              items: items.map(item => ({
                description: item.description || "Line Item",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                taxPercentage: item.taxPercentage
              }))
            })
          })
          
          if (!dbResponse.ok) {
            console.warn("Backend logging skipped, downloading PDF directly.")
          }
        } catch (apiErr) {
          console.error("API Key save failed:", apiErr)
        }
      }

      // 2. Generate and download PDF file
      const response = await fetch("/api/embed/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to generate PDF")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `${documentNumber || "invoice"}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert("An error occurred while generating the PDF. Please check your data.")
    } finally {
      setDownloading(false)
    }
  }

  // Theme variable styles
  const baseBg = isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
  const formCardBg = isDark ? "bg-slate-900/60 backdrop-blur-xl border border-white/5" : "bg-white border border-slate-200 shadow-sm"
  const previewCardBg = isDark ? "bg-slate-900 border border-white/10" : "bg-white border border-slate-300 shadow-md"
  const inputClass = isDark 
    ? "bg-slate-950/80 border border-white/10 rounded-md py-1.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 w-full placeholder:text-slate-600"
    : "bg-white border border-slate-300 rounded-md py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 w-full placeholder:text-slate-400"
  const labelClass = isDark ? "text-[10px] font-semibold text-slate-400" : "text-[10px] font-semibold text-slate-600"
  const headerSectionClass = isDark ? "border-b border-white/5 pb-4" : "border-b border-slate-200 pb-4"

  return (
    <div className={`min-h-screen font-sans ${baseBg} p-4 md:p-6 overflow-x-hidden`}>
      <form onSubmit={handleDownload} className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* EDITING FORM */}
        <div className="lg:col-span-7 space-y-6">
          <div className={`${formCardBg} rounded-xl p-5 space-y-6`}>
            
            {/* Form Title & Doc Type */}
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <div>
                <h1 className="text-lg font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" style={{ color: primaryColor }} />
                  Invoice Generator
                </h1>
                <p className="text-[10px] text-slate-500">Create details for your invoice below</p>
              </div>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className={`text-xs font-semibold px-2 py-1.5 rounded-md border ${
                  isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-300 text-slate-700"
                } focus:outline-none`}
              >
                <option value="invoice">Invoice</option>
                <option value="quotation">Quotation</option>
                <option value="estimate">Estimate</option>
              </select>
            </div>

            {/* Section 1: Business Details */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Building className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                Your Business
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelClass}>Company Name *</label>
                  <input
                    placeholder="Acme Inc."
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>GSTIN (Optional)</label>
                  <input
                    placeholder="29AAAAA1111A1Z1"
                    value={companyGst}
                    onChange={(e) => setCompanyGst(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className={labelClass}>Address</label>
                  <input
                    placeholder="123 Corporate Way, Suite 100"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Email Address</label>
                  <input
                    type="email"
                    placeholder="billing@company.com"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Phone Number</label>
                  <input
                    placeholder="+91 99999 99999"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Bill To */}
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <User className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                Bill To (Client)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelClass}>Client Name *</label>
                  <input
                    placeholder="John Doe or Organization"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>GSTIN (Optional)</label>
                  <input
                    placeholder="29BBBBB2222B2Z2"
                    value={customerGst}
                    onChange={(e) => setCustomerGst(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className={labelClass}>Client Address</label>
                  <input
                    placeholder="456 Client St, Floor 2"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Client Email</label>
                  <input
                    type="email"
                    placeholder="client@wayne.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Client Phone</label>
                  <input
                    placeholder="+91 88888 88888"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Document Meta */}
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                Document Meta
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className={labelClass}>Doc Number</label>
                  <input
                    placeholder="INV-001"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={inputClass}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Issue Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Line Items */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Percent className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                  Line Items
                </h2>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className={`grid grid-cols-12 gap-2 p-3 rounded-lg border ${
                      isDark ? "bg-slate-950/40 border-white/5" : "bg-slate-50 border-slate-200"
                    } items-center`}
                  >
                    <div className="col-span-12 md:col-span-4 space-y-1">
                      <label className={labelClass}>Description</label>
                      <input
                        placeholder="Item name / details"
                        value={item.description}
                        required
                        onChange={(e) => handleUpdateItem(index, "description", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2 space-y-1">
                      <label className={labelClass}>Qty</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2 space-y-1">
                      <label className={labelClass}>Price</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-3 md:col-span-1.5 space-y-1">
                      <label className={labelClass}>Disc %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={(e) => handleUpdateItem(index, "discount", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-3 md:col-span-1.5 space-y-1">
                      <label className={labelClass}>Tax %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.taxPercentage}
                        onChange={(e) => handleUpdateItem(index, "taxPercentage", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-1 flex justify-end md:mt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length <= 1}
                        className="p-1.5 rounded text-rose-500 hover:bg-rose-500/10 disabled:opacity-40"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 5: Notes & Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className={labelClass}>Notes</label>
                <textarea
                  placeholder="Payment bank details, general notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputClass} h-16 resize-none`}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Terms & Conditions</label>
                <textarea
                  placeholder="Interest will be charged on overdue payments..."
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className={`${inputClass} h-16 resize-none`}
                />
              </div>
            </div>

          </div>
        </div>

        {/* LIVE PREVIEW & DOWNLOAD */}
        <div className="lg:col-span-5 space-y-6">
          <div className={`${previewCardBg} rounded-xl p-6 space-y-6 shadow-2xl sticky top-6`}>
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold tracking-tight text-slate-300">Live Document Preview</h3>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                {documentType.toUpperCase()}
              </span>
            </div>

            {/* Simulated HTML Invoice layout */}
            <div className={`p-4 rounded-lg text-xs leading-normal space-y-4 ${isDark ? "bg-slate-950 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
              {/* Header */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="font-bold text-sm text-slate-200">{companyName || "Your Company"}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{companyAddress || "Company Address"}</div>
                  {companyGst && <div className="text-[10px] text-slate-500">GSTIN: {companyGst}</div>}
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm uppercase" style={{ color: primaryColor }}>
                    {documentType}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-slate-400 mt-1">{documentNumber || "INV-XXXX"}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Date: {date}</div>
                </div>
              </div>

              {/* Bill To */}
              <div className="pt-2">
                <div className="text-[9px] font-bold text-slate-500 uppercase">Bill To</div>
                <div className="font-semibold text-slate-200 mt-0.5">{customerName || "Client Name"}</div>
                <div className="text-[10px] text-slate-500">{customerAddress || "Client Address"}</div>
                {customerGst && <div className="text-[10px] text-slate-500">GSTIN: {customerGst}</div>}
              </div>

              {/* Items Preview */}
              <div className="border-t border-b border-white/5 py-2 space-y-1">
                <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 pb-1">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2 text-right">Qty</div>
                  <div className="col-span-2 text-right">Price</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                {items.map((item, index) => {
                  const itemTotal = item.quantity * item.unitPrice
                  const itemDiscount = itemTotal * (item.discount / 100)
                  const itemTax = (itemTotal - itemDiscount) * (item.taxPercentage / 100)
                  const finalItemTotal = itemTotal - itemDiscount + itemTax

                  return (
                    <div key={index} className="grid grid-cols-12 text-[10px] text-slate-400 py-0.5">
                      <div className="col-span-6 truncate font-medium text-slate-300">{item.description || "Line Item"}</div>
                      <div className="col-span-2 text-right">{item.quantity}</div>
                      <div className="col-span-2 text-right">{item.unitPrice}</div>
                      <div className="col-span-2 text-right font-medium text-slate-200">{finalItemTotal.toFixed(2)}</div>
                    </div>
                  )
                })}
              </div>

              {/* Math Totals */}
              <div className="flex flex-col items-end space-y-1 text-[10px]">
                <div className="flex justify-between w-40 text-slate-500">
                  <span>Subtotal:</span>
                  <span>{subTotal.toFixed(2)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between w-40 text-rose-400">
                    <span>Discount:</span>
                    <span>-{totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                {totalTax > 0 && (
                  <div className="flex justify-between w-40 text-slate-500">
                    <span>Tax:</span>
                    <span>{totalTax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between w-40 border-t border-white/10 pt-1.5 font-bold text-xs text-slate-200">
                  <span>Grand Total ({currency}):</span>
                  <span style={{ color: primaryColor }}>{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={downloading}
              className="w-full text-white h-11 font-bold text-sm tracking-wide shadow-lg flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              {downloading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {downloading ? "Generating PDF..." : `Generate & Download ${documentType.toUpperCase()}`}
            </Button>
          </div>
        </div>

      </form>
    </div>
  )
}
