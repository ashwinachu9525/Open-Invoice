import React from "react"
import { Document, Page, Text, View, StyleSheet, renderToStream } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica" },
  header: { fontSize: 18, marginBottom: 20, textAlign: "center", fontWeight: "bold" },
  table: { display: "flex", width: "auto", borderStyle: "solid", borderWidth: 1, borderRightWidth: 0, borderBottomWidth: 0 },
  tableRow: { margin: "auto", flexDirection: "row" },
  tableColHeader: { width: "20%", borderStyle: "solid", borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, backgroundColor: "#f0f0f0", padding: 5 },
  tableCol: { width: "20%", borderStyle: "solid", borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, padding: 5 },
  tableCellHeader: { margin: 2, fontSize: 10, fontWeight: "bold" },
  tableCell: { margin: 2, fontSize: 9 },
})

export async function generateReportPdf(title: string, data: Record<string, unknown>[]) {
  if (data.length === 0) {
    return renderToStream(
      <Document>
        <Page style={styles.page}>
          <Text style={styles.header}>{title}</Text>
          <Text>No data available for this report.</Text>
        </Page>
      </Document>
    )
  }

  const columns = Object.keys(data[0])

  return renderToStream(
    <Document>
      <Page style={{ ...styles.page, padding: 20 }} orientation="landscape">
        <Text style={styles.header}>{title}</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            {columns.map(col => (
              <View style={{ ...styles.tableColHeader, width: `${100 / columns.length}%` }} key={col}>
                <Text style={styles.tableCellHeader}>{col}</Text>
              </View>
            ))}
          </View>
          {data.map((row, i) => (
            <View style={styles.tableRow} key={i}>
              {columns.map(col => (
                <View style={{ ...styles.tableCol, width: `${100 / columns.length}%` }} key={col}>
                  <Text style={styles.tableCell}>{String(row[col] ?? "")}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
