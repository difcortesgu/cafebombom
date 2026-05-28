import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull().unique(),
  role: text('role', { enum: ['owner', 'staff'] }).notNull(),
  pinHash: text('pin_hash').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  userId: text('user_id').notNull().references(() => users.id),
  loggedInAt: integer('logged_in_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  loggedOutAt: integer('logged_out_at'),
});

export const surcharges = sqliteTable('surcharges', {
  name: text('name', { enum: ['to-go', 'delivery'] }).primaryKey(),
  value: real('value').notNull().default(0),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
});

export const receiptPreferences = sqliteTable('receipt_preferences', {
  id: text('id').primaryKey(),
  businessName: text('business_name').notNull().default('CafeBomBom'),
  businessAddress: text('business_address').notNull().default(''),
  businessPhone: text('business_phone').notNull().default(''),
  businessNit: text('business_nit').notNull().default(''),
  businessLogoUri: text('business_logo_uri'),
  footerMessage: text('footer_message').notNull().default('Gracias por tu compra'),
  paperWidth: integer('paper_width').notNull().default(80),
  taxRate: real('tax_rate').notNull().default(0.08),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
});

export const paymentMethods = sqliteTable('payment_methods', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull().unique(),
  icon: text('icon').notNull().default('wallet'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
});

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull().unique(),
  phone: text('phone'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
});

export const ingredientUnits = sqliteTable('ingredient_units', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull().unique(),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
}, (t) => [
  index('idx_ingredient_units_name').on(t.name),
]);

export const ingredients = sqliteTable('ingredients', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull().unique(),
  unit: text('unit').notNull(),
  quantity: real('quantity').notNull().default(0),
  lowStockThreshold: real('low_stock_threshold').notNull().default(10),
  supplierId: text('supplier_id').references(() => suppliers.id),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
}, (t) => [
  index('idx_ingredients_low_stock').on(t.quantity, t.lowStockThreshold),
]);

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull().unique(),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull().unique(),
  categoryId: text('category_id').references(() => categories.id),
  price: real('price').notNull(),
  imageUri: text('image_uri'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
});

export const productIngredients = sqliteTable('product_ingredients', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  productId: text('product_id').notNull().references(() => products.id),
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.id),
  quantityUsed: real('quantity_used').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
}, (t) => [
  uniqueIndex('product_ingredients_unique').on(t.productId, t.ingredientId),
]);

export const productAdditionalIngredients = sqliteTable('product_additional_ingredients', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  productId: text('product_id').notNull().references(() => products.id),
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.id),
  quantityUsed: real('quantity_used').notNull(),
  additionalPrice: real('additional_price').notNull().default(0),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
}, (t) => [
  uniqueIndex('product_additional_ingredients_unique').on(t.productId, t.ingredientId),
]);

export const restaurantTables = sqliteTable('restaurant_tables', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull().unique(),
  tableType: text('table_type', { enum: ['dine-in', 'to-go', 'delivery'] }).notNull().default('dine-in'),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
}, (t) => [
  index('idx_restaurant_tables_name').on(t.name),
]);

export const discounts = sqliteTable('discounts', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull().unique(),
  scope: text('scope', { enum: ['product', 'global'] }).notNull().default('product'),
  productId: text('product_id').references(() => products.id),
  type: text('type', { enum: ['percentage', 'fixed'] }).notNull(),
  value: real('value').notNull(),
  startsAt: integer('starts_at').notNull(),
  endsAt: integer('ends_at'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
}, (t) => [
  index('idx_discounts_scope').on(t.scope),
  index('idx_discounts_active').on(t.isActive),
]);

export const sales = sqliteTable('sales', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  staffId: text('staff_id').notNull().references(() => users.id),
  tableId: text('table_id').notNull().references(() => restaurantTables.id, { onDelete: 'restrict' }),
  paymentMethodId: text('payment_method_id').references(() => paymentMethods.id),
  subtotal: real('subtotal').notNull().default(0),
  itemDiscountTotal: real('item_discount_total').notNull().default(0),
  orderDiscountName: text('order_discount_name'),
  orderDiscountType: text('order_discount_type', { enum: ['percentage', 'fixed'] }),
  orderDiscountValue: real('order_discount_value'),
  orderDiscountAmount: real('order_discount_amount').notNull().default(0),
  discountNote: text('discount_note'),
  discountAppliedBy: text('discount_applied_by').references(() => users.id),
  total: real('total').notNull(),
  status: text('status', { enum: ['draft', 'in-progress', 'ready', 'completed', 'cancelled'] }).notNull().default('draft'),
  readyAt: integer('ready_at'),
  paidAt: integer('paid_at'),
  cancelledAt: integer('cancelled_at'),
}, (t) => [
  index('idx_sales_created_at').on(t.createdAt),
  index('idx_sales_table_id').on(t.tableId),
  index('idx_sales_status').on(t.status),
]);

