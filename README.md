<h1 align="center">Open Invoice</h1>
<p align="center">
  <strong>Open Source AI-Powered Invoicing, Estimation & Indian GST Compliance Platform</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-application-modes-saas-vs-self-host">App Modes</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-api-documentation--developer-portal">API & Swagger</a> •
  <a href="#-super-admin-management-console">Super Admin</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1.0-blue.svg" alt="Version"/>
  <img src="https://img.shields.io/badge/license-Custom-green.svg" alt="License"/>
  <img src="https://img.shields.io/badge/node-20_LTS-brightgreen.svg" alt="Node"/>
  <img src="https://img.shields.io/badge/Next.js-15.x-black.svg" alt="NextJS"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6.svg" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748.svg" alt="Prisma"/>
</p>

---

## ✨ Why Open Invoice?

**Open Invoice** is a modern, self-hostable invoicing, quotation, and business estimation platform designed for freelancers, agencies, and small teams. It delivers enterprise-grade capabilities without the bloat, tracking expenses, automating drafts with AI, and exporting pixel-perfect, tax-compliant PDF documents.

Open Invoice supports dual deployment modes out of the box: a **Fully Free Self-Hosted Mode** for single businesses and a **Hosted SaaS Mode** complete with subscription tiers, usage limits, and admin approval workflows.

---

## 🎯 Features

### Core Capabilities
- **Invoice Generator**: Create detailed, line-itemized invoices with tax calculations. Supports custom currency symbols, exchange rate conversions, and customizable PDF branding.
- **Quotation Builder**: Create professional estimates and proposals. Clone quotation data directly into an invoice draft once accepted by a client.
- **Indian GST Suite**: Fully integrated CGST, SGST, IGST tax calculators, automated inter-state vs. intra-state jurisdiction detection, HSN/SAC code mapping, and customized **TDS deductions** configuration (including Section 194C, 194J, and 194H).
- **Payment & Bank Config**: Set up multiple bank accounts, customize payment terms, and select account coordinates to overlay onto PDF receipts.
- **Customer CRM**: Maintain a centralized directory of customer contact coordinates, addresses, shipping details, and tax registration IDs (GSTIN/Tax ID).
- **Product Catalog**: Manage reusable product lists and services with pre-configured rate sheets, standard billing units, and tax rates.
- **Expense Tracker**: Log outgoings, group expenses by category, and upload receipts to S3/R2 storage.
- **Email & WhatsApp Integration**: Send PDFs and payment reminders to clients via SMTP or WhatsApp messages using self-hosted nodes.

### Programmatic API & Documentation
- **Secured V1 REST API**: Access raw invoice and quotation tables programmatically. Secured via header-based API keys (`x-api-key`).
- **Interactive Swagger UI**: Served directly at `/docs` using local, CSP-compliant static assets. Offers sandboxed API exploration.
- **OpenAPI 3.0 Schema**: Exposes full API specification schemas dynamically at `/api/openapi.json`.

### Super Admin Console (Served at `/admin`)
- **System Metrics**: Visual tracking of total registered users, companies, active invoices, quotations, and collection efficiency.
- **Direct SQL Terminal**: Direct query console to run read/write queries against SQLite or PostgreSQL databases with transaction safety.
- **Audit & Email Logs**: Global history of user events, email logs (tracking delivery success/failure details), and application error crash logs.
- **API Key Inspector**: Search, inspect, and toggle the active status of user API keys globally.

### Security & Mobile PWA
- **Passkeys (WebAuthn)**: Register devices for modern, biometric passwordless sign-ins.
- **Multi-Factor Authentication (MFA)**: Secure account login using TOTP Authenticator apps (Google Authenticator, Authy).
- **Responsive Mobile Layout**: 100% optimized for mobile screens (320px–768px). Action drawers, popovers, and tables adapt gracefully to touch interfaces.
- **PWA Capabilities**: Installable application with local service workers, offline indicators, and network resilience.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `20.x LTS` (or newer)
- **Database**: SQLite (default, self-hosted) or PostgreSQL

### Local Installation
```bash
# 1. Clone the repository
git clone https://github.com/your-username/open-invoice.git
cd open-invoice

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env
# Edit .env and supply secrets (e.g. AUTH_SECRET, ENCRYPTION_KEY)

# 4. Configure your database provider
# For SQLite (default):
npm run db:configure:sqlite
# For PostgreSQL:
npm run db:configure:postgres

# 5. Initialize the database schema
npm run db:push

# 6. Start the development server
npm run dev
```

