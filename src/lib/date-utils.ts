export function getCompanyTimezone(baseCurrency: string | null | undefined): string {
  if (!baseCurrency) return "Asia/Kolkata"
  const currency = baseCurrency.toUpperCase()
  switch (currency) {
    case "INR": return "Asia/Kolkata"
    case "USD": return "America/New_York"
    case "GBP": return "Europe/London"
    case "EUR": return "Europe/Paris"
    case "AED": return "Asia/Dubai"
    case "SGD": return "Asia/Singapore"
    default: return "Asia/Kolkata"
  }
}

export async function getDbNow(db: any, timezone: string): Promise<Date> {
  try {
    const result = (await db.$queryRawUnsafe(
      `SELECT (NOW() AT TIME ZONE 'UTC') AT TIME ZONE '${timezone}' as now`
    )) as any[]
    if (result && result[0] && result[0].now) {
      return new Date(result[0].now)
    }
  } catch (error) {
    console.error("Failed to query DB time:", error)
  }
  return new Date()
}

export async function getCompanyNow(db: any, baseCurrency: string | null | undefined): Promise<Date> {
  const tz = getCompanyTimezone(baseCurrency)
  return getDbNow(db, tz)
}
