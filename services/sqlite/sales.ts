import type { SalesService } from '@/services/interfaces/sales';
import { db, dbReady } from '@/services/sqlite/database/db';
import { categories, discounts, ingredients, productIngredients, products, restaurantTables, saleItems, sales, users } from '@/services/sqlite/database/schema';
import type {
    CreateDiscountPayload,
    CreateSalePayload,
    CreateTablePayload,
    SaleItemDetail,
    SalePricingSummary,
    UpdateDiscountPayload,
    UpdateTablePayload,
} from '@/types/sales';
import type { Discount, Product, RestaurantTable, Sale } from '@/types/types';
import { calculateSaleDiscountBreakdown } from '@/utils/discounts';
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

    const discountsList = db
      .select({
        id: discounts.id,
        name: discounts.name,
        scope: discounts.scope,
        productId: discounts.productId,
        type: discounts.type,
        value: discounts.value,
        startsAt: discounts.startsAt,
        endsAt: discounts.endsAt,
        isActive: discounts.isActive,
      })
      .from(discounts)
      .orderBy(discounts.name)
      .all() as Discount[];

    return { products: productsList, sales: salesList, tables: tablesList, discounts: discountsList };
  }

  async getDiscounts(): Promise<Discount[]> {
    await dbReady;
    return db
      .select({
        id: discounts.id,
        name: discounts.name,
        scope: discounts.scope,
        productId: discounts.productId,
        type: discounts.type,
        value: discounts.value,
        startsAt: discounts.startsAt,
        endsAt: discounts.endsAt,
        isActive: discounts.isActive,
      })
      .from(discounts)
      .orderBy(discounts.name)
      .all() as Discount[];
  }

  async createDiscount(payload: CreateDiscountPayload): Promise<void> {
    await dbReady;
    const startsAt = payload.scope === 'global' ? 0 : payload.startsAt;
    const endsAt = payload.scope === 'global' ? null : payload.endsAt;
    db.insert(discounts)
      .values({
        name: payload.name.trim(),
        scope: payload.scope,
        productId: payload.scope === 'product' ? (payload.productId ?? null) : null,
        type: payload.type,
        value: payload.value,
        startsAt,
        endsAt,
        isActive: payload.isActive,
      })
      .run();
  }

  async updateDiscount(payload: UpdateDiscountPayload): Promise<void> {
    await dbReady;
    const startsAt = payload.scope === 'global' ? 0 : payload.startsAt;
    const endsAt = payload.scope === 'global' ? null : payload.endsAt;
    db.update(discounts)
      .set({
        name: payload.name.trim(),
        scope: payload.scope,
        productId: payload.scope === 'product' ? (payload.productId ?? null) : null,
        type: payload.type,
        value: payload.value,
        startsAt,
        endsAt,
        isActive: payload.isActive,
        updatedAt: sql`cast(strftime('%s', 'now') as int)`,
        syncedAt: null,
      })
      .where(eq(discounts.id, payload.id))
      .run();
  }

  async deleteDiscount(id: string): Promise<void> {
    await dbReady;
    db.delete(discounts).where(eq(discounts.id, id)).run();
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

  async createSale({ staffId, items, tableId, globalDiscountId }: CreateSalePayload): Promise<void> {
    await dbReady;
    if (items.length === 0) {
      return;
    }

    const activeDiscounts = db
      .select({
        id: discounts.id,
        name: discounts.name,
        scope: discounts.scope,
        productId: discounts.productId,
        type: discounts.type,
        value: discounts.value,
        startsAt: discounts.startsAt,
        endsAt: discounts.endsAt,
        isActive: discounts.isActive,
      })
      .from(discounts)
      .all() as Discount[];

    const createdAt = Math.floor(Date.now() / 1000);
    const breakdown = calculateSaleDiscountBreakdown(items, activeDiscounts, createdAt, globalDiscountId ?? null);

    db.transaction((tx) => {
      const [newSale] = tx
        .insert(sales)
        .values({
          createdAt,
          staffId,
          tableId,
          subtotal: breakdown.subtotal,
          itemDiscountTotal: breakdown.itemDiscountTotal,
          orderDiscountName: breakdown.globalDiscountSnapshot.discountName,
          orderDiscountType: breakdown.globalDiscountSnapshot.discountType,
          orderDiscountValue: breakdown.globalDiscountSnapshot.discountValue,
          orderDiscountAmount: breakdown.globalDiscountAmount,
          discountAppliedBy: staffId,
          total: breakdown.total,
        })
        .returning({ id: sales.id })
        .all();

      for (const item of breakdown.items) {
        tx.insert(saleItems)
          .values({
            saleId: newSale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineSubtotal: item.lineSubtotal,
            discountName: item.discountSnapshot.discountName,
            discountType: item.discountSnapshot.discountType,
            discountValue: item.discountSnapshot.discountValue,
            discountAmount: item.discountSnapshot.discountAmount,
          })
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
        line_subtotal: saleItems.lineSubtotal,
        discount_name: saleItems.discountName,
        discount_type: saleItems.discountType,
        discount_value: saleItems.discountValue,
        discount_amount: saleItems.discountAmount,
      })
      .from(saleItems)
      .innerJoin(products, eq(products.id, saleItems.productId))
      .where(eq(saleItems.saleId, saleId))
      .orderBy(saleItems.id)
      .all()
      .map((item) => {
        const lineSubtotal = Number(item.line_subtotal ?? Number(item.unit_price) * item.quantity);
        const discountAmount = Number(item.discount_amount ?? 0);
        const finalLineTotal = Math.max(0, lineSubtotal - discountAmount);
        return {
          ...item,
          line_subtotal: lineSubtotal,
          discount_amount: discountAmount,
          final_line_total: finalLineTotal,
          final_unit_price: item.quantity > 0 ? finalLineTotal / item.quantity : 0,
        };
      }) as SaleItemDetail[];
  }

  async getSalePricingSummary(saleId: string): Promise<SalePricingSummary | null> {
    await dbReady;
    const row = db
      .select({
        subtotal: sales.subtotal,
        item_discount_total: sales.itemDiscountTotal,
        global_discount_name: sales.orderDiscountName,
        global_discount_type: sales.orderDiscountType,
        global_discount_value: sales.orderDiscountValue,
        global_discount_amount: sales.orderDiscountAmount,
        total: sales.total,
        discount_applied_by: users.name,
      })
      .from(sales)
      .leftJoin(users, eq(users.id, sales.discountAppliedBy))
      .where(eq(sales.id, saleId))
      .get();

    if (!row) {
      return null;
    }

    return {
      subtotal: Number(row.subtotal ?? 0),
      item_discount_total: Number(row.item_discount_total ?? 0),
      global_discount_name: row.global_discount_name,
      global_discount_type: row.global_discount_type,
      global_discount_value: row.global_discount_value == null ? null : Number(row.global_discount_value),
      global_discount_amount: Number(row.global_discount_amount ?? 0),
      total: Number(row.total ?? 0),
      discount_applied_by: row.discount_applied_by ?? null,
    };
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
