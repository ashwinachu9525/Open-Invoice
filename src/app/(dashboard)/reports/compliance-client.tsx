"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Download, FileJson, FileCode2, Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"

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

export function ComplianceClient({ customers }: { customers: { id: string, name: string }[] }) {
  const [date, setDate] = useState<DateRange | undefined>()
  const [customerId, setCustomerId] = useState<string>("")
  const [fy, setFy] = useState<string>("")

  const handleFyChange = (val: string) => {
    setFy(val)
    if (val && val !== "custom") {
      const selectedFY = FY_OPTIONS.find(f => f.value === val)
      if (selectedFY) {
        setDate({
          from: new Date(selectedFY.start),
          to: new Date(selectedFY.end)
        })
      }
    } else {
      setDate(undefined)
    }
  }

  const getQueryString = () => {
    const params = new URLSearchParams()
    if (date?.from) params.set("from", format(date.from, "yyyy-MM-dd"))
    if (date?.to) params.set("to", format(date.to, "yyyy-MM-dd"))
    if (customerId && customerId !== "all") params.set("customerId", customerId)
    return params.toString()
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      <Card className="glass glass-card border-white/10 overflow-visible">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Financial Year</Label>
              <Select value={fy} onValueChange={handleFyChange}>
                <SelectTrigger className="bg-white/5 border-white/10 w-full">
                  <SelectValue placeholder="Select FY" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Range</SelectItem>
                  {FY_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white/5 border-white/10",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd, y")} -{" "}
                          {format(date.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100]" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={(r) => { setDate(r); setFy("custom"); }}
                    numberOfMonths={2}
                    captionLayout="dropdown"
                    fromYear={2015}
                    toYear={new Date().getFullYear() + 1}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Filter by Client</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="bg-white/5 border-white/10 w-full">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-green-500" />
              GSTR-1 JSON Export
            </CardTitle>
            <CardDescription>
              Export your B2B and B2C sales for the selected period into the JSON format required by the GST offline tool.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
              onClick={() => {
                window.open(`/api/export/gstr1?${getQueryString()}`, "_blank")
              }}
            >
              <Download className="h-4 w-4" />
              Download GSTR-1 JSON
            </Button>
          </CardContent>
        </Card>

        <Card className="glass glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode2 className="h-5 w-5 text-orange-500" />
              Tally XML Export
            </CardTitle>
            <CardDescription>
              Export your sales invoices into Tally-compatible XML format for easy import as Sales Vouchers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2"
              onClick={() => {
                window.open(`/api/export/tally?${getQueryString()}`, "_blank")
              }}
            >
              <Download className="h-4 w-4" />
              Download Tally XML
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
