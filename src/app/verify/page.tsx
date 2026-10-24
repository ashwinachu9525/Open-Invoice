"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ShieldCheck,
  Search,
  Lock,
  FileCheck2,
  UploadCloud,
  CheckCircle2,
  FileText,
  AlertTriangle,
} from "lucide-react"

export default function GeneralVerificationPortalPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isVerifyingFile, setIsVerifyingFile] = useState(false)
  const [verifyFileResult, setVerifyFileResult] = useState<any>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    const cleanId = identifier.trim()
    if (!cleanId) return
    setIsSubmitting(true)
    router.push(`/verify/${encodeURIComponent(cleanId)}`)
  }

  async function handleFileUpload(file: File) {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a valid .pdf file.")
      return
    }

    setUploadedFile(file)
    setIsVerifyingFile(true)
    setVerifyFileResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/verify/pdf", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      setVerifyFileResult(data)
    } catch (err) {
      console.error("Failed to verify file:", err)
      setVerifyFileResult({ error: "Failed to connect to verification server" })
    } finally {
      setIsVerifyingFile(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20 mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Official Invoice Verification Portal
          </h1>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            Verify the authenticity and document integrity of any invoice issued through the Open-Invoice trust network.
          </p>
        </div>

        {/* Verification Form Card */}
        <Card className="border border-slate-200/80 shadow-md rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600" />
              <CardTitle className="text-base text-slate-900">Verify by Identifier or Token</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Enter the unique verification ID or scan token printed under the invoice QR code.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Input
                    placeholder="Enter Invoice ID or Verification Token (e.g., cm0xyz...)"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-11 rounded-xl text-sm pl-4 pr-10 font-mono"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting || !identifier.trim()}
                  className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium shrink-0"
                >
                  <Search className="w-4 h-4" />
                  {isSubmitting ? "Verifying..." : "Verify Record"}
                </Button>
              </div>
              <p className="text-[11px] text-slate-400">
                Tip: Scanning the QR code on a PDF invoice automatically opens this portal with instant cryptographic authentication.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Document Drag and Drop Inspection */}
        <Card className="border border-slate-200/80 shadow-md rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-indigo-600" />
              <CardTitle className="text-base text-slate-900">Verify Document File Integrity (PDF Check)</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Upload your PDF document to verify its cryptographic SHA-256 checksum and detect unauthorized alterations.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFileUpload(e.dataTransfer.files[0])
                }
              }}
              onClick={() => document.getElementById("general-pdf-input")?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50/50"
                  : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50"
              }`}
            >
              <input
                id="general-pdf-input"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0])
                  }
                }}
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-3 bg-indigo-50 rounded-full text-indigo-600 mb-1">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {uploadedFile ? uploadedFile.name : "Select or drag and drop your invoice PDF"}
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Computes the file&apos;s cryptographic hash and searches for matching registered invoices.
                </p>
              </div>
            </div>

            {isVerifyingFile && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent" />
                <p className="text-xs text-slate-600 font-medium">Validating document checksum against records...</p>
              </div>
            )}

            {verifyFileResult && (
              <div className="space-y-3 pt-2">
                {verifyFileResult.match ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Authentic Document Matched!
                      </span>
                      <Button
                        size="sm"
                        onClick={() => router.push(`/verify/${verifyFileResult.invoiceId}`)}
                        className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                      >
                        View Full Details
                      </Button>
                    </div>
                    <p className="text-xs text-emerald-800">
                      Invoice #{verifyFileResult.invoiceNumber} from {verifyFileResult.companyName}. The PDF file is authentic and unaltered.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                    <div className="font-bold text-sm text-rose-950 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Document Not Recognized or Altered
                    </div>
                    <p className="text-xs text-rose-800">
                      The checksum ({verifyFileResult.uploadedFileHash?.slice(0, 16)}...) did not match any unaltered registered invoices on record.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Principles Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 pt-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              Trusted Backend
            </div>
            <p className="text-slate-500 leading-relaxed">
              Invoice data is queried live from the authoritative database, completely immune to QR code tampering.
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Digital Signatures
            </div>
            <p className="text-slate-500 leading-relaxed">
              Every verification link includes an HMAC-SHA256 signature signed by the platform&apos;s private keys.
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
              Document Checksums
            </div>
            <p className="text-slate-500 leading-relaxed">
              Generated PDFs are cryptographically fingerprinted to detect modifications down to individual bytes.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
