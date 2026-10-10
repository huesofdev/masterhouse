import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

const sqlite = openDatabaseSync('masterh.db');

// Create all tables on startup (SQLite uses CREATE TABLE IF NOT EXISTS)
sqlite.execSync(`
  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_errors (
    id TEXT PRIMARY KEY,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    error TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    route_id TEXT,
    name TEXT NOT NULL,
    nic TEXT,
    phone TEXT,
    address TEXT,
    balance REAL NOT NULL DEFAULT 0,
    is_offline_created INTEGER NOT NULL DEFAULT 0,
    is_walk_in INTEGER NOT NULL DEFAULT 0,
    gps_lat REAL,
    gps_lng REAL,
    nic_front_uri TEXT,
    nic_back_uri TEXT,
    area_id TEXT,
    rating REAL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS route_areas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guarantors (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    name TEXT NOT NULL,
    nic TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    signature_uri TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    price REAL NOT NULL,
    is_serialized INTEGER NOT NULL DEFAULT 0,
    warranty_type TEXT NOT NULL DEFAULT 'NONE',
    warranty_years INTEGER NOT NULL DEFAULT 0,
    warranty_months INTEGER NOT NULL DEFAULT 0,
    min_downpayment_amount REAL NOT NULL DEFAULT 0,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS trip_stock (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    serial_item_id TEXT,
    serial_number TEXT,
    loaded_qty INTEGER NOT NULL,
    sold_qty INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    balance REAL NOT NULL,
    current_due REAL NOT NULL DEFAULT 0,
    product_name TEXT NOT NULL DEFAULT '',
    guarantor_name TEXT,
    guarantor_phone TEXT,
    guarantor_nic TEXT,
    past_attempts TEXT,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'CASH',
    receipt_number TEXT,
    offline_receipt_number TEXT,
    collected_at INTEGER NOT NULL,
    is_synced INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (contract_id) REFERENCES contracts(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    sale_type TEXT NOT NULL,
    offline_receipt_number TEXT,
    downpayment REAL NOT NULL DEFAULT 0,
    partial_downpayment_recovery_date TEXT,
    tax_amount REAL NOT NULL DEFAULT 0,
    tax_details TEXT,
    total_amount REAL NOT NULL,
    pre_order_id TEXT,
    created_at INTEGER NOT NULL,
    is_synced INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    serial_item_id TEXT,
    qty INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    discount_amount REAL NOT NULL DEFAULT 0,
    discount_type TEXT,
    line_total REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS promotions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    discount_type TEXT NOT NULL,
    discount_value REAL NOT NULL,
    min_cart_value REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS installment_schemes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    terms INTEGER NOT NULL,
    frequency TEXT NOT NULL,
    interest_rate REAL NOT NULL,
    min_downpayment_percent REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    company_name TEXT,
    company_logo_uri TEXT,
    branch_name TEXT,
    branch_address TEXT,
    branch_phone TEXT,
    partial_recovery_days_max INTEGER NOT NULL DEFAULT 14
  );

  CREATE TABLE IF NOT EXISTS taxes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rate REAL NOT NULL,
    type TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS pre_orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    advance_payment REAL NOT NULL DEFAULT 0,
    offline_receipt_number TEXT,
    payment_method TEXT,
    sale_type_preference TEXT,
    receipt_number TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    remarks TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS pre_order_items (
    id TEXT PRIMARY KEY,
    pre_order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    discount_input TEXT,
    FOREIGN KEY (pre_order_id) REFERENCES pre_orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS installment_schedules (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    installment_number INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    amount_due REAL NOT NULL,
    amount_paid REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
  );

  CREATE TABLE IF NOT EXISTS collection_attempts (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    status TEXT NOT NULL,
    remarks TEXT,
    created_at INTEGER NOT NULL,
    gps_lat REAL,
    gps_lng REAL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS trip_routes (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    gps_lat REAL NOT NULL,
    gps_lng REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    is_synced INTEGER NOT NULL DEFAULT 0
  );
`);

