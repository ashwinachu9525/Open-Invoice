"use server"

export async function getExchangeRates(baseCurrency: string = "INR"): Promise<Record<string, number>> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })
    
    if (!res.ok) {
      throw new Error("Failed to fetch exchange rates")
    }

    const data = await res.json()
    return data.rates || {}
  } catch (error) {
    console.error("Exchange rate fetch error:", error)
    // Fallback static rates if API fails
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


