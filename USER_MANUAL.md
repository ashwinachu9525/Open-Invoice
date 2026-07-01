# Open-Invoice User Manual & Help Guide

Welcome to **Open-Invoice**, your enterprise-grade, AI-powered B2B invoicing and financial management platform. This comprehensive guide will walk you through all the features and provide step-by-step instructions on how to get the most out of the application.

---

## Table of Contents
1. [Getting Started & Security](#1-getting-started--security)
2. [Company Setup](#2-company-setup)
3. [Customers & Catalog](#3-customers--catalog)
4. [Invoices & Quotations](#4-invoices--quotations)
5. [Expenses & Reports](#5-expenses--reports)
6. [Team Management](#6-team-management)
7. [Advanced Features (AI & Email)](#7-advanced-features)
8. [Custom Domain Setup](#8-custom-domain-setup)

---

## 1. Getting Started & Security

Open-Invoice provides bank-level security for your business data. 

### How to configure Passkeys (Passwordless Login)
Passkeys allow you to log in using your fingerprint, FaceID, or device PIN.
1. Navigate to **Settings** from the sidebar.
2. Scroll to the **Security & Authentication** section.
3. Click **Setup Passkey** and follow your browser's prompt to register your device.
4. On your next login, simply click "Sign in with Passkey".

### How to enable Multi-Factor Authentication (MFA)
Protect your account with a 6-digit Authenticator code.
1. Navigate to **Settings** -> **Security & Authentication**.
2. Click **Setup MFA**.
3. Scan the QR code using Google Authenticator, Authy, or Apple Passwords.
4. Enter the 6-digit code shown on your app to verify and enable.

> **Note:** If you use a Passkey to log in, you will naturally bypass the MFA requirement as Passkeys are already multi-factor!

---

## 2. Company Setup

Before you create your first invoice, configure your company profile to ensure your invoices look professional.

### Update Company Profile
1. Navigate to **Settings**.
2. Scroll to **Company Profile**.
3. Enter your Business Name, Address, GSTIN/Tax ID, and PAN.
4. Click **Save**. These details will automatically appear on all future PDFs.

### Add Bank Accounts
1. In **Settings**, find the **Bank Accounts** section.
2. Click **Add Account** and enter the Bank Name, Account Number, and IFSC/Routing code.
3. You can set one account as your "Default". It will be automatically selected when creating new invoices.

### Invoice Numbering Prefix
1. In **Settings**, go to **Invoice Numbering**.
2. Change your prefix (e.g., from `INV-` to `MYBIZ-2024-`). The system will auto-increment from there.

---

## 3. Customers & Catalog

Manage your clients and your products/services to speed up the invoicing process.

### Adding a Customer
1. Navigate to **Customers** in the sidebar and click **+ New Customer**.
2. Fill in the required details (Name, Email, Phone, Billing Address).
3. Optionally add tax identifiers like GSTIN.
4. Once saved, you can click on the customer to view their **Statement of Account**, which shows their unpaid invoices and total balance.

### Managing the Catalog (Items)
1. Go to **Catalog**.
2. Click **+ New Item** to add products or services you frequently bill for.
3. Set a default Name, Description, Price, and Tax Rate.
4. When creating an invoice, you can simply select items from your catalog instead of typing them out manually.

---

## 4. Invoices & Quotations

The core of Open-Invoice. Create, send, and manage your billing.

### Creating a Quotation (Estimate)
1. Go to **Quotations** -> **Create Quotation**.
2. Select a Customer.
3. Add items from your Catalog or type custom line items.
4. Save the quotation. You can export it as a PDF or send it directly via email.
5. Once a customer accepts the quotation, click **Convert to Invoice** to instantly draft an invoice from it.

### Creating an Invoice
1. Go to **Invoices** -> **Create Invoice**.
2. Select the Customer and the Due Date.
3. Add your line items.
4. (Optional) Use the **AI Assist** button to auto-generate item descriptions or suggest pricing based on your past invoices.
5. Select the Bank Account where you want to receive payment.
6. Click **Save**. 

### Managing Invoices
- **Status Tracking:** Mark invoices as `Sent`, `Paid`, or `Overdue`.
- **PDF Export:** Click the **Download PDF** button to generate a beautifully formatted, print-ready document.
- **Trash:** Deleted invoices are moved to the **Trash** tab where they can be restored if deleted by mistake.

---

## 5. Expenses & Reports

Track where your money goes and analyze your business health.

### Logging an Expense
1. Navigate to **Expenses** -> **Record Expense**.
2. Enter the Vendor name, Amount, Date, and Category (e.g., Software, Travel, Office Supplies).
3. Attach a receipt (image or PDF) for your records.

### Generating Financial Reports
1. Go to **Reports**.
2. Select your date range (e.g., This Month, Last Quarter, Year to Date).
3. The dashboard will automatically calculate your:
   - Total Revenue (from Paid Invoices)
   - Total Expenses
   - Net Profit
4. Export the data to CSV/Excel for your accountant or to import into tools like Tally.

---

## 6. Team Management

Open-Invoice is a multi-tenant platform, meaning you can invite your employees to manage the system with you.

### Inviting a Team Member
1. Navigate to **Settings** -> **Team Management**.
2. Click **Invite Member**.
3. Enter their email address and select their **Role**:
   - `ADMIN`: Full access, including settings and team management.
   - `STAFF`: Can create invoices and customers, but cannot view reports, change bank accounts, or delete records.
4. The user will receive an email invitation to join your workspace.

---

## 7. Advanced Features

### AI Integrations
Open-Invoice utilizes advanced AI (OpenAI, Gemini, or local Nvidia models) to speed up your workflow.
1. Navigate to **Settings** -> **AI Settings**.
2. Enter your API Key for your preferred provider.
3. You can now use AI to:
   - Auto-complete invoice line items.
   - Categorize your expenses automatically from uploaded receipts.
   - Generate professional payment reminder emails.

### Email & SMTP Configuration
Send invoices directly from your own email address.
1. Go to **Settings** -> **Email / SMTP Settings**.
2. Enter your SMTP host, port, username, and password. (Your password is encrypted with AES-256 before being stored).
3. Once configured, you can click **Send Email** directly from any invoice to dispatch the PDF to your customer without downloading it first. You can track sent emails in the **Email Logs** tab.

---

## 8. Custom Domain Setup

### What is Custom Domain Support?
Custom domain support allows Growth (PRO) and Enterprise clients to publish public-facing invoice and quotation billing links under their own branded domain (e.g. `billing.yourcompany.com`) rather than the platform's default domain.

### Step-by-Step Configuration

#### Step 1: Configure your DNS Records
First, configure your custom domain with your DNS provider (Cloudflare, GoDaddy, Namecheap, AWS Route 53, etc.):
1. Add a new **CNAME** record.
2. Set the **Host/Name** to your preferred subdomain (e.g., `billing` or `invoices`).
3. Point the **Target/Value** to: `cname.open-invoice.com`.
4. (Optional) If using Cloudflare, make sure the proxy setting is set to **DNS Only** (Grey Cloud) to allow Caddy/Let's Encrypt SSL challenges to pass directly to your servers.

#### Step 2: Add Domain in Settings
1. Navigate to **Settings** in the Open-Invoice dashboard.
2. Scroll to the **Custom Domain Configuration** card.
3. Enter your domain name exactly as configured (e.g., `billing.yourcompany.com`).
4. Click **Save Changes**.

---

### How to Check and Test Your Custom Domain Setup

To verify that your custom domain is configured and working as expected:

#### 1. Verify DNS Propagation
Run a lookup in your terminal to verify that the CNAME records have propagated:
```bash
nslookup billing.yourcompany.com
```
You should see it resolving/pointing to `cname.open-invoice.com` (or your platform's server IP).

#### 2. Test Dynamic SSL Handshake
Once DNS points to your server, attempt to open your custom domain in a web browser using HTTPS:
`https://billing.yourcompany.com`

- **First Visit Hook**: On the first visit, your reverse proxy (e.g. Caddy) will send an automated request to the backend validation endpoint `/api/public/verify-domain?domain=billing.yourcompany.com` to check authorization.
- If allowed, it requests a Let's Encrypt SSL certificate. This takes **2 to 3 seconds** on the very first load. Subsequent loads will be instant.

#### 3. Test Billing Page Rewriting
Open an invoice billing link using your custom domain:
`https://billing.yourcompany.com/p/invoice/[id]`

- The page should load your standard client-facing invoice preview showing all line items, totals, and branding.
- **Security Validation Check**: Verify that the browser's address bar remains exactly as `https://billing.yourcompany.com/p/invoice/[id]`, showing that the internal Next.js rewrite is working securely.
- **Tenant Scope Check**: Attempting to load an invoice ID belonging to another company using your domain will yield a **404 Not Found** page.

