import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "bold", color: "#1e40af", marginBottom: 5 },
  section: { marginBottom: 12 },
  label: { fontSize: 8, color: "#6b7280", marginBottom: 2 },
  value: { fontSize: 10, color: "#111827", fontWeight: "bold" },
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
  col2: { width: "30%" },
  col3: { width: "30%" },
  footer: { marginTop: 40, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 10, flexDirection: "row", justifyContent: "space-between" },
})

export const TestCertificateDocument = ({ certificate, company }: any) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>TEST CERTIFICATE</Text>
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>{company.name}</Text>
            <Text style={{ color: "#4b5563" }}>{company.address}</Text>
            <Text style={{ color: "#4b5563" }}>
              {company.email} | {company.phone}
            </Text>
            {company.gstNumber && <Text style={{ color: "#4b5563" }}>GSTIN: {company.gstNumber}</Text>}
          </View>
          {company.logo ? (
            <Image src={company.logo} style={{ width: 80, height: 80, objectFit: "contain" }} />
          ) : (
            <View style={{ width: 80, height: 80 }} />
          )}
        </View>

        <View style={{ borderBottomWidth: 1, borderBottomColor: "#e5e7eb", marginBottom: 20 }} />

        {/* Certificate Details & Customer Info */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
          <View style={{ width: "48%" }}>
            <Text style={styles.label}>CERTIFICATE NO.</Text>
            <Text style={styles.value}>{certificate.certificateNumber}</Text>
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>DATE OF TESTING</Text>
              <Text style={styles.value}>{new Date(certificate.date).toLocaleDateString()}</Text>
            </View>
            {certificate.invoice && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.label}>REFERENCE INVOICE</Text>
                <Text style={styles.value}>{certificate.invoice.invoiceNumber}</Text>
              </View>
            )}
          </View>
          <View style={{ width: "48%" }}>
            <Text style={styles.label}>ISSUED TO (CUSTOMER)</Text>
            <Text style={styles.value}>{certificate.customer.name}</Text>
            {certificate.customer.companyName && <Text style={{ color: "#4b5563" }}>{certificate.customer.companyName}</Text>}
            {certificate.customer.address && <Text style={{ color: "#4b5563" }}>{certificate.customer.address}</Text>}
          </View>
        </View>

        {/* Product Details */}
        <View style={{ marginBottom: 20, backgroundColor: "#f9fafb", padding: 10, borderRadius: 4 }}>
          <Text style={styles.label}>PRODUCT NAME / DESCRIPTION</Text>
          <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 5 }}>{certificate.productName}</Text>
          {certificate.batchNumber && (
            <>
              <Text style={styles.label}>BATCH / LOT NO.</Text>
              <Text style={styles.value}>{certificate.batchNumber}</Text>
            </>
          )}
        </View>

        {/* Test Parameters Table */}
        <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 5, marginTop: 10 }}>Test Results</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>Parameter</Text>
          <Text style={styles.col2}>Result</Text>
          <Text style={styles.col3}>Standard / Specification</Text>
        </View>
        {certificate.testedParameters && Array.isArray(certificate.testedParameters) && certificate.testedParameters.map((item: any, idx: number) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={styles.col1}>{item.parameter}</Text>
            <Text style={styles.col2}>{item.result}</Text>
            <Text style={styles.col3}>{item.standard}</Text>
          </View>
        ))}

        {/* Remarks */}
        {certificate.remarks && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.label}>REMARKS</Text>
            <Text style={{ fontSize: 10 }}>{certificate.remarks}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View>
             <Text style={{ fontSize: 8, color: "#9ca3af" }}>This is a computer-generated certificate.</Text>
          </View>
          <View style={{ textAlign: "right", marginTop: 20 }}>
            <Text style={{ fontWeight: "bold", marginBottom: 40 }}>For {company.name}</Text>
            <Text style={{ borderTopWidth: 1, borderTopColor: "#000", paddingTop: 5, width: 150, textAlign: "center" }}>
              {certificate.authorizedSignatory || "Authorized Signatory"}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
