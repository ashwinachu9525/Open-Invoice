# Welcome to the Open-Invoice Wiki

**Open-Invoice** is a specialized, multi-tenant B2B SaaS invoicing and compliance engine designed specifically for the Indian market. It bridges the gap between simple invoicing templates and complex, bloated ERP systems.

---

## 📖 Wiki Table of Contents

1. [[Getting Started & Installation]]
2. [[Custom Domain Setup]]
3. [[Tenant Database Isolation (BYODB)]]
4. [[Compliance & Tax Engine]]
5. [[API & Webhook Integrations]]

---

## ⚡ Core Feature Highlights

### 1. Indian Tax Compliance Engine
- **Multi-State GST Routing**: Dynamic calculation of IGST (inter-state) vs CGST + SGST (intra-state) based on business place-of-supply rules.
- **TDS & TCS Injections**: Tax Deducted at Source (under sections 194C/194J) and Tax Collected at Source configurations embedded directly in invoice line-items.
- **Structured Compliance Exports**: One-click exports matching Government GST Portal GSTR e-Invoice and E-Way Bill JSON structures.

### 2. White-Label Custom Domains
- Growth (PRO) and Enterprise clients can issue billing links and host client-facing payment pages under their own subdomains (e.g. `billing.yourcompany.com`).
- Automatic dynamic SSL certificates via Let's Encrypt managed by the server proxy.

### 3. Bring Your Own Database (BYODB)
- Deep database isolation letting privacy-sensitive clients supply their own PostgreSQL connection string.
- Zero-downtime, on-the-fly connection swapping with automated schema migrations.

### 4. Background Queues & Workflows
- Powered by **Inngest** for reliable, asynchronous execution of payment reminders, email dispatch retries, currency exchange rate synchronization, and automated cron retainer runs.
