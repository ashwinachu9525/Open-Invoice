<h1 align="center">Open Invoice</h1>
<p align="center">
  <strong>Open Source AI-Powered Invoicing & Estimation Platform</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version"/>
  <img src="https://img.shields.io/badge/license-Custom-green.svg" alt="License"/>
  <img src="https://img.shields.io/badge/node-20_LTS-brightgreen.svg" alt="Node"/>
  <img src="https://img.shields.io/badge/Next.js-15.x-black.svg" alt="NextJS"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6.svg" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748.svg" alt="Prisma"/>
</p>

---

## ✨ Why Open Invoice?

**Open Invoice** is a powerful, self-hostable invoicing and estimation platform designed for freelancers, agencies, and businesses who want full control over their billing workflows without paying monthly subscription fees.

Built on a modern **Next.js 15 App Router** architecture, Open Invoice integrates seamlessly with cutting-edge AI (OpenAI, Gemini, NVIDIA) to automate invoice generation, while keeping your data private and secure.

|                               |                                                              |
| ----------------------------- | ------------------------------------------------------------ |
| 🔓 **100% Free Self-Hosted**  | Host it yourself and use all features for free forever       |
| 🤖 **AI Native Generation**   | Chat with AI to instantly draft structured, GST-ready invoices|
| 🏢 **Multi-Company Support**  | Manage multiple brands and SMTP settings in one dashboard    |
| 🎨 **Stunning PDF Exports**   | Pixel-perfect, customizable PDFs rendered at the edge        |
| 🔐 **Passkey Security**       | Modern WebAuthn and MFA for enterprise-grade protection      |

---

## 🎯 Features

### Core Capabilities

| Feature           | Status | Description                          |
| ----------------- | ------ | ------------------------------------ |
| Invoice Generator | ✅     | Create detailed invoices instantly   |
| Quotation Builder | ✅     | Send estimates and quotes to clients |
| Dashboard UI      | ✅     | Modern React UI for managing data    |
| Multi-Company     | ✅     | Switch between different business profiles |
| SMTP Integration  | ✅     | Send emails via your own mail server |

### AI Integration

| Feature           | Status | Description                      |
| ----------------- | ------ | -------------------------------- |
| OpenAI Support    | ✅     | Connect your OpenAI API keys     |
| Google Gemini     | ✅     | Connect your Google AI keys      |
| NVIDIA AI         | ✅     | Connect your NVIDIA AI keys      |
| Chat-to-Invoice   | ✅     | Conversational AI generation     |

### Security & Infrastructure

| Feature             | Status | Description                        |
| ------------------- | ------ | ---------------------------------- |
| Passkey (WebAuthn)  | ✅     | Passwordless secure login          |
| App Modes           | ✅     | Toggle between `selfhost` and `paid` SaaS modes |
| Rate Limiting       | ✅     | IP and User-based usage quotas     |
| XSS Protection      | ✅     | Aggressive isomorphic DOM sanitization |

---

## 🚀 Quick Start

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/your-username/open-invoice.git
cd open-invoice

# 2. Install dependencies
npm install

# 3. Setup Environment Variables
cp .env.example .env
# Important: Leave APP_MODE="" or APP_MODE="selfhost" to bypass all SaaS limits

# 4. Initialize Database
npx prisma db push

# 5. Start Development Server
npm run dev

# Access
# Dashboard: http://localhost:3000
```

---

## 🎛️ Application Modes (SaaS vs Self-Host)

Open Invoice is designed to be run as either a free self-hosted tool or a monetized SaaS. This is controlled entirely by the `APP_MODE` environment variable.

- `APP_MODE="selfhost"` (or empty): **Fully Free Mode.** All SaaS rate limits and Pro upgrade paywalls are disabled.
- `APP_MODE="paid"`: **SaaS Mode.** Activates strict usage quotas (e.g., 3 anonymous generations/day, 4 AI chats/user).

---

## 🛠 Tech Stack

| Layer         | Technology              |
| ------------- | ----------------------- |
| **Runtime**   | Node.js 20 LTS          |
| **Framework** | Next.js 15 (App Router) |
| **Language**  | TypeScript 5.x          |
| **Styling**   | Tailwind CSS + Radix UI |
| **Database**  | SQLite / PostgreSQL     |
| **ORM**       | Prisma                  |
| **Auth**      | Auth.js (NextAuth v5)   |
| **Cache**     | Redis / Valkey          |

---

## 📁 Project Structure

```
open-invoice/
├── src/
│   ├── app/                    # Next.js App Router (Pages & API)
│   ├── components/             # React Components (UI, Modals, Forms)
│   ├── lib/                    # Core libraries, Prisma, and Utilities
│   ├── actions/                # Next.js Server Actions
│   └── auth.ts                 # Auth.js Configuration
├── prisma/                     # Database Schema & Migrations
├── public/                     # Static Assets
├── .env.example
├── package.json
└── README.md
```

---

## 🤝 Contributing

We welcome community contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please read our [Development Guidelines](./docs/08-development-guidelines.md) for coding standards and best practices.

---

## ⚖️ License & Usage Conditions

**CUSTOM NON-COMMERCIAL SELF-HOSTED LICENSE**

This project is open-source, but it comes with strict commercial limitations to protect the core intellectual property:

✅ **ALLOWED:**
- You may self-host this application for your own personal use.
- You may use it internally to run your own freelance business or agency billing.
- You may modify the code for your own internal workflows.

❌ **NOT ALLOWED:**
- You may **NOT** sell or resell this software.
- You may **NOT** deploy this application as a public SaaS (Software as a Service) to charge other users for access.
- You may **NOT** re-package, white-label, or distribute this codebase for commercial profit.

See [LICENSE](./LICENSE) for details.

---

<div align="center">

**Open Invoice** – Free, Open Source AI Invoicing Platform

[🐛 Report Bug](https://github.com/your-username/open-invoice/issues) · [💡 Request Feature](https://github.com/your-username/open-invoice/issues)

<br/>

<sub>Made with ❤️ by the Open Invoice Community</sub>

</div>
