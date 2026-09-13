# 🏢 Master House — Enterprise ERP, POS & Installment Management System

A robust, enterprise-grade multi-branch Enterprise Resource Planning (ERP), Point of Sale (POS), Hire-Purchase Installment Contract, and Field Trip Operations management platform built as a modern TypeScript monorepo.

---

## 🌟 Key Features & Business Modules

### 1. 🛒 Point of Sale (POS) & Direct Sales
- **Fast Scanning & Search**: Instant lookup by product name, SKU, or serial barcode.
- **Serialized & Bulk Inventory**: Full traceability of individual serial numbers and bulk piece goods.
- **Multiple Payment Modes**: Cash, Bank Transfer, and Card with automated drawer cash tracking.
- **Item-Level Discounts**: Percentage (10%), flat amount (Rs 500), or unit multiplier discounts guarded by manager authorization limits.
- **Receipt Printing**: Integrated 80mm thermal and A4 standard invoice printing.

### 2. 📜 Installment Sales & Hire-Purchase Engine
- **Flexible Financing Schemes**: Support for Daily, Weekly, and Monthly frequencies with customizable interest rates and minimum downpayments.
- **Partial Downpayment Recovery**: Schedule 0 short-term recovery dates for customers paying downpayments in installments.
- **Automated Overdue & Penalty Engine**:
  - Automatically calculates late fee penalties when installments exceed grace periods.
  - Recurring 30-day penalty calculation on active unpaid debts.
  - Multi-tier overdue tracking with visual badges and automated customer SMS notifications.
- **Guarantor & KYC Verification**: NIC front/back capture, digital signatures, and AWS S3 secure image handling.
- **Legal Agreements**: One-click generation and printing of legally binding Hire-Purchase Agreements.

### 3. 🚚 Field Trip Operations & Mobile Collections
- **Trip Dispatch & Stock Manifests**: Loading vehicles with serialized and bulk stock, assigning routes, drivers, and field officers.
- **Live Operations Map**: GPS tracking of collection attempts, receipts, and field reps powered by OpenStreetMap.
- **End-of-Trip Cash & Stock Reconciliation**:
  - Real-time comparison between **Actual Cash in Hand** vs **Expected Cash** across direct sales, downpayments, and installment collections.
  - Automatic discrepancy detection for stock shortages, excess, and cash variances.
  - Full audit reports with dual supervisor/driver sign-off sheets.

### 4. 🔄 Service, Returns & Warranties
- **Selective & Full Contract Returns**: Return single items or complete contracts with automatic schedule downsizing.
- **Financial Balance Readjustment**: Proportional loan principal reduction and reverse-chronological schedule waiving.
- **Safe Refund Protection**: Automated calculation ensuring cash refunds never exceed the net cash collected from the customer.
- **Customer Wallet Credits**: Store credit refunds directly credited to the customer's digital wallet.
- **Warranty Claim Lifecycle**: Tracking repairs, supplier returns, replacements, and resolutions.

### 5. 📦 Multi-Branch Inventory & Warehousing
- **Branch-Isolated Stock**: Stock levels, serial units, and warehouse allocations are strictly partitioned per branch.
- **Inter-Branch Stock Transfers**: Formal transfer creation, dispatch, transit, and receipt workflows.
- **Intake & Supplier Payables**: Goods Received Notes (GRN) with branch-isolated supplier ledger accounting and payment tracking.

### 6. 🛡️ Role-Based Access Control (RBAC) & Security
- **Granular Permissions**: 20+ functional permission modules (sales:*, 	rips:*, collections:*, inventory:*, bac:*, etc.).
- **Dynamic Role Management**: Create custom roles (Cashier, Store Keeper, Field Rep, Manager) and modify permissions on the fly via the Web UI.
- **Route & Middleware Guards**: Strict server-side verification using JWT tokens and branch scoping.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Monorepo Manager** | pnpm workspaces |
| **Backend API** | Node.js, Express 5, TypeScript, Drizzle ORM, MySQL 8 |
| **Frontend Web** | React 19, Vite, TanStack Query, TanStack Table, Leaflet Maps, Lucide Icons, React Hook Form, Zod |
| **Mobile App** | React Native, Expo 56, Expo Router, NativeWind (TailwindCSS), SQLite Offline DB |
| **Storage & Media** | AWS S3 / Cloudflare R2 / MinIO with Presigned Signed URLs & Sharp Image Compression |
| **Build & Bundler** | 	sup (API), ite / olldown (Web) |

