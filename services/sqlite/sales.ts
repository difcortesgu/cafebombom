import { db } from '@/database/db';
import { categories, ingredients, productIngredients, products, saleItems, sales, users } from '@/database/schema';
import type { SalesService } from '@/services/interfaces/sales';
import type { CreateSalePayload, SaleItemDetail } from '@/types/sales';
import type { Product, Sale, SaleItemInput } from '@/types/types';
import { between, desc, eq, sql } from 'drizzle-orm';

export class SalesSqliteService implements SalesService {
  async getHydrationData() {
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
        total: sales.total,
      })
      .from(sales)
      .innerJoin(users, eq(users.id, sales.staffId))
      .orderBy(desc(sales.createdAt))
      .limit(50)
      .all() as Sale[];

    return { products: productsList, sales: salesList };
  }

  async createSale({ staffId, items }: CreateSalePayload): Promise<void> {
    if (items.length === 0) {
      return;
    }

    const total = items.reduce((acc: number, item: SaleItemInput) => acc + item.unitPrice * item.quantity, 0);
    const createdAt = Math.floor(Date.now() / 1000);

    db.transaction((tx) => {
      const [newSale] = tx
        .insert(sales)
        .values({ createdAt, staffId, total })
        .returning({ id: sales.id })
        .all();

      for (const item of items) {
        tx.insert(saleItems)
          .values({ saleId: newSale.id, productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })
          .run();

        const recipe = tx
          .select({ ingredientId: productIngredients.ingredientId, quantityUsed: productIngredients.quantityUsed })
          .from(productIngredients)
          .where(eq(productIngredients.productId, item.productId))
          .all();

        for (const entry of recipe) {
          tx.update(ingredients)
            .set({
              quantity: sql`MAX(0, ${ingredients.quantity} - ${entry.quantityUsed * item.quantity})`,
              updatedAt: sql`cast(strftime('%s', 'now') as int)`,
              syncedAt: null,
            })
            .where(eq(ingredients.id, entry.ingredientId))
            .run();
        }
      }
    });
  }

  async getTopSelling(limit = 5): Promise<{ name: string; quantity: number }[]> {
    return db
      .select({ name: products.name, quantity: sql<number>`SUM(${saleItems.quantity})` })
      .from(saleItems)
      .innerJoin(products, eq(products.id, saleItems.productId))
      .groupBy(saleItems.productId)
      .orderBy(sql`SUM(${saleItems.quantity}) DESC`)
      .limit(limit)
      .all();
  }

  async getSaleItems(saleId: number): Promise<SaleItemDetail[]> {
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
    const row = db
      .select({ total: sql<number>`COALESCE(SUM(${sales.total}), 0)` })
      .from(sales)
      .where(between(sales.createdAt, startUnix, endUnix))
      .get();
    return Number(row?.total ?? 0);
  }
}