// Safe migrations for existing databases
try { sqlite.execSync(`ALTER TABLE products ADD COLUMN is_serialized INTEGER NOT NULL DEFAULT 0;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE products ADD COLUMN warranty_type TEXT NOT NULL DEFAULT 'NONE';`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE products ADD COLUMN warranty_years INTEGER NOT NULL DEFAULT 0;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE products ADD COLUMN warranty_months INTEGER NOT NULL DEFAULT 0;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE products ADD COLUMN min_downpayment_amount REAL NOT NULL DEFAULT 0;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE trip_stock ADD COLUMN serial_item_id TEXT;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE trip_stock ADD COLUMN serial_number TEXT;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE trip_stock ADD COLUMN trip_id TEXT NOT NULL DEFAULT 'unknown';`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE sale_items ADD COLUMN serial_item_id TEXT;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE collections ADD COLUMN contract_id TEXT NOT NULL DEFAULT 'unknown';`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE collections ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'CASH';`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE collections ADD COLUMN offline_receipt_number TEXT;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE contracts ADD COLUMN current_due REAL NOT NULL DEFAULT 0;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE contracts ADD COLUMN product_name TEXT NOT NULL DEFAULT '';`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE contracts ADD COLUMN guarantor_name TEXT;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE contracts ADD COLUMN guarantor_phone TEXT;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE contracts ADD COLUMN guarantor_nic TEXT;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE contracts ADD COLUMN past_attempts TEXT;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE sales ADD COLUMN tax_amount REAL NOT NULL DEFAULT 0;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE sales ADD COLUMN tax_details TEXT;`); } catch (e) {}

try { sqlite.execSync(`ALTER TABLE pre_orders ADD COLUMN advance_payment REAL NOT NULL DEFAULT 0;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE pre_orders ADD COLUMN offline_receipt_number TEXT;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE pre_orders ADD COLUMN payment_method TEXT;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE pre_orders ADD COLUMN sale_type_preference TEXT;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE pre_orders ADD COLUMN receipt_number TEXT;`); } catch (e) {}

// For sale_items, add discount columns if missing
try { sqlite.execSync(`ALTER TABLE sale_items ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE sale_items ADD COLUMN discount_type TEXT;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE sale_items ADD COLUMN line_total REAL NOT NULL DEFAULT 0;`); } catch (e) {}

try { sqlite.execSync(`ALTER TABLE sales ADD COLUMN pre_order_id TEXT;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE sales ADD COLUMN offline_receipt_number TEXT;`); } catch (e) {}

// Safe migration to drop product_id constraint from pre_orders
try {
  sqlite.execSync(`
    ALTER TABLE pre_orders RENAME TO pre_orders_old;
    
    CREATE TABLE pre_orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      advance_payment REAL NOT NULL DEFAULT 0,
      offline_receipt_number TEXT,
      payment_method TEXT,
      sale_type_preference TEXT,
      receipt_number TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      remarks TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    INSERT OR IGNORE INTO pre_orders (id, customer_id, advance_payment, offline_receipt_number, payment_method, sale_type_preference, receipt_number, status, remarks, created_at)
    SELECT id, customer_id, advance_payment, offline_receipt_number, payment_method, sale_type_preference, receipt_number, status, remarks, created_at FROM pre_orders_old;
    
    DROP TABLE pre_orders_old;
  `);
} catch (e) {
  // Ignore if it fails (e.g. if pre_orders_old already dropped)
}

// Simple migration to add missing columns to existing tables
try {
  sqlite.execSync(`
    ALTER TABLE products ADD COLUMN image_url TEXT;
  `);
} catch (e) {}

try {
  sqlite.execSync(`
    ALTER TABLE collections ADD COLUMN offline_receipt_number TEXT;
  `);
} catch (e) {}

try {
  sqlite.execSync(`
    ALTER TABLE sales ADD COLUMN offline_receipt_number TEXT;
  `);
} catch (e) {}

try {
  sqlite.execSync(`
    ALTER TABLE sales ADD COLUMN pre_order_id TEXT;
  `);
} catch (e) {}

try {
  sqlite.execSync(`
    ALTER TABLE sale_items ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0;
  `);
} catch (e) {}

try {
  sqlite.execSync(`
    ALTER TABLE sale_items ADD COLUMN discount_type TEXT;
  `);
} catch (e) {}

try {
  sqlite.execSync(`
    ALTER TABLE sale_items ADD COLUMN line_total REAL NOT NULL DEFAULT 0;
  `);
} catch (e) {}

try { sqlite.execSync(`ALTER TABLE sales ADD COLUMN gps_lat REAL;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE sales ADD COLUMN gps_lng REAL;`); } catch (e) {}

try { sqlite.execSync(`ALTER TABLE customers ADD COLUMN area_id TEXT;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE customers ADD COLUMN rating REAL;`); } catch (e) {}
try { sqlite.execSync(`ALTER TABLE sales ADD COLUMN scheme_id TEXT;`); } catch (e) {}
try {
  sqlite.execSync(`
    CREATE TABLE IF NOT EXISTS route_areas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);
} catch (e) {}

export const db = drizzle(sqlite);
export * from './schema';
