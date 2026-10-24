"use client"

import React, { useState } from "react"
import { VerificationResult } from "@/lib/invoice-verification"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileText,
  Building2,
  Calendar,
  Download,
  Copy,
  Check,
  Printer,
  UploadCloud,
  FileCheck2,
  Lock,
  ExternalLink,
  Search,
  FileCode,
} from "lucide-react"

interface VerificationViewProps {
  initialResult: VerificationResult
  identifier: string
  signature?: string | null
}

export function VerificationView({
  initialResult,
  identifier,
  signature,
}: VerificationViewProps) {
  const [activeTab, setActiveTab] = useState("record")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  
  // PDF Document verification states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedHash, setUploadedHash] = useState<string | null>(null)
  const [isVerifyingFile, setIsVerifyingFile] = useState(false)
  const [fileVerificationStatus, setFileVerificationStatus] = useState<"idle" | "match" | "mismatch" | "error">("idle")
  const [isDragging, setIsDragging] = useState(false)

  const { status, invoice, company, customer, securityManifest, message, verifiedAt } = initialResult

  function handleCopy(text: string, key: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    }
  }

  // Calculate browser SHA-256 for uploaded PDF file
  async function computeFileSha256(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  }

  async function handleFileProcess(file: File) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a valid .pdf invoice file.")
      return
    }

    setUploadedFile(file)
    setIsVerifyingFile(true)
    setFileVerificationStatus("idle")

    try {
      const hash = await computeFileSha256(file)
      setUploadedHash(hash)

      const expected = invoice?.pdfHash?.toLowerCase().trim()
      if (expected && hash.toLowerCase() === expected) {
        setFileVerificationStatus("match")
      } else if (!expected) {
        // If official hash is not on record yet, verify with backend API endpoint
        const formData = new FormData()
        formData.append("file", file)
        formData.append("invoiceId", invoice?.id || identifier)

        const res = await fetch("/api/verify/pdf", {
          method: "POST",
          body: formData,
        })
        const data = await res.json()
        if (data.match) {
          setFileVerificationStatus("match")
        } else {
          setFileVerificationStatus("mismatch")
        }
      } else {
        setFileVerificationStatus("mismatch")
      }
    } catch (err) {
      console.error("Failed to verify uploaded PDF hash:", err)
      setFileVerificationStatus("error")
    } finally {
      setIsVerifyingFile(false)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Branding & Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Open-Invoice Trust Network
                <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 font-medium">
                  Official Verification Portal
                </Badge>
              </h1>
              <p className="text-xs text-slate-500">
                Authoritative cryptographic verification & document integrity validation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs text-slate-600 print:hidden"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Certificate
            </Button>
            {invoice && (
              <a href={`/api/invoices/${invoice.id}/pdf?public=true`} target="_blank" rel="noreferrer" className="print:hidden">
                <Button size="sm" className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                  <Download className="w-3.5 h-3.5" />
                  Download Official PDF
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* --- STATUS BANNER --- */}
        {status === "VERIFIED_ORIGINAL" && (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-6 shadow-sm transition-all">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-md shadow-emerald-600/20 shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-emerald-950">Verified Original Invoice</h2>
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-0.5">
                    100% Authentic
                  </Badge>
                  {initialResult.signatureValid && (
                    <Badge variant="outline" className="bg-emerald-100/60 text-emerald-800 border-emerald-300 text-xs">
                      Cryptographically Signed (HMAC-SHA256)
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-emerald-800 leading-relaxed">
                  This invoice has been verified against authoritative records in the issuer&apos;s database. 
                  The details below originate from the trusted issuer and have not been forged.
                </p>
                <div className="text-xs text-emerald-700/80 pt-1 flex items-center gap-2 flex-wrap">
                  <span>Authoritative Verification ID: <code className="bg-emerald-100/80 px-1.5 py-0.5 rounded font-mono text-[11px] text-emerald-900">{identifier}</code></span>
                  <span>•</span>
                  <span>Timestamp: {new Date(verifiedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {status === "TAMPERED" && (
          <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-rose-600 rounded-xl text-white shadow-md shadow-rose-600/20 shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-rose-950">Warning: Tampered or Invalid Invoice</h2>
                  <Badge className="bg-rose-600 text-white text-xs px-2.5 py-0.5">
                    Security Warning
                  </Badge>
                </div>
                <p className="text-sm text-rose-800 leading-relaxed">
                  {message || "The cryptographic signature or parameters supplied do not match the authoritative issuer record. The invoice values may have been modified or altered without authorization."}
                </p>
                <p className="text-xs text-rose-700 pt-1">
                  Do not make payments or rely on altered invoice documents. Contact the issuer immediately to obtain an authentic copy.
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "NOT_FOUND" && (
          <div className="bg-slate-100 border border-slate-300/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-slate-700 rounded-xl text-white shadow-md shadow-slate-700/20 shrink-0">
                <ShieldX className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900">Invoice Record Not Found</h2>
                  <Badge variant="outline" className="bg-slate-200 text-slate-700 border-slate-300 text-xs">
                    Unregistered Record
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  No registered invoice record could be found matching identifier <code className="font-mono font-medium text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">{identifier}</code> in the authoritative database.
                </p>
                <p className="text-xs text-slate-500 pt-1">
                  Ensure the verification URL or QR code was not truncated or modified.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* If Invoice Found: Render Authoritative Details & Document Integrity Tabs */}
        {invoice && company && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-xs">
                <TabsTrigger value="record" className="gap-2 text-xs sm:text-sm font-medium data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg">
                  <FileText className="w-4 h-4" />
                  1. Authoritative Invoice Record
                </TabsTrigger>
                <TabsTrigger value="document" className="gap-2 text-xs sm:text-sm font-medium data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg">
                  <FileCheck2 className="w-4 h-4" />
                  2. PDF Document Integrity Check
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: AUTHORITATIVE INVOICE RECORD */}
            <TabsContent value="record" className="space-y-6 m-0">
              <Card className="border border-slate-200/80 shadow-md rounded-2xl overflow-hidden bg-white">
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-8 py-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Authoritative Invoice</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          {invoice.status}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold mt-1 tracking-tight text-white flex items-center gap-2">
                        Invoice #{invoice.invoiceNumber}
                      </h2>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-400 uppercase font-medium">Authoritative Total</p>
                      <p className="text-2xl font-extrabold text-emerald-400 tracking-tight">
                        {formatCurrency(invoice.finalAmount, invoice.currency)}
                      </p>
                      {invoice.balanceDue > 0 && (
                        <p className="text-xs text-slate-300 mt-0.5">
                          Balance Due: {formatCurrency(invoice.balanceDue, invoice.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <CardContent className="p-8 space-y-8">
                  {/* Issuer & Customer Details Side-by-Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-slate-100">
                    {/* Issuer Card */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                          Authoritative Issuer (Seller)
                        </span>
                        <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                          Verified Issuer
                        </Badge>
                      </div>
                      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-2">
                        <p className="text-base font-bold text-slate-900">{company.name}</p>
                        {company.gstNumber && (
                          <p className="text-xs text-slate-600 flex items-center justify-between">
                            <span>GSTIN / Tax ID:</span>
                            <span className="font-mono font-semibold text-slate-800">{company.gstNumber}</span>
                          </p>
                        )}
                        {company.panNumber && (
                          <p className="text-xs text-slate-600 flex items-center justify-between">
                            <span>PAN:</span>
                            <span className="font-mono font-semibold text-slate-800">{company.panNumber}</span>
                          </p>
                        )}
                        {company.email && (
                          <p className="text-xs text-slate-600 flex items-center justify-between">
                            <span>Email:</span>
                            <span className="text-slate-800">{company.email}</span>
                          </p>
                        )}
                        {company.address && (
                          <p className="text-xs text-slate-500 pt-1 border-t border-slate-200/60 leading-relaxed">
                            {company.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Customer Card */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        Billed To (Buyer)
                      </span>
                      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-2">
                        <p className="text-base font-bold text-slate-900">
                          {customer?.companyName || customer?.name || "Recipient"}
                        </p>
                        {customer?.companyName && customer?.name && (
                          <p className="text-xs text-slate-600">Attn: {customer.name}</p>
                        )}
                        {customer?.gstin && (
                          <p className="text-xs text-slate-600 flex items-center justify-between">
                            <span>GSTIN:</span>
                            <span className="font-mono font-semibold text-slate-800">{customer.gstin}</span>
                          </p>
                        )}
                        {customer?.email && (
                          <p className="text-xs text-slate-600 flex items-center justify-between">
                            <span>Email:</span>
                            <span className="text-slate-800">{customer.email}</span>
                          </p>
                        )}
                        {customer?.address && (
                          <p className="text-xs text-slate-500 pt-1 border-t border-slate-200/60 leading-relaxed">
                            {customer.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">Invoice Date</span>
                      <span className="font-semibold text-slate-900 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(invoice.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Due Date</span>
                      <span className="font-semibold text-slate-900 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Currency</span>
                      <span className="font-semibold text-slate-900">{invoice.currency}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Record Trust</span>
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Authoritative DB
                      </span>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Authoritative Line Items ({invoice.items.length})
                    </h3>
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-3 py-3 text-right">Qty</th>
                            <th className="px-3 py-3 text-right">Unit Rate</th>
                            <th className="px-3 py-3 text-right">Tax</th>
                            <th className="px-4 py-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {invoice.items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-medium text-slate-900">
                                <div>{item.description}</div>
                                {item.hsnSac && (
                                  <div className="text-[10px] text-slate-400 font-mono">HSN: {item.hsnSac}</div>
                                )}
                              </td>
                              <td className="px-3 py-3 text-right text-slate-600 font-mono">{item.quantity}</td>
                              <td className="px-3 py-3 text-right text-slate-600 font-mono">
                                {formatCurrency(item.unitPrice, invoice.currency)}
                              </td>
                              <td className="px-3 py-3 text-right text-slate-600">
                                {item.taxPercentage > 0 ? `${item.taxPercentage}%` : "0%"}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">
                                {formatCurrency(item.total, invoice.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial Totals Breakdown */}
                  <div className="flex justify-end pt-2">
                    <div className="w-full max-w-sm space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {formatCurrency(invoice.subTotal, invoice.currency)}
                        </span>
                      </div>
                      {invoice.cgstAmount > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>CGST</span>
                          <span className="font-mono">{formatCurrency(invoice.cgstAmount, invoice.currency)}</span>
                        </div>
                      )}
                      {invoice.sgstAmount > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>SGST</span>
                          <span className="font-mono">{formatCurrency(invoice.sgstAmount, invoice.currency)}</span>
                        </div>
                      )}
                      {invoice.igstAmount > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>IGST</span>
                          <span className="font-mono">{formatCurrency(invoice.igstAmount, invoice.currency)}</span>
                        </div>
                      )}
                      {invoice.vatAmount > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>VAT</span>
                          <span className="font-mono">{formatCurrency(invoice.vatAmount, invoice.currency)}</span>
                        </div>
                      )}
                      {invoice.totalTax > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Total Tax</span>
                          <span className="font-semibold text-slate-900 font-mono">
                            {formatCurrency(invoice.totalTax, invoice.currency)}
                          </span>
                        </div>
                      )}
                      {invoice.totalDiscount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Total Discount</span>
                          <span className="font-mono">-{formatCurrency(invoice.totalDiscount, invoice.currency)}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                        <span>Final Verified Amount</span>
                        <span className="text-emerald-700 font-mono text-base">
                          {formatCurrency(invoice.finalAmount, invoice.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cryptographic Manifest & Security Proof */}
                  {securityManifest && (
                    <div className="pt-6 border-t border-slate-200">
                      <div className="bg-slate-900 text-slate-200 p-5 rounded-xl space-y-3 font-mono text-xs">
                        <div className="flex items-center justify-between text-indigo-300 font-sans pb-2 border-b border-slate-800">
                          <span className="font-bold flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            Cryptographic Integrity Proof
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Algorithm: {securityManifest.algorithm}
                          </span>
                        </div>

                        <div className="space-y-2 text-[11px]">
                          <div>
                            <div className="text-slate-400 font-sans flex items-center justify-between mb-0.5">
                              <span>Digital Signature (HMAC-SHA256):</span>
                              <button
                                onClick={() => handleCopy(securityManifest.signature, "sig")}
                                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                              >
                                {copiedKey === "sig" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                {copiedKey === "sig" ? "Copied" : "Copy"}
                              </button>
                            </div>
                            <div className="bg-slate-950 p-2 rounded text-emerald-400 break-all select-all">
                              {securityManifest.signature}
                            </div>
                          </div>

                          <div>
                            <div className="text-slate-400 font-sans flex items-center justify-between mb-0.5">
                              <span>Canonical Data Digest:</span>
                              <button
                                onClick={() => handleCopy(securityManifest.dataChecksum, "digest")}
                                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                              >
                                {copiedKey === "digest" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                {copiedKey === "digest" ? "Copied" : "Copy"}
                              </button>
                            </div>
                            <div className="bg-slate-950 p-2 rounded text-slate-300 break-all select-all">
                              {securityManifest.dataChecksum}
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 font-sans pt-2 border-t border-slate-800 flex justify-between items-center">
                          <span>Authority: {securityManifest.authority}</span>
                          <span>Verified: {new Date(verifiedAt).toUTCString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: PDF DOCUMENT INTEGRITY CHECK */}
            <TabsContent value="document" className="space-y-6 m-0">
              <Card className="border border-slate-200/80 shadow-md rounded-2xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-indigo-600" />
                    <div>
                      <CardTitle className="text-lg text-slate-900">PDF Document File Integrity Validation</CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Verify if a physical or digital PDF invoice file has been altered, forged, or edited after generation.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-8 space-y-6">
                  {/* Distinct Explanation Notice */}
                  <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-950 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-indigo-900">
                      <Lock className="w-4 h-4 text-indigo-600" />
                      Difference between Record Verification vs Document Integrity:
                    </p>
                    <p className="text-indigo-800 leading-relaxed">
                      <strong>Record Verification</strong> (Tab 1) confirms the invoice was officially created in the issuer&apos;s authoritative database. 
                      <strong>Document Integrity</strong> checks whether a specific PDF document in your hands is bit-for-bit identical to the original generated file, detecting unauthorized edits to bank accounts, line items, or amounts.
                    </p>
                  </div>

                  {/* Official Stored PDF Hash */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Authoritative Document SHA-256 Fingerprint
                    </span>
                    <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-xs flex items-center justify-between gap-4">
                      <div className="break-all text-emerald-400 select-all">
                        {invoice.pdfHash || "Hash calculated on download / official generation"}
                      </div>
                      {invoice.pdfHash && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(invoice.pdfHash!, "pdfHash")}
                          className="h-7 text-xs text-slate-300 hover:text-white hover:bg-slate-800 shrink-0 gap-1"
                        >
                          {copiedKey === "pdfHash" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedKey === "pdfHash" ? "Copied" : "Copy"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Inspect & Verify Your PDF File
                    </span>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault()
                        setIsDragging(true)
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                        isDragging
                          ? "border-indigo-500 bg-indigo-50/50"
                          : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50"
                      }`}
                      onClick={() => document.getElementById("pdf-file-input")?.click()}
                    >
                      <input
                        id="pdf-file-input"
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleFileProcess(e.target.files[0])
                          }
                        }}
                      />
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="p-3 bg-indigo-50 rounded-full text-indigo-600 mb-1">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          Click to select or drag and drop your invoice PDF
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Drop the downloaded PDF here. The system will compute its cryptographic SHA-256 hash and compare it with the authoritative signature.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Document Verification Live Results */}
                  {isVerifyingFile && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent" />
                      <p className="text-xs text-slate-600 font-medium">Computing cryptographic SHA-256 checksum...</p>
                    </div>
                  )}

                  {!isVerifyingFile && fileVerificationStatus === "match" && (
                    <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        Document Integrity Verified: 100% Bitwise Exact Match
                      </div>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        The uploaded PDF file matches the official document generated by Open-Invoice with bit-level precision. 
                        No content, bank account details, line items, or tax figures have been altered.
                      </p>
                      <div className="font-mono text-[11px] bg-white p-2.5 rounded border border-emerald-200 text-emerald-900 break-all select-all">
                        Checksum: {uploadedHash}
                      </div>
                    </div>
                  )}

                  {!isVerifyingFile && fileVerificationStatus === "mismatch" && (
                    <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-rose-950 font-bold text-sm">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                        Document Hash Mismatch: Tampering Detected
                      </div>
                      <p className="text-xs text-rose-800 leading-relaxed">
                        The cryptographic checksum of your uploaded PDF file does NOT match the official document on record! 
                        The file in your possession has been modified, tampered with, or generated by an unauthorized third party.
                      </p>
                      <div className="space-y-1.5 text-[11px] font-mono">
                        <div className="bg-white p-2.5 rounded border border-rose-200">
                          <span className="text-rose-600 font-sans font-medium block text-[10px]">Uploaded File Checksum:</span>
                          <span className="text-rose-900 break-all select-all">{uploadedHash}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded border border-slate-200">
                          <span className="text-slate-500 font-sans font-medium block text-[10px]">Expected Official Checksum:</span>
                          <span className="text-slate-900 break-all select-all">{invoice.pdfHash || "N/A"}</span>
                        </div>
                      </div>
                      <div className="pt-2">
                        <a href={`/api/invoices/${invoice.id}/pdf?public=true`} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="destructive" className="gap-2 text-xs">
                            <Download className="w-3.5 h-3.5" />
                            Download Genuine Original PDF
                          </Button>
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Footer info */}
        <div className="text-center pt-4 text-xs text-slate-400 space-y-1">
          <p>Open-Invoice Secure Document Trust Network • RFC 7515 / FIPS 180-4 Compliant</p>
          <p>Invoices are cryptographically authenticated directly against authoritative database records.</p>
        </div>

      </div>
    </div>
  )
}
