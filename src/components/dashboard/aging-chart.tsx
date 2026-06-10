"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts"
import { formatINR } from "@/services/tax-engine"

interface AgingChartProps {
  data: Record<string, number>
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl px-4 py-3 shadow-2xl">
        <p className="text-xs text-muted-foreground mb-1">{label} Days Overdue</p>
        <p className="text-sm font-bold text-red-400">{formatINR(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

const COLORS = {
  "Current": "rgba(52, 211, 153, 0.7)",   // emerald
  "0-30": "rgba(250, 204, 21, 0.7)",      // yellow
  "31-60": "rgba(251, 146, 60, 0.7)",     // orange
  "61-90": "rgba(248, 113, 113, 0.7)",    // red
  "90+": "rgba(220, 38, 38, 0.9)",        // dark red
}

export function AgingChart({ data }: AgingChartProps) {
  const chartData = [
    { name: "Current", amount: data["Current"] || 0 },
    { name: "0-30", amount: data["0-30"] || 0 },
    { name: "31-60", amount: data["31-60"] || 0 },
    { name: "61-90", amount: data["61-90"] || 0 },
    { name: "90+", amount: data["90+"] || 0 },
  ]

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="4 4"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.name as keyof typeof COLORS]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
