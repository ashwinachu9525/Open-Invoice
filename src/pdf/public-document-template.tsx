import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"
import { PublicInvoiceData } from "@/lib/public-invoice-schema"
import { format } from "date-fns"

const formatAmount = (amount: number, currency: string) => {
  return `${currency} ` + new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold" },
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
  col1: { width: "40%" },
  col2: { width: "15%", textAlign: "right" },
  col3: { width: "15%", textAlign: "right" },
  col4: { width: "15%", textAlign: "right" },
  col5: { width: "15%", textAlign: "right" },
  totals: { marginTop: 16, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", width: 200, justifyContent: "space-between", paddingVertical: 2 },
  grandTotal: { fontSize: 14, fontWeight: "bold" },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40 },
})

export function PublicDocumentTemplate({ data }: { data: PublicInvoiceData }) {
  const isQuotation = data.documentType === "quotation" || data.documentType === "estimate"
  const docTitle = isQuotation ? (data.documentType === "estimate" ? "ESTIMATE" : "QUOTATION") : "INVOICE"
  
  let subTotal = 0
  let totalTax = 0
  let totalDiscount = 0

  data.items.forEach(item => {
    const itemTotal = item.quantity * item.unitPrice
    const itemDiscount = itemTotal * (item.discount / 100)
    const itemTax = (itemTotal - itemDiscount) * (item.taxPercentage / 100)
    subTotal += itemTotal
    totalDiscount += itemDiscount
    totalTax += itemTax
  })

  const grandTotal = subTotal - totalDiscount + totalTax

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: "50%" }}>
            {data.companyLogo ? (
              <Image src={data.companyLogo} style={{ width: 100, height: "auto", marginBottom: 10 }} />
            ) : null}
            <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 4 }}>{data.companyName}</Text>
            {data.companyAddress && <Text style={{ color: "#4b5563", marginBottom: 2 }}>{data.companyAddress}</Text>}
            {data.companyEmail && <Text style={{ color: "#4b5563", marginBottom: 2 }}>Email: {data.companyEmail}</Text>}
            {data.companyPhone && <Text style={{ color: "#4b5563", marginBottom: 2 }}>Phone: {data.companyPhone}</Text>}
            {data.companyGst && <Text style={{ color: "#4b5563", marginTop: 4 }}>GSTIN: {data.companyGst}</Text>}
          </View>
          <View style={{ width: "50%", alignItems: "flex-end" }}>
            <Text style={[styles.title, { color: data.themeColor || "#000" }]}>{docTitle}</Text>
            <View style={{ marginTop: 10, alignItems: "flex-end" }}>
              <Text style={styles.label}>No.</Text>
              <Text style={{ fontWeight: "bold", marginBottom: 4 }}>{data.documentNumber}</Text>
              
              <Text style={styles.label}>Date</Text>
              <Text style={{ marginBottom: 4 }}>{format(new Date(data.date), "dd MMM yyyy")}</Text>
              
              {data.dueDate && (
                <>
                  <Text style={styles.label}>{isQuotation ? "Valid Until" : "Due Date"}</Text>
                  <Text>{format(new Date(data.dueDate), "dd MMM yyyy")}</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.section}>
          <Text style={styles.label}>Bill To</Text>
          <Text style={{ fontWeight: "bold", fontSize: 12, marginBottom: 2 }}>{data.customerName}</Text>
          {data.customerAddress && <Text style={{ color: "#4b5563", marginBottom: 2 }}>{data.customerAddress}</Text>}
          {data.customerEmail && <Text style={{ color: "#4b5563", marginBottom: 2 }}>Email: {data.customerEmail}</Text>}
          {data.customerPhone && <Text style={{ color: "#4b5563", marginBottom: 2 }}>Phone: {data.customerPhone}</Text>}
          {data.customerGst && <Text style={{ color: "#4b5563", marginTop: 4 }}>GSTIN: {data.customerGst}</Text>}
        </View>

        {/* Table Header */}
        <View style={[styles.tableHeader, { backgroundColor: (data.themeColor || "#000") + "1A" }]}>
          <Text style={styles.col1}>Description</Text>
          <Text style={styles.col2}>Qty</Text>
          <Text style={styles.col3}>Price</Text>
          <Text style={styles.col4}>Tax %</Text>
          <Text style={styles.col5}>Total</Text>
        </View>

        {/* Table Rows */}
        {data.items.map((item, i) => {
          const itemTotal = item.quantity * item.unitPrice
          const itemDiscount = itemTotal * (item.discount / 100)
          const itemTax = (itemTotal - itemDiscount) * (item.taxPercentage / 100)
          const finalItemTotal = itemTotal - itemDiscount + itemTax

          return (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.col1}>{item.description}</Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>{formatAmount(item.unitPrice, data.currency)}</Text>
              <Text style={styles.col4}>{item.taxPercentage > 0 ? `${item.taxPercentage}%` : "-"}</Text>
              <Text style={styles.col5}>{formatAmount(finalItemTotal, data.currency)}</Text>
            </View>
          )
        })}

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={{ color: "#6b7280" }}>Subtotal</Text>
            <Text>{formatAmount(subTotal, data.currency)}</Text>
          </View>
          {totalDiscount > 0 && (
            <View style={styles.totalRow}>
              <Text style={{ color: "#6b7280" }}>Discount</Text>
              <Text>-{formatAmount(totalDiscount, data.currency)}</Text>
            </View>
          )}
          {totalTax > 0 && (
            <View style={styles.totalRow}>
              <Text style={{ color: "#6b7280" }}>Tax</Text>
              <Text>{formatAmount(totalTax, data.currency)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: "#e5e7eb" }]}>
            <Text style={{ fontWeight: "bold" }}>Grand Total</Text>
            <Text style={[styles.grandTotal, { color: data.themeColor || "#000" }]}>{formatAmount(grandTotal, data.currency)}</Text>
          </View>
        </View>

        {/* Notes & Terms */}
        <View style={{ marginTop: 30 }}>
          {data.notes && (
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.label}>Notes</Text>
              <Text style={{ color: "#4b5563" }}>{data.notes}</Text>
            </View>
          )}
          {data.terms && (
            <View>
              <Text style={styles.label}>Terms & Conditions</Text>
              <Text style={{ color: "#4b5563" }}>{data.terms}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{ textAlign: "center", color: "#9ca3af", fontSize: 8 }}>
            Generated for free using InvoiceAI
          </Text>
        </View>
      </Page>
    </Document>
  )
}
