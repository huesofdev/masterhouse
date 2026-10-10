import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  operation: text('operation').notNull(),
  payload: text('payload').notNull(),
  status: text('status').notNull().default('pending'),
  error: text('error'), 
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const syncErrors = sqliteTable('sync_errors', {
  id: text('id').primaryKey(),
  operation: text('operation').notNull(),
  payload: text('payload').notNull(),
  error: text('error'), 
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  routeId: text('route_id'), 
  name: text('name').notNull(),
  nic: text('nic'),
  phone: text('phone'),
  address: text('address'),
  balance: real('balance').notNull().default(0),
  isOfflineCreated: integer('is_offline_created', { mode: 'boolean' }).notNull().default(false),
  isWalkIn: integer('is_walk_in', { mode: 'boolean' }).notNull().default(false),
  gpsLat: real('gps_lat'),
  gpsLng: real('gps_lng'),
  nicFrontUri: text('nic_front_uri'),
  nicBackUri: text('nic_back_uri'),
  areaId: text('area_id'),
  rating: real('rating'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const guarantors = sqliteTable('guarantors', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  name: text('name').notNull(),
  nic: text('nic').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  signatureUri: text('signature_uri').notNull(),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').notNull(),
  price: real('price').notNull(),
  isSerialized: integer('is_serialized', { mode: 'boolean' }).notNull().default(false),
  warrantyType: text('warranty_type').notNull().default('NONE'), // 'WARRANTY' | 'GUARANTEE' | 'NONE'
  warrantyYears: integer('warranty_years').notNull().default(0),
  warrantyMonths: integer('warranty_months').notNull().default(0),
  minDownpaymentAmount: real('min_downpayment_amount').notNull().default(0),
  imageUrl: text('image_url'),
});

export const promotions = sqliteTable('promotions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  discountType: text('discount_type').notNull(), // 'PERCENTAGE' | 'FIXED'
  discountValue: real('discount_value').notNull(),
  minCartValue: real('min_cart_value').notNull().default(0),
});

export const installmentSchemes = sqliteTable('installment_schemes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  terms: integer('terms').notNull(),
  frequency: text('frequency').notNull(), 
  interestRate: real('interest_rate').notNull(),
  minDownpaymentPercent: real('min_downpayment_percent').notNull(),
});

export const tripStock = sqliteTable('trip_stock', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull(),
  productId: text('product_id').notNull().references(() => products.id),
  serialItemId: text('serial_item_id'),
  serialNumber: text('serial_number'),
  loadedQty: integer('loaded_qty').notNull(),
  soldQty: integer('sold_qty').notNull().default(0),
});

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  companyName: text('company_name'),
  companyLogoUri: text('company_logo_uri'),
  branchName: text('branch_name'),
  branchAddress: text('branch_address'),
  branchPhone: text('branch_phone'),
  partialRecoveryDaysMax: integer('partial_recovery_days_max').notNull().default(14),
});

export const routeAreas = sqliteTable('route_areas', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

export const taxes = sqliteTable('taxes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  rate: real('rate').notNull(),
  type: text('type').notNull(), // 'EXCLUSIVE' | 'INCLUSIVE'
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const contracts = sqliteTable('contracts', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  balance: real('balance').notNull(),
  currentDue: real('current_due').notNull().default(0),
  productName: text('product_name').notNull().default(''),
  guarantorName: text('guarantor_name'),
  guarantorPhone: text('guarantor_phone'),
  guarantorNic: text('guarantor_nic'),
  pastAttempts: text('past_attempts'), // JSON array of past missed attempts
  status: text('status').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const installmentSchedules = sqliteTable('installment_schedules', {
  id: text('id').primaryKey(),
  contractId: text('contract_id').notNull().references(() => contracts.id),
  installmentNumber: integer('installment_number').notNull(),
  dueDate: text('due_date').notNull(),
  amountDue: real('amount_due').notNull(),
  amountPaid: real('amount_paid').notNull().default(0),
  status: text('status').notNull(),
});

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  contractId: text('contract_id').notNull().references(() => contracts.id),
  customerId: text('customer_id').notNull().references(() => customers.id),
  amount: real('amount').notNull(),
  paymentMode: text('payment_mode').notNull().default('CASH'),
  receiptNumber: text('receipt_number'), 
  offlineReceiptNumber: text('offline_receipt_number'),
  collectedAt: integer('collected_at', { mode: 'timestamp' }).notNull(),
  isSynced: integer('is_synced', { mode: 'boolean' }).notNull().default(false),
});

export const sales = sqliteTable('sales', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').references(() => customers.id),
  saleType: text('sale_type').notNull(), // 'DIRECT' | 'INSTALLMENT'
  offlineReceiptNumber: text('offline_receipt_number'),
  downpayment: real('downpayment').notNull().default(0),
  partialDownpaymentRecoveryDate: text('partial_downpayment_recovery_date'),
  taxAmount: real('tax_amount').notNull().default(0),
  taxDetails: text('tax_details'), // JSON snapshot of taxes applied
  totalAmount: real('total_amount').notNull(),
  gpsLat: real('gps_lat'),
  gpsLng: real('gps_lng'),
  preOrderId: text('pre_order_id').references(() => preOrders.id),
  schemeId: text('scheme_id').references(() => installmentSchemes.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  isSynced: integer('is_synced', { mode: 'boolean' }).notNull().default(false),
});

export const tripRoutes = sqliteTable('trip_routes', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull(),
  gpsLat: real('gps_lat').notNull(),
  gpsLng: real('gps_lng').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  isSynced: integer('is_synced', { mode: 'boolean' }).notNull().default(false),
});

export const saleItems = sqliteTable('sale_items', {
  id: text('id').primaryKey(),
  saleId: text('sale_id').notNull().references(() => sales.id),
  productId: text('product_id').notNull().references(() => products.id),
  serialItemId: text('serial_item_id'),
  qty: integer('qty').notNull(),
  unitPrice: real('unit_price').notNull(),
  discountAmount: real('discount_amount').notNull().default(0),
  discountType: text('discount_type'), // 'PERCENTAGE' | 'FIXED' | null
  lineTotal: real('line_total').notNull(),
});

export const preOrders = sqliteTable('pre_orders', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  advancePayment: real('advance_payment').notNull().default(0),
  offlineReceiptNumber: text('offline_receipt_number'),
  paymentMethod: text('payment_method'), // 'CASH' | 'CARD' | 'BANK_TRANSFER'
  saleTypePreference: text('sale_type_preference'), // 'DIRECT' | 'INSTALLMENT'
  receiptNumber: text('receipt_number'),
  status: text('status').notNull().default('PENDING'),
  remarks: text('remarks'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const preOrderItems = sqliteTable('pre_order_items', {
  id: text('id').primaryKey(),
  preOrderId: text('pre_order_id').notNull().references(() => preOrders.id),
  productId: text('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull().default(1),
  discountInput: text('discount_input'),
});

export const collectionAttempts = sqliteTable('collection_attempts', {
  id: text('id').primaryKey(),
  contractId: text('contract_id').notNull().references(() => contracts.id),
  customerId: text('customer_id').notNull().references(() => customers.id),
  status: text('status').notNull(),
  remarks: text('remarks'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  gpsLat: real('gps_lat'),
  gpsLng: real('gps_lng'),
});