---

## 📁 Monorepo Structure

`	ext
masterh/
├── apps/
│   ├── api/          # Express REST API, Drizzle ORM schemas, Cron jobs, RBAC
│   ├── web/          # React Single Page Application (Dashboard, POS, Operations, Reports)
│   └── mobile/       # React Native / Expo Mobile App for Field Officers
├── packages/         # Shared utilities and configurations
├── pnpm-workspace.yaml
└── package.json
`

---

## 🚀 Getting Started Locally

### Prerequisites
Make sure you have the following installed on your machine:
- **Node.js**: 20.x or higher
- **pnpm**: 10.x (
pm install -g pnpm)
- **MySQL Server**: 8.0 or higher

---

### Step 1: Clone & Install Dependencies

`ash
git clone <repository-url>
cd masterh

# Install all workspace dependencies
pnpm install
`

---

### Step 2: Configure Environment Variables

#### 1. Backend API (pps/api/.env)
Create pps/api/.env (or copy from pps/api/.env.example):

`env
PORT=5002
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# MySQL Connection URL
DB_URL=mysql://root:password@localhost:3306/masterhousenew

# JWT Auth Secret
JWT_SECRET=super_secret_jwt_key_masterhouse_2026

# S3 / R2 Bucket (For image & NIC uploads)
S3_BUCKET_NAME=masterhouse-uploads
S3_REGION=auto
S3_ENDPOINT=https://your-s3-or-r2-endpoint.com
S3_ACCESS_KEY_ID=your_access_key_id
S3_SECRET_ACCESS_KEY=your_secret_access_key
`

#### 2. Frontend Web (pps/web/.env)
Create pps/web/.env (or copy from pps/web/.env.example):

`env
VITE_API_URL=http://localhost:5002/api
`

---

### Step 3: Database Setup & Seeding

Ensure your MySQL database exists (e.g. CREATE DATABASE masterhousenew;), then run:

`ash
# 1. Push database schema to MySQL
pnpm db:push

# 2. Seed default RBAC permissions, roles, branches, and admin user
pnpm seed:rbac

# 3. (Optional) Seed demo products, catalog, and customers
pnpm seed:demo
`

---

### Step 4: Run the Development Servers

You can run individual services from the root:

`ash
# Start the Backend API (runs on http://localhost:5002)
pnpm dev:api

# Start the Frontend Web App (runs on http://localhost:5173)
pnpm dev:web

# Start the Mobile App (Expo development server)
pnpm dev:mobile
`

---

## 🔑 Default Login Credentials

Once seeded, you can log in to the web app:

* **URL:** http://localhost:5173
* **Email:** dmin@masterhouse.lk
* **Password:** password123
* **Role:** Super Admin (Full System Access)

---

## ⏰ Automated Cron Engines

The system includes background automated engines located in pps/api/src/cron/:

* **Daily Overdue & Late Fee Engine:**
  `ash
  pnpm --filter api tsx src/cron/daily-overdue.ts
  `
  Scans active installment contracts, applies grace period late fees, checks 30-day recurring penalties, updates schedule balances, and queues overdue SMS messages.

* **Daily Installment Reminders:**
  `ash
  pnpm --filter api tsx src/cron/daily-reminders.ts
  `
  Sends automated upcoming payment reminder SMS to customers 2 days prior to their schedule due date.

---

## 🛠️ Production Build

To test and compile production bundles:

`ash
# Build Backend API (outputs to apps/api/dist)
pnpm build:api

# Build Frontend Web App (outputs to apps/web/dist)
pnpm build:web
`

---

## 📄 License
Proprietary software developed for **Master House (Pvt) Ltd**. All rights reserved.
