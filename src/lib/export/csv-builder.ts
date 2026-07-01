import type { ProductCatalog, Customer, Invoice, InvoiceItem, Customer as PrismaCustomer } from "@prisma/client"

// ── RFC-4180 helpers ──────────────────────────────────────────────────────

function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  // Quote if contains comma, double-quote, or newline
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(...cells: (string | number | null | undefined)[]): string {
  return cells.map(esc).join(",")
}

// ── Catalog CSV ───────────────────────────────────────────────────────────

export function buildCatalogCsv(items: ProductCatalog[]): string {
  const header = row("name", "description", "hsn_sac", "unit_price", "tax_percentage", "unit", "is_active", "created_at")
  const rows = items.map(i =>
    row(
      i.name,
      i.description,
      i.hsnSac,
      i.unitPrice,
      i.taxPercentage,
      i.unit,
      i.isActive ? "true" : "false",
      i.createdAt.toISOString().split("T")[0]
    )
  )
  return [header, ...rows].join("\r\n")
}

// ── Customer CSV ──────────────────────────────────────────────────────────

export function buildCustomerCsv(customers: Customer[]): string {
  const header = row("name", "company_name", "gstin", "pan", "email", "phone", "address", "state", "country", "crm_status", "created_at")
  const rows = customers.map(c =>
    row(
      c.name,
      c.companyName,
      c.gstin,
      c.pan,
      c.email,
      c.phone,
      c.address,
      c.state,
      c.country,
      c.crmStatus,
      c.createdAt.toISOString().split("T")[0]
    )
  )
  return [header, ...rows].join("\r\n")
}

// ── Invoice CSV (summary) ─────────────────────────────────────────────────

type InvoiceWithRelations = Invoice & {
  customer: PrismaCustomer
  items: InvoiceItem[]
}

export function buildInvoicesCsv(invoices: InvoiceWithRelations[]): string {
  const header = row(
    "invoice_number", "date", "due_date", "status",
    "customer_name", "customer_gstin",
    "sub_total", "total_tax", "total_discount", "final_amount", "amount_paid", "balance_due",
    "currency"
  )
  const rows = invoices.map(inv =>
    row(
      inv.invoiceNumber,
      inv.date.toISOString().split("T")[0],
      inv.dueDate.toISOString().split("T")[0],
      inv.status,
      inv.customer.name,
      inv.customer.gstin,
      inv.subTotal,
      inv.totalTax,
      inv.totalDiscount,
      inv.finalAmount,
      inv.amountPaid,
      inv.balanceDue,
      inv.currency
    )
  )
  return [header, ...rows].join("\r\n")
}

// ── Invoice JSON (full export) ────────────────────────────────────────────

export function buildInvoicesJson(invoices: InvoiceWithRelations[]): string {
  const data = invoices.map(inv => ({
    invoiceNumber: inv.invoiceNumber,
    date:          inv.date.toISOString().split("T")[0],
    dueDate:       inv.dueDate.toISOString().split("T")[0],
    status:        inv.status,
    currency:      inv.currency,
    customer: {
      name:        inv.customer.name,
      companyName: inv.customer.companyName,
      gstin:       inv.customer.gstin,
      email:       inv.customer.email,
      phone:       inv.customer.phone,
      address:     inv.customer.address,
      state:       inv.customer.state,
    },
    items: inv.items.map(it => ({
      description:   it.description,
      hsnSac:        it.hsnSac,
      quantity:      it.quantity,
      unitPrice:     it.unitPrice,
      discount:      it.discount,
      taxPercentage: it.taxPercentage,
      taxableAmount: it.taxableAmount,
      taxAmount:     it.taxAmount,
      total:         it.total,
    })),
    subTotal:      inv.subTotal,
    totalDiscount: inv.totalDiscount,
    totalTax:      inv.totalTax,
    cgstAmount:    inv.cgstAmount,
    sgstAmount:    inv.sgstAmount,
    igstAmount:    inv.igstAmount,
    finalAmount:   inv.finalAmount,
    amountPaid:    inv.amountPaid,
    balanceDue:    inv.balanceDue,
    notes:         inv.notes,
    terms:         inv.terms,
  }))
  return JSON.stringify(data, null, 2)
}

// ── Invoice XML (UBL 2.1 subset) ──────────────────────────────────────────

export function buildInvoicesXml(invoices: InvoiceWithRelations[]): string {
  const escXml = (s: string | null | undefined) =>
    (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

  const invoiceXml = invoices.map(inv => `  <Invoice>
    <cbc:ID>${escXml(inv.invoiceNumber)}</cbc:ID>
    <cbc:IssueDate>${inv.date.toISOString().split("T")[0]}</cbc:IssueDate>
    <cbc:DueDate>${inv.dueDate.toISOString().split("T")[0]}</cbc:DueDate>
    <cbc:DocumentCurrencyCode>${escXml(inv.currency)}</cbc:DocumentCurrencyCode>
    <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
    <cac:AccountingCustomerParty>
      <cac:Party>
        <cac:PartyName><cbc:Name>${escXml(inv.customer.name)}</cbc:Name></cac:PartyName>
        <cbc:CompanyID>${escXml(inv.customer.gstin)}</cbc:CompanyID>
        <cbc:ElectronicMail>${escXml(inv.customer.email)}</cbc:ElectronicMail>
      </cac:Party>
    </cac:AccountingCustomerParty>
    <cac:LegalMonetaryTotal>
      <cbc:TaxExclusiveAmount currencyID="${escXml(inv.currency)}">${inv.subTotal}</cbc:TaxExclusiveAmount>
      <cbc:PayableAmount currencyID="${escXml(inv.currency)}">${inv.finalAmount}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
${inv.items.map((it, idx) => `    <cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity>${it.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${escXml(inv.currency)}">${it.total}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>${escXml(it.description)}</cbc:Description>
        ${it.hsnSac ? `<cbc:CommodityClassification>${escXml(it.hsnSac)}</cbc:CommodityClassification>` : ""}
      </cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="${escXml(inv.currency)}">${it.unitPrice}</cbc:PriceAmount></cac:Price>
    </cac:InvoiceLine>`).join("\n")}
  </Invoice>`).join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoices xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
          xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
${invoiceXml}
</Invoices>`
}
