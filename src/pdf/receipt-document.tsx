import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
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
  title: { fontSize: 24, fontWeight: "bold", color: "#10b981" }, // Emerald Green
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
  col1: { width: "60%" },
  col2: { width: "20%", textAlign: "right" },
  col3: { width: "20%", textAlign: "right" },
  totals: { marginTop: 16, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", width: 200, justifyContent: "space-between", paddingVertical: 2 },
  grandTotal: { fontSize: 14, fontWeight: "bold", color: "#10b981" },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40 },
  stamp: {
    borderWidth: 2,
    borderColor: "#10b981",
    color: "#10b981",
    padding: 6,
    borderRadius: 4,
    textTransform: "uppercase",
    fontWeight: "bold",
    fontSize: 14,
    alignSelf: "flex-start",
    marginTop: 10,
  }
})

interface ReceiptPDFProps {
  invoice: {
    invoiceNumber: string
    date: Date
    dueDate: Date
    finalAmount: number
    amountPaid: number
    balanceDue: number
    payments: {
      id: string
      amount: number
      method: string
      notes?: string | null
      createdAt: Date
    }[]
    company: {
      name: string
      gstNumber?: string | null
      panNumber?: string | null
      msmeNumber?: string | null
      msmeType?: string | null
      address?: string | null
      email?: string | null
      phone?: string | null
      logo?: string | null
    }
    customer: {
      name: string
      companyName?: string | null
      gstin?: string | null
      address?: string | null
      email?: string | null
      phone?: string | null
    }
  }
}

export function ReceiptPDFDocument({ invoice }: ReceiptPDFProps) {
  const themeColor = "#10b981"
  const lastPayment = invoice.payments[0]
  const paymentMethod = lastPayment?.method || "RECORDED"
  const paymentDate = lastPayment?.createdAt ? new Date(lastPayment.createdAt) : new Date()

  // Words formatting
  let amountInWords = ""
  try {
    amountInWords = toWords.convert(invoice.amountPaid)
  } catch (err) {
    console.error("ToWords error:", err)
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {invoice.company.logo ? (
              <Image src={invoice.company.logo} style={{ height: 40, marginBottom: 8 }} />
            ) : null}
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>{invoice.company.name}</Text>
            {invoice.company.gstNumber && <Text>GSTIN: {invoice.company.gstNumber}</Text>}
            {invoice.company.panNumber && <Text>PAN: {invoice.company.panNumber}</Text>}
            {invoice.company.address && <Text>{invoice.company.address}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.title}>PAYMENT RECEIPT</Text>
            <Text style={{ marginTop: 4 }}>Receipt Date: {paymentDate.toLocaleDateString("en-IN")}</Text>
            <Text>Invoice Ref: {invoice.invoiceNumber}</Text>
            <View style={styles.stamp}>
              <Text>PAID</Text>
            </View>
          </View>
        </View>

        {/* Parties */}
        <View style={[styles.header, { borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 12 }]}>
          <View style={{ width: "45%" }}>
            <Text style={styles.label}>RECEIVED FROM</Text>
            <Text style={{ fontWeight: "bold" }}>{invoice.customer.name}</Text>
            {invoice.customer.companyName && <Text>{invoice.customer.companyName}</Text>}
            {invoice.customer.gstin && <Text>GSTIN: {invoice.customer.gstin}</Text>}
            {invoice.customer.address && <Text>{invoice.customer.address}</Text>}
            {invoice.customer.email && <Text>{invoice.customer.email}</Text>}
          </View>
          <View style={{ width: "45%" }}>
            <Text style={styles.label}>PAYMENT DETAILS</Text>
            <Text>Payment Date: {paymentDate.toLocaleDateString("en-IN")}</Text>
            <Text>Payment Method: {paymentMethod.replace("_", " ")}</Text>
            {lastPayment?.notes && <Text>Payment Notes: {lastPayment.notes}</Text>}
          </View>
        </View>

        {/* Invoice reference breakdown table */}
        <View style={styles.tableHeader}>
          <View style={styles.col1}>
            <Text style={{ color: "#374151" }}>Description</Text>
          </View>
          <View style={styles.col2}>
            <Text style={{ color: "#374151" }}>Total Invoice Amount</Text>
          </View>
          <View style={styles.col3}>
            <Text style={{ color: "#374151" }}>Amount Paid</Text>
          </View>
        </View>

        <View style={styles.tableRow}>
          <View style={styles.col1}>
            <Text>Payment for Invoice {invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.col2}>
            <Text>{formatPdfINR(invoice.finalAmount)}</Text>
          </View>
          <View style={styles.col3}>
            <Text>{formatPdfINR(invoice.amountPaid)}</Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={{ color: "#6b7280" }}>Total Amount Due:</Text>
            <Text>{formatPdfINR(invoice.finalAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ color: "#6b7280" }}>Total Paid:</Text>
            <Text style={{ fontWeight: "bold" }}>{formatPdfINR(invoice.amountPaid)}</Text>
          </View>
          <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 4 }]}>
            <Text style={[styles.grandTotal, { color: themeColor }]}>Balance Due:</Text>
            <Text style={[styles.grandTotal, { color: themeColor }]}>{formatPdfINR(invoice.balanceDue)}</Text>
          </View>
        </View>

        {/* Words section */}
        {amountInWords ? (
          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={styles.label}>AMOUNT RECEIVED IN WORDS</Text>
            <Text style={{ fontStyle: "italic", fontSize: 9 }}>{amountInWords}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={[styles.footer, { borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 10 }]}>
          <Text style={{ textAlign: "center", color: "#9ca3af", fontSize: 8 }}>
            Thank you for your business! If you have any questions, please contact {invoice.company.email || "billing support"}.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
