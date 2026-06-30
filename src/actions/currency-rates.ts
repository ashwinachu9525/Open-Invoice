"use server"

import { prisma } from "@/lib/prisma"

const FALLBACK_RATES: Record<string, number> = {
  USD: 83.5,
  EUR: 89.5,
  GBP: 106.0,
  AED: 22.7,
  SGD: 61.5,
  AUD: 55.5,
  CAD: 61.0,
  INR: 1.0
}

export async function getExchangeRate(fromCurrency: string) {
  try {
    if (fromCurrency === "INR") return 1.0

    const record = await prisma.exchangeRate.findUnique({
      where: { from_to: { from: fromCurrency, to: "INR" } }
    })

    if (record) return record.rate

    // Try to fetch dynamically
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${fromCurrency}`, {
        next: { revalidate: 3600 } // Cache API call for 1 hour
      })
      if (response.ok) {
        const data = await response.json()
        const rate = data.rates?.INR
        if (rate) {
          // Cache in DB asynchronously
          prisma.exchangeRate.upsert({
            where: { from_to: { from: fromCurrency, to: "INR" } },
            update: { rate },
            create: { from: fromCurrency, to: "INR", rate }
          }).catch(e => console.error("Async upsert exchange rate failed:", e))
          
          return rate
        }
      }
    } catch (apiErr) {
      console.warn("Dynamic API exchange rate fetch failed:", apiErr)
    }

    return FALLBACK_RATES[fromCurrency] || 1.0
  } catch (error) {
    console.error("Failed to get exchange rate:", error)
    return FALLBACK_RATES[fromCurrency] || 1.0
  }
}
