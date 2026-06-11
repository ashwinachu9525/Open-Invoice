"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Invoice } from "@prisma/client"
import { formatCurrency } from "@/services/tax-engine"
import { Sparkles, ArrowRight, FileText } from "lucide-react"

interface PastInvoiceModalProps {
  pastInvoices: (Invoice & { customer: { name: string } })[]
  onSelect: (invoice: any, aiInstructions?: string) => void
}

export function PastInvoiceModal({ pastInvoices, onSelect }: PastInvoiceModalProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [useAi, setUseAi] = useState(false)
  const [aiInstructions, setAiInstructions] = useState("")

  const handleContinue = () => {
    if (selectedInvoiceId) {
      const selected = pastInvoices.find(i => i.id === selectedInvoiceId)
      if (selected) {
        onSelect(selected, useAi ? aiInstructions : undefined)
        setIsOpen(false)
      }
    } else {
      setIsOpen(false)
    }
  }

  if (pastInvoices.length === 0) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px] bg-black/90 border-white/10 text-white backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            Use Past Invoice as Template?
          </DialogTitle>
          <DialogDescription>
            You can speed up creation by cloning a previous invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select a past invoice (optional)</label>
            <select
              className="flex h-9 w-full rounded-md border border-white/10 bg-transparent px-3 py-1 text-sm backdrop-blur-sm focus:outline-none focus:border-primary/50"
              value={selectedInvoiceId || ""}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
            >
              <option value="">-- Start fresh --</option>
              {pastInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} - {inv.customer.name} ({formatCurrency(inv.finalAmount, inv.currency)})
                </option>
              ))}
            </select>
          </div>

          {selectedInvoiceId && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="use-ai" 
                  className="rounded border-white/10 bg-transparent accent-indigo-500"
                  checked={useAi}
                  onChange={(e) => setUseAi(e.target.checked)}
                />
                <label htmlFor="use-ai" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Modify with AI Assistant
                </label>
              </div>

              {useAi && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <textarea
                    placeholder="e.g. Update the description to 'May 2026 retainer', increase price by 10%"
                    className="w-full min-h-[80px] rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-purple-500/50 resize-y"
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="hover:bg-white/10">
            Skip
          </Button>
          <Button 
            onClick={handleContinue} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            disabled={!selectedInvoiceId && isOpen}
          >
            {useAi ? "Generate with AI" : "Clone Invoice"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
