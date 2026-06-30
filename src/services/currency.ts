"use server"

import { prisma } from "@/lib/prisma"

export async function getExchangeRates(baseCurrency: string = "INR"): Promise<Record<string, number>> {
  try {
    const dbRates = await prisma.exchangeRate.findMany({
      where: { to: baseCurrency }
    })

    if (dbRates.length > 0) {
      const ratesMap: Record<string, number> = { [baseCurrency]: 1.0 }
      dbRates.forEach(r => {
        ratesMap[r.from] = parseFloat((1 / r.rate).toFixed(6))
      })
      return ratesMap
    }

    const res = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`, {
      next: { revalidate: 3600 },
    })
    
    if (!res.ok) {
      throw new Error("Failed to fetch exchange rates")
    }

    const data = await res.json()
    const apiRates = data.rates || {}

    const targetCurrencies = ["USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD"]
    for (const cur of targetCurrencies) {
      const rateInInr = apiRates[cur] ? 1 / apiRates[cur] : null
      if (rateInInr) {
        prisma.exchangeRate.upsert({
          where: { from_to: { from: cur, to: baseCurrency } },
          update: { rate: rateInInr },
          create: { from: cur, to: baseCurrency, rate: rateInInr }
        }).catch(e => console.error("Async exchange rate upsert failed:", e))
      }
    }

    return apiRates
  } catch (error) {
    console.error("Exchange rate fetch error:", error)
    return {
      USD: 0.012,
      EUR: 0.011,
      GBP: 0.009,
      INR: 1,
      AED: 0.044,
      SGD: 0.016,
      AUD: 0.018,
      CAD: 0.016,
    }
  }
}


