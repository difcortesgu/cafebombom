import type { Expense, Ingredient, Supplier, User } from '@/types/types';
import { generateId } from '@/utils/id';
import Dexie, { type Table } from 'dexie';

export type WebUserRecord = User & {
  pinHash: string;
  isActive: boolean;
};

export type WebSessionRecord = {
  id: string;
  userId: string;
  loggedInAt: number;
  loggedOutAt: number | null;
};

export type WebCategoryRecord = {
  id: string;
  name: string;
};

export type WebProductRecord = {
  id: string;
  name: string;
  categoryId: string | null;
  price: number;
  isActive: boolean;
};

export type WebSupplierRecord = Supplier;

export type WebIngredientRecord = Ingredient;

export type WebRestockLogRecord = {
  id: string;
  ingredientId: string;
  quantityAdded: number;
  cost: number;
  supplierId: string | null;
  date: number;
};

export type WebExpenseRecord = Expense & {
  supplierId: string | null;
};

export type WebEmployeeRecord = {
  id: string;
  name: string;
  salaryType: 'hourly' | 'monthly';
  rate: number;
};

export type WebPayrollEntryRecord = {
  id: string;
  employeeId: string;
  periodStart: number;
  periodEnd: number;
  amount: number;
};

export type WebSaleRecord = {
  id: string;
  createdAt: number;
  staffId: string;
  tableId: string;
  paymentMethod: 'cash' | 'card' | 'transfer';
  subtotal: number;
  itemDiscountTotal: number;
  orderDiscountName: string | null;
  orderDiscountType: 'percentage' | 'fixed' | null;
  orderDiscountValue: number | null;
  orderDiscountAmount: number;
  discountAppliedBy: string | null;
  total: number;
  status: 'draft' | 'in-progress' | 'ready' | 'completed' | 'cancelled';
  readyAt?: number | null;
  paidAt?: number | null;
  cancelledAt?: number | null;
  updatedAt?: number;
};

export type WebRestaurantTableRecord = {
  id: string;
  name: string;
  tableType: 'dine-in' | 'to-go' | 'delivery';
  createdAt: number;
  updatedAt: number;
};

export type WebSurchargeRecord = {
  name: 'to-go' | 'delivery';
  value: number;
  updatedAt: number;
};

export type WebSaleItemRecord = {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  discountName: string | null;
  discountType: 'percentage' | 'fixed' | null;
  discountValue: number | null;
  discountAmount: number;
};