The application is now accessible at `http://localhost:3000`.

---

## 🎛️ Application Modes (SaaS vs Self-Host)

The platform behavior is controlled by the `APP_MODE` environment variable:

- **Self-Hosted Mode (`APP_MODE="selfhost"` or empty)**:
  Bypasses all license checks, subscription paywalls, and usage limits. Enables unlimited invoices, quotations, AI credits, and active companies.
- **Hosted SaaS Mode (`APP_MODE="paid"`)**:
  Enforces a 5-invoice free tier limit. Prompts users to upgrade to Pro and submits requests to the Super Admin panel for licensing. Restricts anonymous generation to 3 requests per IP/day.

---

## 🔧 Environment Variables Configuration

Configure these parameters in your `.env` file:

```ini
# Database Config
DATABASE_PROVIDER="sqlite" # "sqlite" or "postgresql"
DATABASE_URL="file:./data/invoice.db" # Or postgresql connection string

# Core Encryption Keys
# Generate secrets using: openssl rand -base64 32
AUTH_SECRET="your-auth-secret-min-32-characters-long"
ENCRYPTION_KEY="your-encryption-key-min-32-characters" # For encrypting SMTP passwords

# Super Admin Config
ADMIN_SQL_PASSWORD="your-admin-sql-console-password"

# Optional OAuth (Google Login)
GOOGLE_CLIENT_ID="google-client-id"
GOOGLE_CLIENT_SECRET="google-client-secret"

# AI Core Configuration
OPENAI_API_KEY="sk-..."

# File Storage Configuration (Optional, S3 / Cloudflare R2)
S3_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_ACCESS_KEY_ID="s3-access-key-id"
S3_SECRET_ACCESS_KEY="s3-secret-access-key"
S3_BUCKET_NAME="invoice-bucket"

# Background Job Engine (Inngest)
INNGEST_EVENT_KEY="your-inngest-event-key"
INNGEST_SIGNING_KEY="your-inngest-signing-key"

# Global System SMTP for signup/verification
APP_SMTP_HOST="smtp.mailtrap.io"
APP_SMTP_PORT=587
APP_SMTP_USER="smtp-username"
APP_SMTP_PASS="smtp-password"
APP_SMTP_FROM="noreply@openinvoice.com"

# Cache Configuration (Redis / Valkey)
VALKEY_URL="rediss://default:password@host:port"

# PWA Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="vapid-public-key"
VAPID_PRIVATE_KEY="vapid-private-key"
VAPID_SUBJECT="mailto:support@openinvoice.com"

# Application Mode Toggle
APP_MODE="" # "selfhost" or "paid"
```

