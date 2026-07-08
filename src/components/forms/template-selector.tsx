"use client"

import React, { useState } from "react"
import { ChevronLeft, ChevronRight, CheckCircle2, Diamond } from "lucide-react"
import { cn } from "@/lib/utils"

interface TemplateSelectorProps {
  value: string
  onChange: (value: string) => void
  isPro?: boolean
}

const templates = [
  { id: "modern", name: "Modern" },
  { id: "classic", name: "Classic" },
  { id: "minimal", name: "Minimal" },
]

export function TemplateSelector({ value, onChange, isPro }: TemplateSelectorProps) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = templates.findIndex((t) => t.id === value)
    return idx >= 0 ? idx : 0
  })

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % templates.length)
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + templates.length) % templates.length)
  }

  const currentTemplate = templates[currentIndex]
  const isSelected = value === currentTemplate.id

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">1. Select Template</h3>
          <div className="flex items-center justify-center bg-orange-500 rounded p-1">
            <Diamond className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {/* Left Arrow */}
        <button
          type="button"
          onClick={handlePrev}
          className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Carousel Content */}
        <div className="flex flex-col items-center justify-center flex-1 px-4">
          <div className="flex items-center gap-3 mb-6 h-8">
            <h4 className="text-xl font-medium text-foreground">{currentTemplate.name}</h4>
            {isSelected && (
              <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                <CheckCircle2 className="h-5 w-5 fill-primary text-primary-foreground" />
                <span className="font-semibold text-sm">Selected</span>
              </div>
            )}
          </div>

          <div
            className={cn(
              "relative w-full max-w-[320px] aspect-[1/1.4] rounded-lg border shadow-sm transition-all duration-300 cursor-pointer overflow-hidden",
              isSelected ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-border hover:border-muted-foreground hover:shadow-md"
            )}
            onClick={() => onChange(currentTemplate.id)}
          >
            {/* Realistic Dummy Representation of Invoice */}
            <div className="w-full h-full bg-white dark:bg-slate-50 p-3 flex flex-col pointer-events-none text-[5px] leading-tight text-slate-800 dark:text-slate-800 font-sans">
              
              {/* MODERN PREVIEW */}
              {currentTemplate.id === "modern" && (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-0.5 w-1/2">
                      <div className="font-bold text-[7px] text-primary mb-1">COMPANY NAME</div>
                      <div>123 Business Road, Suite 100</div>
                      <div>New York, NY 10001</div>
                      <div>contact@company.com</div>
                    </div>
                    <div className="text-right space-y-0.5">
                      <div className="font-bold text-[8px] text-primary mb-1">INVOICE</div>
                      <div>#INV-2024-001</div>
                      <div>Date: Jan 01, 2024</div>
                      <div>Due: Jan 15, 2024</div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="font-semibold text-slate-500 mb-0.5">BILLED TO:</div>
                    <div className="font-bold">Client Organization</div>
                    <div>456 Client Avenue</div>
                    <div>San Francisco, CA 94107</div>
                  </div>

                  <div className="w-full rounded bg-primary text-primary-foreground font-semibold flex px-1 py-0.5 mb-1">
                    <div className="flex-1">Description</div>
                    <div className="w-6 text-right">Qty</div>
                    <div className="w-8 text-right">Rate</div>
                    <div className="w-10 text-right">Amount</div>
                  </div>
                  <div className="space-y-0.5 mb-4">
                    <div className="flex px-1 py-0.5 bg-slate-100 rounded-sm">
                      <div className="flex-1 font-medium">Software Development</div>
                      <div className="w-6 text-right">1</div>
                      <div className="w-8 text-right">₹500</div>
                      <div className="w-10 text-right">₹500</div>
                    </div>
                    <div className="flex px-1 py-0.5">
                      <div className="flex-1 font-medium">Server Hosting</div>
                      <div className="w-6 text-right">12</div>
                      <div className="w-8 text-right">₹50</div>
                      <div className="w-10 text-right">₹600</div>
                    </div>
                    <div className="flex px-1 py-0.5 bg-slate-100 rounded-sm">
                      <div className="flex-1 font-medium">Maintenance</div>
                      <div className="w-6 text-right">1</div>
                      <div className="w-8 text-right">₹200</div>
                      <div className="w-10 text-right">₹200</div>
                    </div>
                  </div>

                  <div className="mt-auto flex justify-between border-t border-slate-200 pt-2">
                    <div className="w-1/2 space-y-1">
                      <div className="font-semibold text-slate-500">Bank Details</div>
                      <div>HDFC Bank</div>
                      <div>Ac: 1234567890</div>
                      <div>IFSC: HDFC0001234</div>
                    </div>
                    <div className="w-2/5 space-y-0.5">
                       <div className="w-full flex justify-between"><div className="text-slate-500">Subtotal</div><div>₹1,300</div></div>
                       <div className="w-full flex justify-between"><div className="text-slate-500">Tax (18%)</div><div>₹234</div></div>
                       <div className="w-full flex justify-between border-t border-slate-200 pt-0.5 mt-0.5">
                         <div className="font-bold text-[6px]">Total</div>
                         <div className="font-bold text-[6px] text-primary">₹1,534</div>
                       </div>
                    </div>
                  </div>
                </>
              )}

              {/* CLASSIC PREVIEW */}
              {currentTemplate.id === "classic" && (
                <div className="font-serif h-full flex flex-col">
                  <div className="text-center border-b-[1.5px] border-slate-800 pb-2 mb-3">
                    <div className="font-bold text-[10px] tracking-widest text-slate-900 mb-0.5">TAX INVOICE</div>
                    <div className="font-bold text-[6px] text-slate-800">COMPANY NAME PVT LTD</div>
                    <div className="text-slate-600">123 Business Road, Suite 100, New York, NY 10001</div>
                  </div>
                  <div className="flex justify-between mb-3 text-slate-800">
                    <div className="w-1/2 space-y-0.5">
                      <div className="font-bold">Billed To:</div>
                      <div>Client Organization</div>
                      <div>456 Client Avenue</div>
                      <div>San Francisco, CA</div>
                    </div>
                    <div className="w-1/2 space-y-0.5 items-end flex flex-col text-right">
                      <div className="flex w-full justify-end gap-2"><span className="font-bold">Invoice No:</span><span>INV-2024-001</span></div>
                      <div className="flex w-full justify-end gap-2"><span className="font-bold">Date:</span><span>01/01/2024</span></div>
                      <div className="flex w-full justify-end gap-2"><span className="font-bold">Due Date:</span><span>15/01/2024</span></div>
                    </div>
                  </div>
                  <div className="w-full border border-slate-800 mb-3">
                    <div className="w-full bg-slate-100 border-b border-slate-800 flex px-1 py-0.5 font-bold">
                      <div className="flex-1 border-r border-slate-800">Description</div>
                      <div className="w-6 text-center border-r border-slate-800">Qty</div>
                      <div className="w-8 text-right border-r border-slate-800 pr-1">Rate</div>
                      <div className="w-10 text-right pr-1">Amount</div>
                    </div>
                    <div className="w-full border-b border-slate-300 flex px-1 py-0.5">
                      <div className="flex-1 border-r border-slate-300">Software Dev</div>
                      <div className="w-6 text-center border-r border-slate-300">1</div>
                      <div className="w-8 text-right border-r border-slate-300 pr-1">₹500</div>
                      <div className="w-10 text-right pr-1">₹500</div>
                    </div>
                    <div className="w-full flex px-1 py-0.5">
                      <div className="flex-1 border-r border-slate-300">Hosting</div>
                      <div className="w-6 text-center border-r border-slate-300">12</div>
                      <div className="w-8 text-right border-r border-slate-300 pr-1">₹50</div>
                      <div className="w-10 text-right pr-1">₹600</div>
                    </div>
                  </div>
                  <div className="mt-auto flex justify-end">
                    <div className="w-[45%] border-l border-t border-r border-b border-slate-800 p-1 space-y-0.5">
                       <div className="w-full flex justify-between"><div className="font-bold">Subtotal</div><div>₹1,100</div></div>
                       <div className="w-full flex justify-between"><div className="font-bold">Tax</div><div>₹198</div></div>
                       <div className="w-full flex justify-between border-t border-slate-800 pt-0.5 mt-0.5">
                         <div className="font-bold text-[6px]">Grand Total</div>
                         <div className="font-bold text-[6px]">₹1,298</div>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MINIMAL PREVIEW */}
              {currentTemplate.id === "minimal" && (
                <div className="flex flex-col h-full text-slate-600">
                  <div className="flex justify-between items-center mb-6">
                    <div className="font-bold text-[8px] text-slate-900 tracking-wide uppercase">Company Name</div>
                    <div className="text-right space-y-0.5">
                      <div className="font-bold text-[10px] text-slate-900">INVOICE</div>
                      <div>#INV-2024-001</div>
                    </div>
                  </div>
                  
                  <div className="w-full border-t border-slate-200 mb-4"></div>
                  
                  <div className="flex justify-between mb-6">
                    <div>
                      <div className="text-[4px] uppercase tracking-widest text-slate-400 mb-1">Invoice To</div>
                      <div className="font-semibold text-slate-800">Client Organization</div>
                      <div>456 Client Avenue</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[4px] uppercase tracking-widest text-slate-400 mb-1">Issue Date</div>
                      <div className="font-semibold text-slate-800">Jan 01, 2024</div>
                    </div>
                  </div>

                  <div className="space-y-1 mb-6">
                    <div className="flex justify-between items-center text-[4px] uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1 mb-1">
                      <div className="flex-1">Service</div>
                      <div className="w-12 text-right">Amount</div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex-1 font-medium text-slate-800">Software Development</div>
                      <div className="w-12 text-right">₹500.00</div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex-1 font-medium text-slate-800">Server Hosting</div>
                      <div className="w-12 text-right">₹600.00</div>
                    </div>
                  </div>
                  
                  <div className="mt-auto w-full flex justify-between items-end">
                    <div className="w-1/2">
                      <div className="text-[4px] uppercase tracking-widest text-slate-400 mb-0.5">Payment Terms</div>
                      <div className="font-medium text-slate-800">Due within 15 days</div>
                    </div>
                    <div className="w-[40%] space-y-1">
                      <div className="w-full flex justify-between"><div className="text-slate-500">Subtotal</div><div>₹1,100.00</div></div>
                      <div className="w-full flex justify-between"><div className="text-slate-500">Tax</div><div>₹198.00</div></div>
                      <div className="w-full flex justify-between pt-1 mt-1">
                        <div className="font-bold text-[6px] text-slate-900">Total</div>
                        <div className="font-bold text-[6px] text-slate-900">₹1,298.00</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Click overlay */}
            {!isSelected && (
              <div className="absolute inset-0 bg-background/0 hover:bg-foreground/5 transition-colors flex items-center justify-center">
                 <div className="bg-background border px-4 py-2 rounded-full shadow-lg font-medium text-sm text-foreground opacity-0 transition-opacity hover:opacity-100 transform translate-y-2 hover:translate-y-0">
                   Click to Select
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Arrow */}
        <button
          type="button"
          onClick={handleNext}
          className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-8">
        {templates.map((t, i) => (
          <div
            key={t.id}
            className={cn(
              "h-2 rounded-full transition-all duration-300 cursor-pointer",
              i === currentIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            onClick={() => setCurrentIndex(i)}
          />
        ))}
      </div>
    </div>
  )
}