export type WebDiscountRecord = {
  id: string;
  name: string;
  scope: 'product' | 'global';
  productId: string | null;
  type: 'percentage' | 'fixed';
  value: number;
  startsAt: number;
  endsAt: number | null;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type WebProductIngredientRecord = {
  id: string;
  productId: string;
  ingredientId: string;
  quantityUsed: number;
};

export type WebIngredientCompositionRecord = {
  id: string;
  parentIngredientId: string;
  childIngredientId: string;
  quantityNeeded: number;
};

export type WebReceiptPreferenceRecord = {
  id: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessLogoUri: string | null;
  footerMessage: string;
  paperWidth: 58 | 80;
  taxRate: number;
  updatedAt: number;
};

type InsertableRecord<T extends { id: string }> = Omit<T, 'id'> & { id?: string };

export class CafeBomBomDB extends Dexie {
  users!: Table<WebUserRecord, string, InsertableRecord<WebUserRecord>>;
  sessions!: Table<WebSessionRecord, string, InsertableRecord<WebSessionRecord>>;
  categories!: Table<WebCategoryRecord, string, InsertableRecord<WebCategoryRecord>>;
  products!: Table<WebProductRecord, string, InsertableRecord<WebProductRecord>>;
  suppliers!: Table<WebSupplierRecord, string, InsertableRecord<WebSupplierRecord>>;
  ingredients!: Table<WebIngredientRecord, string, InsertableRecord<WebIngredientRecord>>;
  restockLogs!: Table<WebRestockLogRecord, string, InsertableRecord<WebRestockLogRecord>>;
  expenses!: Table<WebExpenseRecord, string, InsertableRecord<WebExpenseRecord>>;
  employees!: Table<WebEmployeeRecord, string, InsertableRecord<WebEmployeeRecord>>;
  payrollEntries!: Table<WebPayrollEntryRecord, string, InsertableRecord<WebPayrollEntryRecord>>;
  restaurantTables!: Table<WebRestaurantTableRecord, string, InsertableRecord<WebRestaurantTableRecord>>;
  surcharges!: Table<WebSurchargeRecord, string, WebSurchargeRecord>;
  sales!: Table<WebSaleRecord, string, InsertableRecord<WebSaleRecord>>;
  saleItems!: Table<WebSaleItemRecord, string, InsertableRecord<WebSaleItemRecord>>;
  discounts!: Table<WebDiscountRecord, string, InsertableRecord<WebDiscountRecord>>;
  productIngredients!: Table<WebProductIngredientRecord, string, InsertableRecord<WebProductIngredientRecord>>;
  ingredientCompositions!: Table<WebIngredientCompositionRecord, string, InsertableRecord<WebIngredientCompositionRecord>>;
  receiptPreferences!: Table<WebReceiptPreferenceRecord, string, InsertableRecord<WebReceiptPreferenceRecord>>;

  constructor() {
    super('cafebombom.web');

    this.version(6).stores({
      users: 'id, name',
      sessions: 'id, userId',
      categories: 'id, &name',
      products: 'id, &name, categoryId',
      suppliers: 'id, &name',
      ingredients: 'id, &name',
      restockLogs: 'id, ingredientId, date',
      expenses: 'id, date',
      employees: 'id, &name',
      payrollEntries: 'id, employeeId',
      restaurantTables: 'id, &name, createdAt',
      sales: 'id, createdAt, staffId, tableId',
      saleItems: 'id, saleId, productId',
      discounts: 'id, &name, scope, productId, isActive, startsAt, endsAt',
      productIngredients: 'id, productId, [productId+ingredientId]',
      ingredientCompositions: 'id, [parentIngredientId+childIngredientId]',
    });

    this.version(7)
      .stores({
        users: 'id, name',
        sessions: 'id, userId',
        categories: 'id, &name',
        products: 'id, &name, categoryId',
        suppliers: 'id, &name',
        ingredients: 'id, &name',
        restockLogs: 'id, ingredientId, date',
        expenses: 'id, date',
        employees: 'id, &name',
        payrollEntries: 'id, employeeId',
        restaurantTables: 'id, &name, isToGo, isDelivery, createdAt',
        sales: 'id, createdAt, staffId, tableId',
        saleItems: 'id, saleId, productId',
        discounts: 'id, &name, scope, productId, isActive, startsAt, endsAt',
        productIngredients: 'id, productId, [productId+ingredientId]',
        ingredientCompositions: 'id, [parentIngredientId+childIngredientId]',
      })
      .upgrade(async (tx) => {
        await tx.table('restaurantTables').toCollection().modify((table: Partial<WebRestaurantTableRecord>) => {
          (table as any).isToGo = Boolean((table as any).isToGo);
          (table as any).isDelivery = Boolean((table as any).isDelivery);
        });
      });

    this.version(8)
      .stores({
        users: 'id, name',
        sessions: 'id, userId',
        categories: 'id, &name',
        products: 'id, &name, categoryId',
        suppliers: 'id, &name',
        ingredients: 'id, &name',
        restockLogs: 'id, ingredientId, date',
        expenses: 'id, date',
        employees: 'id, &name',
        payrollEntries: 'id, employeeId',
        restaurantTables: 'id, &name, tableType, createdAt',
        sales: 'id, createdAt, staffId, tableId',
        saleItems: 'id, saleId, productId',
        discounts: 'id, &name, scope, productId, isActive, startsAt, endsAt',
        productIngredients: 'id, productId, [productId+ingredientId]',
        ingredientCompositions: 'id, [parentIngredientId+childIngredientId]',
      })
      .upgrade(async (tx) => {
        await tx.table('restaurantTables').toCollection().modify((table: any) => {
          if (table.isDelivery) {
            table.tableType = 'delivery';
          } else if (table.isToGo) {
            table.tableType = 'to-go';
          } else {
            table.tableType = 'dine-in';
          }
        });
      });

    this.version(9)
      .stores({
        users: 'id, name',
        sessions: 'id, userId',
        categories: 'id, &name',
        products: 'id, &name, categoryId',
        suppliers: 'id, &name',
        ingredients: 'id, &name',
        restockLogs: 'id, ingredientId, date',
        expenses: 'id, date',
        employees: 'id, &name',
        payrollEntries: 'id, employeeId',
        restaurantTables: 'id, &name, tableType, createdAt',
        appSettings: '&key, updatedAt',
        sales: 'id, createdAt, staffId, tableId',
        saleItems: 'id, saleId, productId',
        discounts: 'id, &name, scope, productId, isActive, startsAt, endsAt',
        productIngredients: 'id, productId, [productId+ingredientId]',
        ingredientCompositions: 'id, [parentIngredientId+childIngredientId]',
      });

    this.version(10)
      .stores({
        users: 'id, name',
        sessions: 'id, userId',
        categories: 'id, &name',
        products: 'id, &name, categoryId',
        suppliers: 'id, &name',
        ingredients: 'id, &name',
        restockLogs: 'id, ingredientId, date',
        expenses: 'id, date',
        employees: 'id, &name',
        payrollEntries: 'id, employeeId',
        restaurantTables: 'id, &name, tableType, createdAt',
        surcharges: '&name, updatedAt',
        sales: 'id, createdAt, staffId, tableId',
        saleItems: 'id, saleId, productId',
        discounts: 'id, &name, scope, productId, isActive, startsAt, endsAt',
        productIngredients: 'id, productId, [productId+ingredientId]',
        ingredientCompositions: 'id, [parentIngredientId+childIngredientId]',
      })
      .upgrade(async (tx) => {
        const appSettingsTable = tx.table('appSettings');
        const toGo = await appSettingsTable.get('to_go_surcharge');
        const delivery = await appSettingsTable.get('delivery_surcharge');
        const now = Math.floor(Date.now() / 1000);

        await tx.table('surcharges').bulkPut([
          {
            name: 'to-go',
            value: Number.isFinite(Number.parseFloat(toGo?.value ?? '0')) ? Math.max(0, Number.parseFloat(toGo?.value ?? '0')) : 0,
            updatedAt: now,
          },
          {
            name: 'delivery',
            value: Number.isFinite(Number.parseFloat(delivery?.value ?? '0')) ? Math.max(0, Number.parseFloat(delivery?.value ?? '0')) : 0,
            updatedAt: now,
          },
        ]);
      });

    this.version(11)
      .stores({
        users: 'id, name',
        sessions: 'id, userId',
        categories: 'id, &name',
        products: 'id, &name, categoryId',
        suppliers: 'id, &name',
        ingredients: 'id, &name',
        restockLogs: 'id, ingredientId, date',
        expenses: 'id, date',
        employees: 'id, &name',
        payrollEntries: 'id, employeeId',
        restaurantTables: 'id, &name, tableType, createdAt',
        surcharges: '&name, updatedAt',
        sales: 'id, createdAt, staffId, tableId, paymentMethod',
        saleItems: 'id, saleId, productId',
        discounts: 'id, &name, scope, productId, isActive, startsAt, endsAt',
        productIngredients: 'id, productId, [productId+ingredientId]',
        ingredientCompositions: 'id, [parentIngredientId+childIngredientId]',
      })
      .upgrade(async (tx) => {
        await tx.table('sales').toCollection().modify((sale: any) => {
          if (!sale.paymentMethod) {
            sale.paymentMethod = 'cash';
          }
        });
      });

    this.version(12)
      .stores({
        users: 'id, name',
        sessions: 'id, userId',
        categories: 'id, &name',
        products: 'id, &name, categoryId',
        suppliers: 'id, &name',
        ingredients: 'id, &name',
        restockLogs: 'id, ingredientId, date',
        expenses: 'id, date',
        employees: 'id, &name',
        payrollEntries: 'id, employeeId',
        restaurantTables: 'id, &name, tableType, createdAt',
        surcharges: '&name, updatedAt',
        sales: 'id, createdAt, staffId, tableId, paymentMethod, status',
        saleItems: 'id, saleId, productId',
        discounts: 'id, &name, scope, productId, isActive, startsAt, endsAt',
        productIngredients: 'id, productId, [productId+ingredientId]',
        ingredientCompositions: 'id, [parentIngredientId+childIngredientId]',
      })
      .upgrade(async (tx) => {
        await tx.table('sales').toCollection().modify((sale: any) => {
          if (!sale.status) {
            sale.status = 'draft';
          }
        });
      });

    this.version(13)
      .stores({
        users: 'id, name',
        sessions: 'id, userId',
        categories: 'id, &name',
        products: 'id, &name, categoryId',
        suppliers: 'id, &name',
        ingredients: 'id, &name',
        restockLogs: 'id, ingredientId, date',
        expenses: 'id, date',
        employees: 'id, &name',
        payrollEntries: 'id, employeeId',
        restaurantTables: 'id, &name, tableType, createdAt',
        surcharges: '&name, updatedAt',
        sales: 'id, createdAt, staffId, tableId, paymentMethod, status',
        saleItems: 'id, saleId, productId',
        discounts: 'id, &name, scope, productId, isActive, startsAt, endsAt',
        productIngredients: 'id, productId, [productId+ingredientId]',
        ingredientCompositions: 'id, [parentIngredientId+childIngredientId]',
        receiptPreferences: 'id, updatedAt',
      });

    this.version(14)
      .stores({
        users: 'id, name',
        sessions: 'id, userId',
        categories: 'id, &name',
        products: 'id, &name, categoryId',
        suppliers: 'id, &name',
        ingredients: 'id, &name',
        restockLogs: 'id, ingredientId, date',
        expenses: 'id, date',
        employees: 'id, &name',
        payrollEntries: 'id, employeeId',
        restaurantTables: 'id, &name, tableType, createdAt',
        surcharges: '&name, updatedAt',
        sales: 'id, createdAt, staffId, tableId, paymentMethod, status',
        saleItems: 'id, saleId, productId',
        discounts: 'id, &name, scope, productId, isActive, startsAt, endsAt',
        productIngredients: 'id, productId, [productId+ingredientId]',
        ingredientCompositions: 'id, [parentIngredientId+childIngredientId]',
        receiptPreferences: 'id, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx.table('sales').toCollection().modify((sale: any) => {
          if (sale.status === 'paid') {
            sale.status = sale.readyAt ? 'completed' : 'in-progress';
          }
        });
      });

    this.attachIdHooks();
  }

  private attachIdHooks(): void {
    const withId = [
      this.users,
      this.sessions,
      this.categories,
      this.products,
      this.suppliers,
      this.ingredients,
      this.restockLogs,
      this.expenses,
      this.employees,
      this.payrollEntries,
      this.restaurantTables,
      this.surcharges,
      this.sales,
      this.saleItems,
      this.discounts,
      this.productIngredients,
      this.ingredientCompositions,
      this.receiptPreferences,
    ];

    for (const table of withId) {
      table.hook('creating', (_primaryKey, obj: { id?: string }) => {
        if (!obj.id) {
          obj.id = generateId();
        }
        return obj.id;
      });
    }
  }

}

let db: CafeBomBomDB | null = null;

export async function getDb(): Promise<CafeBomBomDB> {
  if (!db) {
    db = new CafeBomBomDB();
  }
  return db;
}
