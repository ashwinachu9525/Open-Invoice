# Compliance & Indian Tax Engine

The core value proposition of Open-Invoice is its specialized Indian Tax Engine that accurately handles regional regulations.

---

## 📊 Tax Classifications

### 1. Goods & Services Tax (GST)
- **CGST + SGST (Intra-State)**: Automatically triggered if the Company address state matches the Customer address state.
- **IGST (Inter-State)**: Triggered when states differ, or for foreign export billing transactions.
- **Reverse Charge Mechanism (RCM)**: Toggle support inside line item creation forms.

### 2. Tax Deducted at Source (TDS)
- Supports TDS sections such as **194C** (Contracts, 1% or 2%) and **194J** (Professional Services, 10% or 2%).
- Deductible values are calculated automatically at line-item totals and highlighted in the invoice summary.

### 3. Tax Collected at Source (TCS)
- Enables regulatory tax collections for specific business domains at default rates.

---

## 🗂️ Government Schema Validation
Open-Invoice generates structured exports that match NIC and GSTR government schema requirements:
- **E-Invoice (JSON)**: Fully structured schema format ready to upload directly to the Invoice Registration Portal (IRP).
- **UBL 2.1 XML**: Global B2B schema format for tax systems.
- **Bulk CSV Export**: Standard accounting import file templates.
