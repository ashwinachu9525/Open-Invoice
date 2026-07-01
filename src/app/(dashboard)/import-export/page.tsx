"use client"

import { useState, useRef, useCallback, useTransition } from "react"
import { toast } from "sonner"
import {
  Download, Upload, FileText, Users, Package, FileJson,
  FileCode2, AlertTriangle, CheckCircle2, XCircle,
  ArrowUpDown, ChevronDown, ChevronRight, Eye, Loader2,
  FileImage, RefreshCw, Sparkles
} from "lucide-react"
import type { InvoiceImportDraft, ImportResult } from "@/lib/import/types"
import { CATALOG_CSV_TEMPLATE, CUSTOMER_CSV_TEMPLATE } from "@/lib/import/csv-parser"

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = "export" | "csv-import" | "legacy-invoice"
type CsvImportType = "catalog" | "customers"
type ExportFormat = "csv" | "json" | "xml"

// ── Helpers ────────────────────────────────────────────────────────────────
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadText(text: string, filename: string, mimeType = "text/plain") {
  const blob = new Blob([text], { type: mimeType })
  downloadBlob(blob, filename)
}

function confidenceBadge(c?: number) {
  if (c === undefined || c === null) return null
  const pct = Math.round(c * 100)
  const color = c >= 0.8 ? "text-emerald-500" : c >= 0.5 ? "text-amber-500" : "text-red-500"
  return <span className={`text-xs font-bold ${color}`}>{pct}% confidence</span>
}

// ── Sub-Components ─────────────────────────────────────────────────────────

