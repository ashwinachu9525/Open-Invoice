"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Copy, Check, Layout, Palette, Settings2, Eye } from "lucide-react"

interface ApiKeyData {
  id: string
  name: string
  keyHint: string
  createdAt: Date
}

interface EmbedWidgetConfigProps {
  apiKeys: ApiKeyData[]
}

const BRAND_COLORS = [
  { name: "Indigo", value: "#4f46e5" },
  { name: "Blue", value: "#2563eb" },
  { name: "Emerald", value: "#059669" },
  { name: "Rose", value: "#e11d48" },
  { name: "Amber", value: "#d97706" },
  { name: "Violet", value: "#7c3aed" },
]

export function EmbedWidgetConfig({ apiKeys }: EmbedWidgetConfigProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [primaryColor, setPrimaryColor] = useState("#4f46e5")
  const [selectedApiKeyId, setSelectedApiKeyId] = useState("")
  const [copied, setCopied] = useState(false)
  const [previewKey, setPreviewKey] = useState(0) // triggers iframe refresh

  const selectedKey = apiKeys.find((k) => k.id === selectedApiKeyId)
  
  // We construct the URL. For safety in preview we can omit/include a placeholder or use the real preview if available
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
  
  // We can pass a mock key or the actual key. If selected, use a mock key prefix or a parameter that tells the embed page it's authorized
  const embedUrl = `${origin}/embed/invoice-generator?theme=${theme}&primaryColor=${encodeURIComponent(primaryColor)}${
    selectedApiKeyId ? `&apiKey=YOUR_API_KEY` : ""
  }`

  const iframeCode = `<iframe
  src="${embedUrl}"
  width="100%"
  height="750px"
  style="border: none; border-radius: 12px; background: transparent; overflow: hidden;"
  allow="clipboard-write"
></iframe>`

  function handleCopy() {
    navigator.clipboard.writeText(iframeCode)
    setCopied(true)
    toast.success("Embed code copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  function handleRefreshPreview() {
    setPreviewKey((prev) => prev + 1)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2 space-y-6">
        <Card className="glass border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-indigo-400" />
              Widget Customizer
            </CardTitle>
            <CardDescription>
              Configure the style and behavior of the embeddable generator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5" />
                Color Theme
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`py-2 px-3 text-xs rounded-md border font-medium transition-all ${
                    theme === "dark"
                      ? "bg-indigo-600/20 border-indigo-500 text-white"
                      : "bg-transparent border-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Dark Glassmorphic
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`py-2 px-3 text-xs rounded-md border font-medium transition-all ${
                    theme === "light"
                      ? "bg-indigo-600/20 border-indigo-500 text-white"
                      : "bg-transparent border-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Light Mode
                </button>
              </div>
            </div>

            {/* Brand Color Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                Brand Color
              </label>
              <div className="flex flex-wrap gap-2">
                {BRAND_COLORS.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setPrimaryColor(color.value)}
                    className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center transition-all hover:scale-105"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  >
                    {primaryColor === color.value && (
                      <span className="w-2.5 h-2.5 rounded-full bg-white shadow-md shadow-black/50" />
                    )}
                  </button>
                ))}
                <div className="flex items-center gap-2 border border-white/10 rounded-md px-2 py-1 bg-white/5">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-6 h-6 border-none bg-transparent cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-slate-400">{primaryColor.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* API Key Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Authorized API Key (Optional)
              </label>
              <select
                value={selectedApiKeyId}
                onChange={(e) => setSelectedApiKeyId(e.target.value)}
                className="w-full h-9 rounded-md border border-white/10 bg-slate-900 px-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Guest Mode (Free Client-only generation)</option>
                {apiKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.name} ({key.keyHint})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 leading-normal">
                If an API key is selected, invoices created within the iframe will automatically save directly inside your company dashboard. Otherwise, it functions as a public generator.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              Copy Embed Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              readOnly
              value={iframeCode}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              className="w-full h-24 rounded-lg bg-slate-950 p-2 font-mono text-[10px] text-slate-300 border border-white/5 resize-none focus:outline-none"
            />
            <Button onClick={handleCopy} className="w-full bg-indigo-600 hover:bg-indigo-700 h-9 text-xs">
              {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? "Copied!" : "Copy HTML Snippet"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-indigo-400" />
            Live Sandbox Preview
          </h3>
          <Button variant="ghost" size="sm" onClick={handleRefreshPreview} className="text-xs text-indigo-400 h-7 px-2 hover:bg-white/5">
            Reset Preview
          </Button>
        </div>

        <div className="border border-white/10 rounded-xl overflow-hidden shadow-2xl bg-slate-900/50 aspect-[4/3] max-h-[500px] flex flex-col relative">
          {/* Mock Browser Header */}
          <div className="bg-slate-950 px-4 py-2 flex items-center gap-2 border-b border-white/5">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="bg-slate-900 rounded-md flex-1 text-[10px] text-slate-500 font-mono py-1 px-3 border border-white/5 text-center truncate select-all">
              {embedUrl.replace("YOUR_API_KEY", selectedKey ? `${selectedKey.keyHint}` : "")}
            </div>
          </div>
          
          {/* Iframe View */}
          <div className="flex-1 bg-slate-950 relative">
            <iframe
              key={previewKey}
              src={`${origin}/embed/invoice-generator?theme=${theme}&primaryColor=${encodeURIComponent(
                primaryColor
              )}&preview=true`}
              className="w-full h-full border-none overflow-y-auto"
              title="Invoice Generator Sandbox Preview"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
