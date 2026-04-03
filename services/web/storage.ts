import type { Expense, Ingredient, Supplier, User } from '@/types/types';
import { hashPin } from '@/utils/hash';

type WebUserRecord = User & {
  pinHash: string;
  isActive: boolean;
};

type WebSessionRecord = {
  id: number;
  userId: number;
  loggedInAt: number;
  loggedOutAt: number | null;
};

type WebCategoryRecord = {
  id: number;
  name: string;
};

type WebProductRecord = {
  id: number;
  name: string;
  categoryId: number | null;
  price: number;
  isActive: boolean;
};

type WebSupplierRecord = Supplier;

type WebIngredientRecord = Ingredient;

type WebRestockLogRecord = {
  id: number;
  ingredientId: number;
  quantityAdded: number;
  cost: number;
  supplierId: number | null;
  date: number;
};

type WebExpenseRecord = Expense & {
  supplierId: number | null;
};

type WebEmployeeRecord = {
  id: number;
  name: string;
  salaryType: 'hourly' | 'monthly';
  rate: number;
};

type WebPayrollEntryRecord = {
  id: number;
  employeeId: number;
  periodStart: number;
  periodEnd: number;
  amount: number;
};

type WebSaleRecord = {
  id: number;
  createdAt: number;
  staffId: number;
  total: number;
};

type WebSaleItemRecord = {
  id: number;
  saleId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
};

export type WebProductIngredientRecord = {
  id: number;
  productId: number;
  ingredientId: number;
  quantityUsed: number;
};

export type WebIngredientCompositionRecord = {
  id: number;
  parentIngredientId: number;
  childIngredientId: number;
  quantityNeeded: number;
};

type WebIds = {
  users: number;
  sessions: number;
  categories: number;
  products: number;
  suppliers: number;
  ingredients: number;
  restockLogs: number;
  expenses: number;
  employees: number;
  payrollEntries: number;
  sales: number;
  saleItems: number;
  productIngredients: number;
  ingredientCompositions: number;
};

export type WebData = {
  ids: WebIds;
  users: WebUserRecord[];
  sessions: WebSessionRecord[];
  categories: WebCategoryRecord[];
  products: WebProductRecord[];
  suppliers: WebSupplierRecord[];
  ingredients: WebIngredientRecord[];
  restockLogs: WebRestockLogRecord[];
  expenses: WebExpenseRecord[];
  employees: WebEmployeeRecord[];
  payrollEntries: WebPayrollEntryRecord[];
  sales: WebSaleRecord[];
  saleItems: WebSaleItemRecord[];
  productIngredients: WebProductIngredientRecord[];
  ingredientCompositions: WebIngredientCompositionRecord[];
};

const STORAGE_KEY = 'cafebombom.web.v1';

let memoryFallback: WebData | null = null;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getStorage(): Storage | null {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }

  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function createSeedData(): WebData {
  return {
    ids: {
      users: 3,
      sessions: 1,
      categories: 5,
      products: 5,
      suppliers: 1,
      ingredients: 1,
      restockLogs: 1,
      expenses: 1,
      employees: 1,
      payrollEntries: 1,
      sales: 1,
      saleItems: 1,
      productIngredients: 1,
      ingredientCompositions: 1,
    },
    users: [
      { id: 1, name: 'Owner', role: 'owner', pinHash: hashPin('1234'), isActive: true },
      { id: 2, name: 'Staff', role: 'staff', pinHash: hashPin('2222'), isActive: true },
      // Hashes PINs using bcryptjs with 10 salt rounds
    ],
    sessions: [],
    categories: [
      { id: 1, name: 'Coffee' },
      { id: 2, name: 'Tea' },
      { id: 3, name: 'Pastry' },
      { id: 4, name: 'Snacks' },
    ],
    products: [
      { id: 1, name: 'Cappuccino', categoryId: 1, price: 4.5, isActive: true },
      { id: 2, name: 'Latte', categoryId: 1, price: 4.25, isActive: true },
      { id: 3, name: 'Thai Milk Tea', categoryId: 2, price: 3.9, isActive: true },
      { id: 4, name: 'Butter Croissant', categoryId: 3, price: 2.8, isActive: true },
    ],
    suppliers: [],
    ingredients: [],
    restockLogs: [],
    expenses: [],
    employees: [],
    payrollEntries: [],
    sales: [],
    saleItems: [],
    productIngredients: [],
    ingredientCompositions: [],
  };
}

function normalizeData(data: WebData): WebData {
  if (!data.ids) {
    return createSeedData();
  }

  return {
    ids: {
      ...data.ids,
      productIngredients: data.ids.productIngredients ?? 1,
      ingredientCompositions: data.ids.ingredientCompositions ?? 1,
    },
    users: data.users ?? [],
    sessions: data.sessions ?? [],
    categories: data.categories ?? [],
    products: data.products ?? [],
    suppliers: data.suppliers ?? [],
    ingredients: data.ingredients ?? [],
    restockLogs: data.restockLogs ?? [],
    expenses: data.expenses ?? [],
    employees: data.employees ?? [],
    payrollEntries: data.payrollEntries ?? [],
    sales: data.sales ?? [],
    saleItems: data.saleItems ?? [],
    productIngredients: data.productIngredients ?? [],
    ingredientCompositions: data.ingredientCompositions ?? [],
  };
}

export function readWebData(): WebData {
  const storage = getStorage();

  if (!storage) {
    if (!memoryFallback) {
      memoryFallback = createSeedData();
    }
    return clone(memoryFallback);
  }

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = createSeedData();
    storage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return clone(seed);
  }

  try {
    return clone(normalizeData(JSON.parse(raw) as WebData));
  } catch {
    const seed = createSeedData();
    storage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return clone(seed);
  }
}

export function writeWebData(data: WebData): void {
  const next = clone(data);
  const storage = getStorage();

  if (storage) {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
    return;
  }

  memoryFallback = next;
}

export function updateWebData<T>(updater: (data: WebData) => T): T {
  const data = readWebData();
  const result = updater(data);
  writeWebData(data);
  return result;
}

export function nextId(data: WebData, key: keyof WebIds): number {
  const value = data.ids[key];
  data.ids[key] += 1;
  return value;
}

export type {
    WebCategoryRecord,
    WebEmployeeRecord,
    WebExpenseRecord,
    WebIngredientRecord,
    WebPayrollEntryRecord,
    WebProductRecord,
    WebRestockLogRecord,
    WebSaleItemRecord,
    WebSaleRecord,
    WebSessionRecord,
    WebSupplierRecord,
    WebUserRecord
};
