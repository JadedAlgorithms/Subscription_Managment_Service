# Brightloop Subscription Management System - Phase 1

Enterprise-grade Recurring Revenue Engine and Subscription Management Platform for Brightloop Software.

---

## 1. Tech Stack Overview

- **Runtime:** Node.js (LTS v20+) with TypeScript (Strict mode enabled)
- **Backend API:** Express.js 4 with Prisma ORM 5+
- **Database:** PostgreSQL (with explicit Decimal/Numeric financial precision)
- **Frontend Client:** React 19 + TypeScript + Vite + Tailwind CSS
- **Package Management:** Standard npm Workspaces (`/server` & `/client`)

---

## 2. Directory Structure

```
Subscription_Managment_Service/
├── .env.example                     # Root environment configuration template
├── .gitignore                       # Git exclusion rules for node, build, and secrets
├── package.json                     # Root workspace orchestrator & concurrent scripts
├── README.md                        # Phase 1 documentation & architecture guide
│
├── server/                          # Backend API & Billing Engine
│   ├── .env.example                 # Server environment template
│   ├── package.json                 # Express, Prisma, Bcryptjs, Zod, TS dependencies
│   ├── tsconfig.json                # Strict NodeNext TypeScript compiler configuration
│   ├── prisma/
│   │   ├── schema.prisma            # Complete Prisma schema with relations & indices
│   │   └── seed.ts                  # Automated test fixtures seed script (Admin, Staff, Customer, Odoo variant)
│   └── src/
│       ├── index.ts                 # Express entry point, CORS, Helmet, JSON parsing, error handling
│       ├── lib/
│       │   └── prisma.ts            # PrismaClient singleton with pooling & graceful shutdown
│       ├── types/
│       │   └── index.ts             # Domain types, Enums, and Request/Response DTOs
│       ├── middleware/
│       │   ├── errorHandler.ts      # Centralized error handler (Prisma, Zod, AppError)
│       │   └── requestLogger.ts     # Request performance and status logger
│       └── routes/
│           ├── index.ts             # Central API router & overview endpoints
│           └── health.ts            # System telemetry & database latency probe
│
└── client/                          # Frontend Application
    ├── package.json                 # React 19, Vite, Tailwind CSS, Lucide icons
    ├── tsconfig.json                # TypeScript compiler config for React
    ├── tsconfig.node.json           # Vite node configuration
    ├── vite.config.ts               # Vite configuration with API reverse proxy
    ├── tailwind.config.js           # Tailwind CSS configuration with Brightloop theme
    ├── postcss.config.js            # PostCSS configuration
    ├── index.html                   # HTML5 shell
    └── src/
        ├── index.css                # Tailwind directives and custom scrollbars
        ├── main.tsx                 # React 19 root bootstrap
        ├── App.tsx                  # Interactive Phase 1 overview & telemetry dashboard
        └── types/
            └── index.ts             # Client domain models & type parity with server
```

---

## 3. Quick Start & Execution

### 3.1 Prerequisites
- Node.js LTS (v20 or v22+)
- PostgreSQL 14+ (local instance or cloud database such as Neon/Supabase)

### 3.2 Installation
Install dependencies across root and all workspaces:
```bash
npm install
```

### 3.3 Database Configuration
Copy `.env.example` to `.env` in both root and `server/`:
```bash
cp .env.example .env
cp server/.env.example server/.env
```

Ensure `DATABASE_URL` points to your PostgreSQL database:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brightloop_subscriptions?schema=public"
```

### 3.4 Prisma ORM Client Generation, Migration & Seed
Generate the Prisma client:
```bash
npm run db:generate
```

Push schema or run migrations:
```bash
npm run db:push
# OR for migration history:
npm run db:migrate
```

Seed the database with realistic test fixtures:
```bash
npm run db:seed
```

### 3.5 Run Full-Stack System Concurrently
Start both backend API (`http://localhost:5000`) and frontend client (`http://localhost:5173`) with a single command:
```bash
npm run dev
```

---

## 4. Phase 1 Core Capabilities & Schemas

### 4.1 Strict RBAC & Authentication Fixtures
Seeded with pre-hashed passwords conforming to the security policy (8+ chars, upper, lower, special):
- **Admin:** `admin@brightloop.io` / `BrightloopAdmin@2026`
- **Staff:** `staff@brightloop.io` / `BrightloopStaff@2026`
- **Customer (Acme Corp):** `billing@acmecorp.com` / `AcmeCustomer@2026`
- **Customer (Globex Corp):** `tech@globex.org` / `GlobexCustomer@2026`

### 4.2 Products & Dynamic Variant Surcharges
- Base Product: `Brightloop ERP Core Engine` ($1,200.00 / month)
- Variant: `Odoo Enterprise Synchronization Connector` (dynamic price surcharge: **+$560.00**, SKU: `BL-ERP-ODOO-560`)

### 4.3 Billing Idempotency Guarantee
To mathematically guarantee that no customer is double-billed even during concurrent cron or worker execution, `Invoice` enforces a composite unique constraint:
```prisma
@@unique([subscriptionId, billingPeriodStart], name: "subscription_billing_period_unique")
```
Attempts to invoice the same subscription for the same billing period trigger a database constraint rejection (`P2002`), caught by `errorHandler.ts`.

### 4.4 High-Performance Indexing (< 2s Finance SLA)
- `Invoice`: `@@index([status, dueDate])` for instant overdue queries.
- `Subscription`: `@@index([customerId, status])` and `@@index([nextBillingDate])`.
- `User`: `@@index([email])` and `@@index([role, isActive])`.

