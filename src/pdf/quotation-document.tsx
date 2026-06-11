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
  return "Rs. " + new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1e40af" },
  section: { marginBottom: 12 },
  label: { fontSize: 8, color: "#6b7280", marginBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 6,
    fontWeight: "bold",
    marginTop: 10,
  },
  tableRow: { flexDirection: "row", padding: 6, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  col1: { width: "35%" },
  col2: { width: "10%", textAlign: "right" },
  col3: { width: "12%", textAlign: "right" },
  col4: { width: "10%", textAlign: "right" },
  col5: { width: "10%", textAlign: "right" },
  col6: { width: "13%", textAlign: "right" },
  col7: { width: "10%", textAlign: "right" },
  totals: { marginTop: 16, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", width: 200, justifyContent: "space-between", paddingVertical: 2 },
  grandTotal: { fontSize: 14, fontWeight: "bold", color: "#1e40af" },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40 },
})

interface QuotationPDFProps {
  quotation: {
    quotationNumber: string
    date: Date
    expiryDate: Date
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
    finalAmount: number
    status: string
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
      quotationTemplate?: string | null
    }
  }
  qrCodeDataUrl?: string
}

export function QuotationDocument({ quotation, qrCodeDataUrl }: QuotationPDFProps) {
  const template = quotation.company.quotationTemplate || "modern"
  const themeColor = template === "classic" || template === "minimal" ? "#000000" : (quotation.themeColor || "#1e40af")
  const themeFont = template === "classic" ? "Times-Roman" : (quotation.themeFont || "Helvetica")

  const headerBgColor = template === "modern" ? `${themeColor}1A` : template === "classic" ? "#f3f4f6" : "#ffffff"
  const headerTextColor = template === "modern" ? themeColor : "#000000"
  const borderStyle = template === "minimal" ? { borderBottomWidth: 0 } : { borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }

  return (
    <Document>
      <Page size="A4" style={[styles.page, { fontFamily: themeFont as any }]}>

        <View style={styles.header}>
          <View>
            {quotation.company.logo && (
              <Image src={quotation.company.logo} style={{ width: 80, height: 40, marginBottom: 8 }} />
            )}
            <Text style={styles.label}>BILLED BY</Text>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>{quotation.company.name}</Text>
            {quotation.company.gstNumber && <Text>GSTIN: {quotation.company.gstNumber}</Text>}
            {quotation.company.panNumber && <Text>PAN: {quotation.company.panNumber}</Text>}
            {quotation.company.address && <Text>{quotation.company.address}</Text>}
            {quotation.company.email && <Text>{quotation.company.email}</Text>}
            {quotation.company.phone && <Text>Phone: {quotation.company.phone}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.title, { color: themeColor }]}>QUOTATION</Text>
            <Text>#{quotation.quotationNumber}</Text>
            <Text>Date: {new Date(quotation.date).toLocaleDateString("en-IN")}</Text>
            <Text>Due: {new Date(quotation.expiryDate).toLocaleDateString("en-IN")}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>BILL TO</Text>
          <Text style={{ fontWeight: "bold" }}>{quotation.customer.name}</Text>
          {quotation.customer.companyName && <Text>{quotation.customer.companyName}</Text>}
          {quotation.customer.gstin && <Text>GSTIN: {quotation.customer.gstin}</Text>}
          {quotation.customer.address && <Text>{quotation.customer.address}</Text>}
          {quotation.customer.state && <Text>{quotation.customer.state}</Text>}
          {quotation.customer.phone && <Text>Phone: {quotation.customer.phone}</Text>}
        </View>

        <View style={[styles.tableHeader, { backgroundColor: headerBgColor }]}>
          <Text style={[styles.col1, { color: headerTextColor }]}>Description</Text>
          <Text style={[styles.col2, { color: headerTextColor }]}>HSN/SAC</Text>
          <Text style={[styles.col3, { color: headerTextColor }]}>Qty</Text>
          <Text style={[styles.col4, { color: headerTextColor }]}>Rate</Text>
          <Text style={[styles.col5, { color: headerTextColor }]}>Disc</Text>
          <Text style={[styles.col6, { color: headerTextColor }]}>Tax%</Text>
          <Text style={[styles.col7, { color: headerTextColor }]}>Amount</Text>
        </View>

        {quotation.items.map((item, i) => (
          <View key={i} style={[styles.tableRow, borderStyle]}>
            <Text style={styles.col1}>{item.description}</Text>
            <Text style={styles.col2}>{item.hsnSac ?? "-"}</Text>
            <Text style={styles.col3}>{item.quantity}</Text>
            <Text style={styles.col4}>{formatPdfINR(item.unitPrice)}</Text>
            <Text style={styles.col5}>{formatPdfINR(item.discount)}</Text>
            <Text style={styles.col6}>{item.taxPercentage}%</Text>
            <Text style={styles.col7}>{formatPdfINR(item.total)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatPdfINR(quotation.subTotal)}</Text>
          </View>
          {quotation.totalDiscount > 0 && (
            <View style={styles.totalRow}>
               <Text>Discount</Text>
               <Text>-{formatPdfINR(quotation.totalDiscount)}</Text>
            </View>
          )}
          {quotation.cgstAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>CGST</Text>
              <Text>{formatPdfINR(quotation.cgstAmount)}</Text>
            </View>
          )}
          {quotation.sgstAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>SGST</Text>
              <Text>{formatPdfINR(quotation.sgstAmount)}</Text>
            </View>
          )}
          {quotation.igstAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>IGST</Text>
              <Text>{formatPdfINR(quotation.igstAmount)}</Text>
            </View>
          )}
          {quotation.tdsAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>TDS ({quotation.tdsPercentage}%)</Text>
              <Text>-{formatPdfINR(quotation.tdsAmount)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, { marginTop: 8 }]}>
            <Text style={[styles.grandTotal, { color: themeColor }]}>Total</Text>
            <Text style={[styles.grandTotal, { color: themeColor }]}>{formatPdfINR(quotation.finalAmount)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 10, backgroundColor: "#f9fafb", padding: 8, borderRadius: 4 }}>
           <Text style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>Total (in words)</Text>
           <Text style={{ fontSize: 10, fontWeight: "bold" }}>{toWords.convert(quotation.finalAmount)}</Text>
        </View>

        {quotation.notes && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={styles.label}>NOTES</Text>
            <Text>{quotation.notes}</Text>
          </View>
        )}

        {quotation.terms && (
          <View style={styles.section}>
            <Text style={styles.label}>TERMS & CONDITIONS</Text>
            <Text>{quotation.terms}</Text>
          </View>
        )}

        {(quotation.bankName || quotation.bankAccountNumber || quotation.bankIfscCode) && (
          <View style={styles.section}>
            <Text style={styles.label}>BANK DETAILS</Text>
            {quotation.bankName && <Text>Bank: {quotation.bankName}</Text>}
            {quotation.bankAccountName && <Text>Account Name: {quotation.bankAccountName}</Text>}
            {quotation.bankAccountNumber && <Text>Account Number: {quotation.bankAccountNumber}</Text>}
            {quotation.bankIfscCode && <Text>IFSC: {quotation.bankIfscCode}</Text>}
            {quotation.bankAccountType && <Text>Account Type: {quotation.bankAccountType}</Text>}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={{ fontSize: 8, color: "#9ca3af", textAlign: "center", marginBottom: 12 }}>
            This is an electronically generated document, no signature is required.
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            {qrCodeDataUrl && <Image src={qrCodeDataUrl} style={{ width: 60, height: 60 }} />}
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 8, color: "#9ca3af", marginBottom: 2 }}>Powered by</Text>
              <Link src={process.env.NEXT_PUBLIC_APP_URL || "https://quotationai.com"} style={{ fontSize: 12, color: themeColor, textDecoration: "none", fontWeight: "bold" }}>
                {process.env.NEXT_PUBLIC_APP_NAME || "QuotationAI"}
              </Link>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
