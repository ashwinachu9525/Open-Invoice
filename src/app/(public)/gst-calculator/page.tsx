"use client"

import { useState, useMemo } from "react"

// ── Types ──────────────────────────────────────────────────────────────────
type CalcMode = "exclusive" | "inclusive"
type TaxType  = "IGST" | "CGST_SGST"

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

// ── Component ──────────────────────────────────────────────────────────────
export default function GstCalculatorPage() {
  const [amount, setAmount]     = useState("")
  const [rate, setRate]         = useState<number>(18)
  const [mode, setMode]         = useState<CalcMode>("exclusive")
  const [taxType, setTaxType]   = useState<TaxType>("IGST")
  const [customRate, setCustomRate] = useState("")
  const [isCustom, setIsCustom] = useState(false)

  const effectiveRate = isCustom ? (parseFloat(customRate) || 0) : rate
  const rawAmount     = parseFloat(amount) || 0

  const result = useMemo(() => {
    if (rawAmount <= 0 || effectiveRate < 0) return null
    const r = effectiveRate / 100

    let baseAmount: number
    let gstAmount: number
    let totalAmount: number

    if (mode === "exclusive") {
      // GST is added on top of the base
      baseAmount  = rawAmount
      gstAmount   = round2(rawAmount * r)
      totalAmount = round2(rawAmount + gstAmount)
    } else {
      // GST is included in the amount
      totalAmount = rawAmount
      baseAmount  = round2(rawAmount / (1 + r))
      gstAmount   = round2(totalAmount - baseAmount)
    }

    const cgst = round2(gstAmount / 2)
    const sgst = round2(gstAmount / 2)

    return { baseAmount, gstAmount, totalAmount, cgst, sgst }
  }, [rawAmount, effectiveRate, mode])

  const RATE_OPTS = [0, 3, 5, 12, 18, 28]

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.65 0.22 160 / 16%) 0%, transparent 70%)",
          }}
        />
        <div className="container mx-auto px-4 pt-16 pb-12 max-w-3xl text-center relative">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <span>🧮</span>
            <span>Free GST Calculator</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5 gradient-text">
            GST Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Instantly calculate GST-inclusive or GST-exclusive amounts. Break down CGST, SGST, and
            IGST components — all for free, no sign-up needed.
          </p>
        </div>
      </div>

      {/* ── Main Card ─────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 max-w-3xl pb-16">
        <div className="bg-card/70 backdrop-blur border border-border/60 rounded-3xl shadow-xl overflow-hidden">
          {/* Mode Toggle */}
          <div className="flex border-b border-border/60">
            {([
              { key: "exclusive", label: "Add GST", sub: "GST added to amount" },
              { key: "inclusive", label: "Remove GST", sub: "Extract GST from amount" },
            ] as { key: CalcMode; label: string; sub: string }[]).map(opt => (
              <button
                key={opt.key}
                id={`mode-${opt.key}`}
                onClick={() => setMode(opt.key)}
                className={`flex-1 px-6 py-4 text-left transition-colors ${
                  mode === opt.key
                    ? "bg-primary/10 border-b-2 border-primary"
                    : "hover:bg-muted/40"
                }`}
              >
                <p className={`font-semibold text-sm ${mode === opt.key ? "text-primary" : "text-foreground/70"}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
              </button>
            ))}
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Amount Input */}
            <div>
              <label htmlFor="calc-amount" className="text-sm font-semibold text-foreground/80 block mb-2">
                {mode === "exclusive" ? "Base Amount (₹)" : "Total Amount incl. GST (₹)"}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg pointer-events-none">₹</span>
                <input
                  id="calc-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full pl-10 pr-4 py-4 text-lg font-semibold rounded-2xl border border-border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>
            </div>

            {/* GST Rate Selection */}
            <div>
              <p className="text-sm font-semibold text-foreground/80 mb-3">GST Rate</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {RATE_OPTS.map(r => (
                  <button
                    key={r}
                    id={`rate-${r}`}
                    onClick={() => { setRate(r); setIsCustom(false) }}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      !isCustom && rate === r
                        ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {r === 0 ? "Nil 0%" : `${r}%`}
                  </button>
                ))}
                <button
                  id="rate-custom"
                  onClick={() => setIsCustom(true)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    isCustom
                      ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                      : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  Custom %
                </button>
              </div>
              {isCustom && (
                <div className="animate-in slide-in-from-top-1 duration-150">
                  <input
                    id="custom-rate-input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={customRate}
                    onChange={e => setCustomRate(e.target.value)}
                    placeholder="Enter custom GST rate %"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}
            </div>

            {/* Tax type (IGST or CGST+SGST) */}
            <div>
              <p className="text-sm font-semibold text-foreground/80 mb-3">Tax Type</p>
              <div className="flex rounded-xl overflow-hidden border border-border text-sm font-medium">
                {([
                  { key: "IGST",      label: "IGST (Interstate / Import)" },
                  { key: "CGST_SGST", label: "CGST + SGST (Intrastate)" },
                ] as { key: TaxType; label: string }[]).map(opt => (
                  <button
                    key={opt.key}
                    id={`taxtype-${opt.key.toLowerCase()}`}
                    onClick={() => setTaxType(opt.key)}
                    className={`flex-1 px-4 py-2.5 transition-colors ${
                      taxType === opt.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Result Panel ─────────────────────────────────────────── */}
            {result ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-4">
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* Summary row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: mode === "exclusive" ? "Base Amount" : "Pre-GST Amount", value: result.baseAmount, accent: false },
                    { label: "Total GST",   value: result.gstAmount,   accent: false },
                    { label: "Total Payable", value: result.totalAmount, accent: true },
                  ].map(row => (
                    <div
                      key={row.label}
                      className={`rounded-2xl p-4 text-center ${
                        row.accent
                          ? "bg-primary/15 border border-primary/30"
                          : "bg-muted/50 border border-border/60"
                      }`}
                    >
                      <p className="text-xs text-muted-foreground font-medium mb-1">{row.label}</p>
                      <p className={`text-lg font-bold ${row.accent ? "text-primary" : "text-foreground"}`}>
                        ₹{fmt(row.value)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Breakdown */}
                <div className="bg-muted/30 rounded-2xl p-4 space-y-2 text-sm">
                  <p className="font-semibold text-foreground/70 text-xs uppercase tracking-wider mb-3">
                    Tax Breakdown
                  </p>
                  {taxType === "IGST" ? (
                    <div className="flex justify-between items-center py-2 border-b border-border/40">
                      <span className="font-medium text-foreground/80">
                        IGST @ {effectiveRate}%
                      </span>
                      <span className="font-bold text-foreground">₹{fmt(result.gstAmount)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-border/40">
                        <span className="font-medium text-foreground/80">
                          CGST @ {effectiveRate / 2}%
                        </span>
                        <span className="font-bold text-foreground">₹{fmt(result.cgst)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border/40">
                        <span className="font-medium text-foreground/80">
                          SGST @ {effectiveRate / 2}%
                        </span>
                        <span className="font-bold text-foreground">₹{fmt(result.sgst)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-border/40">
                    <span className="text-muted-foreground">{mode === "exclusive" ? "Base Amount" : "Pre-GST Amount"}</span>
                    <span className="text-foreground">₹{fmt(result.baseAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-foreground">Total</span>
                    <span className="font-bold text-primary text-lg">₹{fmt(result.totalAmount)}</span>
                  </div>
                </div>

                {/* Formula note */}
                <p className="text-xs text-muted-foreground text-center">
                  {mode === "exclusive"
                    ? `Formula: ₹${fmt(result.baseAmount)} × (1 + ${effectiveRate}%) = ₹${fmt(result.totalAmount)}`
                    : `Formula: ₹${fmt(result.totalAmount)} ÷ (1 + ${effectiveRate}%) = ₹${fmt(result.baseAmount)} (base)`}
                </p>
              </div>
            ) : (
              rawAmount > 0 ? null : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Enter an amount above to see the GST calculation
                </div>
              )
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Automatically apply GST on invoices — with CGST/SGST/IGST line items — using Open-Invoice
          </p>
          <a
            href="/register"
            className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Create Free Account →
          </a>
        </div>

        {/* ── SEO Content ────────────────────────────────────────────── */}
        <div className="mt-16 space-y-10">
          <section>
            <h2 className="text-2xl font-bold mb-4">How to Use the GST Calculator</h2>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground text-sm leading-relaxed">
              <li><strong>Choose mode:</strong> Select "Add GST" if you want to calculate the final price after adding GST, or "Remove GST" to extract the base price from a GST-inclusive total.</li>
              <li><strong>Enter the amount:</strong> Type in the base amount or GST-inclusive total.</li>
              <li><strong>Select the GST rate:</strong> Choose from the standard slab rates (0%, 3%, 5%, 12%, 18%, 28%) or enter a custom rate.</li>
              <li><strong>Select tax type:</strong> Choose IGST for interstate transactions or imports, and CGST + SGST for intrastate supply.</li>
              <li><strong>Read the result:</strong> The calculator instantly shows the base amount, GST component, and total payable.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">GST Rate Slabs in India</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Rate</th>
                    <th className="text-left py-3 px-4 font-semibold">Category of Goods / Services</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["0% (Nil)", "Essential food items (milk, eggs, vegetables, grains), healthcare, education"],
                    ["3%",       "Gold, silver, diamonds, precious stones and jewellery"],
                    ["5%",       "Processed food, medicines, coal, domestic LPG, airline economy class"],
                    ["12%",      "Butter, ghee, cheese, mobile phones, frozen meat, business class air travel"],
                    ["18%",      "Electronics, computers, capital goods, most services (IT, professional, banking)"],
                    ["28%",      "Luxury goods, automobiles, tobacco, cement, aerated drinks, casinos"],
                  ].map(([rate, cat]) => (
                    <tr key={rate} className="border-b border-border/50">
                      <td className="py-3 px-4 font-bold text-foreground">{rate}</td>
                      <td className="py-3 px-4">{cat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">IGST vs CGST + SGST</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-3">
              Under India's GST regime, the tax is split depending on whether the transaction is interstate or intrastate:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm leading-relaxed">
              <li><strong className="text-foreground">IGST (Integrated GST)</strong> — Levied by the central government on interstate transactions (supplier and buyer in different states) and imports. The full GST % is IGST.</li>
              <li><strong className="text-foreground">CGST + SGST</strong> — When both parties are in the same state, the tax is split equally: half goes to the Central Government (CGST) and half to the State Government (SGST).</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