export const saleItems = sqliteTable('sale_items', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  saleId: text('sale_id').notNull().references(() => sales.id),
  productId: text('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  quantityPaid: integer('quantity_paid').notNull().default(0),
  observation: text('observation'),
  removedIngredientIds: text('removed_ingredient_ids').notNull().default('[]'),
  selectedAdditionalIngredients: text('selected_additional_ingredients').notNull().default('[]'),
  unitPrice: real('unit_price').notNull(),
  lineSubtotal: real('line_subtotal').notNull().default(0),
  discountName: text('discount_name'),
  discountType: text('discount_type', { enum: ['percentage', 'fixed'] }),
  discountValue: real('discount_value'),
  discountAmount: real('discount_amount').notNull().default(0),
});

export const salePayments = sqliteTable('sale_payments', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  saleId: text('sale_id').notNull().references(() => sales.id),
  paymentMethodId: text('payment_method_id').notNull().references(() => paymentMethods.id),
  subtotal: real('subtotal').notNull().default(0),
  itemDiscountTotal: real('item_discount_total').notNull().default(0),
  globalDiscountAmount: real('global_discount_amount').notNull().default(0),
  surchargeAmount: real('surcharge_amount').notNull().default(0),
  total: real('total').notNull().default(0),
  paidAt: integer('paid_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  createdBy: text('created_by').references(() => users.id),
}, (t) => [
  index('idx_sale_payments_sale_id').on(t.saleId),
  index('idx_sale_payments_paid_at').on(t.paidAt),
]);

export const salePaymentItems = sqliteTable('sale_payment_items', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  paymentId: text('payment_id').notNull().references(() => salePayments.id),
  saleItemId: text('sale_item_id').notNull().references(() => saleItems.id),
  quantityPaid: integer('quantity_paid').notNull(),
  unitPriceSnapshot: real('unit_price_snapshot').notNull(),
  lineSubtotalSnapshot: real('line_subtotal_snapshot').notNull(),
  discountAmountSnapshot: real('discount_amount_snapshot').notNull().default(0),
  lineTotalSnapshot: real('line_total_snapshot').notNull(),
}, (t) => [
  index('idx_sale_payment_items_payment_id').on(t.paymentId),
  index('idx_sale_payment_items_sale_item_id').on(t.saleItemId),
]);

export const restockLogs = sqliteTable('restock_logs', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.id),
  quantityAdded: real('quantity_added').notNull(),
  cost: real('cost').notNull(),
  supplierId: text('supplier_id').references(() => suppliers.id),
  paymentMethodId: text('payment_method_id').references(() => paymentMethods.id),
  date: integer('date').notNull(),
});

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  date: integer('date').notNull(),
  category: text('category').notNull(),
  amount: real('amount').notNull(),
  description: text('description'),
  supplierId: text('supplier_id').references(() => suppliers.id),
  paymentMethodId: text('payment_method_id').notNull().references(() => paymentMethods.id),
}, (t) => [
  index('idx_expenses_date').on(t.date),
]);

export const cashRegisterSessions = sqliteTable('cash_register_sessions', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  openingAmount: real('opening_amount').notNull(),
  closingAmount: real('closing_amount'),
  openingNotes: text('opening_notes'),
  closingNotes: text('closing_notes'),
  openedAt: integer('opened_at').notNull(),
  closedAt: integer('closed_at'),
  openedBy: text('opened_by').notNull().references(() => users.id),
  closedBy: text('closed_by').references(() => users.id),
}, (t) => [
  index('idx_cash_register_opened_at').on(t.openedAt),
]);

export const employees = sqliteTable('employees', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull().unique(),
  salaryType: text('salary_type', { enum: ['hourly', 'monthly'] }).notNull(),
  rate: real('rate').notNull(),
});

export const payrollEntries = sqliteTable('payroll_entries', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  periodStart: integer('period_start').notNull(),
  periodEnd: integer('period_end').notNull(),
  amount: real('amount').notNull(),
  paymentMethodId: text('payment_method_id').notNull().references(() => paymentMethods.id),
});

export const cashRegisterAdjustments = sqliteTable('cash_register_adjustments', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  sessionId: text('session_id').notNull().references(() => cashRegisterSessions.id),
  amount: real('amount').notNull(),
  reason: text('reason').notNull(),
  adjustedBy: text('adjusted_by').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
}, (t) => [
  index('idx_cash_register_adjustments_session_id').on(t.sessionId),
]);


