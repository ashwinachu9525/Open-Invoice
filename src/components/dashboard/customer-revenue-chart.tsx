"use client"

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from "recharts"
import { formatINR } from "@/services/tax-engine"

interface CustomerRevenueChartProps {
  data: { name: string; revenue: number }[]
}

const COLORS = [
  "rgba(139, 92, 246, 0.8)",  // violet
  "rgba(59, 130, 246, 0.8)",  // blue
  "rgba(16, 185, 129, 0.8)",  // emerald
  "rgba(245, 158, 11, 0.8)",  // amber
  "rgba(236, 72, 153, 0.8)",  // pink
]

// Custom tooltip
function CustomTooltip({ active, payload }: {
  active?: boolean
  payload?: any[]
}) {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl px-4 py-3 shadow-2xl">
        <p className="text-xs text-muted-foreground mb-1">{payload[0].name}</p>
        <p className="text-sm font-bold text-white">{formatINR(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export function CustomerRevenueChart({ data }: CustomerRevenueChartProps) {
  // If no data, show empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No revenue data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="revenue"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          iconType="circle"
          formatter={(value) => <span className="text-xs text-muted-foreground ml-1">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
