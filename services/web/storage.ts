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
  tableId: string;
  subtotal: number;
  itemDiscountTotal: number;
  orderDiscountName: string | null;
  orderDiscountType: 'percentage' | 'fixed' | null;
  orderDiscountValue: number | null;
  orderDiscountAmount: number;
  discountAppliedBy: string | null;
  total: number;
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
      const ingredientId1 = generateId();
      const ingredientId2 = generateId();
      const ingredientId3 = generateId();
      const ingredientId4 = generateId();
      const now = Math.floor(Date.now() / 1000);

      await this.transaction('rw', [this.users, this.categories, this.products, this.ingredients, this.productIngredients, this.restaurantTables, this.discounts, this.surcharges], async () => {
        if ((await this.users.count()) === 0) {
          await this.users.bulkAdd([
            { id: userId1, name: 'Owner', role: 'owner', pinHash: hashPin('1234'), isActive: true },
            { id: userId2, name: 'Staff', role: 'staff', pinHash: hashPin('2222'), isActive: true },
          ]);
        }
        if ((await this.categories.count()) === 0) {
          await this.categories.bulkAdd([
            { id: categoryId1, name: 'Coffee' },
            { id: categoryId2, name: 'Tea' },
            { id: categoryId3, name: 'Pastry' },
            { id: categoryId4, name: 'Snacks' },
          ]);
        }
        if ((await this.ingredients.count()) === 0) {
          await this.ingredients.bulkAdd([
            { id: ingredientId1, name: 'Espresso Beans', unit: 'grams', quantity: 0, low_stock_threshold: 500, supplier_id: null },
            { id: ingredientId2, name: 'Milk', unit: 'liters', quantity: 0, low_stock_threshold: 2, supplier_id: null },
            { id: ingredientId3, name: 'Tea Blend', unit: 'grams', quantity: 0, low_stock_threshold: 400, supplier_id: null },
            { id: ingredientId4, name: 'Pastry Dough', unit: 'grams', quantity: 0, low_stock_threshold: 1000, supplier_id: null },
          ]);
        }
        if ((await this.products.count()) === 0) {
          const coffee = await this.categories.where('name').equals('Coffee').first();
          const tea = await this.categories.where('name').equals('Tea').first();
          const pastry = await this.categories.where('name').equals('Pastry').first();
          if (coffee && tea && pastry) {
            await this.products.bulkAdd([
              { id: productId1, name: 'Cappuccino', categoryId: coffee.id, price: 4.5, isActive: true },
              { id: productId2, name: 'Latte', categoryId: coffee.id, price: 4.25, isActive: true },
              { id: productId3, name: 'Thai Milk Tea', categoryId: tea.id, price: 3.9, isActive: true },
              { id: productId4, name: 'Butter Croissant', categoryId: pastry.id, price: 2.8, isActive: true },
            ]);
          }
        }
        if ((await this.productIngredients.count()) === 0) {
          const cappuccino = await this.products.where('name').equals('Cappuccino').first();
          const latte = await this.products.where('name').equals('Latte').first();
          const thaiMilkTea = await this.products.where('name').equals('Thai Milk Tea').first();
          const butterCroissant = await this.products.where('name').equals('Butter Croissant').first();
          const espresso = await this.ingredients.where('name').equals('Espresso Beans').first();
          const milk = await this.ingredients.where('name').equals('Milk').first();
          const teaBlend = await this.ingredients.where('name').equals('Tea Blend').first();
          const pastryDough = await this.ingredients.where('name').equals('Pastry Dough').first();

          if (cappuccino && latte && thaiMilkTea && butterCroissant && espresso && milk && teaBlend && pastryDough) {
            await this.productIngredients.bulkAdd([
              { productId: cappuccino.id, ingredientId: espresso.id, quantityUsed: 18 },
              { productId: latte.id, ingredientId: espresso.id, quantityUsed: 18 },
              { productId: thaiMilkTea.id, ingredientId: teaBlend.id, quantityUsed: 10 },
              { productId: butterCroissant.id, ingredientId: pastryDough.id, quantityUsed: 80 },
              { productId: cappuccino.id, ingredientId: milk.id, quantityUsed: 150 },
              { productId: latte.id, ingredientId: milk.id, quantityUsed: 180 },
              { productId: thaiMilkTea.id, ingredientId: milk.id, quantityUsed: 120 },
            ]);
          }
        }
        if ((await this.restaurantTables.count()) === 0) {
          await this.restaurantTables.bulkAdd([
            { name: 'Para llevar', tableType: 'to-go', createdAt: now, updatedAt: now },
            { name: 'Domicilio', tableType: 'delivery', createdAt: now, updatedAt: now },
            { name: 'Mesa 1', tableType: 'dine-in', createdAt: now, updatedAt: now },
            { name: 'Mesa 2', tableType: 'dine-in', createdAt: now, updatedAt: now },
            { name: 'Mesa 3', tableType: 'dine-in', createdAt: now, updatedAt: now },
            { name: 'Mesa 4', tableType: 'dine-in', createdAt: now, updatedAt: now },
          ]);
        }
        if ((await this.discounts.count()) === 0) {
          await this.discounts.bulkAdd([
            { name: 'Grand Opening 5%', scope: 'global', productId: null, type: 'percentage', value: 5, startsAt: now, endsAt: null, isActive: true, createdAt: now, updatedAt: now },
            { name: 'Happy Hour $1', scope: 'global', productId: null, type: 'fixed', value: 1, startsAt: now, endsAt: null, isActive: true, createdAt: now, updatedAt: now },
          ]);
        }

        if ((await this.surcharges.count()) === 0) {
          await this.surcharges.bulkAdd([
            { name: 'to-go', value: 0, updatedAt: now },
            { name: 'delivery', value: 0, updatedAt: now },
          ]);
        }
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
