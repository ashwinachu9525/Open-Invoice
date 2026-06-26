"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition, useState, useRef, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Filter, X, CalendarDays, ChevronDown, ArrowRight } from "lucide-react"
import { format, isValid, parseISO } from "date-fns"
import type { DateRange } from "react-day-picker"

/* ── Indian Financial Years ────────────────────────────── */
function getFinancialYears() {
  const years: { label: string; value: string; start: string; end: string }[] = []
  const now = new Date()
  const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  for (let y = currentFY; y >= 2020; y--) {
    years.push({
      label: `FY ${y}–${String(y + 1).slice(2)}`,
      value: `${y}-${y + 1}`,
      start: `${y}-04-01`,
      end: `${y + 1}-03-31`,
    })
  }
  return years
}
const FY_OPTIONS = getFinancialYears()

/* ── Helpers ────────────────────────────────────────────── */
function parseDate(s?: string) {
  if (!s) return undefined
  const d = parseISO(s)
  return isValid(d) ? d : undefined
}

function formatDisplay(d?: Date) {
  return d ? format(d, "dd MMM yyyy") : "Pick date"
}

/* ── Main Component ─────────────────────────────────────── */
interface QuotationFilterBarProps {
  currentFrom?: string
  currentTo?: string
  currentFY?: string
}

