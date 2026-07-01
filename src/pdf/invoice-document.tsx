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
    }
  }
  qrCodeDataUrl?: string
}

export function InvoiceDocument({ invoice, qrCodeDataUrl }: InvoicePDFProps) {
  const template = invoice.company.invoiceTemplate || "modern"
  const themeColor = template === "classic" || template === "minimal" ? "#000000" : (invoice.themeColor || "#1e40af")
  const themeFont = template === "classic" ? "Times-Roman" : (invoice.themeFont || "Helvetica")

  const headerBgColor = template === "modern" ? `${themeColor}1A` : template === "classic" ? "#f3f4f6" : "#ffffff"
  const headerTextColor = template === "modern" ? themeColor : "#000000"
  const borderStyle = template === "minimal" ? { borderBottomWidth: 0 } : { borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }

  return (
    <Document>
      <Page size="A4" style={[styles.page, { fontFamily: themeFont as any }]}>

        <View style={styles.header}>
          <View>
            {invoice.company.logo && (
              <Image src={invoice.company.logo} style={{ width: 80, height: 40, marginBottom: 8 }} />
            )}
            <Text style={styles.label}>BILLED BY</Text>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>{invoice.company.name}</Text>
            {invoice.company.gstNumber && <Text>GSTIN: {invoice.company.gstNumber}</Text>}
            {invoice.company.panNumber && <Text>PAN: {invoice.company.panNumber}</Text>}
            {invoice.company.msmeNumber && <Text>MSME: {invoice.company.msmeNumber} ({invoice.company.msmeType})</Text>}
            {invoice.company.address && <Text>{invoice.company.address}</Text>}
            {invoice.company.email && <Text>{invoice.company.email}</Text>}
            {invoice.company.phone && <Text>Phone: {invoice.company.phone}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.title, { color: themeColor }]}>TAX INVOICE</Text>
            <Text>#{invoice.invoiceNumber}</Text>
            <Text>Date: {new Date(invoice.date).toLocaleDateString("en-IN")}</Text>
            <Text>Due: {new Date(invoice.dueDate).toLocaleDateString("en-IN")}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>BILL TO</Text>
          <Text style={{ fontWeight: "bold" }}>{invoice.customer.name}</Text>
          {invoice.customer.companyName && <Text>{invoice.customer.companyName}</Text>}
          {invoice.customer.gstin && <Text>GSTIN: {invoice.customer.gstin}</Text>}
          {invoice.customer.address && <Text>{invoice.customer.address}</Text>}
          {invoice.customer.state && <Text>{invoice.customer.state}</Text>}
          {invoice.customer.phone && <Text>Phone: {invoice.customer.phone}</Text>}
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

        {invoice.items.map((item, i) => (
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
            <Text>{formatPdfINR(invoice.subTotal)}</Text>
          </View>
          {invoice.totalDiscount > 0 && (
            <View style={styles.totalRow}>
               <Text>Discount</Text>
               <Text>-{formatPdfINR(invoice.totalDiscount)}</Text>
            </View>
          )}
          {invoice.cgstAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>CGST</Text>
              <Text>{formatPdfINR(invoice.cgstAmount)}</Text>
            </View>
          )}
          {invoice.sgstAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>SGST</Text>
              <Text>{formatPdfINR(invoice.sgstAmount)}</Text>
            </View>
          )}
          {invoice.igstAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>IGST</Text>
              <Text>{formatPdfINR(invoice.igstAmount)}</Text>
            </View>
          )}
          {invoice.tdsAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>TDS ({invoice.tdsPercentage}%)</Text>
              <Text>-{formatPdfINR(invoice.tdsAmount)}</Text>
            </View>
          )}
          {invoice.tcsAmount && invoice.tcsAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>TCS ({invoice.tcsRate}%)</Text>
              <Text>+{formatPdfINR(invoice.tcsAmount)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, { marginTop: 8 }]}>
            <Text style={[styles.grandTotal, { color: themeColor }]}>Total</Text>
            <Text style={[styles.grandTotal, { color: themeColor }]}>{formatPdfINR(invoice.finalAmount)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 10, backgroundColor: "#f9fafb", padding: 8, borderRadius: 4 }}>
           <Text style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>Total (in words)</Text>
           <Text style={{ fontSize: 10, fontWeight: "bold" }}>{toWords.convert(invoice.finalAmount)}</Text>
        </View>

        {invoice.notes && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={styles.label}>NOTES</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        {invoice.terms && (
          <View style={styles.section}>
            <Text style={styles.label}>TERMS & CONDITIONS</Text>
            <Text>{invoice.terms}</Text>
          </View>
        )}

        {(invoice.bankName || invoice.bankAccountNumber || invoice.bankIfscCode) && (
          <View style={styles.section}>
            <Text style={styles.label}>BANK DETAILS</Text>
            {invoice.bankName && <Text>Bank: {invoice.bankName}</Text>}
            {invoice.bankAccountName && <Text>Account Name: {invoice.bankAccountName}</Text>}
            {invoice.bankAccountNumber && <Text>Account Number: {invoice.bankAccountNumber}</Text>}
            {invoice.bankIfscCode && <Text>IFSC: {invoice.bankIfscCode}</Text>}
            {invoice.bankAccountType && <Text>Account Type: {invoice.bankAccountType}</Text>}
          </View>
        )}

        {invoice.paymentCollectionMethod === "ONLINE" && (
          <View style={styles.section}>
            <Text style={styles.label}>PAYMENT DETAILS</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2, fontSize: 9 }}>
              <Text style={{ color: "#374151" }}>Pay Online: </Text>
              <Link
                src={invoice.razorpayPaymentLinkUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invoices/${invoice.id}?pay=true`}
                style={{ color: themeColor, fontWeight: "bold", textDecoration: "underline" }}
              >
                Click here to pay securely
              </Link>
            </View>
            <Text style={{ fontSize: 7, color: "#9ca3af", marginTop: 2 }}>
              Accepts UPI, Credit/Debit Cards, Netbanking & Wallets via Razorpay.
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={{ fontSize: 8, color: "#9ca3af", textAlign: "center", marginBottom: 12 }}>
            This is an electronically generated document, no signature is required.
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            {qrCodeDataUrl && (
              <View style={{ alignItems: "center" }}>
                <Image src={qrCodeDataUrl} style={{ width: 60, height: 60 }} />
                <Text style={{ fontSize: 6, color: "#6b7280", marginTop: 2, fontWeight: "bold" }}>
                  {invoice.paymentCollectionMethod === "UPI_QR" ? "SCAN TO PAY (UPI)" : "VERIFY INVOICE"}
                </Text>
              </View>
            )}
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 8, color: "#9ca3af", marginBottom: 2 }}>Powered by</Text>
              <Link src={process.env.NEXT_PUBLIC_APP_URL || "https://invoiceai.com"} style={{ fontSize: 12, color: themeColor, textDecoration: "none", fontWeight: "bold" }}>
                {process.env.NEXT_PUBLIC_APP_NAME || "InvoiceAI"}
              </Link>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
