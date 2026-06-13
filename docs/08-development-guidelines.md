# 08 - Development Guidelines

## 8.1 Project Structure

```
open-invoice/
├── src/
│   ├── app/                       # Next.js App Router (Pages, Layouts, API Routes)
│   │   ├── (dashboard)/           # Protected dashboard routes
│   │   ├── (super-admin)/         # Super admin routes
│   │   ├── api/                   # API endpoints (App Router)
│   │   └── layout.tsx             # Root layout
│   │
│   ├── components/                # React Components
│   │   ├── ui/                    # Reusable primitive UI components (shadcn/ui)
│   │   ├── modals/                # Application modals
│   │   ├── public/                # Components for public-facing pages
│   │   └── ...
│   │
│   ├── lib/                       # Core utilities and libraries
│   │   ├── prisma.ts              # Prisma client initialization
│   │   ├── redis.ts               # Valkey/Redis client
│   │   ├── usage.ts               # Rate limiting & usage engine
│   │   └── utils.ts               # Tailwind/CSS utilities
│   │
│   ├── actions/                   # Next.js Server Actions
│   │   ├── ai-chat.ts             # AI generation logic
│   │   └── document.ts            # Document generation actions
│   │
│   └── auth.ts                    # Auth.js (NextAuth v5) Configuration
│
├── prisma/                        # Database ORM
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Database migrations
│
├── public/                        # Static Assets (Images, Fonts)
├── docs/                          # Documentation
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## 8.2 Coding Standards

### Naming Conventions

```typescript
// Files: kebab-case
ai-chat.ts
document-preview.tsx
upgrade-modal.tsx

// React Components: PascalCase
export function DocumentPreview() {}
export function UpgradeModal() {}

// Server Actions / Functions: camelCase
export async function createChatSession() {}
export async function checkUsage() {}

// Constants: UPPER_SNAKE_CASE
const MAX_FREE_SESSIONS = 4;
const DEFAULT_CURRENCY = 'USD';

// Database Models (Prisma): PascalCase
model User {}
model Invoice {}
```

### TypeScript Usage

- Use `interface` or `type` for all component props.
- Return explicit types from Server Actions if the type cannot be easily inferred.
- Avoid `any`. Use `unknown` if the type is truly dynamic.

## 8.3 Next.js Architecture Guidelines

### Server Components vs Client Components

- By default, all components in the `app` directory are **Server Components**.
- Use the `"use client"` directive at the top of a file **only** when you need:
  - React hooks (`useState`, `useEffect`)
  - Browser APIs (`window`, `document`)
  - Event listeners (`onClick`, `onChange`)
- Keep `"use client"` components as low in the component tree as possible to maximize server-side rendering performance.

### Data Mutation (Server Actions)

We heavily rely on **Next.js Server Actions** for data mutations rather than standard API routes.

```typescript
// src/actions/invoice.ts
"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export async function deleteInvoice(id: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  await prisma.invoice.delete({
    where: { id, userId: session.user.id }
  })

  // Revalidate the dashboard path to refresh data automatically
  revalidatePath("/dashboard/invoices")
}
```

### Server-Side Data Fetching

Fetch data directly in Server Components instead of using `useEffect`.

```tsx
// src/app/(dashboard)/invoices/page.tsx
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export default async function InvoicesPage() {
  const session = await auth()
  
  // Direct DB call inside a Server Component
  const invoices = await prisma.invoice.findMany({
    where: { userId: session?.user?.id }
  })

  return (
    <div>
      {invoices.map(inv => <p key={inv.id}>{inv.number}</p>)}
    </div>
  )
}
```

## 8.4 Git Workflow

### Branch Naming

```
main            # Production-ready code
feature/*       # New features
bugfix/*        # Bug fixes
```

### Commit Message Convention

```
<type>(<scope>): <subject>

Types:
- feat:     New feature
- fix:      Bug fix
- docs:     Documentation
- refactor: Code refactoring
- chore:    Maintenance
```

## 8.5 Environment & Infrastructure

### App Modes

Open Invoice operates in two modes defined by `APP_MODE`:
1. **Self-Host (Free) Mode:** `APP_MODE=""` or `"selfhost"`. Disables all rate limits and hides Pro upgrade UI.
2. **Paid SaaS Mode:** `APP_MODE="paid"`. Enforces limits and requires subscription upgrades.

Always use `IS_FREE_MODE` from `@/lib/app-mode` when wrapping monetization logic:

```typescript
import { IS_FREE_MODE } from "@/lib/app-mode"

if (!IS_FREE_MODE) {
  // Execute rate limits
}
```

## 8.6 Database & Prisma

- We use **Prisma ORM**.
- The schema is located at `prisma/schema.prisma`.
- When updating the schema during development, run:
  ```bash
  npx prisma db push
  ```

## 8.7 UI & Styling (Tailwind CSS)

- We use **Tailwind CSS** for all styling.
- We utilize **Radix UI** primitives mapped via `shadcn/ui` components located in `src/components/ui/`.
- Use the `cn()` utility for conditional class merging to avoid Tailwind class conflicts:

```tsx
import { cn } from "@/lib/utils"

export function Badge({ active, className }: { active: boolean, className?: string }) {
  return (
    <span className={cn(
      "px-2 py-1 rounded-md text-sm",
      active ? "bg-green-500 text-white" : "bg-gray-200 text-gray-700",
      className
    )}>
      Status
    </span>
  )
}
```
