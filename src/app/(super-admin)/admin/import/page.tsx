"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { bulkImportData } from "@/actions/admin-tools"
import { toast } from "sonner"
import { Upload, FileSpreadsheet, Loader2, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react"

type ImportType = "users" | "companies" | "invoices"

export default function BulkImporterPage() {
  const [importType, setImportType] = useState<ImportType>("users")
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [password, setPassword] = useState("")
  const [importing, setImporting] = useState(false)

  // CSV parsing helper
  function parseCSV(text: string): any[] {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)
    if (lines.length === 0) return []

    // Simple CSV parser that handles commas
    const parseCSVLine = (line: string) => {
      const result: string[] = []
      let current = ""
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    const fileHeaders = parseCSVLine(lines[0])
    setHeaders(fileHeaders)

    const rows = lines.slice(1).map(line => {
      const values = parseCSVLine(line)
      const obj: any = {}
      fileHeaders.forEach((header, index) => {
        const cleanHeader = header.replace(/^["']|["']$/g, "")
        const cleanValue = values[index] ? values[index].replace(/^["']|["']$/g, "") : ""
        obj[cleanHeader] = cleanValue
      })
      return obj
    })

    return rows
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    const reader = new FileReader()

    reader.onload = (event) => {
      const text = event.target?.result as string
      try {
        if (selectedFile.name.endsWith(".json")) {
          const json = JSON.parse(text)
          const dataArray = Array.isArray(json) ? json : [json]
          if (dataArray.length > 0) {
            setHeaders(Object.keys(dataArray[0]))
            setParsedData(dataArray)
          } else {
            toast.error("JSON array is empty.")
          }
        } else if (selectedFile.name.endsWith(".csv")) {
          const rows = parseCSV(text)
          setParsedData(rows)
          toast.success(`Successfully parsed ${rows.length} CSV rows.`)
        } else {
          toast.error("Unsupported file type. Please upload a .csv or .json file.")
        }
      } catch (err: any) {
        console.error(err)
        toast.error("Error parsing file. Please check file syntax.")
      }
    }

    reader.readAsText(selectedFile)
  }

  async function handleImport() {
    if (!password) {
      toast.error("Please enter the SQL Admin password.")
      return
    }
    if (parsedData.length === 0) {
      toast.error("No data parsed to import.")
      return
    }

    setImporting(true)
    try {
      const res = await bulkImportData(importType, parsedData, password)
      if (res.success) {
        toast.success(res.message || "Bulk import successful!")
        setFile(null)
        setParsedData([])
        setHeaders([])
        setPassword("")
      } else {
        toast.error(res.error || "Failed to import data.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bulk Data Importer</h1>
        <p className="text-gray-500">Bulk seed or migrate platform tenants using CSV or JSON uploads.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Import Configuration</CardTitle>
              <CardDescription>Select the target data type and structure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Target Entity Type</Label>
                <Select
                  value={importType}
                  onValueChange={(val) => {
                    if (val) {
                      setImportType(val as ImportType)
                      setFile(null)
                      setParsedData([])
                      setHeaders([])
                    }
                  }}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="users">Users</SelectItem>
                    <SelectItem value="companies">Companies</SelectItem>
                    <SelectItem value="invoices">Invoices</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Upload Input */}
              <div className="space-y-2">
                <Label>Upload File (CSV or JSON)</Label>
                <div className="border border-dashed border-slate-800 rounded-xl p-6 bg-slate-950/40 text-center hover:bg-slate-950/60 transition duration-200 relative">
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-medium">
                    {file ? file.name : "Drag and drop or click to upload"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">Supports UTF-8 CSV or JSON arrays</p>
                </div>
              </div>

              {/* Password Verification */}
              {parsedData.length > 0 && (
                <div className="space-y-2 border-t border-slate-850 pt-4 animate-in fade-in duration-200">
                  <Label className="flex items-center gap-1.5 text-amber-500 font-semibold">
                    <AlertTriangle className="w-4 h-4" /> Admin SQL Password Required
                  </Label>
                  <Input
                    type="password"
                    placeholder="Enter SQL admin password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-indigo-500/50"
                  />
                  <Button
                    onClick={handleImport}
                    disabled={importing || !password}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold mt-2"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Importing...
                      </>
                    ) : (
                      <>
                        Commit {parsedData.length} Records <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Column templates reference */}
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Template Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-4 text-slate-400">
              {importType === "users" && (
                <>
                  <p>Upload users matching the headers below:</p>
                  <pre className="bg-slate-950 p-2.5 rounded-lg text-emerald-400 font-mono text-[10px] overflow-x-auto">
                    email,name,role,isPro{"\n"}
                    admin@test.com,Admin User,SUPER_ADMIN,true{"\n"}
                    john@test.com,John Doe,BUSINESS_OWNER,false
                  </pre>
                  <p className="text-[10px] leading-relaxed">
                    * Roles: `MEMBER`, `BUSINESS_OWNER`, `SUPER_ADMIN`.
                  </p>
                </>
              )}
              {importType === "companies" && (
                <>
                  <p>Upload companies matching the headers below:</p>
                  <pre className="bg-slate-950 p-2.5 rounded-lg text-emerald-400 font-mono text-[10px] overflow-x-auto">
                    name,subscriptionTier{"\n"}
                    Acme Corp,PRO{"\n"}
                    Global LLC,FREE
                  </pre>
                  <p className="text-[10px] leading-relaxed">
                    * Plan Tiers: `FREE`, `PRO`, `ENTERPRISE`.
                  </p>
                </>
              )}
              {importType === "invoices" && (
                <>
                  <p>Upload invoices matching the headers below:</p>
                  <pre className="bg-slate-950 p-2.5 rounded-lg text-emerald-400 font-mono text-[10px] overflow-x-auto">
                    invoiceNumber,amount,status,dueDate,companyId{"\n"}
                    INV-001,45000,PAID,2026-07-15,company_uuid_here{"\n"}
                    INV-002,12000,SENT,2026-08-01,company_uuid_here
                  </pre>
                  <p className="text-[10px] leading-relaxed">
                    * Statuses: `DRAFT`, `SENT`, `PAID`, `PARTIALLY_PAID`.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-900/60 border-slate-800 h-full flex flex-col">
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>
                {parsedData.length > 0
                  ? `Showing parsed row preview (max 10 display of ${parsedData.length} records)`
                  : "Upload a file on the left configuration panel to preview parsed records."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-start overflow-hidden">
              {parsedData.length > 0 ? (
                <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40 max-h-[500px]">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[10px] text-muted-foreground uppercase bg-slate-900/80 sticky top-0">
                      <tr>
                        {headers.map((h, i) => (
                          <th key={i} className="px-4 py-3 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {parsedData.slice(0, 10).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-900/50">
                          {headers.map((h, cIdx) => (
                            <td key={cIdx} className="px-4 py-3 font-mono text-slate-300 truncate max-w-[150px]">
                              {String(row[h] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-20 text-center">
                  <FileSpreadsheet className="w-12 h-12 text-slate-700 mb-3" />
                  <p className="text-sm font-medium">No Data Loaded</p>
                  <p className="text-xs max-w-xs mt-1 text-slate-500">
                    Select a CSV/JSON file to preview columns and check syntax constraints.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
