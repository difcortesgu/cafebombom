import type { Expense, Ingredient, Supplier, User } from '@/types/types';
import { hashPin } from '@/utils/hash';
import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';

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

export class CafeBomBomDB extends Dexie {
  users!: Table<WebUserRecord>;
  sessions!: Table<WebSessionRecord>;
  categories!: Table<WebCategoryRecord>;
  products!: Table<WebProductRecord>;
  suppliers!: Table<WebSupplierRecord>;
  ingredients!: Table<WebIngredientRecord>;
  restockLogs!: Table<WebRestockLogRecord>;
  expenses!: Table<WebExpenseRecord>;
  employees!: Table<WebEmployeeRecord>;
  payrollEntries!: Table<WebPayrollEntryRecord>;
  sales!: Table<WebSaleRecord>;
  saleItems!: Table<WebSaleItemRecord>;
  productIngredients!: Table<WebProductIngredientRecord>;
  ingredientCompositions!: Table<WebIngredientCompositionRecord>;

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
  }

  async seed(): Promise<void> {
    const hasData = await this.users.count();
    if (hasData > 0) return;

    try {
      const userId1 = uuidv4();
      const userId2 = uuidv4();
      const categoryId1 = uuidv4();
      const categoryId2 = uuidv4();
      const categoryId3 = uuidv4();
      const categoryId4 = uuidv4();
      const productId1 = uuidv4();
      const productId2 = uuidv4();
      const productId3 = uuidv4();
      const productId4 = uuidv4();

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

export function generateId(): string {
  return uuidv4();
}

export async function getDb(): Promise<CafeBomBomDB> {
  if (!db) {
    db = new CafeBomBomDB();
    await db.seed();
  }
  return db;
}
