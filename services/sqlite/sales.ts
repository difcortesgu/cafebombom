import type { SalesService } from '@/services/interfaces/sales';
import { db, dbReady } from '@/services/sqlite/database/db';
import { categories, discounts, ingredients, productIngredients, products, restaurantTables, saleItems, sales, surcharges, users } from '@/services/sqlite/database/schema';
import type {
  AddItemToOrderPayload,
  CreateDiscountPayload,
  CreateSalePayload,
  CreateTablePayload,
  RemoveItemFromOrderPayload,
  SaleItemDetail,
  SalePricingSummary,
  UpdateDiscountPayload,
  UpdateDraftOrderPayload,
  UpdateTablePayload,
} from '@/types/sales';
import type { Discount, PaymentMethod, Product, RestaurantTable, Sale } from '@/types/types';
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
        payment_method: sales.paymentMethod,
        total: sales.total,
        status: sales.status,
        ready_at: sales.readyAt,
        paid_at: sales.paidAt,
        cancelled_at: sales.cancelledAt,
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
        table_type: restaurantTables.tableType,
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
        table_type: restaurantTables.tableType,
        created_at: restaurantTables.createdAt,
      })
      .from(restaurantTables)
      .orderBy(restaurantTables.name)
      .all() as RestaurantTable[];
  }

  async createTable({ name, tableType }: CreateTablePayload): Promise<void> {
    await dbReady;
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }
    db.insert(restaurantTables)
      .values({
        name: normalizedName,
        tableType,
      })
      .onConflictDoNothing()
      .run();
  }

  async updateTable({ id, name, tableType }: UpdateTablePayload): Promise<void> {
    await dbReady;
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }
    db.update(restaurantTables)
      .set({
        name: normalizedName,
        tableType,
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

  async createSale({ staffId, items, tableId, paymentMethod, globalDiscountId, orderTypeSurcharge }: CreateSalePayload): Promise<void> {
    await dbReady;
    if (items.length === 0) {
      return;
    }

    const normalizedSurcharge = Number.isFinite(orderTypeSurcharge) ? Math.max(0, Number(orderTypeSurcharge)) : 0;
    const normalizedPaymentMethod: PaymentMethod = paymentMethod ?? 'cash';

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
          paymentMethod: normalizedPaymentMethod,
          subtotal: breakdown.subtotal,
          itemDiscountTotal: breakdown.itemDiscountTotal,
          orderDiscountName: breakdown.globalDiscountSnapshot.discountName,
          orderDiscountType: breakdown.globalDiscountSnapshot.discountType,
          orderDiscountValue: breakdown.globalDiscountSnapshot.discountValue,
          orderDiscountAmount: breakdown.globalDiscountAmount,
          discountAppliedBy: staffId,
          total: breakdown.total + normalizedSurcharge,
          status: 'draft',
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
      }
    });
  }

  async updateDraftOrder({ orderId, staffId, items, tableId, paymentMethod, globalDiscountId, orderTypeSurcharge }: UpdateDraftOrderPayload): Promise<void> {
    await dbReady;

    if (items.length === 0) {
      return;
    }

    const existingOrder = db
      .select({ status: sales.status })
      .from(sales)
      .where(eq(sales.id, orderId))
      .get();

    if (!existingOrder) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (existingOrder.status !== 'draft') {
      throw new Error('Only draft orders can be edited.');
    }

    const normalizedSurcharge = Number.isFinite(orderTypeSurcharge) ? Math.max(0, Number(orderTypeSurcharge)) : 0;
    const normalizedPaymentMethod: PaymentMethod = paymentMethod ?? 'cash';

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

    const now = Math.floor(Date.now() / 1000);
    const breakdown = calculateSaleDiscountBreakdown(items, activeDiscounts, now, globalDiscountId ?? null);

    db.transaction((tx) => {
      tx.delete(saleItems).where(eq(saleItems.saleId, orderId)).run();

      tx.update(sales)
        .set({
          tableId,
          paymentMethod: normalizedPaymentMethod,
          subtotal: breakdown.subtotal,
          itemDiscountTotal: breakdown.itemDiscountTotal,
          orderDiscountName: breakdown.globalDiscountSnapshot.discountName,
          orderDiscountType: breakdown.globalDiscountSnapshot.discountType,
          orderDiscountValue: breakdown.globalDiscountSnapshot.discountValue,
          orderDiscountAmount: breakdown.globalDiscountAmount,
          discountAppliedBy: staffId,
          total: breakdown.total + normalizedSurcharge,
          syncedAt: null,
        })
        .where(eq(sales.id, orderId))
        .run();

      for (const item of breakdown.items) {
        tx.insert(saleItems)
          .values({
            saleId: orderId,
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
        product_id: saleItems.productId,
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

    const subtotal = Number(row.subtotal ?? 0);
    const itemDiscountTotal = Number(row.item_discount_total ?? 0);
    const globalDiscountAmount = Number(row.global_discount_amount ?? 0);
    const total = Number(row.total ?? 0);
    const discountedSubtotal = Math.max(0, subtotal - itemDiscountTotal - globalDiscountAmount);
    const orderTypeSurcharge = Math.max(0, total - discountedSubtotal);

    return {
      subtotal,
      item_discount_total: itemDiscountTotal,
      global_discount_name: row.global_discount_name,
      global_discount_type: row.global_discount_type,
      global_discount_value: row.global_discount_value == null ? null : Number(row.global_discount_value),
      global_discount_amount: globalDiscountAmount,
      order_type_surcharge: orderTypeSurcharge,
      total,
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

  async getOrderTypeSurchargeConfig(): Promise<{ toGoSurcharge: number; deliverySurcharge: number }> {
    await dbReady;

    const rows = db
      .select({ name: surcharges.name, value: surcharges.value })
      .from(surcharges)
      .where(sql`${surcharges.name} IN ('to-go', 'delivery')`)
      .all();

    const toGoSurcharge = Number(rows.find((row) => row.name === 'to-go')?.value ?? 0);
    const deliverySurcharge = Number(rows.find((row) => row.name === 'delivery')?.value ?? 0);

    return {
      toGoSurcharge: Number.isFinite(toGoSurcharge) ? Math.max(0, toGoSurcharge) : 0,
      deliverySurcharge: Number.isFinite(deliverySurcharge) ? Math.max(0, deliverySurcharge) : 0,
    };
  }

  async saveOrderTypeSurchargeConfig(payload: { toGoSurcharge: number; deliverySurcharge: number }): Promise<void> {
    await dbReady;

    const safeToGo = Number.isFinite(payload.toGoSurcharge) ? Math.max(0, payload.toGoSurcharge) : 0;
    const safeDelivery = Number.isFinite(payload.deliverySurcharge) ? Math.max(0, payload.deliverySurcharge) : 0;

    db.insert(surcharges)
      .values({ name: 'to-go', value: safeToGo })
      .onConflictDoUpdate({
        target: surcharges.name,
        set: {
          value: safeToGo,
          updatedAt: sql`cast(strftime('%s', 'now') as int)`,
        },
      })
      .run();

    db.insert(surcharges)
      .values({ name: 'delivery', value: safeDelivery })
      .onConflictDoUpdate({
        target: surcharges.name,
        set: {
          value: safeDelivery,
          updatedAt: sql`cast(strftime('%s', 'now') as int)`,
        },
      })
      .run();
  }

  private async deductInventoryForOrder(orderId: string): Promise<void> {
    await dbReady;
    const orderItems = db
      .select({
        productId: saleItems.productId,
        quantity: saleItems.quantity,
      })
      .from(saleItems)
      .where(eq(saleItems.saleId, orderId))
      .all();

    db.transaction((tx) => {
      for (const item of orderItems) {
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

  async sendToKitchen(orderId: string): Promise<void> {
    await dbReady;
    const order = db.select({ status: sales.status }).from(sales).where(eq(sales.id, orderId)).get();

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== 'draft') {
      throw new Error(`Cannot send order to kitchen. Order status must be 'draft', but is '${order.status}'`);
    }

    db.update(sales)
      .set({
        status: 'in-progress',
        syncedAt: null,
      })
      .where(eq(sales.id, orderId))
      .run();

    await this.deductInventoryForOrder(orderId);
  }

  async markOrderReady(orderId: string): Promise<void> {
    await dbReady;
    const order = db
      .select({ status: sales.status, readyAt: sales.readyAt })
      .from(sales)
      .where(eq(sales.id, orderId))
      .get();

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (!['in-progress', 'paid'].includes(order.status)) {
      throw new Error(`Cannot mark order as ready. Order status must be 'in-progress' or 'paid', but is '${order.status}'`);
    }

    // Paid-first flow: inventory was not deducted yet while order was still draft.
    if (order.status === 'paid' && !order.readyAt) {
      await this.deductInventoryForOrder(orderId);
    }

    const readyAt = Math.floor(Date.now() / 1000);
    db.update(sales)
      .set({
        status: 'ready',
        readyAt,
        syncedAt: null,
      })
      .where(eq(sales.id, orderId))
      .run();

    // Check if order should auto-complete
    await this.autoCompleteIfReady(orderId);
  }

  async markOrderPaid(orderId: string, paymentMethod?: PaymentMethod): Promise<void> {
    await dbReady;
    const order = db.select({ status: sales.status }).from(sales).where(eq(sales.id, orderId)).get();

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (!['draft', 'in-progress', 'ready'].includes(order.status)) {
      throw new Error(`Cannot mark order as paid. Order status must be 'draft', 'in-progress', or 'ready', but is '${order.status}'`);
    }

    const paidAt = Math.floor(Date.now() / 1000);
    const nextStatus = order.status === 'draft' ? 'paid' : order.status;
    db.update(sales)
      .set({
        status: nextStatus,
        paidAt,
        ...(paymentMethod && { paymentMethod }),
        syncedAt: null,
      })
      .where(eq(sales.id, orderId))
      .run();

    // Check if order should auto-complete
    await this.autoCompleteIfReady(orderId);
  }

  private async autoCompleteIfReady(orderId: string): Promise<void> {
    await dbReady;
    const order = db
      .select({ status: sales.status, readyAt: sales.readyAt, paidAt: sales.paidAt })
      .from(sales)
      .where(eq(sales.id, orderId))
      .get();

    if (order && order.readyAt && order.paidAt) {
      db.update(sales)
        .set({
          status: 'completed',
          syncedAt: null,
        })
        .where(eq(sales.id, orderId))
        .run();
    }
  }

  async addItemToOrder(payload: AddItemToOrderPayload): Promise<void> {
    await dbReady;
    const { orderId, item } = payload;

    const order = db.select({ status: sales.status }).from(sales).where(eq(sales.id, orderId)).get();

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== 'draft') {
      throw new Error(`Can only add items to draft orders. Order status is '${order.status}'`);
    }

    const product = db
      .select({ price: products.price })
      .from(products)
      .where(eq(products.id, item.productId))
      .get();

    if (!product) {
      throw new Error(`Product ${item.productId} not found`);
    }

    const lineSubtotal = item.unitPrice * item.quantity;

    db.insert(saleItems)
      .values({
        saleId: orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineSubtotal,
      })
      .run();

    // Update order totals
    const orderItems = db
      .select({
        subtotal: sql<number>`COALESCE(SUM(${saleItems.lineSubtotal}), 0)`,
      })
      .from(saleItems)
      .where(eq(saleItems.saleId, orderId))
      .get();

    db.update(sales)
      .set({
        subtotal: orderItems?.subtotal ?? 0,
        total: orderItems?.subtotal ?? 0,
        syncedAt: null,
      })
      .where(eq(sales.id, orderId))
      .run();
  }

  async removeItemFromOrder(payload: RemoveItemFromOrderPayload): Promise<void> {
    await dbReady;
    const { orderId, saleItemId } = payload;

    const order = db.select({ status: sales.status }).from(sales).where(eq(sales.id, orderId)).get();

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== 'draft') {
      throw new Error(`Can only remove items from draft orders. Order status is '${order.status}'`);
    }

    db.delete(saleItems).where(eq(saleItems.id, saleItemId)).run();

    // Update order totals
    const orderItems = db
      .select({
        subtotal: sql<number>`COALESCE(SUM(${saleItems.lineSubtotal}), 0)`,
      })
      .from(saleItems)
      .where(eq(saleItems.saleId, orderId))
      .get();

    db.update(sales)
      .set({
        subtotal: orderItems?.subtotal ?? 0,
        total: orderItems?.subtotal ?? 0,
        syncedAt: null,
      })
      .where(eq(sales.id, orderId))
      .run();
  }

  async cancelOrder(orderId: string): Promise<void> {
    await dbReady;
    const order = db
      .select({ status: sales.status })
      .from(sales)
      .where(eq(sales.id, orderId))
      .get();

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new Error(`Cannot cancel order with status '${order.status}'`);
    }

    const cancelledAt = Math.floor(Date.now() / 1000);
    db.update(sales)
      .set({
        status: 'cancelled',
        cancelledAt,
        syncedAt: null,
      })
      .where(eq(sales.id, orderId))
      .run();

    // If order was in-progress or ready, restore inventory
    if (['in-progress', 'ready', 'paid'].includes(order.status)) {
      const orderItems = db
        .select({
          productId: saleItems.productId,
          quantity: saleItems.quantity,
        })
        .from(saleItems)
        .where(eq(saleItems.saleId, orderId))
        .all();

      db.transaction((tx) => {
        for (const item of orderItems) {
          const recipeEdges = tx
            .select({ ingredientId: productIngredients.ingredientId, quantityUsed: productIngredients.quantityUsed })
            .from(productIngredients)
            .where(eq(productIngredients.productId, item.productId))
            .all();

          const leafRestorations = recipeEdges.map(({ ingredientId, quantityUsed }) => ({ ingredientId, quantity: quantityUsed * item.quantity }));

          for (const leaf of leafRestorations) {
            tx.update(ingredients)
              .set({
                quantity: sql`${ingredients.quantity} + ${leaf.quantity}`,
                updatedAt: sql`cast(strftime('%s', 'now') as int)`,
                syncedAt: null,
              })
              .where(eq(ingredients.id, leaf.ingredientId))
              .run();
          }
        }
      });
    }
  }
}
