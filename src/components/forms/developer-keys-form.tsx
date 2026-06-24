"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { generateApiKey, revokeApiKey } from "@/actions/api-key"
import { toast } from "sonner"
import { Key, Copy, Check, Trash, Plus, Terminal, AlertTriangle, Loader2 } from "lucide-react"

interface ApiKeyData {
  id: string
  name: string
  keyHint: string
  createdAt: Date
  isActive: boolean
}

interface DeveloperKeysFormProps {
  initialKeys: ApiKeyData[]
}

export function DeveloperKeysForm({ initialKeys }: DeveloperKeysFormProps) {
  const [keys, setKeys] = useState<ApiKeyData[]>(initialKeys)
  const [newKeyName, setNewKeyName] = useState("")
  const [plainKey, setPlainKey] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"curl" | "node">("curl")

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API Key")
      return
    }

    setIsGenerating(true)
    setPlainKey(null)

    try {
      const res = await generateApiKey(newKeyName)
      if (res.error) {
        toast.error(res.error)
      } else if (res.success && res.plainKey && res.apiKey) {
        setPlainKey(res.plainKey)
        setKeys([res.apiKey as ApiKeyData, ...keys])
        setNewKeyName("")
        toast.success("API Key generated successfully!")
      }
    } catch (err) {
      toast.error("An error occurred while generating the API key")
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Are you sure you want to revoke this API key? External systems using it will lose access immediately.")) {
      return
    }

    setRevokingId(id)
    try {
      const res = await revokeApiKey(id)
      if (res.error) {
        toast.error(res.error)
      } else if (res.success) {
        setKeys(keys.filter((k) => k.id !== id))
        toast.success("API Key revoked successfully")
      }
    } catch (err) {
      toast.error("Failed to revoke API key")
    } finally {
      setRevokingId(null)
    }
  }

  function handleCopy() {
    if (!plainKey) return
    navigator.clipboard.writeText(plainKey)
    setCopied(true)
    toast.success("API Key copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  const curlSnippet = plainKey
    ? `curl -X POST ${window.location.origin}/api/v1/invoices \\
  -H "x-api-key: ${plainKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customerId": "cust_123456",
    "invoiceNumber": "INV-001",
    "date": "${new Date().toISOString().slice(0,10)}",
    "dueDate": "${new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0,10)}",
    "currency": "INR",
    "items": [
      {
        "description": "Consulting Services",
        "quantity": 10,
        "unitPrice": 1500,
        "taxPercentage": 18
      }
    ]
  }'`
    : `curl -X POST https://api.openinvoice.dev/api/v1/invoices \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{...}'`;

  const nodeSnippet = plainKey
    ? `const response = await fetch("${window.location.origin}/api/v1/invoices", {
  method: "POST",
  headers: {
    "x-api-key": "${plainKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    customerId: "cust_123456",
    invoiceNumber: "INV-001",
    date: "${new Date().toISOString().slice(0,10)}",
    dueDate: "${new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0,10)}",
    currency: "INR",
    items: [
      {
        description: "Web Development Package",
        quantity: 1,
        unitPrice: 45000,
        taxPercentage: 18
      }
    ]
  })
});
const result = await response.json();
console.log(result);`
    : `// Node fetch integration example
const response = await fetch("https://api.openinvoice.dev/api/v1/invoices", {
  method: "POST",
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ ... })
});`;

  return (
    <div className="space-y-6">
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            API Keys
          </CardTitle>
          <CardDescription>
            Manage keys that authenticate external requests to the Open Invoice API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {plainKey && (
            <Alert className="bg-emerald-500/10 border-emerald-500/20 text-slate-100">
              <AlertTriangle className="h-4 w-4 text-emerald-400" />
              <AlertTitle className="text-emerald-400 font-bold">Copy your API Key</AlertTitle>
              <AlertDescription className="mt-2 space-y-3">
                <p className="text-xs text-emerald-300/95">
                  For security reasons, this key will only be shown to you **once**. Be sure to save it somewhere secure.
                </p>
                <div className="flex items-center gap-2 bg-slate-950/80 p-3 rounded-lg border border-emerald-500/20 font-mono text-xs select-all break-all pr-12 relative">
                  {plainKey}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1 h-8 w-8 hover:bg-white/10 hover:text-white"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleGenerate} className="flex gap-2 items-end">
            <div className="grid gap-1.5 flex-1">
              <label htmlFor="key-name" className="text-xs font-semibold text-slate-300">
                Key Name
              </label>
              <Input
                id="key-name"
                placeholder="e.g. Production Webhook Engine"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                disabled={isGenerating}
                className="glass border-white/10"
              />
            </div>
            <Button type="submit" disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-700 h-9">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Generate Key
            </Button>
          </form>

          <div className="border-t border-white/5 pt-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Active Keys</h3>
            {keys.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No active API keys created yet.</p>
            ) : (
              <div className="space-y-2">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className="flex justify-between items-center bg-white/5 border border-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{key.name}</p>
                      <div className="flex gap-2 mt-1 font-mono text-[10px] text-slate-400">
                        <span>{key.keyHint}</span>
                        <span>•</span>
                        <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      onClick={() => handleRevoke(key.id)}
                      disabled={revokingId === key.id}
                    >
                      {revokingId === key.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            Quick Integration
          </CardTitle>
          <CardDescription>
            Learn how to use your API keys to create invoices programmatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex border-b border-white/10 text-xs">
            <button
              onClick={() => setActiveTab("curl")}
              className={`pb-2 px-3 border-b-2 font-medium transition-colors ${
                activeTab === "curl" ? "border-indigo-500 text-white" : "border-transparent text-slate-400 hover:text-slate-300"
              }`}
            >
              cURL
            </button>
            <button
              onClick={() => setActiveTab("node")}
              className={`pb-2 px-3 border-b-2 font-medium transition-colors ${
                activeTab === "node" ? "border-indigo-500 text-white" : "border-transparent text-slate-400 hover:text-slate-300"
              }`}
            >
              NodeJS (Fetch)
            </button>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-white/5 font-mono text-xs overflow-x-auto text-indigo-300 max-h-[300px]">
            <pre>{activeTab === "curl" ? curlSnippet : nodeSnippet}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
