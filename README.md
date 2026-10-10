# 🏢 Master House — Enterprise ERP, POS & Hire-Purchase Management System

A robust, enterprise-grade multi-branch Enterprise Resource Planning (ERP), Point of Sale (POS), Hire-Purchase Installment Contract, and Field Trip Operations platform built as a high-performance TypeScript monorepo.

---

## 🌟 Key Features & Business Modules

### 1. 🛒 Point of Sale (POS) & Direct Sales
- **Fast Scanning & Product Search**: Instant lookup by product name, SKU, or serial barcode.
- **Multi-Faceted Category & Brand Filters**: Co-operative filter ribbons allowing cashiers to filter products by category, brand, or combined subsets with live branch stock counters.
- **Serialized & Bulk Inventory**: Complete traceability of serialized electronics and bulk items.
- **Multiple Payment Modes**: Cash-only field enforcement or multi-mode counter checkout (Cash, Bank Transfer, Card).
- **Item-Level Discounts**: Percentage, flat rupee discounts, or unit multiplier discounts protected by manager-authorized discount caps.
- **Receipt & Invoice Printing**: Integrated 80mm thermal receipt printing and A4 invoice documents.

### 2. 📜 Installment Sales & Hire-Purchase Engine
- **Flexible Financing Schemes**: Support for Daily, Weekly, and Monthly installment frequencies with configurable interest rates, repayment tenures, and downpayment thresholds.
- **Partial Downpayment Recovery**: Special Schedule 0 short-term recovery schedules for customers splitting downpayments.
- **Automated Overdue & Penalty Engine**:
  - Automatically calculates late fee penalties when installments exceed their grace period.
  - Recurring 30-day penalty calculation on active delinquent debts.
  - Multi-tier overdue tracking with visual badges and automated customer SMS notifications.
- **Guarantor & KYC Verification**: NIC front/back document upload, digital signatures, and secure cloud storage.
- **Legal Agreements**: One-click generation and printing of legally binding Hire-Purchase Agreements.

### 3. 🚚 Field Trip Operations & Offline Mobile Collections
- **Trip Dispatch & Stock Manifests**: Loading vehicles with serialized and bulk stock, assigning routes, drivers, and field collection officers.
- **Offline-First Mobile App**: Field officers can collect installment receipts and create sales even without cellular coverage, utilizing local SQLite storage and conflict-free bi-directional sync upon reconnection.
- **GPS Location Capture**: Real-time GPS location tagging of collection attempts and payments.
- **End-of-Trip Cash & Stock Reconciliation**:
  - Real-time comparison between **Actual Cash in Hand** vs **Expected Cash** across direct sales, downpayments, and installment collections.
  - Automatic discrepancy detection for stock shortages, excess inventory, and cash variances.
  - Supervisor sign-off and reconciliation reports.

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
- **Granular Permissions**: 20+ functional permission modules (`sales:*`, `trips:*`, `collections:*`, `inventory:*`, `rbac:*`, etc.).
- **Dynamic Role Management**: Create custom roles (Cashier, Store Keeper, Field Rep, Manager) and modify permissions on the fly via the Web UI.
- **Route & Middleware Guards**: Strict server-side verification using JWT tokens and branch scoping.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Monorepo Manager** | pnpm workspaces |
| **Backend API** | Node.js, Express, TypeScript, Drizzle ORM, MySQL 8 |
| **Frontend Web** | React 19, Vite, TanStack Query, TanStack Table, Leaflet Maps, Lucide Icons, React Hook Form, Zod |
| **Mobile App** | React Native, Expo, Expo Router, NativeWind (TailwindCSS), SQLite (Offline-First) |
| **Storage & Media** | AWS S3 / Cloudflare R2 / MinIO with Presigned URLs & Sharp Image Processing |
| **Build & Bundler** | tsup (API), Vite (Web) |

---

## 📁 Monorepo Structure

```text
masterh/
├── apps/
│   ├── api/          # Express REST API, Drizzle ORM schemas, Cron engines, RBAC
│   ├── web/          # React SPA (Dashboard, POS, Operations, Reports, Management)
│   └── mobile/       # React Native / Expo Mobile App for Field Officers
├── packages/         # Shared utilities and configurations
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## 🚀 Getting Started Locally

### Prerequisites
Make sure you have the following installed on your machine:
- **Node.js**: `20.x` or higher
- **pnpm**: `10.x` (`npm install -g pnpm`)
- **MySQL Server**: `8.0` or higher

---

### Step 1: Clone & Install Dependencies

```bash
git clone https://github.com/huesofdev/masterhouse.git
cd masterhouse

# Install all workspace dependencies
pnpm install
```

---

### Step 2: Configure Environment Variables

#### 1. Backend API (`apps/api/.env`)
Copy the sample environment file in `apps/api/`:
```bash
cp apps/api/.env.example apps/api/.env
```
Ensure the MySQL connection string and secrets match your local environment:
```env
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
```

#### 2. Frontend Web (`apps/web/.env`)
Copy the sample environment file in `apps/web/`:
```bash
cp apps/web/.env.example apps/web/.env
```
Ensure it points to your local API server:
```env
VITE_API_URL=http://localhost:5002/api
```

#### 3. Mobile App (`apps/mobile/.env`)
Copy the sample environment file in `apps/mobile/`:
```bash
cp apps/mobile/.env.example apps/mobile/.env
```
```env
# For emulator:
EXPO_PUBLIC_API_URL=http://localhost:5002/api

# For physical device testing over Wi-Fi, use your machine's LAN IP:
# EXPO_PUBLIC_API_URL=http://192.168.1.100:5002/api
```

---

### Step 3: Database Setup & Seeding

1. Create your local MySQL database:
```sql
CREATE DATABASE masterhousenew CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Push the Drizzle ORM schema to MySQL:
```bash
pnpm db:push
```

3. Seed initial RBAC permissions, default roles, branches, and Super Admin user:
```bash
pnpm seed:rbac
```

4. *(Optional)* Seed demonstration catalog, products, and customers:
```bash
pnpm seed:demo
```

---

### Step 4: Run the Development Servers

Run the desired apps from the root directory:

```bash
# Start Backend API (runs on http://localhost:5002)
pnpm dev:api

# Start Frontend Web Dashboard (runs on http://localhost:5173)
pnpm dev:web

# Start Mobile App development server (Expo)
pnpm dev:mobile
```

---

## 🔑 Default Login Credentials

After running `pnpm seed:rbac`, log in to the web application:

- **URL:** [http://localhost:5173](http://localhost:5173)
- **Email:** `admin@masterhouse.lk`
- **Password:** `password123`
- **Role:** Super Admin (Full Access)

---

## ⏰ Automated Cron Engines

The backend includes automated background task runners in `apps/api/src/cron/`:

1. **Daily Overdue & Late Fee Engine:**
   ```bash
   pnpm --filter api tsx src/cron/daily-overdue.ts
   ```
   *Scans active contracts, applies grace period late fees, calculates 30-day recurring penalties, and queues overdue SMS notifications.*

2. **Daily Installment Reminders:**
   ```bash
   pnpm --filter api tsx src/cron/daily-reminders.ts
   ```
   *Sends automated reminder SMS messages to customers 2 days prior to schedule due dates.*

---

## 🛠️ Production Build

To verify and compile production bundles:

```bash
# Build Backend API (outputs to apps/api/dist)
pnpm build:api

# Build Frontend Web App (outputs to apps/web/dist)
pnpm build:web
```

---

## 📄 License
Proprietary software developed for **Master House (Pvt) Ltd**. All rights reserved.
