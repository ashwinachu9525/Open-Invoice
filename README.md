# Indian Invoice SaaS

Production-ready invoice management platform for Indian freelancers, consultants, agencies, and SMBs. Built with Next.js 15+, React 19, Prisma, PostgreSQL, and Auth.js.

## Features

- **Authentication** — Email/password (Argon2), Google OAuth, email verification, password reset, RBAC
- **Company & Customer Management** — GSTIN, PAN, state-based tax profiles
- **Invoice Engine** — CGST/SGST/IGST auto-calculation, TDS (1–10%), line items with HSN/SAC
- **PDF Generation** — Professional invoices with QR code, tax breakdown, watermark for drafts
- **Payment Tracking** — UPI, bank transfer, Razorpay, Stripe
- **Recurring Invoices** — Weekly/monthly/quarterly via Inngest cron jobs
- **SMTP Module** — Encrypted credentials, test connection, invoice emails
- **Dashboard** — Revenue, pending/overdue amounts, GST/TDS totals, Recharts graphs
- **Reports** — GST, TDS, outstanding invoices (JSON/CSV export)
- **AI Features** — Natural language invoice generation, email writer, business insights (OpenAI)
- **Security** — Argon2 hashing, AES-256 encryption, rate limiting, audit logs, secure cookies

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui |
| Forms | React Hook Form + Zod |
| State | TanStack Query, Zustand |
| Backend | Server Actions, Route Handlers, Middleware |
| Database | PostgreSQL + Prisma ORM |
| Auth | Auth.js (NextAuth v5) JWT sessions |
| Jobs | Inngest |
| PDF | @react-pdf/renderer |
| Email | Nodemailer |
| Storage | AWS S3 / Cloudflare R2 |
| AI | OpenAI API |

## Quick Start

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Generate secrets:

```bash
openssl rand -base64 32  # AUTH_SECRET
openssl rand -base64 32  # ENCRYPTION_KEY
```

### 3. Choose your database

**Option A — SQLite (default, no setup required)**

Database is stored locally inside the project at `data/invoice.db`:

```bash
npm run db:configure:sqlite
```

**Option B — PostgreSQL (production)**

```bash
# Set in .env or via Settings UI
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/invoice_saas"

npm run db:configure:postgres
```

You can also switch databases anytime in **Settings → Database** in the app UI.

### 4. Database setup

```bash
npm run db:push    # or: npm run db:migrate
```

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register, set up your company profile, add customers, and create invoices.

## Project Structure

```
src/
├── app/              # Next.js App Router pages & API routes
├── actions/          # Server Actions
├── ai/               # OpenAI integrations
├── components/       # UI components
├── lib/              # Prisma, crypto, rate-limit, Inngest
├── pdf/              # React PDF templates
├── services/         # Tax engine, SMTP, storage, reports
├── tests/            # Vitest unit tests
├── types/            # TypeScript declarations
└── validations/      # Zod schemas
prisma/
└── schema.prisma     # Database schema
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run test` | Run unit tests |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:push` | Push schema to DB |
| `npm run db:studio` | Open Prisma Studio |

## Deployment (Vercel + PostgreSQL)

### Vercel

1. Push to GitHub and import in [Vercel](https://vercel.com)
2. Add environment variables from `.env.example`
3. Use [Vercel Postgres](https://vercel.com/storage/postgres) or [Neon](https://neon.tech) for `DATABASE_URL`
4. Set `NEXTAUTH_URL` to your production domain
5. Deploy — Vercel runs `prisma generate && next build` automatically

### Database migrations

```bash
npx prisma migrate deploy
```

### Inngest (recurring invoices)

1. Create an [Inngest](https://www.inngest.com) account
2. Add `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` to Vercel env
3. Register your app URL: `https://yourdomain.com/api/inngest`

### Docker

```bash
docker compose up --build
```

Runs the app on port 3000 with PostgreSQL on port 5432.

## GST/TDS Tax Engine

The tax engine (`src/services/tax-engine.ts`) automatically:

- Splits GST into **CGST + SGST** for intra-state transactions
- Applies **IGST** for inter-state transactions
- Calculates **TDS** on taxable amount (before GST)
- Supports custom line-item GST rates and discounts

## Security

- Passwords hashed with **Argon2**
- SMTP passwords encrypted with **AES-256-GCM**
- Rate limiting on auth and AI endpoints
- JWT sessions with secure/httpOnly cookies in production
- Audit logs for all critical actions
- Soft deletes on users, customers, invoices

## License

MIT