function TabButton({ id, active, onClick, icon: Icon, label, description }: {
  id: Tab; active: boolean; onClick: () => void
  icon: React.ElementType; label: string; description: string
}) {
  return (
    <button
      id={`tab-${id}`}
      onClick={onClick}
      className={`flex-1 flex flex-col items-start gap-1 px-5 py-4 border-b-2 transition-all text-left ${
        active
          ? "border-primary bg-primary/5 text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center gap-2 font-semibold text-sm">
        <Icon className="w-4 h-4" /> {label}
      </div>
      <span className="text-xs text-muted-foreground hidden sm:block">{description}</span>
    </button>
  )
}

function SectionCard({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="bg-card/60 backdrop-blur border border-border/60 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border/40">
        <h2 className="font-semibold text-base">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ── Export Tab ─────────────────────────────────────────────────────────────
function ExportTab() {
  const [invoiceFormat, setInvoiceFormat] = useState<ExportFormat>("csv")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo]     = useState("")
  const [loadingKey, setLoadingKey] = useState<string | null>(null)

  async function doExport(type: string, format = "csv") {
    const key = `${type}-${format}`
    setLoadingKey(key)
    try {
      const params = new URLSearchParams({ type, format })
      if (type === "invoices" && dateFrom) params.set("from", dateFrom)
      if (type === "invoices" && dateTo)   params.set("to",   dateTo)

      const res = await fetch(`/api/export/bulk?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Export failed")
      }
      const blob = await res.blob()
      const cd = res.headers.get("Content-Disposition") ?? ""
      const nameMatch = cd.match(/filename="?([^"]+)"?/)
      const filename = nameMatch?.[1] ?? `export_${Date.now()}.${format}`
      downloadBlob(blob, filename)
      toast.success("Download started!")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed")
    } finally {
      setLoadingKey(null)
    }
  }

  const ExportBtn = ({ label, type, format = "csv", icon: Icon }: {
    label: string; type: string; format?: string; icon: React.ElementType
  }) => {
    const key = `${type}-${format}`
    const loading = loadingKey === key
    return (
      <button
        id={`export-${type}-${format}`}
        onClick={() => doExport(type, format)}
        disabled={!!loadingKey}
        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-primary/10 hover:border-primary/40 transition-all group disabled:opacity-50"
      >
        <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-sm font-medium">{label}</p>
        </div>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : (
          <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-6">
        <SectionCard title="Export Catalog" subtitle="Download all products & services as CSV">
          <ExportBtn label="Product / Service Catalog" type="catalog" icon={Package} />
        </SectionCard>

        <SectionCard title="Export Customers" subtitle="Download all customer profiles as CSV">
          <ExportBtn label="Customer Profiles" type="customers" icon={Users} />
        </SectionCard>
      </div>

      <SectionCard title="Export Invoices" subtitle="Download invoices in CSV, JSON, or UBL XML format">
        <div className="space-y-4">
          {/* Format picker */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Format</p>
            <div className="flex gap-2 flex-wrap">
              {([
                { key: "csv",  icon: FileText,  label: "CSV" },
                { key: "json", icon: FileJson,   label: "JSON" },
                { key: "xml",  icon: FileCode2,  label: "XML (UBL 2.1)" },
              ] as { key: ExportFormat; icon: React.ElementType; label: string }[]).map(f => (
                <button
                  key={f.key}
                  id={`invoice-format-${f.key}`}
                  onClick={() => setInvoiceFormat(f.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    invoiceFormat === f.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <f.icon className="w-4 h-4" />
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional date filter */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Date Range (optional)</p>
            <div className="flex gap-3 flex-wrap">
              <input
                id="export-date-from"
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="self-center text-muted-foreground text-sm">to</span>
              <input
                id="export-date-to"
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <button
            id="export-invoices-btn"
            onClick={() => doExport("invoices", invoiceFormat)}
            disabled={!!loadingKey}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loadingKey?.startsWith("invoices") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export Invoices ({invoiceFormat.toUpperCase()})
          </button>
        </div>
      </SectionCard>
    </div>
  )
}

// ── CSV Import Tab ─────────────────────────────────────────────────────────
function CsvImportTab() {
  const [importType, setImportType] = useState<CsvImportType>("catalog")
  const [file, setFile]             = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [result, setResult]         = useState<ImportResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.name.endsWith(".csv")) {
      setFile(dropped)
      setResult(null)
    } else {
      toast.error("Please drop a .csv file")
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setResult(null) }
  }

  function downloadTemplate() {
    const template = importType === "catalog" ? CATALOG_CSV_TEMPLATE : CUSTOMER_CSV_TEMPLATE
    downloadText(template, `${importType}_template.csv`, "text/csv")
  }

  function doImport() {
    if (!file) return
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("type", importType)
        const res = await fetch("/api/import/bulk", { method: "POST", body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Import failed")
        setResult(data as ImportResult)
        if (data.inserted > 0) {
          toast.success(`Imported ${data.inserted} ${importType === "catalog" ? "items" : "customers"} successfully!`)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Import failed")
      }
    })
  }

  const colInfo = importType === "catalog"
    ? "name (required), description, hsn_sac, unit_price (required), tax_percentage, unit"
    : "name (required), company_name, gstin, pan, email, phone, address, state, country"

  return (
    <div className="space-y-6">
      {/* Type selector */}
      <SectionCard title="What would you like to import?">
        <div className="flex gap-3">
          {([
            { key: "catalog",   icon: Package, label: "Product Catalog" },
            { key: "customers", icon: Users,   label: "Customers" },
          ] as { key: CsvImportType; icon: React.ElementType; label: string }[]).map(opt => (
            <button
              key={opt.key}
              id={`csv-import-type-${opt.key}`}
              onClick={() => { setImportType(opt.key); setFile(null); setResult(null) }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all ${
                importType === opt.key
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <opt.icon className="w-4 h-4" />
              {opt.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={`Import ${importType === "catalog" ? "Catalog" : "Customers"} via CSV`}
        subtitle={`Columns: ${colInfo}`}
      >
        <div className="space-y-4">
          {/* Template download */}
          <button
            id="download-csv-template"
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV template
          </button>

          {/* Drop zone */}
          <div
            id="csv-dropzone"
            onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all py-12 flex flex-col items-center gap-3 ${
              isDragOver
                ? "border-primary bg-primary/5"
                : file
                ? "border-emerald-500/50 bg-emerald-500/5"
                : "border-border hover:border-primary/40 hover:bg-muted/20"
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            {file ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <p className="font-semibold text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground" />
                <p className="font-semibold text-sm">Drop your CSV here, or click to browse</p>
                <p className="text-xs text-muted-foreground">Accepts .csv files</p>
              </>
            )}
          </div>

          {/* Import button */}
          {file && (
            <button
              id="run-csv-import"
              onClick={doImport}
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isPending ? "Importing…" : `Import ${importType === "catalog" ? "Catalog" : "Customers"}`}
            </button>
          )}

          {/* Results */}
          {result && (
            <div className="rounded-2xl border border-border/60 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-4 px-5 py-3 bg-muted/30 border-b border-border/40">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  {result.inserted} imported
                </div>
                {result.skipped > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-sm font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    {result.skipped} skipped
                  </div>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="divide-y divide-border/40 max-h-56 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-2.5 text-sm">
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">Row {e.row}:</span> {e.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

// ── Legacy Invoice Tab ─────────────────────────────────────────────────────
function LegacyInvoiceTab() {
  const [file, setFile]           = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [draft, setDraft]         = useState<InvoiceImportDraft | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [expandedItems, setExpandedItems] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) { setFile(dropped); setDraft(null) }
  }

  async function doExtract() {
    if (!file) return
    setIsLoading(true)
    setDraft(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/import/legacy-invoice", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Extraction failed")
      setDraft(data.draft as InvoiceImportDraft)
      toast.success("Invoice data extracted! Review the fields below.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Extraction failed")
    } finally {
      setIsLoading(false)
    }
  }

  function handleCreateInvoice() {
    // Redirect to new invoice page with draft data encoded in query params
    if (!draft) return
    const encoded = btoa(encodeURIComponent(JSON.stringify(draft)))
    window.location.href = `/invoices/new?draft=${encoded}`
  }

  const getFileIcon = () => {
    if (!file) return <Upload className="w-10 h-10 text-muted-foreground" />
    const name = file.name.toLowerCase()
    if (name.endsWith(".json")) return <FileJson className="w-10 h-10 text-amber-500" />
    if (name.endsWith(".xml"))  return <FileCode2 className="w-10 h-10 text-blue-500" />
    return <FileImage className="w-10 h-10 text-violet-500" />
  }

  const getSourceLabel = (source?: string) => {
    if (source === "ocr")  return { label: "OCR (Gemini AI)", icon: Sparkles, color: "text-violet-500" }
    if (source === "xml")  return { label: "XML Parser", icon: FileCode2, color: "text-blue-500" }
    return { label: "JSON Parser", icon: FileJson, color: "text-amber-500" }
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Upload Legacy Invoice"
        subtitle="Supports scanned images (JPG/PNG via OCR), GST e-Invoice XML, UBL 2.1 XML, and JSON format"
      >
        <div className="space-y-4">
          {/* Format chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "JPG / PNG", icon: FileImage, color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
              { label: "PDF (OCR)", icon: FileImage, color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
              { label: "GST e-Invoice XML", icon: FileCode2, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
              { label: "UBL 2.1 XML", icon: FileCode2, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
              { label: "JSON / Open-Invoice", icon: FileJson, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
            ].map(f => (
              <span key={f.label} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${f.color}`}>
                <f.icon className="w-3 h-3" />
                {f.label}
              </span>
            ))}
          </div>

          {/* Drop zone */}
          <div
            id="legacy-dropzone"
            onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all py-12 flex flex-col items-center gap-3 ${
              isDragOver
                ? "border-primary bg-primary/5"
                : file
                ? "border-violet-500/50 bg-violet-500/5"
                : "border-border hover:border-primary/40 hover:bg-muted/20"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.xml,.json"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setDraft(null) } }}
            />
            {getFileIcon()}
            {file ? (
              <>
                <p className="font-semibold text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-sm">Drop your invoice file here</p>
                <p className="text-xs text-muted-foreground">Image for OCR, or XML/JSON structured format</p>
              </>
            )}
          </div>

          {file && !draft && (
            <button
              id="extract-invoice-btn"
              onClick={doExtract}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Extract Invoice Data
                </>
              )}
            </button>
          )}
        </div>
      </SectionCard>

      {/* Draft review */}
      {draft && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-4">
          {/* Status bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-card/60 border border-border/60 rounded-2xl px-5 py-3">
            <div className="flex items-center gap-3">
              {(() => {
                const { label, icon: Icon, color } = getSourceLabel(draft.source)
                return (
                  <span className={`flex items-center gap-1.5 text-sm font-semibold ${color}`}>
                    <Icon className="w-4 h-4" />
                    Parsed via {label}
                  </span>
                )
              })()}
              {confidenceBadge(draft.confidence)}
            </div>
            <div className="flex gap-2">
              <button
                id="re-upload-btn"
                onClick={() => { setDraft(null); setFile(null) }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:bg-muted/40 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try another file
              </button>
              <button
                id="create-invoice-from-draft"
                onClick={handleCreateInvoice}
                className="flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> Create Invoice →
              </button>
            </div>
          </div>

          {/* Warnings */}
          {draft.parseWarnings && draft.parseWarnings.length > 0 && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                {draft.parseWarnings.map((w, i) => (
                  <p key={i} className="text-sm text-amber-700 dark:text-amber-400">{w}</p>
                ))}
              </div>
            </div>
          )}

          {/* Field grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            <SectionCard title="Invoice Details">
              <dl className="space-y-2 text-sm">
                {([
                  ["Invoice No.", draft.invoiceNumber],
                  ["Date",        draft.date],
                  ["Due Date",    draft.dueDate],
                  ["Currency",    draft.currency],
                  ["Notes",       draft.notes],
                ] as [string, string | undefined][]).map(([k, v]) => v ? (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground shrink-0">{k}</dt>
                    <dd className="font-medium text-right truncate">{v}</dd>
                  </div>
                ) : null)}
              </dl>
            </SectionCard>

            <SectionCard title="Buyer">
              <dl className="space-y-2 text-sm">
                {([
                  ["Name",    draft.buyerName],
                  ["Company", draft.buyerCompanyName],
                  ["GSTIN",   draft.buyerGstin],
                  ["Email",   draft.buyerEmail],
                  ["Phone",   draft.buyerPhone],
                  ["State",   draft.buyerState],
                ] as [string, string | undefined][]).map(([k, v]) => v ? (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground shrink-0">{k}</dt>
                    <dd className="font-medium text-right truncate">{v}</dd>
                  </div>
                ) : null)}
              </dl>
            </SectionCard>
          </div>

          {/* Line items */}
          <div className="bg-card/60 backdrop-blur border border-border/60 rounded-2xl overflow-hidden">
            <button
              id="toggle-draft-items"
              className="w-full flex items-center justify-between px-6 py-4 border-b border-border/40 hover:bg-muted/20 transition-colors"
              onClick={() => setExpandedItems(v => !v)}
            >
              <h3 className="font-semibold text-sm">Line Items ({draft.items.length})</h3>
              {expandedItems ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedItems && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20">
                      <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-semibold">Description</th>
                      <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-semibold">HSN/SAC</th>
                      <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-semibold">Qty</th>
                      <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-semibold">Unit Price</th>
                      <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-semibold">Tax %</th>
                      <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {draft.items.map((it, i) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 max-w-xs truncate">{it.description}</td>
                        <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{it.hsnSac ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right">{it.quantity}</td>
                        <td className="px-4 py-2.5 text-right">₹{it.unitPrice.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2.5 text-right">{it.taxPercentage ?? 18}%</td>
                        <td className="px-4 py-2.5 text-right font-semibold">
                          {it.total !== undefined ? `₹${it.total.toLocaleString("en-IN")}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals row */}
                {draft.finalAmount !== undefined && (
                  <div className="flex justify-end border-t border-border/40 px-6 py-3">
                    <div className="text-sm space-y-1 text-right">
                      {draft.subTotal !== undefined && (
                        <p className="text-muted-foreground">Subtotal: ₹{draft.subTotal.toLocaleString("en-IN")}</p>
                      )}
                      {draft.totalTax !== undefined && (
                        <p className="text-muted-foreground">Tax: ₹{draft.totalTax.toLocaleString("en-IN")}</p>
                      )}
                      <p className="font-bold text-base">Total: ₹{draft.finalAmount.toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex justify-end">
            <button
              id="create-invoice-from-draft-bottom"
              onClick={handleCreateInvoice}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <FileText className="w-4 h-4" />
              Create Invoice from this data →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<Tab>("export")

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ArrowUpDown className="w-7 h-7 text-primary" />
          Import / Export
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bulk import catalogs & customers via CSV · Export all data · Upload legacy invoices via OCR, XML, or JSON
        </p>
      </div>

      {/* Tab bar */}
      <div className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex border-b border-border/40">
          <TabButton id="export"         active={activeTab === "export"}         onClick={() => setActiveTab("export")}         icon={Download}    label="Export Data"          description="Download CSV, JSON, XML" />
          <TabButton id="csv-import"     active={activeTab === "csv-import"}     onClick={() => setActiveTab("csv-import")}     icon={Upload}      label="Import CSV"           description="Catalog & customer bulk import" />
          <TabButton id="legacy-invoice" active={activeTab === "legacy-invoice"} onClick={() => setActiveTab("legacy-invoice")} icon={Sparkles}    label="Legacy Invoice"       description="OCR, XML & JSON upload" />
        </div>

        <div className="p-6">
          {activeTab === "export"         && <ExportTab />}
          {activeTab === "csv-import"     && <CsvImportTab />}
          {activeTab === "legacy-invoice" && <LegacyInvoiceTab />}
        </div>
      </div>
    </div>
  )
}
