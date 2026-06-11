"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { formatCurrency } from "@/services/tax-engine"

interface ReportsChartsProps {
  revenueData: { month: string; revenue: number }[]
  taxData: { name: string; value: number }[]
  currencyData: { name: string; value: number }[]
}

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"]

export function ReportsCharts({ revenueData, taxData, currencyData }: ReportsChartsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="glass border-white/10 md:col-span-2">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Monthly revenue across all currencies (Converted to Base Currency)</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis 
                stroke="rgba(255,255,255,0.5)" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `₹${value / 1000}k`}
              />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                formatter={(value: number) => formatCurrency(value, "INR")}
              />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle>Tax Breakdown</CardTitle>
          <CardDescription>Distribution of collected taxes</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {taxData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taxData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {taxData.filter(d => d.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  formatter={(value: number) => formatCurrency(value, "INR")}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              No tax data available
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle>Currency Usage</CardTitle>
          <CardDescription>Invoices by currency</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {currencyData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currencyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={80}
                  dataKey="value"
                >
                  {currencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              No currency data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
