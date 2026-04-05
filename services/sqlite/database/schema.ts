import { generateId } from '@/utils/id';
import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  name: text('name').notNull().unique(),
  role: text('role', { enum: ['owner', 'staff'] }).notNull(),
  pinHash: text('pin_hash').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  syncedAt: integer('synced_at'),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  userId: text('user_id').notNull().references(() => users.id),
  loggedInAt: integer('logged_in_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  loggedOutAt: integer('logged_out_at'),
});

export const surcharges = sqliteTable('surcharges', {
  name: text('name', { enum: ['to-go', 'delivery'] }).primaryKey(),
  value: real('value').notNull().default(0),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
});

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  name: text('name').notNull().unique(),
  phone: text('phone'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  syncedAt: integer('synced_at'),
});

export const ingredients = sqliteTable('ingredients', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  name: text('name').notNull().unique(),
  unit: text('unit').notNull(),
  quantity: real('quantity').notNull().default(0),
  lowStockThreshold: real('low_stock_threshold').notNull().default(10),
  supplierId: text('supplier_id').references(() => suppliers.id),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  syncedAt: integer('synced_at'),
}, (t) => [
  index('idx_ingredients_low_stock').on(t.quantity, t.lowStockThreshold),
]);

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  name: text('name').notNull().unique(),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  syncedAt: integer('synced_at'),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  name: text('name').notNull().unique(),
  categoryId: text('category_id').references(() => categories.id),
  price: real('price').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  syncedAt: integer('synced_at'),
});

export const productIngredients = sqliteTable('product_ingredients', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  productId: text('product_id').notNull().references(() => products.id),
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.id),
  quantityUsed: real('quantity_used').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  syncedAt: integer('synced_at'),
}, (t) => [
  uniqueIndex('product_ingredients_unique').on(t.productId, t.ingredientId),
]);

export const restaurantTables = sqliteTable('restaurant_tables', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  name: text('name').notNull().unique(),
  tableType: text('table_type', { enum: ['dine-in', 'to-go', 'delivery'] }).notNull().default('dine-in'),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  syncedAt: integer('synced_at'),
}, (t) => [
  index('idx_restaurant_tables_name').on(t.name),
]);

export const discounts = sqliteTable('discounts', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
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
  syncedAt: integer('synced_at'),
}, (t) => [
  index('idx_discounts_scope').on(t.scope),
  index('idx_discounts_active').on(t.isActive),
]);

export const sales = sqliteTable('sales', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  staffId: text('staff_id').notNull().references(() => users.id),
  tableId: text('table_id').notNull().references(() => restaurantTables.id, { onDelete: 'restrict' }),
  paymentMethod: text('payment_method', { enum: ['cash', 'card', 'transfer'] }).notNull().default('cash'),
  subtotal: real('subtotal').notNull().default(0),
  itemDiscountTotal: real('item_discount_total').notNull().default(0),
  orderDiscountName: text('order_discount_name'),
  orderDiscountType: text('order_discount_type', { enum: ['percentage', 'fixed'] }),
  orderDiscountValue: real('order_discount_value'),
  orderDiscountAmount: real('order_discount_amount').notNull().default(0),
  discountNote: text('discount_note'),
  discountAppliedBy: text('discount_applied_by').references(() => users.id),
  total: real('total').notNull(),
  status: text('status', { enum: ['draft', 'in-progress', 'ready', 'paid', 'completed', 'cancelled'] }).notNull().default('draft'),
  readyAt: integer('ready_at'),
  paidAt: integer('paid_at'),
  cancelledAt: integer('cancelled_at'),
  syncedAt: integer('synced_at'),
}, (t) => [
  index('idx_sales_created_at').on(t.createdAt),
  index('idx_sales_table_id').on(t.tableId),
  index('idx_sales_status').on(t.status),
]);

export const saleItems = sqliteTable('sale_items', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  saleId: text('sale_id').notNull().references(() => sales.id),
  productId: text('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  lineSubtotal: real('line_subtotal').notNull().default(0),
  discountName: text('discount_name'),
  discountType: text('discount_type', { enum: ['percentage', 'fixed'] }),
  discountValue: real('discount_value'),
  discountAmount: real('discount_amount').notNull().default(0),
});

export const restockLogs = sqliteTable('restock_logs', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.id),
  quantityAdded: real('quantity_added').notNull(),
  cost: real('cost').notNull(),
  supplierId: text('supplier_id').references(() => suppliers.id),
  date: integer('date').notNull(),
  syncedAt: integer('synced_at'),
});

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  date: integer('date').notNull(),
  category: text('category').notNull(),
  amount: real('amount').notNull(),
  description: text('description'),
  supplierId: text('supplier_id').references(() => suppliers.id),
  syncedAt: integer('synced_at'),
}, (t) => [
  index('idx_expenses_date').on(t.date),
]);

export const employees = sqliteTable('employees', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  name: text('name').notNull().unique(),
  salaryType: text('salary_type', { enum: ['hourly', 'monthly'] }).notNull(),
  rate: real('rate').notNull(),
  syncedAt: integer('synced_at'),
});

export const payrollEntries = sqliteTable('payroll_entries', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  periodStart: integer('period_start').notNull(),
  periodEnd: integer('period_end').notNull(),
  amount: real('amount').notNull(),
  syncedAt: integer('synced_at'),
});

// Processed ingredient composition: parent ingredient requires child ingredient at a given quantity.
// Used to model "processed ingredients" that are assembled from raw/leaf ingredients.
export const ingredientCompositions = sqliteTable('ingredient_compositions', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  parentIngredientId: text('parent_ingredient_id').notNull().references(() => ingredients.id),
  childIngredientId: text('child_ingredient_id').notNull().references(() => ingredients.id),
  quantityNeeded: real('quantity_needed').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(strftime('%s', 'now') as int))`),
  syncedAt: integer('synced_at'),
}, (t) => [
  uniqueIndex('ingredient_compositions_unique').on(t.parentIngredientId, t.childIngredientId),
  index('idx_ingredient_compositions_parent').on(t.parentIngredientId),
]);