---

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Actions, API routes)
- **Language**: [TypeScript 5.x](https://www.typescriptlang.org/)
- **ORM**: [Prisma ORM](https://www.prisma.io/)
- **UI & Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [Radix UI / Base UI](https://base-ui.com/)
- **Auth**: [Auth.js v5](https://authjs.dev/) (WebAuthn credentials, TOTP MFA, OAuth)
- **Background Processes**: [Inngest](https://www.inngest.com/)
- **Caching**: Valkey / Redis
- **Testing**: [Vitest](https://vitest.dev/) (Unit/Integration) + [Playwright](https://playwright.dev/) (E2E)

---

## 📁 Project Structure

```
open-invoice/
├── src/
│   ├── app/                    # Next.js App Router Pages, layouts & APIs
│   │   ├── (dashboard)/        # Invoices, Quotations, Settings, AI, CRM, Catalog
│   │   ├── (super-admin)/      # Central management `/admin` routes
│   │   ├── api/                # Secured V1 endpoints & spec schemas
│   │   ├── docs/               # Interactive Swagger UI route
│   │   └── layout.tsx          # App entry frame & theme providers
│   ├── components/             # React visual components (ui, forms, layout)
│   ├── actions/                # Next.js Server Actions (CRUD Operations)
│   ├── lib/                    # Shared libraries (Prisma, encryption, auth adapters)
│   ├── services/               # Core business log (tax engine, AI interfaces)
│   └── auth.ts                 # Auth.js configuration & credentials callbacks
├── prisma/                     # Database Schema configurations & migrations
├── public/                     # Static media assets & local Swagger UI bundles
├── scripts/                    # Database setup and configuration scripts
├── package.json
└── README.md
```

---

## ⚙️ Available Scripts

Run these scripts using `npm run <script>`:

- `dev`: Start the Next.js development server with Turbopack (`next dev --turbo`).
- `build`: Build the production-ready Next.js bundle.
- `start`: Run the built production application.
- `lint`: Run ESLint to analyze code quality and potential syntax errors.
- `test`: Run all unit and integration tests via Vitest.
- `test:watch`: Start the Vitest runner in watch mode.
- `db:configure`: Automatically execute database configuration based on `.env` settings.
- `db:configure:sqlite`: Force configure the local SQLite database.
- `db:configure:postgres`: Force configure PostgreSQL adapter.
- `db:migrate`: Generate and apply migrations database schemas.
- `db:push`: Push local schema changes directly to the database without generating migration files (recommended for fast iterations).
- `db:studio`: Open Prisma Studio visual GUI database manager.

---

## 🔐 Authentication & Authorization Flows

### Role-Based Access Controls (RBAC)
1. **SUPER_ADMIN**: Accesses the `/admin` control panels, direct SQL terminals, global audit logs, and API key toggles. Cannot view normal company financial dashboards unless acting as a standard user.
2. **ADMIN**: Standard company owner. Full read/write access to invoice tables, quotations, bank accounts, SMTP configurations, and team invites.
3. **STAFF**: Invited team member. Can compile, draft, and issue invoices or quotations. Blocked from viewing expense lists, financial analytics, reports, or modifying company profile/banking details.

### Security Profiles
- **Biometric WebAuthn Passkeys**: Allows secure login via device credentials. Setting up a passkey acts as a single-step multi-factor authentication, satisfying both login factors in one gesture.
- **TOTP Authenticator Apps**: Users can configure Multi-Factor Authentication (MFA) via 2FA apps. Backup/secret codes are stored encrypted in the database.

---

## 🔌 API Integrations & External Services

- **WhatsApp Sharing**: Connect to an instance of `open-wa` API node. Send invoice PDF links directly to customer phone numbers with one click.
- **AI Models Integration**: Connects to OpenAI (`gpt-4o`/`gpt-3.5-turbo`), Google Gemini (`gemini-2.5-flash`), or NVIDIA Nim APIs. Supports conversational billing commands and automated document item drafting.

---

## 🧪 Testing

### Unit & Integration Tests
Tests are configured using **Vitest** for quick execution:
```bash
npm run test
```

### End-to-End (E2E) Tests
Playwright tests are configured under the `e2e` directory. To run E2E scenarios:
```bash
npx playwright test
```

---

## 🚀 Deployment Instructions

### Self-Hosted (Single Server/Docker)
A `Dockerfile` and `docker-compose.yml` are provided in the repository. To build and run:
```bash
docker-compose up --build -d
```

### Vercel / Cloud Platforms
1. Link your git repository to Vercel.
2. Add your environment variables (refer to `.env.example`).
3. Set your build command override if using custom database configurations: `npm run build`.
4. Ensure `DATABASE_PROVIDER="postgresql"` is set if deploying to external relational databases.

---

## 🆕 What's New (Changelog)

### Version 1.1.0 (June 2026)
- **Programmatic REST APIs (V1)**: Secured, token-based programmatic endpoints for managing invoices and quotations.
- **Local Swagger Portal**: Added a locally served, interactive developer documentation dashboard at `/docs`, completely bypassing external CDN dependencies to satisfy strict Content Security Policy directives.
- **Centralized API Key Manager**: Embedded an inspector in the Super Admin dashboard to search, verify, and activate/deactivate API keys globally.
- **Mobile Viewport Optimization**: Conducted a full audit to achieve 100% responsiveness across viewports (320px to 768px), adding responsive drawers for AI chat logs and refactoring popovers.
- **TDS Tax Compliance**: Integrated Section-specific TDS rates (194C, 194J, 194H) directly into invoice line items and summaries.

---

## ⚖️ License & Usage Conditions

**CUSTOM NON-COMMERCIAL SELF-HOSTED LICENSE**

This project is open-source, but it comes with strict commercial limitations:

✅ **ALLOWED:**
- Self-host the application for your own personal use.
- Use it internally to run your own freelance business or agency billing.
- Modify the codebase to suit your internal workflows.

❌ **NOT ALLOWED:**
- Sell, resell, or distribute this software for profit.
- Deploy the application as a public SaaS (Software as a Service) to charge other users for access.
- Re-package, white-label, or distribute the codebase.

See the [LICENSE](./LICENSE) file for the full legal text.
