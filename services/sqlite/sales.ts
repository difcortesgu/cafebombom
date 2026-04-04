import { db, dbReady } from '@/database/db';
import { categories, ingredients, productIngredients, products, restaurantTables, saleItems, sales, users } from '@/database/schema';
import type { SalesService } from '@/services/interfaces/sales';
import type { CreateSalePayload, CreateTablePayload, SaleItemDetail, UpdateTablePayload } from '@/types/sales';
import type { Product, RestaurantTable, Sale, SaleItemInput } from '@/types/types';
import { between, desc, eq, sql } from 'drizzle-orm';

export class SalesSqliteService implements SalesService {
  async getHydrationData() {
    await dbReady;
    const productsList = db
      .select({
        id: products.id,
        name: products.name,
        category: categories.name,
        price: products.price,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(eq(products.isActive, true))
      .orderBy(products.name)
      .all() as Product[];

    const salesList = db
      .select({
        id: sales.id,
        created_at: sales.createdAt,
        staff_name: users.name,
        table_name: restaurantTables.name,
        total: sales.total,
      })
      .from(sales)
      .innerJoin(users, eq(users.id, sales.staffId))
      .leftJoin(restaurantTables, eq(restaurantTables.id, sales.tableId))
      .orderBy(desc(sales.createdAt))
      .limit(50)
      .all() as Sale[];

    const tablesList = db
      .select({
        id: restaurantTables.id,
        name: restaurantTables.name,
        created_at: restaurantTables.createdAt,
      })
      .from(restaurantTables)
      .orderBy(restaurantTables.name)
      .all() as RestaurantTable[];

    return { products: productsList, sales: salesList, tables: tablesList };
  }

  async getTables(): Promise<RestaurantTable[]> {
    await dbReady;
    return db
      .select({
        id: restaurantTables.id,
        name: restaurantTables.name,
        created_at: restaurantTables.createdAt,
      })
      .from(restaurantTables)
      .orderBy(restaurantTables.name)
      .all() as RestaurantTable[];
  }

  async createTable({ name }: CreateTablePayload): Promise<void> {
    await dbReady;
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }
    db.insert(restaurantTables)
      .values({ name: normalizedName })
      .onConflictDoNothing()
      .run();
  }

  async updateTable({ id, name }: UpdateTablePayload): Promise<void> {
    await dbReady;
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }
    db.update(restaurantTables)
      .set({
        name: normalizedName,
        updatedAt: sql`cast(strftime('%s', 'now') as int)`,
        syncedAt: null,
      })
      .where(eq(restaurantTables.id, id))
      .run();
  }

  async deleteTable(id: string): Promise<void> {
    await dbReady;
    try {
      db.delete(restaurantTables).where(eq(restaurantTables.id, id)).run();
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      if (msg.includes('FOREIGN KEY constraint failed')) {
        throw new Error('Cannot delete a table that has linked sales.');
      }
      throw err;
    }
  }

  async createSale({ staffId, items, tableId }: CreateSalePayload): Promise<void> {
    await dbReady;
    if (items.length === 0) {
      return;
    }

    const total = items.reduce((acc: number, item: SaleItemInput) => acc + item.unitPrice * item.quantity, 0);
    const createdAt = Math.floor(Date.now() / 1000);

    db.transaction((tx) => {
      const [newSale] = tx
        .insert(sales)
        .values({ createdAt, staffId, tableId: tableId ?? null, total })
        .returning({ id: sales.id })
        .all();

      for (const item of items) {
        tx.insert(saleItems)
          .values({ saleId: newSale.id, productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })
          .run();

        const recipeEdges = tx
          .select({ ingredientId: productIngredients.ingredientId, quantityUsed: productIngredients.quantityUsed })
          .from(productIngredients)
          .where(eq(productIngredients.productId, item.productId))
          .all();

        const leafConsumptions = recipeEdges.map(({ ingredientId, quantityUsed }) => ({ ingredientId, quantity: quantityUsed * item.quantity }));

        for (const leaf of leafConsumptions) {
          tx.update(ingredients)
            .set({
              quantity: sql`MAX(0, ${ingredients.quantity} - ${leaf.quantity})`,
              updatedAt: sql`cast(strftime('%s', 'now') as int)`,
              syncedAt: null,
            })
            .where(eq(ingredients.id, leaf.ingredientId))
            .run();
        }
      }
    });
  }

  async getTopSelling(limit = 5): Promise<{ name: string; quantity: number }[]> {
    await dbReady;
    return db
      .select({ name: products.name, quantity: sql<number>`SUM(${saleItems.quantity})` })
      .from(saleItems)
      .innerJoin(products, eq(products.id, saleItems.productId))
      .groupBy(saleItems.productId)
      .orderBy(sql`SUM(${saleItems.quantity}) DESC`)
      .limit(limit)
      .all();
  }

  async getSaleItems(saleId: string): Promise<SaleItemDetail[]> {
    await dbReady;
    return db
      .select({
        id: saleItems.id,
        product_name: products.name,
        quantity: saleItems.quantity,
        unit_price: saleItems.unitPrice,
      })
      .from(saleItems)
      .innerJoin(products, eq(products.id, saleItems.productId))
      .where(eq(saleItems.saleId, saleId))
      .orderBy(saleItems.id)
      .all() as SaleItemDetail[];
  }

  async getRevenueInRange(startUnix: number, endUnix: number): Promise<number> {
    await dbReady;
    const row = db
      .select({ total: sql<number>`COALESCE(SUM(${sales.total}), 0)` })
      .from(sales)
      .where(between(sales.createdAt, startUnix, endUnix))
      .get();
    return Number(row?.total ?? 0);
  }
}
