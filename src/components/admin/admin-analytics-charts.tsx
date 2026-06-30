"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AdminAnalyticsChartsProps {
  data: {
    month: string
    users: number
    companies: number
    revenue: number
  }[]
}

export function AdminAnalyticsCharts({ data }: AdminAnalyticsChartsProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* User & Company Growth Chart */}
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-100">
              Registration Growth
            </CardTitle>
            <CardDescription className="text-slate-400">
              New user signups and company creations over the last 6 months.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(15,23,42,0.9)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  labelStyle={{ color: "rgba(255,255,255,0.6)", fontWeight: "bold" }}
                />
                <Legend formatter={(value: any) => value === "users" ? "Users Registered" : "Companies Created"} />
                <Bar dataKey="users" fill="#8b5cf6" name="users" radius={[4, 4, 0, 0]} />
                <Bar dataKey="companies" fill="#10b981" name="companies" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Global Invoice Billing pipeline */}
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-100">
              Invoice Pipeline Value
            </CardTitle>
            <CardDescription className="text-slate-400">
              Total financial volume of generated invoices over the last 6 months.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                <YAxis 
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} 
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} 
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val || 0).toLocaleString("en-IN")}`, "Total Volume"]}
                  contentStyle={{ backgroundColor: "rgba(15,23,42,0.9)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  labelStyle={{ color: "rgba(255,255,255,0.6)", fontWeight: "bold" }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
