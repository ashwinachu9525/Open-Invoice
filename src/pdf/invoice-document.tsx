import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
} from "@react-pdf/renderer"
import { ToWords } from "to-words"

const toWords = new ToWords({
  localeCode: "en-IN",
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
    doNotAddOnly: false,
  },
})

const formatPdfINR = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 9, fontFamily: "Helvetica", color: "#27272A" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1e40af" },
  section: { marginBottom: 12 },
  label: { fontSize: 8, color: "#6b7280", marginBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  tableHeader: {
    flexDirection: "row",
    padding: 8,
    fontWeight: "bold",
    marginTop: 10,
    borderRadius: 4,
  },
  tableRow: { flexDirection: "row", padding: 8, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  col1: { flex: 1 },
  col2: { width: 60, textAlign: "right" },
  col3: { width: 40, textAlign: "right" },
  col4: { width: 70, textAlign: "right" },
  col5: { width: 60, textAlign: "right" },
  col6: { width: 40, textAlign: "right" },
  col7: { width: 80, textAlign: "right" },
  totals: { marginTop: 16, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", width: 200, justifyContent: "space-between", paddingVertical: 2 },
  grandTotal: { fontSize: 14, fontWeight: "bold", color: "#1e40af" },
  footer: { position: "absolute", bottom: 40, left: 48, right: 48 },
  
  // Premium Modern Styles
  modAccentBar: { position: "absolute", top: 0, left: 0, right: 0, height: 6 },
  modHeaderBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, marginTop: 12 },
  modTitle: { fontSize: 32, fontWeight: "bold", letterSpacing: -0.5 },
  modInvoiceMeta: { fontSize: 10, color: "#71717A", marginTop: 4, textAlign: "right" },
  modInfoGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32, padding: 20, backgroundColor: "#FAFAFA", borderRadius: 8, border: "1pt solid #E4E4E7" },
  modSectionLabel: { fontSize: 7, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, fontWeight: "bold" },
  modTextBase: { fontSize: 11, fontWeight: "bold", color: "#18181B", marginBottom: 4 },
  modTextMuted: { fontSize: 9, color: "#52525B", lineHeight: 1.5 },
  
  modTableHeader: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 12, backgroundColor: "#F4F4F5", borderRadius: 6, marginBottom: 8 },
  modTh: { fontSize: 7, color: "#71717A", textTransform: "uppercase", letterSpacing: 1, fontWeight: "bold" },
  modTableRow: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#F4F4F5" },
  modTd: { fontSize: 9, color: "#27272A" },
  
  modTotalsBox: { width: "45%", padding: 20, backgroundColor: "#FAFAFA", borderRadius: 8, border: "1pt solid #E4E4E7" },
  modTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  modTotalLabel: { fontSize: 9, color: "#71717A" },
  modTotalValue: { fontSize: 9, color: "#18181B", fontWeight: "bold" },
  modNetPayable: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, marginTop: 8, borderTopWidth: 1, borderTopColor: "#E4E4E7" },
  modNetLabel: { fontSize: 11, color: "#09090B", fontWeight: "bold" },
  modNetValue: { fontSize: 12, color: "#09090B", fontWeight: "bold" },
})

interface InvoicePDFProps {
  invoice: {
    id: string
    invoiceNumber: string
    date: Date
    dueDate: Date
    notes?: string | null
    terms?: string | null
    subTotal: number
    totalDiscount: number
    totalTax: number
    cgstAmount: number
    sgstAmount: number
    igstAmount: number
    tdsPercentage: number
    tdsAmount: number
    tcsRate?: number | null
    tcsAmount?: number | null
    finalAmount: number
    status: string
    paymentCollectionMethod?: string
    vpaAddress?: string | null
    razorpayPaymentLinkUrl?: string | null
    bankName?: string | null
    bankAccountName?: string | null
    bankAccountNumber?: string | null
    bankIfscCode?: string | null
    bankAccountType?: string | null
    themeColor?: string | null
    themeFont?: string | null
    items: {
      description: string
      hsnSac?: string | null
      quantity: number
      unitPrice: number
      discount: number
      taxPercentage: number
      total: number
    }[]
    customer: {
      name: string
      companyName?: string | null
      gstin?: string | null
      address?: string | null
      state?: string | null
      email?: string | null
      phone?: string | null
    }
    company: {
      name: string
      gstNumber?: string | null
      panNumber?: string | null
      address?: string | null
      state?: string | null
      email?: string | null
      phone?: string | null
      logo?: string | null
      invoiceTemplate?: string | null
      msmeNumber?: string | null
      msmeType?: string | null
      subscriptionTier?: string | null
      removeWatermark?: boolean
    }
  }
  qrCodeDataUrl?: string
}