export function QuotationFilterBar({
  currentFrom,
  currentTo,
  currentFY,
}: QuotationFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Popover state
  const [fyOpen, setFyOpen] = useState(false)
  const [rangeOpen, setRangeOpen] = useState(false)
  const fyRef = useRef<HTMLDivElement>(null)
  const rangeRef = useRef<HTMLDivElement>(null)

  // Range selection state
  const [range, setRange] = useState<DateRange | undefined>({
    from: parseDate(currentFrom),
    to: parseDate(currentTo),
  })

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Sync range state when URL changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRange({
      from: parseDate(currentFrom),
      to: parseDate(currentTo),
    })
  }, [currentFrom, currentTo])

  // Close popovers on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (fyRef.current && !fyRef.current.contains(e.target as Node)) setFyOpen(false)
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) setRangeOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const hasFilter = Boolean(currentFrom || currentTo || currentFY)
  const currentFYLabel = FY_OPTIONS.find((f) => f.value === currentFY)?.label

  function applyFY(fy: (typeof FY_OPTIONS)[0]) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("fy", fy.value)
    params.set("from", fy.start)
    params.set("to", fy.end)
    setFyOpen(false)
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function applyRange() {
    if (!range?.from && !range?.to) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete("fy")
    if (range?.from) params.set("from", format(range.from, "yyyy-MM-dd"))
    if (range?.to) params.set("to", format(range.to, "yyyy-MM-dd"))
    setRangeOpen(false)
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function clearFilter() {
    setRange(undefined)
    startTransition(() => router.push(pathname))
  }

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasFilter && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-xs font-medium text-primary animate-in fade-in duration-200">
          <CalendarDays className="h-3 w-3" />
          {currentFYLabel
            ? currentFYLabel
            : `${currentFrom ? format(parseISO(currentFrom), "dd MMM yy") : "…"} → ${currentTo ? format(parseISO(currentTo), "dd MMM yy") : "…"}`}
          <button
            onClick={clearFilter}
            className="hover:text-red-400 transition-colors ml-0.5"
            aria-label="Clear filter"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Search Input ── */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          const search = formData.get("search") as string
          const params = new URLSearchParams(searchParams.toString())
          if (search) params.set("search", search)
          else params.delete("search")
          params.delete("page") // Reset to page 1 on new search
          startTransition(() => router.push(`${pathname}?${params.toString()}`))
        }}
        className="relative"
      >
        <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <input
          name="search"
          type="search"
          placeholder="Search quotations..."
          defaultValue={searchParams.get("search") ?? ""}
          className="h-8 w-[160px] sm:w-[200px] rounded-lg border border-white/10 bg-black/20 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
        />
      </form>

      {/* ── FY Quick-Select ── */}
      <div ref={fyRef} className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setFyOpen((p) => !p); setRangeOpen(false) }}
          className="glass border-white/10 hover:bg-white/8 gap-1.5 text-xs"
        >
          <Filter className="h-3.5 w-3.5" />
          Financial Year
          <ChevronDown className={`h-3 w-3 opacity-60 transition-transform duration-200 ${fyOpen ? "rotate-180" : ""}`} />
        </Button>

        {fyOpen && (
          <div className="absolute right-0 md:left-0 md:right-auto top-full mt-1.5 z-50 w-52 glass border border-white/12 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-2.5 pb-1">
              Select Financial Year
            </p>
            <Separator className="bg-white/8 mb-1" />
            {FY_OPTIONS.map((fy) => (
              <button
                key={fy.value}
                onClick={() => applyFY(fy)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-white/8 transition-colors flex items-center justify-between group ${
                  currentFY === fy.value
                    ? "text-primary font-semibold bg-primary/10"
                    : "text-foreground"
                }`}
              >
                <span>{fy.label}</span>
                <span className="text-muted-foreground text-[10px] group-hover:text-foreground transition-colors">
                  Apr {fy.start.slice(0, 4)} – Mar {fy.end.slice(0, 4)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Custom Date Range Picker ── */}
      <div ref={rangeRef} className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setRangeOpen((p) => !p); setFyOpen(false) }}
          className={`glass border-white/10 hover:bg-white/8 gap-1.5 text-xs ${rangeOpen ? "border-primary/40 bg-white/8" : ""}`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          {range?.from && !currentFY
            ? <span className="flex items-center gap-1">
                <span>{formatDisplay(range.from)}</span>
                {range.to && <><ArrowRight className="h-3 w-3" /><span>{formatDisplay(range.to)}</span></>}
              </span>
            : "Custom Range"}
          <ChevronDown className={`h-3 w-3 opacity-60 transition-transform duration-200 ${rangeOpen ? "rotate-180" : ""}`} />
        </Button>

        {rangeOpen && (
          <div className="absolute right-0 md:left-0 md:right-auto top-full mt-1.5 z-50 glass border border-white/12 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 min-w-fit">
            {/* Header */}
            <div className="px-4 pt-3 pb-2 border-b border-white/8">
              <p className="text-xs font-semibold text-foreground">Select Date Range</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Use month &amp; year dropdowns to navigate quickly
              </p>
            </div>

            {/* Selected range display */}
            <div className="px-4 py-2 flex items-center gap-2 bg-white/3 border-b border-white/6">
              <div className={`flex-1 text-center rounded-lg px-2 py-1.5 text-xs border ${range?.from ? "border-primary/40 bg-primary/10 text-primary font-medium" : "border-white/8 text-muted-foreground"}`}>
                {range?.from ? format(range.from, "dd MMM yyyy") : "Start Date"}
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className={`flex-1 text-center rounded-lg px-2 py-1.5 text-xs border ${range?.to ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-medium" : "border-white/8 text-muted-foreground"}`}>
                {range?.to ? format(range.to, "dd MMM yyyy") : "End Date"}
              </div>
            </div>

            {/* Calendar — DOB-style with captionLayout="dropdown" */}
            <div className="p-2">
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                captionLayout="dropdown"
                startMonth={new Date(2020, 0)}
                endMonth={new Date(new Date().getFullYear() + 1, 11)}
                numberOfMonths={isMobile ? 1 : 2}
                defaultMonth={range?.from ?? new Date()}
                className="[--cell-size:--spacing(8)]"
                classNames={{
                  dropdowns: "flex h-8 w-full items-center justify-center gap-1 text-xs font-medium",
                  dropdown_root: "relative",
                  dropdown: "absolute inset-0 opacity-0 cursor-pointer",
                  caption_label: "flex items-center gap-1 text-xs font-semibold cursor-pointer rounded-md px-1.5 py-1 hover:bg-white/8 transition-colors",
                  month_caption: "flex h-8 w-full items-center justify-center px-8 mb-1",
                  button_previous: "absolute left-0 top-0 size-8 flex items-center justify-center rounded-lg hover:bg-white/8 transition-colors",
                  button_next: "absolute right-0 top-0 size-8 flex items-center justify-center rounded-lg hover:bg-white/8 transition-colors",
                  weekday: "text-[10px] text-muted-foreground font-normal",
                  day: "relative aspect-square h-full w-full rounded-lg p-0 text-center select-none",
                  today: "rounded-lg bg-white/8 text-foreground",
                  range_start: "rounded-l-lg bg-primary/20",
                  range_middle: "rounded-none bg-primary/10",
                  range_end: "rounded-r-lg bg-primary/20",
                }}
              />
            </div>

            {/* Footer */}
            <div className="px-4 pb-3 pt-1 flex items-center justify-between border-t border-white/8 gap-2">
              <button
                onClick={() => { setRange(undefined) }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRangeOpen(false)}
                  className="glass border-white/10 hover:bg-white/8 text-xs h-7"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={applyRange}
                  disabled={isPending || (!range?.from && !range?.to)}
                  className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-xs h-7 px-4"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
