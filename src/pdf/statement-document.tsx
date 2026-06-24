import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#1e293b", backgroundColor: "#ffffff" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  title: { fontSize: 24, fontWeight: "bold", letterSpacing: 1 },
  label: { fontSize: 9, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  section: { marginBottom: 20 },
  tableHeader: { flexDirection: "row", padding: "8 10", borderRadius: 4, marginTop: 15, fontSize: 9, fontWeight: "bold" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", padding: "8 10", fontSize: 9 },
  col1: { width: "20%" }, // Date
  col2: { width: "25%" }, // Invoice #
  col3: { width: "20%" }, // Status
  col4: { width: "15%", textAlign: "right" }, // Amount
  col5: { width: "20%", textAlign: "right" }, // Balance Due
  totals: { marginTop: 20, width: "100%", alignItems: "flex-end" },
  totalRow: { flexDirection: "row", width: "40%", justifyContent: "space-between", paddingVertical: 4 },
  grandTotal: { fontWeight: "bold", fontSize: 12 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40 },
})

export const formatPdfINR = (amount: number) => {
  return "Rs. " + amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface StatementProps {
  customer: {
    name: string
    companyName?: string | null
    address?: string | null
    email?: string | null
    phone?: string | null
  }
  company: {
    name: string
    address?: string | null
    email?: string | null
    phone?: string | null
    logo?: string | null
  }
  invoices: {
    date: Date
    dueDate: Date
    invoiceNumber: string
    status: string
    finalAmount: number
    balanceDue: number
  }[]
  totalBilled: number
  totalPaid: number
  totalOutstanding: number
  themeColor?: string
}

export function StatementDocument({ customer, company, invoices, totalBilled, totalPaid, totalOutstanding, themeColor = "#1e40af" }: StatementProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {company.logo && <Image src={company.logo} style={{ width: 80, height: 40, marginBottom: 8 }} />}
            <Text style={styles.label}>FROM</Text>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>{company.name}</Text>
            {company.address && <Text>{company.address}</Text>}
            {company.email && <Text>{company.email}</Text>}
            {company.phone && <Text>Phone: {company.phone}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.title, { color: themeColor }]}>STATEMENT</Text>
            <Text>Date: {new Date().toLocaleDateString("en-IN")}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>TO (CUSTOMER)</Text>
          <Text style={{ fontWeight: "bold" }}>{customer.name}</Text>
          {customer.companyName && <Text>{customer.companyName}</Text>}
          {customer.address && <Text>{customer.address}</Text>}
          {customer.email && <Text>{customer.email}</Text>}
          {customer.phone && <Text>Phone: {customer.phone}</Text>}
        </View>

        {/* Summary Boxes */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20, backgroundColor: "#f8fafc", padding: 15, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0" }}>
          <View style={{ alignItems: "center", width: "30%" }}>
            <Text style={styles.label}>Total Billed</Text>
            <Text style={{ fontSize: 12, fontWeight: "bold" }}>{formatPdfINR(totalBilled)}</Text>
          </View>
          <View style={{ alignItems: "center", width: "30%" }}>
            <Text style={styles.label}>Total Paid</Text>
            <Text style={{ fontSize: 12, fontWeight: "bold" }}>{formatPdfINR(totalPaid)}</Text>
          </View>
          <View style={{ alignItems: "center", width: "30%" }}>
            <Text style={[styles.label, { color: themeColor }]}>Amount Due</Text>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: themeColor }}>{formatPdfINR(totalOutstanding)}</Text>
          </View>
        </View>

        <View style={[styles.tableHeader, { backgroundColor: `${themeColor}1A` }]}>
          <Text style={[styles.col1, { color: themeColor }]}>Date</Text>
          <Text style={[styles.col2, { color: themeColor }]}>Invoice #</Text>
          <Text style={[styles.col3, { color: themeColor }]}>Status</Text>
          <Text style={[styles.col4, { color: themeColor }]}>Amount</Text>
          <Text style={[styles.col5, { color: themeColor }]}>Balance Due</Text>
        </View>

        {invoices.map((inv, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.col1}>{new Date(inv.date).toLocaleDateString("en-IN")}</Text>
            <Text style={styles.col2}>{inv.invoiceNumber}</Text>
            <Text style={styles.col3}>{inv.status}</Text>
            <Text style={styles.col4}>{formatPdfINR(inv.finalAmount)}</Text>
            <Text style={styles.col5}>{formatPdfINR(inv.balanceDue)}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={{ fontSize: 8, color: "#9ca3af", textAlign: "center", marginBottom: 12 }}>
            This is an electronically generated statement.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