export function InvoiceDocument({ invoice, qrCodeDataUrl }: InvoicePDFProps) {
  const template = invoice.company.invoiceTemplate || "modern"
  const themeColor = template === "classic" || template === "minimal" ? "#000000" : (invoice.themeColor || "#09090B")
  const themeFont = template === "classic" ? "Times-Roman" : (invoice.themeFont || "Helvetica")

  const isPro = invoice.company.subscriptionTier === "PRO" || invoice.company.subscriptionTier === "ENTERPRISE"
  const showContactPerson = (invoice.customer as any)?.showContactPersonName !== false

  const hasTax = invoice.items.some((item) => item.taxPercentage > 0)
  const hasHsn = invoice.items.some((item) => item.hsnSac && item.hsnSac.trim() !== "")
  const hasDiscount = invoice.items.some((item) => item.discount > 0)

  return (
    <Document>
      <Page size="A4" style={[styles.page, { fontFamily: themeFont as any }]}>

        {/* --- HEADER SECTION --- */}
        {template === "classic" ? (
          <View style={{ marginBottom: 20 }}>
            <View style={{ borderBottomWidth: 2, borderBottomColor: "#000000", paddingBottom: 10, marginBottom: 10, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", letterSpacing: 2 }}>TAX INVOICE</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", marginTop: 4 }}>{invoice.company.name}</Text>
              {invoice.company.address && <Text style={{ fontSize: 10, marginTop: 2 }}>{invoice.company.address}</Text>}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ width: "50%" }}>
                <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Billed To:</Text>
                {showContactPerson ? (
                  <>
                    {invoice.customer.name && <Text>{invoice.customer.name.toUpperCase()}</Text>}
                    {invoice.customer.companyName && <Text>{invoice.customer.companyName}</Text>}
                  </>
                ) : (
                  invoice.customer.companyName && <Text>{invoice.customer.companyName.toUpperCase()}</Text>
                )}
                {invoice.customer.address && <Text>{invoice.customer.address}</Text>}
              </View>
              <View style={{ width: "50%", alignItems: "flex-end" }}>
                <View style={{ flexDirection: "row", marginBottom: 2 }}><Text style={{ fontWeight: "bold", width: 60 }}>Invoice No:</Text><Text>#{invoice.invoiceNumber}</Text></View>
                <View style={{ flexDirection: "row", marginBottom: 2 }}><Text style={{ fontWeight: "bold", width: 60 }}>Date:</Text><Text>{new Date(invoice.date).toLocaleDateString("en-IN")}</Text></View>
                <View style={{ flexDirection: "row", marginBottom: 2 }}><Text style={{ fontWeight: "bold", width: 60 }}>Due Date:</Text><Text>{new Date(invoice.dueDate).toLocaleDateString("en-IN")}</Text></View>
              </View>
            </View>
          </View>
        ) : template === "minimal" ? (
          <View style={{ marginBottom: 30 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <View>
                {invoice.company.logo ? (
                  <Image src={invoice.company.logo} style={{ width: 80, height: 40 }} />
                ) : (
                  <Text style={{ fontSize: 18, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1 }}>{invoice.company.name}</Text>
                )}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 36, color: "#18181B", fontWeight: "bold", letterSpacing: 4, textAlign: "right" }}>INVOICE</Text>
                <Text style={{ fontSize: 12, color: "#6b7280" }}>#{invoice.invoiceNumber}</Text>
              </View>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 15, flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Invoice To</Text>
                {showContactPerson ? (
                  <>
                    {invoice.customer.name && <Text style={{ fontWeight: "bold", fontSize: 11, color: "#111827" }}>{invoice.customer.name.toUpperCase()}</Text>}
                    {invoice.customer.companyName && <Text style={{ color: "#374151" }}>{invoice.customer.companyName}</Text>}
                  </>
                ) : (
                  invoice.customer.companyName && <Text style={{ fontWeight: "bold", fontSize: 11, color: "#111827" }}>{invoice.customer.companyName.toUpperCase()}</Text>
                )}
                {invoice.customer.address && <Text style={{ color: "#4b5563" }}>{invoice.customer.address}</Text>}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Issue Date</Text>
                <Text style={{ fontWeight: "bold", fontSize: 11, color: "#111827" }}>{new Date(invoice.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View>
            {/* Premium Modern Template Header */}
            <View style={[styles.modAccentBar, { backgroundColor: themeColor }]} />
            <View style={styles.modHeaderBox}>
              <View style={{ width: "50%" }}>
                <Text style={styles.modSectionLabel}>Billed By</Text>
                {invoice.company.logo && (
                  <Image src={invoice.company.logo} style={{ width: 120, height: 50, objectFit: "contain", marginBottom: 12 }} />
                )}
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#09090B", marginBottom: 4, letterSpacing: -0.2 }}>{invoice.company.name}</Text>
                {invoice.company.address && <Text style={styles.modTextMuted}>{invoice.company.address}</Text>}
                {invoice.company.gstNumber && <Text style={[styles.modTextMuted, { marginTop: 4 }]}>GSTIN: {invoice.company.gstNumber}</Text>}
                {invoice.company.panNumber && <Text style={styles.modTextMuted}>PAN: {invoice.company.panNumber}</Text>}
                {invoice.company.email && <Text style={[styles.modTextMuted, { marginTop: 4 }]}>{invoice.company.email}</Text>}
                {invoice.company.phone && <Text style={styles.modTextMuted}>{invoice.company.phone}</Text>}
              </View>
              <View style={{ width: "50%", alignItems: "flex-end" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[styles.modTitle, { color: themeColor }]}>Invoice</Text>
                  {invoice.status === "PAID" && (
                    <View style={{ backgroundColor: "#4ade80", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                      <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "bold" }}>Paid</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.modInvoiceMeta}>#{invoice.invoiceNumber}</Text>
              </View>
            </View>
            
            {/* Premium Bill To & Meta Grid */}
            <View style={styles.modInfoGrid}>
              <View style={{ width: "50%" }}>
                <Text style={styles.modSectionLabel}>Billed To</Text>
                {showContactPerson ? (
                  <>
                    {invoice.customer.name && <Text style={styles.modTextBase}>{invoice.customer.name.toUpperCase()}</Text>}
                    {invoice.customer.companyName && <Text style={styles.modTextMuted}>{invoice.customer.companyName}</Text>}
                  </>
                ) : (
                  invoice.customer.companyName && <Text style={styles.modTextBase}>{invoice.customer.companyName.toUpperCase()}</Text>
                )}
                {invoice.customer.address && <Text style={[styles.modTextMuted, { marginTop: 4 }]}>{invoice.customer.address}</Text>}
                {invoice.customer.gstin && <Text style={[styles.modTextMuted, { marginTop: 4 }]}>GSTIN: {invoice.customer.gstin}</Text>}
                {invoice.customer.phone && <Text style={styles.modTextMuted}>{invoice.customer.phone}</Text>}
              </View>
              <View style={{ width: "50%", flexDirection: "row", justifyContent: "flex-end", gap: 32 }}>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.modSectionLabel}>Issue Date</Text>
                  <Text style={{ fontSize: 10, color: "#18181B", fontWeight: "bold" }}>{new Date(invoice.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.modSectionLabel}>Due Date</Text>
                  <Text style={{ fontSize: 10, color: "#18181B", fontWeight: "bold" }}>{new Date(invoice.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* --- TABLE HEADER --- */}
        {template === "classic" ? (
          <View style={{ flexDirection: "row", padding: 6, fontWeight: "bold", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#000000", backgroundColor: "#f9fafb", marginTop: 10 }}>
            <Text style={[styles.col1, { color: "#000000" }]}>Description</Text>
            {hasHsn && <Text style={[styles.col2, { color: "#000000" }]}>HSN/SAC</Text>}
            <Text style={[styles.col3, { color: "#000000" }]}>Qty</Text>
            <Text style={[styles.col4, { color: "#000000" }]}>Rate</Text>
            {hasDiscount && <Text style={[styles.col5, { color: "#000000" }]}>Disc</Text>}
            {hasTax && <Text style={[styles.col6, { color: "#000000" }]}>Tax%</Text>}
            <Text style={[styles.col7, { color: "#000000" }]}>Amount</Text>
          </View>
        ) : template === "minimal" ? (
          <View style={{ flexDirection: "row", paddingVertical: 8, fontWeight: "bold", borderBottomWidth: 1, borderColor: "#e5e7eb", marginTop: 10 }}>
            <Text style={[styles.col1, { color: "#6b7280", fontSize: 8, textTransform: "uppercase", letterSpacing: 1 }]}>Service</Text>
            {hasHsn && <Text style={[styles.col2, { color: "#6b7280", fontSize: 8, textTransform: "uppercase", letterSpacing: 1 }]}>HSN</Text>}
            <Text style={[styles.col3, { color: "#6b7280", fontSize: 8, textTransform: "uppercase", letterSpacing: 1 }]}>Qty</Text>
            <Text style={[styles.col4, { color: "#6b7280", fontSize: 8, textTransform: "uppercase", letterSpacing: 1 }]}>Rate</Text>
            {hasDiscount && <Text style={[styles.col5, { color: "#6b7280", fontSize: 8, textTransform: "uppercase", letterSpacing: 1 }]}>Disc</Text>}
            {hasTax && <Text style={[styles.col6, { color: "#6b7280", fontSize: 8, textTransform: "uppercase", letterSpacing: 1 }]}>Tax</Text>}
            <Text style={[styles.col7, { color: "#6b7280", fontSize: 8, textTransform: "uppercase", letterSpacing: 1 }]}>Amount</Text>
          </View>
        ) : (
          <View style={styles.modTableHeader}>
            <Text style={[styles.col1, styles.modTh]}>Description</Text>
            {hasHsn && <Text style={[styles.col2, styles.modTh]}>HSN/SAC</Text>}
            <Text style={[styles.col3, styles.modTh]}>Qty</Text>
            <Text style={[styles.col4, styles.modTh]}>Rate</Text>
            {hasDiscount && <Text style={[styles.col5, styles.modTh]}>Disc</Text>}
            {hasTax && <Text style={[styles.col6, styles.modTh]}>Tax%</Text>}
            <Text style={[styles.col7, styles.modTh]}>Amount</Text>
          </View>
        )}

        {/* --- TABLE ROWS --- */}
        {invoice.items.map((item, i) => (
          <View key={i} style={[
            template === "classic" ? { ...styles.tableRow, borderBottomColor: "#000000", borderBottomWidth: 1, paddingVertical: 6 } : 
            template === "minimal" ? { ...styles.tableRow, borderBottomWidth: 0, paddingVertical: 8 } : 
            styles.modTableRow
          ]}>
            <Text style={[styles.col1, template === "minimal" ? { color: "#111827", fontWeight: "bold" } : template === "modern" ? styles.modTd : {}]}>
              {item.description}
            </Text>
            {hasHsn && <Text style={[styles.col2, template === "modern" ? styles.modTd : {}]}>{item.hsnSac ?? "-"}</Text>}
            <Text style={[styles.col3, template === "modern" ? styles.modTd : {}]}>{item.quantity}</Text>
            <Text style={[styles.col4, template === "modern" ? styles.modTd : {}]}>Rs. {formatPdfINR(item.unitPrice)}</Text>
            {hasDiscount && <Text style={[styles.col5, template === "modern" ? styles.modTd : {}]}>{item.discount > 0 ? `Rs. ${formatPdfINR(item.discount)}` : "-"}</Text>}
            {hasTax && <Text style={[styles.col6, template === "modern" ? styles.modTd : {}]}>{item.taxPercentage}%</Text>}
            <Text style={[styles.col7, template === "modern" ? styles.modTd : {}]}>Rs. {formatPdfINR(item.total)}</Text>
          </View>
        ))}

        {template === "classic" && <View style={{ borderTopWidth: 1, borderColor: "#000000", marginTop: -1 }} />}

        {/* --- TOTALS SECTION --- */}
        {template !== "modern" ? (
          <View style={{ flexDirection: "row", marginTop: 30, justifyContent: "space-between" }}>
            <View style={{ width: "45%" }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: "#111827", lineHeight: 1.4 }}>
                Total (in words) : {toWords.convert(invoice.finalAmount).toUpperCase()}
              </Text>
            </View>
            <View style={{ width: "45%" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#111827", borderBottomWidth: 1, borderBottomColor: "#111827", marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: "bold", color: "#111827" }}>Total (INR)</Text>
                <Text style={{ fontSize: 12, fontWeight: "bold", color: "#111827" }}>Rs. {formatPdfINR(invoice.finalAmount)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                <Text style={{ color: "#4b5563" }}>Subtotal</Text>
                <Text style={{ color: "#4b5563" }}>Rs. {formatPdfINR(invoice.subTotal)}</Text>
              </View>
              {invoice.totalDiscount > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                   <Text style={{ color: "#4b5563" }}>Discount</Text>
                   <Text style={{ color: "#4b5563" }}>(Rs. {formatPdfINR(invoice.totalDiscount)})</Text>
                </View>
              )}
              {invoice.cgstAmount > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                  <Text style={{ color: "#4b5563" }}>CGST</Text>
                  <Text style={{ color: "#4b5563" }}>Rs. {formatPdfINR(invoice.cgstAmount)}</Text>
                </View>
              )}
              {invoice.sgstAmount > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                  <Text style={{ color: "#4b5563" }}>SGST</Text>
                  <Text style={{ color: "#4b5563" }}>Rs. {formatPdfINR(invoice.sgstAmount)}</Text>
                </View>
              )}
              {invoice.igstAmount > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                  <Text style={{ color: "#4b5563" }}>IGST</Text>
                  <Text style={{ color: "#4b5563" }}>Rs. {formatPdfINR(invoice.igstAmount)}</Text>
                </View>
              )}
              {invoice.tdsAmount > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                  <Text style={{ color: "#4b5563" }}>TDS Withheld ({invoice.tdsPercentage}%)</Text>
                  <Text style={{ color: "#4b5563" }}>(Rs. {formatPdfINR(invoice.tdsAmount)})</Text>
                </View>
              )}
              {invoice.tcsAmount && invoice.tcsAmount > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                  <Text style={{ color: "#4b5563" }}>TCS ({invoice.tcsRate}%)</Text>
                  <Text style={{ color: "#4b5563" }}>Rs. {formatPdfINR(invoice.tcsAmount)}</Text>
                </View>
              )}
              {invoice.tdsAmount > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
                  <Text style={{ color: "#111827", fontWeight: "bold" }}>Net Payable</Text>
                  <Text style={{ color: "#111827", fontWeight: "bold" }}>Rs. {formatPdfINR(invoice.finalAmount - invoice.tdsAmount)}</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: "row", marginTop: 32, justifyContent: "space-between" }}>
            <View style={{ width: "50%", paddingRight: 20 }}>
              {invoice.notes && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.modSectionLabel}>Notes</Text>
                  <Text style={styles.modTextMuted}>{invoice.notes}</Text>
                </View>
              )}
              {invoice.terms && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.modSectionLabel}>Terms & Conditions</Text>
                  <Text style={styles.modTextMuted}>{invoice.terms}</Text>
                </View>
              )}
              <View style={{ marginTop: "auto" }}>
                <Text style={styles.modSectionLabel}>Amount in Words</Text>
                <Text style={{ fontSize: 9, color: "#18181B", fontWeight: "bold", lineHeight: 1.4 }}>
                  {toWords.convert(invoice.finalAmount).toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.modTotalsBox}>
              <View style={styles.modTotalRow}>
                <Text style={styles.modTotalLabel}>Subtotal</Text>
                <Text style={styles.modTotalValue}>Rs. {formatPdfINR(invoice.subTotal)}</Text>
              </View>
              {invoice.totalDiscount > 0 && (
                <View style={styles.modTotalRow}>
                   <Text style={styles.modTotalLabel}>Discount</Text>
                   <Text style={styles.modTotalValue}>(Rs. {formatPdfINR(invoice.totalDiscount)})</Text>
                </View>
              )}
              {invoice.cgstAmount > 0 && (
                <View style={styles.modTotalRow}>
                  <Text style={styles.modTotalLabel}>CGST</Text>
                  <Text style={styles.modTotalValue}>Rs. {formatPdfINR(invoice.cgstAmount)}</Text>
                </View>
              )}
              {invoice.sgstAmount > 0 && (
                <View style={styles.modTotalRow}>
                  <Text style={styles.modTotalLabel}>SGST</Text>
                  <Text style={styles.modTotalValue}>Rs. {formatPdfINR(invoice.sgstAmount)}</Text>
                </View>
              )}
              {invoice.igstAmount > 0 && (
                <View style={styles.modTotalRow}>
                  <Text style={styles.modTotalLabel}>IGST</Text>
                  <Text style={styles.modTotalValue}>Rs. {formatPdfINR(invoice.igstAmount)}</Text>
                </View>
              )}
              {invoice.tdsAmount > 0 && (
                <View style={styles.modTotalRow}>
                  <Text style={styles.modTotalLabel}>TDS Withheld ({invoice.tdsPercentage}%)</Text>
                  <Text style={styles.modTotalValue}>(Rs. {formatPdfINR(invoice.tdsAmount)})</Text>
                </View>
              )}
              {invoice.tcsAmount && invoice.tcsAmount > 0 && (
                <View style={styles.modTotalRow}>
                  <Text style={styles.modTotalLabel}>TCS ({invoice.tcsRate}%)</Text>
                  <Text style={styles.modTotalValue}>Rs. {formatPdfINR(invoice.tcsAmount)}</Text>
                </View>
              )}
              <View style={styles.modNetPayable}>
                <Text style={styles.modNetLabel}>Total Amount</Text>
                <Text style={[styles.modNetValue, { color: themeColor }]}>Rs. {formatPdfINR(invoice.finalAmount)}</Text>
              </View>
              {invoice.tdsAmount > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 8 }}>
                  <Text style={styles.modTotalLabel}>Net Payable</Text>
                  <Text style={styles.modTotalValue}>Rs. {formatPdfINR(invoice.finalAmount - invoice.tdsAmount)}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* --- EXTRAS: BANK & PAYMENT --- */}
        {template !== "modern" && invoice.notes && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={styles.label}>NOTES</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        {template !== "modern" && invoice.terms && (
          <View style={styles.section}>
            <Text style={styles.label}>TERMS & CONDITIONS</Text>
            <Text>{invoice.terms}</Text>
          </View>
        )}

        {(invoice.bankName || invoice.bankAccountNumber || invoice.bankIfscCode) && (
          <View style={[template === "modern" ? { marginTop: 32, padding: 16, backgroundColor: "#FAFAFA", borderRadius: 8, border: "1pt solid #E4E4E7" } : { marginTop: 20, padding: 12, backgroundColor: "#f9fafb", borderRadius: 4, borderWidth: 1, borderColor: "#e5e7eb" }]}>
            <Text style={template === "modern" ? styles.modSectionLabel : [styles.label, { color: themeColor, fontWeight: "bold", fontSize: 9, marginBottom: 10 }]}>BANK DETAILS</Text>
            <View style={{ flexDirection: "row" }}>
              <View style={{ width: "50%", paddingRight: 10 }}>
                {invoice.bankName && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={template === "modern" ? { fontSize: 7, color: "#A1A1AA", marginBottom: 2 } : { fontSize: 8, color: "#6b7280", marginBottom: 2 }}>Bank Name</Text>
                    <Text style={template === "modern" ? { fontSize: 9, fontWeight: "bold", color: "#18181B" } : { fontSize: 9, fontWeight: "bold", color: "#111827" }}>{invoice.bankName}</Text>
                  </View>
                )}
                {invoice.bankAccountNumber && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={template === "modern" ? { fontSize: 7, color: "#A1A1AA", marginBottom: 2 } : { fontSize: 8, color: "#6b7280", marginBottom: 2 }}>Account Number</Text>
                    <Text style={template === "modern" ? { fontSize: 9, fontWeight: "bold", color: "#18181B" } : { fontSize: 9, fontWeight: "bold", color: "#111827" }}>{invoice.bankAccountNumber}</Text>
                  </View>
                )}
                {invoice.bankAccountType && (
                  <View style={{ marginBottom: 0 }}>
                    <Text style={template === "modern" ? { fontSize: 7, color: "#A1A1AA", marginBottom: 2 } : { fontSize: 8, color: "#6b7280", marginBottom: 2 }}>Account Type</Text>
                    <Text style={template === "modern" ? { fontSize: 9, fontWeight: "bold", color: "#18181B" } : { fontSize: 9, fontWeight: "bold", color: "#111827" }}>{invoice.bankAccountType}</Text>
                  </View>
                )}
              </View>
              <View style={{ width: "50%", paddingRight: 10 }}>
                {invoice.bankAccountName && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={template === "modern" ? { fontSize: 7, color: "#A1A1AA", marginBottom: 2 } : { fontSize: 8, color: "#6b7280", marginBottom: 2 }}>Account Name</Text>
                    <Text style={template === "modern" ? { fontSize: 9, fontWeight: "bold", color: "#18181B" } : { fontSize: 9, fontWeight: "bold", color: "#111827" }}>{invoice.bankAccountName}</Text>
                  </View>
                )}
                {invoice.bankIfscCode && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={template === "modern" ? { fontSize: 7, color: "#A1A1AA", marginBottom: 2 } : { fontSize: 8, color: "#6b7280", marginBottom: 2 }}>IFSC Code</Text>
                    <Text style={template === "modern" ? { fontSize: 9, fontWeight: "bold", color: "#18181B" } : { fontSize: 9, fontWeight: "bold", color: "#111827" }}>{invoice.bankIfscCode}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {invoice.paymentCollectionMethod === "ONLINE" && (
          <View style={template === "modern" ? { marginTop: 16 } : styles.section}>
            <Text style={template === "modern" ? styles.modSectionLabel : styles.label}>PAYMENT DETAILS</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2, fontSize: 9 }}>
              <Text style={{ color: "#52525B" }}>Pay Online: </Text>
              <Link
                src={invoice.razorpayPaymentLinkUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invoices/${invoice.id}?pay=true`}
                style={{ color: themeColor, fontWeight: "bold", textDecoration: "none" }}
              >
                Click here to pay securely
              </Link>
            </View>
            <Text style={{ fontSize: 7, color: "#A1A1AA", marginTop: 2 }}>
              Accepts UPI, Credit/Debit Cards, Netbanking & Wallets via Razorpay.
            </Text>
          </View>
        )}

        {(invoice as any).paymentCollectionMethod === "CRYPTO_QR" && (invoice as any).cryptoAddress && (
          <View style={template === "modern" ? { marginTop: 16 } : styles.section}>
            <Text style={template === "modern" ? styles.modSectionLabel : styles.label}>CRYPTO PAYMENT DETAILS</Text>
            <View style={{ flexDirection: "column", gap: 2, fontSize: 9 }}>
              <Text style={{ color: "#52525B" }}>Wallet Address: <Text style={{ fontFamily: "Courier", fontWeight: "bold", color: "#18181B" }}>{(invoice as any).cryptoAddress}</Text></Text>
              {(invoice as any).cryptoNetwork && <Text style={{ color: "#52525B" }}>Network: <Text style={{ color: "#18181B" }}>{(invoice as any).cryptoNetwork}</Text></Text>}
            </View>
            <Text style={{ fontSize: 7, color: "#A1A1AA", marginTop: 2 }}>
              Scan the QR code below or send exact amount to the above address.
            </Text>
          </View>
        )}

        {/* --- FOOTER --- */}
        <View style={styles.footer}>
          <View style={{ borderTopWidth: 1, borderTopColor: "#E4E4E7", paddingTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View style={{ width: "33%" }}>
              {qrCodeDataUrl && (
                <View style={{ alignItems: "flex-start" }}>
                  <Image src={qrCodeDataUrl} style={{ width: 50, height: 50, borderRadius: 4 }} />
                  <Text style={{ fontSize: 5, color: "#A1A1AA", marginTop: 4, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {invoice.paymentCollectionMethod === "UPI_QR" ? "SCAN TO PAY" : invoice.paymentCollectionMethod === "CRYPTO_QR" ? "SCAN TO PAY" : "VERIFY INVOICE"}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ width: "34%", alignItems: "center", paddingBottom: 4 }}>
              <Text style={{ fontSize: 7, color: "#A1A1AA", textAlign: "center" }}>
                This is an electronically generated document.
              </Text>
              <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} style={{ fontSize: 7, color: "#A1A1AA", marginTop: 4 }} />
            </View>
            <View style={{ width: "33%", alignItems: "flex-end", paddingBottom: 4 }}>
              {!invoice.company.removeWatermark && !isPro && (
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 7, color: "#A1A1AA", marginBottom: 2 }}>Powered by</Text>
                  <Link src={process.env.NEXT_PUBLIC_APP_URL || "https://invoiceai.com"} style={{ fontSize: 10, color: themeColor, textDecoration: "none", fontWeight: "bold" }}>
                    {process.env.NEXT_PUBLIC_APP_NAME || "Open-Invoice"}
                  </Link>
                </View>
              )}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
