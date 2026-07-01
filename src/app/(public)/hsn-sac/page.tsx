"use client"

import { useState, useMemo, useCallback } from "react"
import { Metadata } from "next"

// ── Types ──────────────────────────────────────────────────────────────────
interface HsnEntry {
  code: string
  description: string
  gstRate: number
  type: "HSN" | "SAC"
  category: string
}

// ── Dataset ────────────────────────────────────────────────────────────────
const HSN_SAC_DATA: HsnEntry[] = [
  // Chapter 1 - Live Animals
  { code: "0101", description: "Live horses, asses, mules and hinnies", gstRate: 0, type: "HSN", category: "Live Animals" },
  { code: "0102", description: "Live bovine animals (cattle)", gstRate: 0, type: "HSN", category: "Live Animals" },
  { code: "0103", description: "Live swine (pigs)", gstRate: 0, type: "HSN", category: "Live Animals" },
  { code: "0104", description: "Live sheep and goats", gstRate: 0, type: "HSN", category: "Live Animals" },
  { code: "0105", description: "Live poultry (chickens, ducks, geese, turkeys, guinea fowls)", gstRate: 0, type: "HSN", category: "Live Animals" },
  // Chapter 2 - Meat
  { code: "0201", description: "Meat of bovine animals, fresh or chilled", gstRate: 0, type: "HSN", category: "Meat & Fish" },
  { code: "0204", description: "Meat of sheep or goats, fresh, chilled or frozen", gstRate: 0, type: "HSN", category: "Meat & Fish" },
  { code: "0207", description: "Meat and edible offal of poultry (chicken/duck/turkey)", gstRate: 5, type: "HSN", category: "Meat & Fish" },
  // Chapter 3 - Fish
  { code: "0301", description: "Live fish", gstRate: 0, type: "HSN", category: "Meat & Fish" },
  { code: "0302", description: "Fish, fresh or chilled (excluding fillets)", gstRate: 5, type: "HSN", category: "Meat & Fish" },
  { code: "0303", description: "Fish, frozen (excluding fillets)", gstRate: 5, type: "HSN", category: "Meat & Fish" },
  { code: "0306", description: "Crustaceans (lobster, crab, shrimp)", gstRate: 5, type: "HSN", category: "Meat & Fish" },
  // Dairy
  { code: "0401", description: "Milk and cream, not concentrated nor sweetened", gstRate: 0, type: "HSN", category: "Dairy & Eggs" },
  { code: "0402", description: "Milk and cream, concentrated or sweetened", gstRate: 5, type: "HSN", category: "Dairy & Eggs" },
  { code: "0403", description: "Buttermilk, curdled milk and cream, yogurt, kephir", gstRate: 5, type: "HSN", category: "Dairy & Eggs" },
  { code: "0405", description: "Butter and other fats and oils derived from milk", gstRate: 12, type: "HSN", category: "Dairy & Eggs" },
  { code: "0406", description: "Cheese and curd", gstRate: 12, type: "HSN", category: "Dairy & Eggs" },
  { code: "0407", description: "Birds' eggs, in shell, fresh or preserved", gstRate: 0, type: "HSN", category: "Dairy & Eggs" },
  // Cereals
  { code: "1001", description: "Wheat and meslin", gstRate: 0, type: "HSN", category: "Cereals & Grains" },
  { code: "1002", description: "Rye", gstRate: 0, type: "HSN", category: "Cereals & Grains" },
  { code: "1003", description: "Barley", gstRate: 0, type: "HSN", category: "Cereals & Grains" },
  { code: "1006", description: "Rice", gstRate: 0, type: "HSN", category: "Cereals & Grains" },
  { code: "1101", description: "Wheat or meslin flour", gstRate: 0, type: "HSN", category: "Cereals & Grains" },
  { code: "1102", description: "Cereal flours other than wheat or meslin", gstRate: 0, type: "HSN", category: "Cereals & Grains" },
  // Vegetables & Fruits
  { code: "0701", description: "Potatoes, fresh or chilled", gstRate: 0, type: "HSN", category: "Vegetables & Fruits" },
  { code: "0702", description: "Tomatoes, fresh or chilled", gstRate: 0, type: "HSN", category: "Vegetables & Fruits" },
  { code: "0803", description: "Bananas, including plantains, fresh or dried", gstRate: 0, type: "HSN", category: "Vegetables & Fruits" },
  { code: "0805", description: "Citrus fruit, fresh or dried", gstRate: 0, type: "HSN", category: "Vegetables & Fruits" },
  { code: "0901", description: "Coffee, whether or not roasted", gstRate: 5, type: "HSN", category: "Vegetables & Fruits" },
  { code: "0902", description: "Tea, whether or not flavoured", gstRate: 5, type: "HSN", category: "Vegetables & Fruits" },
  { code: "0904", description: "Pepper of genus Piper; dried/crushed capsicums", gstRate: 5, type: "HSN", category: "Vegetables & Fruits" },
  // Textiles
  { code: "5001", description: "Silk-worm cocoons suitable for reeling", gstRate: 5, type: "HSN", category: "Textiles" },
  { code: "5101", description: "Wool, not carded or combed", gstRate: 5, type: "HSN", category: "Textiles" },
  { code: "5201", description: "Cotton, not carded or combed", gstRate: 5, type: "HSN", category: "Textiles" },
  { code: "5208", description: "Woven fabrics of cotton (< 85% cotton by weight)", gstRate: 5, type: "HSN", category: "Textiles" },
  { code: "6101", description: "Men's overcoats, carcoats, capes, cloaks", gstRate: 5, type: "HSN", category: "Textiles" },
  { code: "6201", description: "Men's or boys' overcoats, raincoats, windcheaters", gstRate: 12, type: "HSN", category: "Textiles" },
  // Electronics
  { code: "8471", description: "Automatic data processing machines (computers)", gstRate: 18, type: "HSN", category: "Electronics" },
  { code: "8473", description: "Parts and accessories for computers", gstRate: 18, type: "HSN", category: "Electronics" },
  { code: "8517", description: "Telephone sets including smartphones", gstRate: 12, type: "HSN", category: "Electronics" },
  { code: "8518", description: "Microphones and stands; loudspeakers; amplifiers", gstRate: 18, type: "HSN", category: "Electronics" },
  { code: "8528", description: "Monitors and projectors; TV receivers", gstRate: 18, type: "HSN", category: "Electronics" },
  { code: "8543", description: "Electrical machines and apparatus (NEC)", gstRate: 18, type: "HSN", category: "Electronics" },
  // Vehicles
  { code: "8703", description: "Motor cars and other motor vehicles principally for transport of persons", gstRate: 28, type: "HSN", category: "Vehicles" },
  { code: "8711", description: "Motorcycles (including mopeds) and cycles with auxiliary motors", gstRate: 28, type: "HSN", category: "Vehicles" },
  { code: "8714", description: "Parts and accessories for vehicles", gstRate: 28, type: "HSN", category: "Vehicles" },
  // Gold & Jewellery
  { code: "7108", description: "Gold (including gold plated with platinum), unwrought", gstRate: 3, type: "HSN", category: "Precious Metals" },
  { code: "7113", description: "Articles of jewellery and parts thereof of precious metals", gstRate: 3, type: "HSN", category: "Precious Metals" },
  { code: "7114", description: "Articles of goldsmiths' or silversmiths' wares", gstRate: 3, type: "HSN", category: "Precious Metals" },
  // Chemicals & Pharma
  { code: "2501", description: "Salt; pure sodium chloride; sea water", gstRate: 0, type: "HSN", category: "Chemicals" },
  { code: "2710", description: "Petroleum oils and oils obtained from bituminous minerals", gstRate: 18, type: "HSN", category: "Chemicals" },
  { code: "3004", description: "Medicaments — mixtures/preparations for therapeutic use", gstRate: 5, type: "HSN", category: "Chemicals" },
  { code: "3301", description: "Essential oils (terpeneless or not); resinoids", gstRate: 18, type: "HSN", category: "Chemicals" },
  { code: "3303", description: "Perfumes and toilet waters", gstRate: 18, type: "HSN", category: "Chemicals" },
  { code: "3401", description: "Soap; organic surface-active products in bar form", gstRate: 18, type: "HSN", category: "Chemicals" },
  // SAC - Services
  { code: "9954", description: "Construction services", gstRate: 18, type: "SAC", category: "Construction Services" },
  { code: "9961", description: "Services in wholesale trade", gstRate: 18, type: "SAC", category: "Trade Services" },
  { code: "9962", description: "Services in retail trade", gstRate: 18, type: "SAC", category: "Trade Services" },
  { code: "9963", description: "Accommodation, food and beverage service activities", gstRate: 18, type: "SAC", category: "Hospitality Services" },
  { code: "9964", description: "Passenger transport services", gstRate: 5, type: "SAC", category: "Transport Services" },
  { code: "9965", description: "Goods transport services", gstRate: 5, type: "SAC", category: "Transport Services" },
  { code: "9966", description: "Rental services of transport vehicles with operators", gstRate: 12, type: "SAC", category: "Transport Services" },
  { code: "9967", description: "Supporting services in transport", gstRate: 18, type: "SAC", category: "Transport Services" },
  { code: "9971", description: "Financial and related services", gstRate: 18, type: "SAC", category: "Financial Services" },
  { code: "9972", description: "Real estate services", gstRate: 12, type: "SAC", category: "Real Estate Services" },
  { code: "9973", description: "Leasing or rental services without operator", gstRate: 18, type: "SAC", category: "Leasing Services" },
  { code: "9983", description: "Other professional, technical and business services", gstRate: 18, type: "SAC", category: "Professional Services" },
  { code: "9984", description: "Telecommunications, broadcasting and information supply services", gstRate: 18, type: "SAC", category: "IT & Telecom Services" },
  { code: "9985", description: "Support services (business process outsourcing)", gstRate: 18, type: "SAC", category: "IT & Telecom Services" },
  { code: "9986", description: "Support services to agriculture, hunting, forestry", gstRate: 0, type: "SAC", category: "Agriculture Services" },
  { code: "9987", description: "Maintenance, repair and installation services", gstRate: 18, type: "SAC", category: "Professional Services" },
  { code: "9988", description: "Manufacturing services on physical inputs owned by others", gstRate: 5, type: "SAC", category: "Manufacturing Services" },
  { code: "9991", description: "Public administration and other government services", gstRate: 0, type: "SAC", category: "Government Services" },
  { code: "9992", description: "Education services", gstRate: 0, type: "SAC", category: "Education Services" },
  { code: "9993", description: "Human health and social care services", gstRate: 0, type: "SAC", category: "Health Services" },
  { code: "9994", description: "Sewage and waste collection, treatment and disposal services", gstRate: 18, type: "SAC", category: "Utility Services" },
  { code: "9995", description: "Services of membership organisations", gstRate: 18, type: "SAC", category: "Other Services" },
  { code: "9996", description: "Recreational, cultural and sporting services", gstRate: 18, type: "SAC", category: "Other Services" },
  { code: "9997", description: "Other services", gstRate: 18, type: "SAC", category: "Other Services" },
  { code: "9998", description: "Domestic services", gstRate: 0, type: "SAC", category: "Other Services" },
]

