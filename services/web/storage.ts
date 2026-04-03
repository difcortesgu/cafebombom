import type { Expense, Ingredient, Supplier, User } from '@/types/types';
import { hashPin } from '@/utils/hash';
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
  total: number;
};

export type WebSaleItemRecord = {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
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
  sales!: Table<WebSaleRecord, string, InsertableRecord<WebSaleRecord>>;
  saleItems!: Table<WebSaleItemRecord, string, InsertableRecord<WebSaleItemRecord>>;
  productIngredients!: Table<WebProductIngredientRecord, string, InsertableRecord<WebProductIngredientRecord>>;
  ingredientCompositions!: Table<WebIngredientCompositionRecord, string, InsertableRecord<WebIngredientCompositionRecord>>;

  constructor() {
    super('cafebombom.web');

    this.version(1).stores({
      users: 'id',
      sessions: 'id, userId',
      categories: 'id',
      products: 'id, categoryId',
      suppliers: 'id',
      ingredients: 'id',
      restockLogs: 'id, ingredientId, date',
      expenses: 'id, date',
      employees: 'id',
      payrollEntries: 'id, employeeId',
      sales: 'id, createdAt, staffId',
      saleItems: 'id, saleId, productId',
      productIngredients: 'id, productId, [productId+ingredientId]',
      ingredientCompositions: 'id, [parentIngredientId+childIngredientId]',
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
      this.sales,
      this.saleItems,
      this.productIngredients,
      this.ingredientCompositions,
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

  async seed(): Promise<void> {
    const hasData = await this.users.count();
    if (hasData > 0) return;

    try {
      const userId1 = generateId();
      const userId2 = generateId();
      const categoryId1 = generateId();
      const categoryId2 = generateId();
      const categoryId3 = generateId();
      const categoryId4 = generateId();
      const productId1 = generateId();
      const productId2 = generateId();
      const productId3 = generateId();
      const productId4 = generateId();

      await this.transaction('rw', [this.users, this.categories, this.products], async () => {
        await this.users.bulkAdd([
          { id: userId1, name: 'Owner', role: 'owner', pinHash: hashPin('1234'), isActive: true },
          { id: userId2, name: 'Staff', role: 'staff', pinHash: hashPin('2222'), isActive: true },
        ]);
        await this.categories.bulkAdd([
          { id: categoryId1, name: 'Coffee' },
          { id: categoryId2, name: 'Tea' },
          { id: categoryId3, name: 'Pastry' },
          { id: categoryId4, name: 'Snacks' },
        ]);
        await this.products.bulkAdd([
          { id: productId1, name: 'Cappuccino', categoryId: categoryId1, price: 4.5, isActive: true },
          { id: productId2, name: 'Latte', categoryId: categoryId1, price: 4.25, isActive: true },
          { id: productId3, name: 'Thai Milk Tea', categoryId: categoryId2, price: 3.9, isActive: true },
          { id: productId4, name: 'Butter Croissant', categoryId: categoryId3, price: 2.8, isActive: true },
        ]);
      });
    } catch (err) {
      console.error('Failed to seed database:', err);
    }
  }
}

let db: CafeBomBomDB | null = null;

export async function getDb(): Promise<CafeBomBomDB> {
  if (!db) {
    db = new CafeBomBomDB();
    await db.seed();
  }
  return db;
}
