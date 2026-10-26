"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Award,
  Plus,
  Trash2,
  Calendar,
  Save,
  ArrowLeft,
  Sparkles,
  Building,
  FileText,
  CheckCircle2,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createTestCertificate, TestParameter } from "@/actions/test-certificates"

interface CustomerOption {
  id: string
  name: string
  companyName?: string | null
}

interface InvoiceOption {
  id: string
  invoiceNumber: string
  customerId: string
  items?: { description: string }[]
}

interface CertificateFormProps {
  customers: CustomerOption[]
  invoices: InvoiceOption[]
  defaultCertificateNumber: string
  initialInvoiceId?: string
  initialCustomerId?: string
  initialProductName?: string
}

export function CertificateForm({
  customers,
  invoices,
  defaultCertificateNumber,
  initialInvoiceId = "",
  initialCustomerId = "",
  initialProductName = "",
}: CertificateFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [certificateNumber, setCertificateNumber] = useState(defaultCertificateNumber)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [customerId, setCustomerId] = useState(initialCustomerId)
  const [invoiceId, setInvoiceId] = useState(initialInvoiceId)
  const [productName, setProductName] = useState(initialProductName)
  const [batchNumber, setBatchNumber] = useState("")
  const [remarks, setRemarks] = useState("The product complies with the specified quality standards.")
  const [authorizedSignatory, setAuthorizedSignatory] = useState("Quality Assurance Manager")

  // Tested Parameters
  const [parameters, setParameters] = useState<TestParameter[]>([
    { parameter: "Appearance / Visual", result: "Conforms", standard: "Uniform & Defect Free" },
    { parameter: "Purity / Assay", result: "99.8%", standard: "Min 99.5%" },
    { parameter: "Moisture Content", result: "0.15%", standard: "Max 0.50%" },
  ])

  // Handle invoice selection change
  function handleInvoiceChange(selectedInvId: string) {
    if (selectedInvId === "none") {
      setInvoiceId("")
      return
    }

    setInvoiceId(selectedInvId)
    const matchingInv = invoices.find((inv) => inv.id === selectedInvId)
    if (matchingInv) {
      if (matchingInv.customerId && !customerId) {
        setCustomerId(matchingInv.customerId)
      }
      if (matchingInv.items && matchingInv.items.length > 0 && !productName) {
        setProductName(matchingInv.items[0].description)
      }
    }
  }

  // Parameter row management
  function addParameterRow() {
    setParameters((prev) => [...prev, { parameter: "", result: "", standard: "" }])
  }

  function removeParameterRow(index: number) {
    setParameters((prev) => prev.filter((_, i) => i !== index))
  }

  function updateParameter(index: number, field: keyof TestParameter, value: string) {
    setParameters((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    )
  }

  // Parameter preset templates
  function applyPreset(presetType: "chemical" | "mechanical" | "electrical") {
    if (presetType === "chemical") {
      setParameters([
        { parameter: "Purity / Assay", result: "99.8%", standard: "Min 99.5%" },
        { parameter: "pH Value (10% Solution)", result: "7.1", standard: "6.5 - 7.5" },
        { parameter: "Moisture Content", result: "0.12%", standard: "Max 0.5%" },
        { parameter: "Residue on Ignition", result: "0.03%", standard: "Max 0.1%" },
      ])
    } else if (presetType === "mechanical") {
      setParameters([
        { parameter: "Tensile Strength", result: "485 MPa", standard: "Min 450 MPa" },
        { parameter: "Yield Strength", result: "320 MPa", standard: "Min 280 MPa" },
        { parameter: "Elongation (A50)", result: "26%", standard: "Min 22%" },
        { parameter: "Hardness (Rockwell B)", result: "78 HRB", standard: "70 - 85 HRB" },
      ])
    } else if (presetType === "electrical") {
      setParameters([
        { parameter: "Dielectric Strength", result: "2.5 kV/mm", standard: "Min 2.0 kV/mm" },
        { parameter: "Insulation Resistance", result: "> 100 MΩ", standard: "Min 50 MΩ" },
        { parameter: "Contact Resistance", result: "12 mΩ", standard: "Max 25 mΩ" },
      ])
    }
    toast.success("Applied parameter template.")
  }

  // Submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!certificateNumber.trim()) {
      toast.error("Please enter a Certificate Number.")
      return
    }
    if (!customerId) {
      toast.error("Please select a Customer / Client.")
      return
    }
    if (!productName.trim()) {
      toast.error("Please enter the Product Name.")
      return
    }

    const validParameters = parameters.filter((p) => p.parameter.trim() !== "")
    if (validParameters.length === 0) {
      toast.error("Please include at least one test parameter.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createTestCertificate({
        customerId,
        invoiceId: invoiceId || undefined,
        certificateNumber: certificateNumber.trim(),
        date,
        productName: productName.trim(),
        batchNumber: batchNumber.trim() || undefined,
        testedParameters: validParameters,
        remarks: remarks.trim() || undefined,
        authorizedSignatory: authorizedSignatory.trim() || undefined,
      })

      if (res.success && res.certificate) {
        toast.success(`Certificate ${certificateNumber} created successfully!`)
        router.push(`/certificates/${res.certificate.id}`)
      } else {
        toast.error(res.error || "Failed to create certificate.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* ── Top Navigation ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/certificates"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Certificates
        </Link>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg gap-2"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Generating..." : "Save & Generate PDF"}
          </Button>
        </div>
      </div>

      {/* ── Section 1: Certificate Metadata ── */}
      <Card className="glass border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-400" />
            General Information
          </CardTitle>
          <CardDescription>
            Basic details for this quality inspection report or certificate of analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Certificate Number *</Label>
            <Input
              value={certificateNumber}
              onChange={(e) => setCertificateNumber(e.target.value)}
              placeholder="e.g. TC-2026-001"
              required
              className="bg-white/5 border-white/10 font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Issue Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="bg-white/5 border-white/10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Customer / Client *</Label>
            <Select value={customerId} onValueChange={(val) => setCustomerId(val || "")}>
              <SelectTrigger className="bg-white/5 border-white/10 text-sm">
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.companyName ? `${c.name} (${c.companyName})` : c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Linked Invoice (Optional)</Label>
            <Select value={invoiceId || "none"} onValueChange={(val) => handleInvoiceChange(val || "")}>
              <SelectTrigger className="bg-white/5 border-white/10 text-sm">
                <SelectValue placeholder="None (Standalone)" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                <SelectItem value="none">None (Standalone)</SelectItem>
                {invoices.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.invoiceNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Product & Batch Details ── */}
      <Card className="glass border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Product & Batch Specifications
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Product / Item Name *</Label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Stainless Steel SS-304 Fasteners"
              required
              className="bg-white/5 border-white/10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Batch / Lot / Heat Number</Label>
            <Input
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="e.g. LOT-2026-X94"
              className="bg-white/5 border-white/10 font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Tested Parameters ── */}
      <Card className="glass border-white/10">
        <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              Tested Parameters & Test Results
            </CardTitle>
            <CardDescription>
              Specify test metrics, observed results, and acceptance standards
            </CardDescription>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              Presets:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("chemical")}
              className="glass border-white/10 text-xs h-7 px-2.5"
            >
              Chemical
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("mechanical")}
              className="glass border-white/10 text-xs h-7 px-2.5"
            >
              Mechanical
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("electrical")}
              className="glass border-white/10 text-xs h-7 px-2.5"
            >
              Electrical
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-muted-foreground">
                  <th className="text-left pb-2 font-medium w-5/12">Test Parameter / Property</th>
                  <th className="text-left pb-2 font-medium w-3/12 px-2">Observed Result</th>
                  <th className="text-left pb-2 font-medium w-3/12 px-2">Specified Standard</th>
                  <th className="w-10 pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {parameters.map((param, index) => (
                  <tr key={index}>
                    <td className="py-2 pr-2">
                      <Input
                        value={param.parameter}
                        onChange={(e) => updateParameter(index, "parameter", e.target.value)}
                        placeholder="e.g. Tensile Strength"
                        className="bg-white/5 border-white/10 text-sm h-9"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        value={param.result}
                        onChange={(e) => updateParameter(index, "result", e.target.value)}
                        placeholder="e.g. 520 MPa"
                        className="bg-white/5 border-white/10 text-sm h-9 font-medium text-emerald-400"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        value={param.standard}
                        onChange={(e) => updateParameter(index, "standard", e.target.value)}
                        placeholder="e.g. Min 450 MPa"
                        className="bg-white/5 border-white/10 text-sm h-9 text-slate-300"
                      />
                    </td>
                    <td className="py-2 pl-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={parameters.length <= 1}
                        onClick={() => removeParameterRow(index)}
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addParameterRow}
            className="glass border-white/10 text-xs gap-1.5 mt-2"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            Add Parameter Row
          </Button>
        </CardContent>
      </Card>

      {/* ── Section 4: Signoff & Remarks ── */}
      <Card className="glass border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-400" />
            Remarks & Signoff
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Authorized Signatory</Label>
            <Input
              value={authorizedSignatory}
              onChange={(e) => setAuthorizedSignatory(e.target.value)}
              placeholder="e.g. Head of QA / Inspection Manager"
              className="bg-white/5 border-white/10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Remarks / Conclusion</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Any comments, standards reference, or pass/fail statement..."
              className="bg-white/5 border-white/10 text-sm resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Bottom Submit Bar ── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link href="/certificates">
          <Button type="button" variant="outline" className="glass border-white/10">
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg gap-2 px-6"
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? "Generating Certificate..." : "Generate Certificate"}
        </Button>
      </div>
    </form>
  )
}