const GST_RATE_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  0:  { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400", label: "Nil Rated" },
  3:  { bg: "bg-blue-500/15",    text: "text-blue-600 dark:text-blue-400",       label: "3%" },
  5:  { bg: "bg-sky-500/15",     text: "text-sky-600 dark:text-sky-400",         label: "5%" },
  12: { bg: "bg-amber-500/15",   text: "text-amber-600 dark:text-amber-400",     label: "12%" },
  18: { bg: "bg-orange-500/15",  text: "text-orange-600 dark:text-orange-400",   label: "18%" },
  28: { bg: "bg-red-500/15",     text: "text-red-600 dark:text-red-400",         label: "28%" },
}

const ALL_CATEGORIES = Array.from(new Set(HSN_SAC_DATA.map(d => d.category))).sort()

export default function HsnSacPage() {
  const [query, setQuery]         = useState("")
  const [typeFilter, setTypeFilter] = useState<"ALL" | "HSN" | "SAC">("ALL")
  const [rateFilter, setRateFilter] = useState<number | "ALL">("ALL")
  const [catFilter, setCatFilter] = useState<string>("ALL")
  const [expanded, setExpanded]   = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return HSN_SAC_DATA.filter(item => {
      if (typeFilter !== "ALL" && item.type !== typeFilter) return false
      if (rateFilter !== "ALL" && item.gstRate !== rateFilter) return false
      if (catFilter !== "ALL" && item.category !== catFilter) return false
      if (q && !item.code.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) return false
      return true
    })
  }, [query, typeFilter, rateFilter, catFilter])

  const toggle = useCallback((code: string) => {
    setExpanded(prev => (prev === code ? null : code))
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.65 0.22 270 / 18%) 0%, transparent 70%)",
          }}
        />
        <div className="container mx-auto px-4 pt-16 pb-12 max-w-5xl text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <span>🔍</span>
            <span>Free HSN / SAC Code Directory</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5 gradient-text">
            HSN &amp; SAC Code Lookup
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Search the complete list of Harmonised System of Nomenclature (HSN) codes for goods and
            Service Accounting Codes (SAC) for services under Indian GST — with applicable GST rates.
          </p>

          {/* Search Box */}
          <div className="relative max-w-xl mx-auto">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input
              id="hsn-sac-search"
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by code or description (e.g. 8517 or smartphone)"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-border bg-card/80 backdrop-blur text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="sticky top-[65px] z-40 bg-background/90 backdrop-blur border-b border-border/60">
        <div className="container mx-auto px-4 max-w-5xl py-3 flex flex-wrap gap-3 items-center">
          {/* Type */}
          <div className="flex rounded-xl overflow-hidden border border-border text-sm font-medium">
            {(["ALL", "HSN", "SAC"] as const).map(t => (
              <button
                key={t}
                id={`filter-type-${t.toLowerCase()}`}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-1.5 transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* GST Rate */}
          <select
            id="filter-gst-rate"
            value={rateFilter}
            onChange={e => setRateFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl border border-border bg-card/80 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">All GST Rates</option>
            {[0, 3, 5, 12, 18, 28].map(r => (
              <option key={r} value={r}>{r === 0 ? "Nil (0%)" : `${r}%`}</option>
            ))}
          </select>

          {/* Category */}
          <select
            id="filter-category"
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border bg-card/80 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 max-w-[200px]"
          >
            <option value="ALL">All Categories</option>
            {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <span className="ml-auto text-xs text-muted-foreground font-medium">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 max-w-5xl py-8 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <div className="text-5xl mb-4">🔎</div>
            <p className="text-lg font-medium">No codes found</p>
            <p className="text-sm mt-1">Try a different search term or adjust the filters</p>
          </div>
        ) : (
          filtered.map(item => {
            const rateStyle = GST_RATE_COLORS[item.gstRate] ?? GST_RATE_COLORS[18]
            const isOpen = expanded === item.code
            return (
              <div
                key={item.code}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${isOpen ? "border-primary/40 shadow-md" : "border-border/60 hover:border-border"} bg-card/60 backdrop-blur`}
              >
                <button
                  id={`hsn-item-${item.code}`}
                  className="w-full text-left px-5 py-4 flex items-center gap-4"
                  onClick={() => toggle(item.code)}
                  aria-expanded={isOpen}
                >
                  {/* Code badge */}
                  <span className="shrink-0 font-mono font-bold text-sm px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 tracking-wider">
                    {item.code}
                  </span>

                  {/* Description */}
                  <span className="flex-1 text-sm font-medium text-foreground/90 text-left leading-snug">
                    {item.description}
                  </span>

                  {/* Type pill */}
                  <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${item.type === "HSN" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400" : "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"}`}>
                    {item.type}
                  </span>

                  {/* GST Rate */}
                  <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${rateStyle.bg} ${rateStyle.text}`}>
                    {rateStyle.label}
                  </span>

                  {/* Chevron */}
                  <svg xmlns="http://www.w3.org/2000/svg" className={`shrink-0 w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6"/>
                  </svg>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-border/40 text-sm space-y-2 animate-in slide-in-from-top-1 duration-150">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-0.5">Code</p>
                        <p className="font-mono font-bold text-foreground">{item.code}</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-0.5">Type</p>
                        <p className="font-semibold text-foreground">{item.type === "HSN" ? "HSN (Goods)" : "SAC (Services)"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-0.5">Category</p>
                        <p className="font-semibold text-foreground">{item.category}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${rateStyle.bg}`}>
                        <p className={`text-xs mb-0.5 ${rateStyle.text}`}>GST Rate</p>
                        <p className={`font-bold text-lg ${rateStyle.text}`}>{item.gstRate}%</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-xs mt-3 leading-relaxed">
                      {item.type === "HSN"
                        ? `HSN code ${item.code} is used on GST invoices for goods under the category "${item.category}". The applicable GST rate is ${item.gstRate}%.`
                        : `SAC code ${item.code} is used on GST invoices for services under "${item.category}". The applicable GST rate is ${item.gstRate}%.`}
                    </p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ── SEO Content ──────────────────────────────────────────────── */}
      <div className="border-t border-border/40 mt-8">
        <div className="container mx-auto px-4 max-w-3xl py-16 space-y-10">
          <section>
            <h2 className="text-2xl font-bold mb-4">What is an HSN Code?</h2>
            <p className="text-muted-foreground leading-relaxed">
              The <strong>Harmonised System of Nomenclature (HSN)</strong> is a globally standardised
              6-digit code used to classify goods for taxation purposes. In India, the GST system uses
              HSN codes with 4, 6, or 8 digits. Businesses with a turnover above ₹5 crore must use
              8-digit HSN codes on their GST invoices.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4">What is a SAC Code?</h2>
            <p className="text-muted-foreground leading-relaxed">
              The <strong>Services Accounting Code (SAC)</strong> is a classification system issued by
              the Central Board of Indirect Taxes and Customs (CBIC) to identify services under GST.
              Every type of service—from construction to professional consulting—has a unique 6-digit
              SAC code that must be mentioned on service invoices.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4">HSN vs SAC: Key Differences</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Aspect</th>
                    <th className="text-left py-3 px-4 font-semibold text-violet-500">HSN</th>
                    <th className="text-left py-3 px-4 font-semibold text-cyan-500">SAC</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["Applies to", "Goods", "Services"],
                    ["Digit length", "4, 6, or 8 digits", "6 digits"],
                    ["Origin", "World Customs Organisation", "CBIC (India)"],
                    ["Example", "8517 (Smartphones)", "9983 (IT Services)"],
                  ].map(([a, h, s]) => (
                    <tr key={a} className="border-b border-border/50">
                      <td className="py-3 px-4 font-medium text-foreground">{a}</td>
                      <td className="py-3 px-4">{h}</td>
                      <td className="py-3 px-4">{s}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Add HSN/SAC codes to your invoices automatically with Open-Invoice
            </p>
            <a
              href="/register"
              className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Create Free Account →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
