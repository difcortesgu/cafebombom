import { db } from '@/database';
import { categories, discounts, ingredients, productAdditionalIngredients, productIngredients, products, restaurantTables, saleItems, salePaymentItems, salePayments, sales, surcharges, users } from '@/database/schema';
import { buildDashboardSalesSummary, RECOGNIZED_REVENUE_STATUSES } from '@/services/analytics';
import { salesErrorMessage } from '@/services/messages';
import { calculateSaleDiscountBreakdown } from '@/services/pricing';
import type {
  AddItemToOrderPayload,
  CreateDiscountPayload,
  CreatePartialPaymentPayload,
  CreateSalePayload,
  CreateTablePayload,
  DashboardSalesSummary,
  DashboardTrendBucket,
  RemoveItemFromOrderPayload,
  SaleItemDetail,
  SalePayment,
  SalePaymentBoard,
  SalePaymentBoardItem,
  SalePaymentLine,
  SalePricingSummary,
  UpdateDiscountPayload,
  UpdateDraftOrderPayload,
  UpdateTablePayload,
} from '@/types/sales';
import type { Discount, Product, ProductAdditionalIngredientOption, RestaurantTable, Sale, SaleItemAdditionalIngredientInput, SaleItemInput } from '@/types/types';
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';

function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function normalizeObservation(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }

  const value = raw.trim();
  return value.length > 0 ? value : null;
}

function allocateProportionally(total: number, weights: number[]): number[] {
  const safeTotal = roundMoney(total);
  if (safeTotal <= 0 || weights.length === 0) {
    return weights.map(() => 0);
  }

  const safeWeights = weights.map((weight) => Math.max(0, Number(weight) || 0));
  const weightSum = safeWeights.reduce((sum, value) => sum + value, 0);
  if (weightSum <= 0) {
    const evenShare = roundMoney(safeTotal / safeWeights.length);
    const result = safeWeights.map(() => evenShare);
    const currentSum = roundMoney(result.reduce((sum, value) => sum + value, 0));
    result[result.length - 1] = roundMoney(result[result.length - 1] + (safeTotal - currentSum));
    return result;
  }

  const provisional = safeWeights.map((weight) => roundMoney((safeTotal * weight) / weightSum));
  const provisionalSum = roundMoney(provisional.reduce((sum, value) => sum + value, 0));
  provisional[provisional.length - 1] = roundMoney(provisional[provisional.length - 1] + (safeTotal - provisionalSum));
  return provisional;
}

export class SalesSqliteService {
  private normalizeRemovedIngredientIds(raw: unknown): string[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return Array.from(new Set(raw
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)));
  }

  private parseRemovedIngredientIds(raw: string | null | undefined): string[] {
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return this.normalizeRemovedIngredientIds(parsed);
    } catch {
      return [];
    }
  }

  private normalizeSelectedAdditionalIngredients(raw: unknown): SaleItemAdditionalIngredientInput[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    const deduped = new Map<string, number>();
    for (const value of raw) {
      if (!value || typeof value !== 'object') {
        continue;
      }

      const ingredientId = typeof (value as { ingredientId?: unknown }).ingredientId === 'string'
        ? (value as { ingredientId: string }).ingredientId.trim()
        : '';
      const quantity = clampQuantity(Number((value as { quantity?: unknown }).quantity ?? 0));

      if (!ingredientId || quantity <= 0) {
        continue;
      }

      deduped.set(ingredientId, quantity);
    }

    return Array.from(deduped.entries()).map(([ingredientId, quantity]) => ({ ingredientId, quantity }));
  }

  private parseSelectedAdditionalIngredients(raw: string | null | undefined): SaleItemAdditionalIngredientInput[] {
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return this.normalizeSelectedAdditionalIngredients(parsed);
    } catch {
      return [];
    }
  }

  private serializeSelectedAdditionalIngredients(raw: SaleItemAdditionalIngredientInput[] | undefined): string {
    return JSON.stringify(this.normalizeSelectedAdditionalIngredients(raw ?? []));
  }

  private async resolveSaleItems(items: SaleItemInput[]): Promise<SaleItemInput[]> {
    if (items.length === 0) {
      return [];
    }

    const productIds = Array.from(new Set(items.map((item) => item.productId).filter((id) => typeof id === 'string' && id.length > 0)));
    if (productIds.length === 0) {
      return [];
    }

    const productRows = db
      .select({ id: products.id, price: products.price })
      .from(products)
      .where(inArray(products.id, productIds))
      .all();
    const productMap = new Map(productRows.map((row) => [row.id, Number(row.price)]));

    const additionalRows = db
      .select({
        productId: productAdditionalIngredients.productId,
        ingredientId: productAdditionalIngredients.ingredientId,
        additionalPrice: productAdditionalIngredients.additionalPrice,
      })
      .from(productAdditionalIngredients)
      .where(inArray(productAdditionalIngredients.productId, productIds))
      .all();

    const additionalMap = new Map<string, Map<string, number>>();
    for (const row of additionalRows) {
      if (!additionalMap.has(row.productId)) {
        additionalMap.set(row.productId, new Map());
      }
      additionalMap.get(row.productId)!.set(row.ingredientId, Number(row.additionalPrice));
    }

    const resolvedItems: SaleItemInput[] = [];
    for (const item of items) {
      const productPrice = productMap.get(item.productId);
      if (productPrice == null) {
        throw new Error(salesErrorMessage('productNotFound', { productId: item.productId }));
      }

      const quantity = clampQuantity(Number(item.quantity));
      if (quantity <= 0) {
        continue;
      }

      const removedIngredientIds = this.normalizeRemovedIngredientIds(item.removedIngredientIds ?? []);
      const allowedAdditionalByIngredient = additionalMap.get(item.productId) ?? new Map<string, number>();
      const normalizedAdditional = this
        .normalizeSelectedAdditionalIngredients(item.additionalIngredients ?? [])
        .filter((entry) => allowedAdditionalByIngredient.has(entry.ingredientId));

      const additionalUnitPrice = normalizedAdditional.reduce(
        (sum, entry) => sum + (allowedAdditionalByIngredient.get(entry.ingredientId) ?? 0) * entry.quantity,
        0,
      );

      resolvedItems.push({
        productId: item.productId,
        quantity,
        unitPrice: roundMoney(productPrice + additionalUnitPrice),
        observation: normalizeObservation(item.observation),
        removedIngredientIds,
        additionalIngredients: normalizedAdditional,
      });
    }

    return resolvedItems;
  }

  async getHydrationData() {
    const productsList = db
      .select({
        id: products.id,
        name: products.name,
        category: categories.name,
        price: products.price,
        imageUri: products.imageUri,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(eq(products.isActive, true))
      .orderBy(products.name)
      .all();

    const additionalRows = db
      .select({
        productId: productAdditionalIngredients.productId,
        ingredientId: productAdditionalIngredients.ingredientId,
        ingredientName: ingredients.name,
        quantityUsed: productAdditionalIngredients.quantityUsed,
        additionalPrice: productAdditionalIngredients.additionalPrice,
      })
      .from(productAdditionalIngredients)
      .innerJoin(ingredients, eq(ingredients.id, productAdditionalIngredients.ingredientId))
      .all();

    const additionalByProduct = new Map<string, ProductAdditionalIngredientOption[]>();
    for (const row of additionalRows) {
      if (!additionalByProduct.has(row.productId)) {
        additionalByProduct.set(row.productId, []);
      }

      additionalByProduct.get(row.productId)!.push({
        ingredientId: row.ingredientId,
        ingredientName: row.ingredientName,
        quantityUsed: Number(row.quantityUsed),
        additionalPrice: Number(row.additionalPrice),
      });
    }

    const mappedProducts = productsList.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category ?? '',
      price: Number(row.price),
      imageUri: row.imageUri,
      additionalIngredients: additionalByProduct.get(row.id) ?? [],
    })) as Product[];

    const salesList = db
      .select({
        id: sales.id,
        created_at: sales.createdAt,
        staff_name: users.name,
        table_name: restaurantTables.name,
        payment_method: sales.paymentMethodId,
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

    return { products: mappedProducts, sales: salesList, tables: tablesList, discounts: discountsList };
  }

  async getDiscounts(): Promise<Discount[]> {
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

  async createDiscount(payload: CreateDiscountPayload): Promise<string> {
    const startsAt = payload.scope === 'global' ? 0 : payload.startsAt;
    const endsAt = payload.scope === 'global' ? null : payload.endsAt;
    const [inserted] = db.insert(discounts)
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
      .returning({ id: discounts.id })
      .all();

    if (!inserted) {
      throw new Error('Failed to create discount.');
    }

    return inserted.id;
  }

  async updateDiscount(payload: UpdateDiscountPayload): Promise<void> {
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
      })
      .where(eq(discounts.id, payload.id))
      .run();
  }

  async deleteDiscount(id: string): Promise<void> {
    db.delete(discounts).where(eq(discounts.id, id)).run();
  }

  async getTables(): Promise<RestaurantTable[]> {
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

  async createTable({ name, tableType }: CreateTablePayload): Promise<string | null> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return null;
    }
    const [inserted] = db.insert(restaurantTables)
      .values({
        name: normalizedName,
        tableType,
      })
      .onConflictDoNothing()
      .returning({ id: restaurantTables.id })
      .all();

    return inserted?.id ?? null;
  }

  async updateTable({ id, name, tableType }: UpdateTablePayload): Promise<void> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }
    db.update(restaurantTables)
      .set({
        name: normalizedName,
        tableType,
        updatedAt: sql`cast(strftime('%s', 'now') as int)`,
      })
      .where(eq(restaurantTables.id, id))
      .run();
  }

  async deleteTable(id: string): Promise<void> {
    try {
      db.delete(restaurantTables).where(eq(restaurantTables.id, id)).run();
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      if (msg.includes('FOREIGN KEY constraint failed')) {
        throw new Error(salesErrorMessage('tableHasLinkedSales'));
      }
      throw err;
    }
  }

  async createSale({ staffId, items, tableId, globalDiscountId, orderTypeSurcharge }: CreateSalePayload): Promise<string | null> {
    const resolvedItems = await this.resolveSaleItems(items);
    if (resolvedItems.length === 0) {
      return null;
    }

    const normalizedSurcharge = Number.isFinite(orderTypeSurcharge) ? Math.max(0, Number(orderTypeSurcharge)) : 0;

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
    const breakdown = calculateSaleDiscountBreakdown(resolvedItems, activeDiscounts, createdAt, globalDiscountId ?? null);

    const saleId = db.transaction((tx) => {
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
            observation: normalizeObservation(item.observation),
            removedIngredientIds: JSON.stringify(item.removedIngredientIds),
            selectedAdditionalIngredients: this.serializeSelectedAdditionalIngredients(item.additionalIngredients),
            unitPrice: item.unitPrice,
            lineSubtotal: item.lineSubtotal,
            discountName: item.discountSnapshot.discountName,
            discountType: item.discountSnapshot.discountType,
            discountValue: item.discountSnapshot.discountValue,
            discountAmount: item.discountSnapshot.discountAmount,
          })
          .run();
      }

      return newSale.id;
    });

    return saleId;
  }

  async updateDraftOrder({ orderId, staffId, items, tableId, globalDiscountId, orderTypeSurcharge }: UpdateDraftOrderPayload): Promise<void> {
    const resolvedItems = await this.resolveSaleItems(items);
    if (resolvedItems.length === 0) {
      return;
    }

    const existingOrder = db
      .select({ status: sales.status })
      .from(sales)
      .where(eq(sales.id, orderId))
      .get();

    if (!existingOrder) {
      throw new Error(salesErrorMessage('orderNotFound', { orderId }));
    }

    if (existingOrder.status !== 'draft') {
      throw new Error(salesErrorMessage('onlyDraftEditable'));
    }

    const normalizedSurcharge = Number.isFinite(orderTypeSurcharge) ? Math.max(0, Number(orderTypeSurcharge)) : 0;

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
    const breakdown = calculateSaleDiscountBreakdown(resolvedItems, activeDiscounts, now, globalDiscountId ?? null);

    db.transaction((tx) => {
      tx.delete(saleItems).where(eq(saleItems.saleId, orderId)).run();

      tx.update(sales)
        .set({
          tableId,
          subtotal: breakdown.subtotal,
          itemDiscountTotal: breakdown.itemDiscountTotal,
          orderDiscountName: breakdown.globalDiscountSnapshot.discountName,
          orderDiscountType: breakdown.globalDiscountSnapshot.discountType,
          orderDiscountValue: breakdown.globalDiscountSnapshot.discountValue,
          orderDiscountAmount: breakdown.globalDiscountAmount,
          discountAppliedBy: staffId,
          total: breakdown.total + normalizedSurcharge,
        })
        .where(eq(sales.id, orderId))
        .run();

      for (const item of breakdown.items) {
        tx.insert(saleItems)
          .values({
            saleId: orderId,
            productId: item.productId,
            quantity: item.quantity,
            observation: normalizeObservation(item.observation),
            removedIngredientIds: JSON.stringify(item.removedIngredientIds),
            selectedAdditionalIngredients: this.serializeSelectedAdditionalIngredients(item.additionalIngredients),
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
    return db
      .select({ name: products.name, quantity: sql<number>`SUM(${saleItems.quantity})` })
      .from(saleItems)
      .innerJoin(products, eq(products.id, saleItems.productId))
      .innerJoin(sales, eq(sales.id, saleItems.saleId))
      .where(inArray(sales.status, RECOGNIZED_REVENUE_STATUSES))
      .groupBy(saleItems.productId)
      .orderBy(sql`SUM(${saleItems.quantity}) DESC`)
      .limit(limit)
      .all();
  }

  async getSaleItems(saleId: string): Promise<SaleItemDetail[]> {
    const rawItems = db
      .select({
        id: saleItems.id,
        product_id: saleItems.productId,
        product_name: products.name,
        observation: saleItems.observation,
        quantity: saleItems.quantity,
        quantity_paid: saleItems.quantityPaid,
        removed_ingredient_ids: saleItems.removedIngredientIds,
        selected_additional_ingredients: saleItems.selectedAdditionalIngredients,
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
      .all();

    const productIds = Array.from(new Set(rawItems.map((item) => item.product_id)));
    const additionalOptions = productIds.length > 0
      ? db
        .select({
          productId: productAdditionalIngredients.productId,
          ingredientId: productAdditionalIngredients.ingredientId,
          ingredientName: ingredients.name,
          additionalPrice: productAdditionalIngredients.additionalPrice,
        })
        .from(productAdditionalIngredients)
        .innerJoin(ingredients, eq(ingredients.id, productAdditionalIngredients.ingredientId))
        .where(inArray(productAdditionalIngredients.productId, productIds))
        .all()
      : [];

    const additionalOptionMap = new Map<string, { ingredientName: string; additionalPrice: number }>();
    for (const option of additionalOptions) {
      additionalOptionMap.set(`${option.productId}:${option.ingredientId}`, {
        ingredientName: option.ingredientName,
        additionalPrice: Number(option.additionalPrice),
      });
    }

    return rawItems
      .map((item) => {
        const lineSubtotal = Number(item.line_subtotal ?? Number(item.unit_price) * item.quantity);
        const discountAmount = Number(item.discount_amount ?? 0);
        const finalLineTotal = Math.max(0, lineSubtotal - discountAmount);
        const quantityPaid = clampQuantity(Number(item.quantity_paid ?? 0));
        const quantityPending = Math.max(0, item.quantity - quantityPaid);
        const selectedAdditionalIngredients = this.parseSelectedAdditionalIngredients(item.selected_additional_ingredients);
        const selectedAdditionalIngredientDetails = selectedAdditionalIngredients.map((entry) => {
          const option = additionalOptionMap.get(`${item.product_id}:${entry.ingredientId}`);
          const unitAdditionalPrice = Number(option?.additionalPrice ?? 0);
          return {
            ingredient_id: entry.ingredientId,
            ingredient_name: option?.ingredientName ?? entry.ingredientId,
            quantity: entry.quantity,
            unit_additional_price: unitAdditionalPrice,
            total_additional_price: roundMoney(unitAdditionalPrice * entry.quantity),
          };
        });

        return {
          ...item,
          observation: normalizeObservation(item.observation),
          quantity_paid: quantityPaid,
          quantity_pending: quantityPending,
          removed_ingredient_ids: this.parseRemovedIngredientIds(item.removed_ingredient_ids),
          selected_additional_ingredients: selectedAdditionalIngredients,
          selected_additional_ingredient_details: selectedAdditionalIngredientDetails,
          line_subtotal: lineSubtotal,
          discount_amount: discountAmount,
          final_line_total: finalLineTotal,
          final_unit_price: item.quantity > 0 ? finalLineTotal / item.quantity : 0,
        };
      }) as SaleItemDetail[];
  }

  async getSalePricingSummary(saleId: string): Promise<SalePricingSummary | null> {
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
    const row = db
      .select({ total: sql<number>`COALESCE(SUM(${sales.total}), 0)` })
      .from(sales)
      .where(
        and(
          gte(sales.createdAt, startUnix),
          lt(sales.createdAt, endUnix),
          inArray(sales.status, RECOGNIZED_REVENUE_STATUSES),
        ),
      )
      .get();
    return Number(row?.total ?? 0);
  }

  async getDashboardSummary(startUnix: number, endUnix: number, bucket: DashboardTrendBucket = 'day'): Promise<DashboardSalesSummary> {
    const salesList = db
      .select({
        id: sales.id,
        created_at: sales.createdAt,
        total: sales.total,
        payment_method: sales.paymentMethodId,
        status: sales.status,
      })
      .from(sales)
      .where(and(gte(sales.createdAt, startUnix), lt(sales.createdAt, endUnix)))
      .all();

    const saleItemsList = db
      .select({
        sale_id: saleItems.saleId,
        product_name: products.name,
        quantity: saleItems.quantity,
        line_subtotal: saleItems.lineSubtotal,
        discount_amount: saleItems.discountAmount,
      })
      .from(saleItems)
      .innerJoin(products, eq(products.id, saleItems.productId))
      .innerJoin(sales, eq(sales.id, saleItems.saleId))
      .where(
        and(
          gte(sales.createdAt, startUnix),
          lt(sales.createdAt, endUnix),
          inArray(sales.status, RECOGNIZED_REVENUE_STATUSES),
        ),
      )
      .all();

    const paymentEvents = db
      .select({
        sale_id: salePayments.saleId,
        method: salePayments.paymentMethodId,
        total: salePayments.total,
      })
      .from(salePayments)
      .innerJoin(sales, eq(sales.id, salePayments.saleId))
      .where(
        and(
          gte(sales.createdAt, startUnix),
          lt(sales.createdAt, endUnix),
          inArray(sales.status, RECOGNIZED_REVENUE_STATUSES),
        ),
      )
      .all() as Array<{ sale_id: string; method: string | null; total: number }>;

    return buildDashboardSalesSummary({
      sales: salesList,
      saleItems: saleItemsList,
      paymentEvents,
      startUnix,
      endUnix,
      bucket,
    });
  }

  async getOrderTypeSurchargeConfig(): Promise<{ toGoSurcharge: number; deliverySurcharge: number }> {
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
    const orderItems = db
      .select({
        productId: saleItems.productId,
        quantity: saleItems.quantity,
        removedIngredientIds: saleItems.removedIngredientIds,
        selectedAdditionalIngredients: saleItems.selectedAdditionalIngredients,
      })
      .from(saleItems)
      .where(eq(saleItems.saleId, orderId))
      .all();

    db.transaction((tx) => {
      for (const item of orderItems) {
        const removedIngredientIds = this.parseRemovedIngredientIds(item.removedIngredientIds);
        const selectedAdditionalIngredients = this.parseSelectedAdditionalIngredients(item.selectedAdditionalIngredients);
        const selectedAdditionalByIngredient = new Map(selectedAdditionalIngredients.map((entry) => [entry.ingredientId, entry.quantity]));

        const recipeEdges = tx
          .select({ ingredientId: productIngredients.ingredientId, quantityUsed: productIngredients.quantityUsed })
          .from(productIngredients)
          .where(eq(productIngredients.productId, item.productId))
          .all();
        const additionalEdges = tx
          .select({ ingredientId: productAdditionalIngredients.ingredientId, quantityUsed: productAdditionalIngredients.quantityUsed })
          .from(productAdditionalIngredients)
          .where(eq(productAdditionalIngredients.productId, item.productId))
          .all();

        const leafConsumptions = recipeEdges
          .filter(({ ingredientId }) => !removedIngredientIds.includes(ingredientId))
          .map(({ ingredientId, quantityUsed }) => ({ ingredientId, quantity: quantityUsed * item.quantity }));
        const leafAdditionalConsumptions = additionalEdges
          .map(({ ingredientId, quantityUsed }) => ({
            ingredientId,
            quantity: quantityUsed * (selectedAdditionalByIngredient.get(ingredientId) ?? 0) * item.quantity,
          }))
          .filter((leaf) => leaf.quantity > 0);

        const consumptionByIngredient = new Map<string, number>();
        for (const leaf of [...leafConsumptions, ...leafAdditionalConsumptions]) {
          const current = consumptionByIngredient.get(leaf.ingredientId) ?? 0;
          consumptionByIngredient.set(leaf.ingredientId, current + leaf.quantity);
        }

        for (const [ingredientId, quantity] of consumptionByIngredient.entries()) {
          tx.update(ingredients)
            .set({
              quantity: sql`MAX(0, ${ingredients.quantity} - ${quantity})`,
              updatedAt: sql`cast(strftime('%s', 'now') as int)`,
            })
            .where(eq(ingredients.id, ingredientId))
            .run();
        }
      }
    });
  }

  async sendToKitchen(orderId: string): Promise<void> {
    const order = db.select({ status: sales.status }).from(sales).where(eq(sales.id, orderId)).get();

    if (!order) {
      throw new Error(salesErrorMessage('orderNotFound', { orderId }));
    }

    if (order.status !== 'draft') {
      throw new Error(salesErrorMessage('sendToKitchenInvalidStatus', { status: order.status }));
    }

    db.update(sales)
      .set({
        status: 'in-progress',
      })
      .where(eq(sales.id, orderId))
      .run();

    await this.deductInventoryForOrder(orderId);
  }

  async markOrderReady(orderId: string): Promise<void> {
    const order = db
      .select({ status: sales.status, readyAt: sales.readyAt })
      .from(sales)
      .where(eq(sales.id, orderId))
      .get();

    if (!order) {
      throw new Error(salesErrorMessage('orderNotFound', { orderId }));
    }

    if (order.status !== 'in-progress') {
      throw new Error(salesErrorMessage('markReadyInvalidStatus', { status: order.status }));
    }

    const readyAt = Math.floor(Date.now() / 1000);
    db.update(sales)
      .set({
        status: 'ready',
        readyAt,
      })
      .where(eq(sales.id, orderId))
      .run();

    // Check if order should auto-complete
    await this.autoCompleteIfReady(orderId);
  }

  async getSalePayments(orderId: string): Promise<SalePayment[]> {
    const payments = db
      .select({
        id: salePayments.id,
        sale_id: salePayments.saleId,
        payment_method: salePayments.paymentMethodId,
        subtotal: salePayments.subtotal,
        item_discount_total: salePayments.itemDiscountTotal,
        global_discount_amount: salePayments.globalDiscountAmount,
        surcharge_amount: salePayments.surchargeAmount,
        total: salePayments.total,
        paid_at: salePayments.paidAt,
        created_by_name: users.name,
      })
      .from(salePayments)
      .leftJoin(users, eq(users.id, salePayments.createdBy))
      .where(eq(salePayments.saleId, orderId))
      .orderBy(salePayments.paidAt, salePayments.id)
      .all() as Array<Omit<SalePayment, 'lines'>>;

    const paymentLines = db
      .select({
        payment_id: salePaymentItems.paymentId,
        payment_item_id: salePaymentItems.id,
        sale_item_id: salePaymentItems.saleItemId,
        product_id: saleItems.productId,
        product_name: products.name,
        quantity_paid: salePaymentItems.quantityPaid,
        unit_price: salePaymentItems.unitPriceSnapshot,
        line_subtotal: salePaymentItems.lineSubtotalSnapshot,
        discount_amount: salePaymentItems.discountAmountSnapshot,
        line_total: salePaymentItems.lineTotalSnapshot,
      })
      .from(salePaymentItems)
      .innerJoin(salePayments, eq(salePayments.id, salePaymentItems.paymentId))
      .innerJoin(saleItems, eq(saleItems.id, salePaymentItems.saleItemId))
      .innerJoin(products, eq(products.id, saleItems.productId))
      .where(eq(salePayments.saleId, orderId))
      .all() as Array<SalePaymentLine & { payment_id: string }>;

    const linesByPayment = new Map<string, SalePaymentLine[]>();
    for (const line of paymentLines) {
      if (!linesByPayment.has(line.payment_id)) {
        linesByPayment.set(line.payment_id, []);
      }
      linesByPayment.get(line.payment_id)!.push({
        payment_item_id: line.payment_item_id,
        sale_item_id: line.sale_item_id,
        product_id: line.product_id,
        product_name: line.product_name,
        quantity_paid: clampQuantity(line.quantity_paid),
        unit_price: Number(line.unit_price),
        line_subtotal: Number(line.line_subtotal),
        discount_amount: Number(line.discount_amount),
        line_total: Number(line.line_total),
      });
    }

    return payments.map((payment) => ({
      ...payment,
      subtotal: Number(payment.subtotal),
      item_discount_total: Number(payment.item_discount_total),
      global_discount_amount: Number(payment.global_discount_amount),
      surcharge_amount: Number(payment.surcharge_amount),
      total: Number(payment.total),
      paid_at: Number(payment.paid_at),
      lines: linesByPayment.get(payment.id) ?? [],
    }));
  }

  async getSalePaymentBoard(orderId: string): Promise<SalePaymentBoard> {
    const order = db
      .select({ id: sales.id })
      .from(sales)
      .where(eq(sales.id, orderId))
      .get();

    if (!order) {
      throw new Error(salesErrorMessage('orderNotFound', { orderId }));
    }

    const pending = db
      .select({
        sale_item_id: saleItems.id,
        product_id: saleItems.productId,
        product_name: products.name,
        unit_price: saleItems.unitPrice,
        discount_amount_total: saleItems.discountAmount,
        line_subtotal_total: saleItems.lineSubtotal,
        quantity_total: saleItems.quantity,
        quantity_paid: saleItems.quantityPaid,
      })
      .from(saleItems)
      .innerJoin(products, eq(products.id, saleItems.productId))
      .where(eq(saleItems.saleId, orderId))
      .orderBy(saleItems.id)
      .all()
      .map((item) => {
        const quantityTotal = clampQuantity(item.quantity_total);
        const quantityPaid = clampQuantity(item.quantity_paid);
        const quantityPending = Math.max(0, quantityTotal - quantityPaid);
        const lineSubtotalTotal = Number(item.line_subtotal_total);
        const discountAmountTotal = Number(item.discount_amount_total);
        const lineTotalTotal = roundMoney(Math.max(0, lineSubtotalTotal - discountAmountTotal));
        return {
          sale_item_id: item.sale_item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          unit_price: Number(item.unit_price),
          discount_amount_total: discountAmountTotal,
          line_subtotal_total: lineSubtotalTotal,
          line_total_total: lineTotalTotal,
          quantity_total: quantityTotal,
          quantity_paid: quantityPaid,
          quantity_pending: quantityPending,
        } satisfies SalePaymentBoardItem;
      })
      .filter((item) => item.quantity_pending > 0);

    const paid = await this.getSalePayments(orderId);
    return {
      sale_id: orderId,
      pending,
      paid,
    };
  }

  async createPartialPayment(payload: CreatePartialPaymentPayload): Promise<void> {
    const order = db
      .select({
        status: sales.status,
        subtotal: sales.subtotal,
        item_discount_total: sales.itemDiscountTotal,
        global_discount_amount: sales.orderDiscountAmount,
        total: sales.total,
      })
      .from(sales)
      .where(eq(sales.id, payload.orderId))
      .get();

    if (!order) {
      throw new Error(salesErrorMessage('orderNotFound', { orderId: payload.orderId }));
    }

    if (!['draft', 'in-progress', 'ready'].includes(order.status)) {
      throw new Error(salesErrorMessage('markPaidInvalidStatus', { status: order.status }));
    }

    const lineSelectionMap = new Map<string, number>();
    for (const rawLine of payload.lines) {
      const quantity = clampQuantity(rawLine.quantity);
      if (!rawLine.saleItemId || quantity <= 0) {
        continue;
      }
      lineSelectionMap.set(rawLine.saleItemId, (lineSelectionMap.get(rawLine.saleItemId) ?? 0) + quantity);
    }

    if (lineSelectionMap.size === 0) {
      throw new Error('Debe seleccionar al menos un item para pagar.');
    }

    const items = db
      .select({
        id: saleItems.id,
        productId: saleItems.productId,
        quantity: saleItems.quantity,
        quantityPaid: saleItems.quantityPaid,
        unitPrice: saleItems.unitPrice,
        lineSubtotal: saleItems.lineSubtotal,
        discountAmount: saleItems.discountAmount,
      })
      .from(saleItems)
      .where(eq(saleItems.saleId, payload.orderId))
      .all();

    const selected: Array<{
      saleItemId: string;
      productId: string;
      quantity: number;
      quantityPaid: number;
      quantityPending: number;
      selectedQuantity: number;
      unitPrice: number;
      lineSubtotal: number;
      discountAmount: number;
    }> = [];

    for (const item of items) {
      const selectedQuantity = clampQuantity(lineSelectionMap.get(item.id) ?? 0);
      if (selectedQuantity <= 0) {
        continue;
      }

      const quantity = clampQuantity(item.quantity);
      const quantityPaid = clampQuantity(item.quantityPaid);
      const quantityPending = Math.max(0, quantity - quantityPaid);

      if (selectedQuantity > quantityPending) {
        throw new Error(`La cantidad seleccionada excede el pendiente para el item ${item.id}.`);
      }

      selected.push({
        saleItemId: item.id,
        productId: item.productId,
        quantity,
        quantityPaid,
        quantityPending,
        selectedQuantity,
        unitPrice: Number(item.unitPrice),
        lineSubtotal: Number(item.lineSubtotal),
        discountAmount: Number(item.discountAmount),
      });
    }

    if (selected.length === 0) {
      throw new Error('Debe seleccionar al menos un item valido para pagar.');
    }

    const selectedLineSnapshots = selected.map((item) => {
      const lineSubtotalPerUnit = item.quantity > 0 ? Number(item.lineSubtotal) / item.quantity : 0;
      const lineDiscountPerUnit = item.quantity > 0 ? Number(item.discountAmount) / item.quantity : 0;
      const lineSubtotal = roundMoney(lineSubtotalPerUnit * item.selectedQuantity);
      const discountAmount = roundMoney(lineDiscountPerUnit * item.selectedQuantity);
      const lineTotal = roundMoney(Math.max(0, lineSubtotal - discountAmount));
      return {
        saleItemId: item.saleItemId,
        productId: item.productId,
        selectedQuantity: item.selectedQuantity,
        unitPrice: item.unitPrice,
        lineSubtotal,
        discountAmount,
        lineTotal,
      };
    });

    const selectedSubtotal = roundMoney(selectedLineSnapshots.reduce((sum, line) => sum + line.lineSubtotal, 0));
    const selectedItemDiscountTotal = roundMoney(selectedLineSnapshots.reduce((sum, line) => sum + line.discountAmount, 0));
    const selectedDiscountedSubtotal = roundMoney(Math.max(0, selectedSubtotal - selectedItemDiscountTotal));

    const orderSubtotal = Number(order.subtotal ?? 0);
    const orderItemDiscountTotal = Number(order.item_discount_total ?? 0);
    const orderGlobalDiscountAmount = Number(order.global_discount_amount ?? 0);
    const orderTotal = Number(order.total ?? 0);

    const orderDiscountedSubtotal = roundMoney(Math.max(0, orderSubtotal - orderItemDiscountTotal));
    const orderGlobalAndDiscountedTotal = roundMoney(Math.max(0, orderDiscountedSubtotal - orderGlobalDiscountAmount));
    const orderSurchargeAmount = roundMoney(Math.max(0, orderTotal - orderGlobalAndDiscountedTotal));

    const globalDiscountAmount = allocateProportionally(orderGlobalDiscountAmount, [selectedDiscountedSubtotal, Math.max(0, orderDiscountedSubtotal - selectedDiscountedSubtotal)])[0];
    const surchargeAmount = allocateProportionally(orderSurchargeAmount, [selectedDiscountedSubtotal, Math.max(0, orderDiscountedSubtotal - selectedDiscountedSubtotal)])[0];

    let paymentTotal = roundMoney(Math.max(0, selectedDiscountedSubtotal - globalDiscountAmount + surchargeAmount));

    const paidSoFarRow = db
      .select({ total: sql<number>`COALESCE(SUM(${salePayments.total}), 0)` })
      .from(salePayments)
      .where(eq(salePayments.saleId, payload.orderId))
      .get();
    const paidSoFar = roundMoney(Number(paidSoFarRow?.total ?? 0));
    const remainingDue = roundMoney(Math.max(0, orderTotal - paidSoFar));

    const closesPayment = items.every((item) => {
      const selectedQuantity = clampQuantity(lineSelectionMap.get(item.id) ?? 0);
      const quantity = clampQuantity(item.quantity);
      const quantityPaid = clampQuantity(item.quantityPaid);
      return quantity - (quantityPaid + selectedQuantity) <= 0;
    });
    let finalSurchargeAmount = surchargeAmount;
    const finalGlobalDiscountAmount = globalDiscountAmount;
    if (closesPayment) {
      const delta = roundMoney(remainingDue - paymentTotal);
      finalSurchargeAmount = roundMoney(finalSurchargeAmount + delta);
      paymentTotal = roundMoney(Math.max(0, selectedDiscountedSubtotal - finalGlobalDiscountAmount + finalSurchargeAmount));
    } else if (paymentTotal > remainingDue) {
      throw new Error('El pago parcial excede el saldo pendiente de la orden.');
    }

    const now = Math.floor(Date.now() / 1000);

    db.transaction((tx) => {
      const [insertedPayment] = tx
        .insert(salePayments)
        .values({
          saleId: payload.orderId,
          paymentMethodId: payload.paymentMethodId,
          subtotal: selectedSubtotal,
          itemDiscountTotal: selectedItemDiscountTotal,
          globalDiscountAmount: finalGlobalDiscountAmount,
          surchargeAmount: finalSurchargeAmount,
          total: paymentTotal,
          paidAt: now,
          createdBy: payload.paidBy ?? null,
        })
        .returning({ id: salePayments.id })
        .all();

      if (!insertedPayment) {
        throw new Error('No se pudo crear el pago parcial.');
      }

      for (const line of selectedLineSnapshots) {
        tx.insert(salePaymentItems)
          .values({
            paymentId: insertedPayment.id,
            saleItemId: line.saleItemId,
            quantityPaid: line.selectedQuantity,
            unitPriceSnapshot: line.unitPrice,
            lineSubtotalSnapshot: line.lineSubtotal,
            discountAmountSnapshot: line.discountAmount,
            lineTotalSnapshot: line.lineTotal,
          })
          .run();

        tx.update(saleItems)
          .set({
            quantityPaid: sql`${saleItems.quantityPaid} + ${line.selectedQuantity}`,
          })
          .where(eq(saleItems.id, line.saleItemId))
          .run();
      }

      const pendingRow = tx
        .select({
          pending: sql<number>`COALESCE(SUM(CASE WHEN ${saleItems.quantity} - ${saleItems.quantityPaid} > 0 THEN ${saleItems.quantity} - ${saleItems.quantityPaid} ELSE 0 END), 0)`,
        })
        .from(saleItems)
        .where(eq(saleItems.saleId, payload.orderId))
        .get();

      const hasPending = Number(pendingRow?.pending ?? 0) > 0;
      tx.update(sales)
        .set({
          paidAt: hasPending ? null : now,
          paymentMethodId: hasPending ? null : payload.paymentMethodId,
        })
        .where(eq(sales.id, payload.orderId))
        .run();
    });

    await this.autoCompleteIfReady(payload.orderId);
  }

  async markOrderPaid(orderId: string, paymentMethodId: string): Promise<void> {
    const order = db.select({ status: sales.status }).from(sales).where(eq(sales.id, orderId)).get();

    if (!order) {
      throw new Error(salesErrorMessage('orderNotFound', { orderId }));
    }

    if (!['draft', 'in-progress', 'ready'].includes(order.status)) {
      throw new Error(salesErrorMessage('markPaidInvalidStatus', { status: order.status }));
    }

    const pendingLines = db
      .select({
        saleItemId: saleItems.id,
        quantity: saleItems.quantity,
        quantityPaid: saleItems.quantityPaid,
      })
      .from(saleItems)
      .where(eq(saleItems.saleId, orderId))
      .all()
      .map((item) => ({
        saleItemId: item.saleItemId,
        quantity: Math.max(0, clampQuantity(item.quantity) - clampQuantity(item.quantityPaid)),
      }))
      .filter((line) => line.quantity > 0);

    if (pendingLines.length === 0) {
      return;
    }

    await this.createPartialPayment({
      orderId,
      paymentMethodId,
      lines: pendingLines,
    });
  }

  private async autoCompleteIfReady(orderId: string): Promise<void> {
    const order = db
      .select({ status: sales.status, readyAt: sales.readyAt, paidAt: sales.paidAt })
      .from(sales)
      .where(eq(sales.id, orderId))
      .get();

    if (order && order.readyAt && order.paidAt) {
      db.update(sales)
        .set({
          status: 'completed',
        })
        .where(eq(sales.id, orderId))
        .run();
    }
  }

  async addItemToOrder(payload: AddItemToOrderPayload): Promise<string> {
    const { orderId, item } = payload;

    const order = db.select({ status: sales.status }).from(sales).where(eq(sales.id, orderId)).get();

    if (!order) {
      throw new Error(salesErrorMessage('orderNotFound', { orderId }));
    }

    if (order.status !== 'draft') {
      throw new Error(salesErrorMessage('addItemsDraftOnly', { status: order.status }));
    }

    const [resolvedItem] = await this.resolveSaleItems([item]);
    if (!resolvedItem) {
      throw new Error(salesErrorMessage('productNotFound', { productId: item.productId }));
    }

    const lineSubtotal = resolvedItem.unitPrice * resolvedItem.quantity;
    const removedIngredientIds = this.normalizeRemovedIngredientIds(resolvedItem.removedIngredientIds ?? []);

    const [inserted] = db.insert(saleItems)
      .values({
        saleId: orderId,
        productId: resolvedItem.productId,
        quantity: resolvedItem.quantity,
        observation: normalizeObservation(resolvedItem.observation),
        removedIngredientIds: JSON.stringify(removedIngredientIds),
        selectedAdditionalIngredients: this.serializeSelectedAdditionalIngredients(resolvedItem.additionalIngredients),
        unitPrice: resolvedItem.unitPrice,
        lineSubtotal,
      })
      .returning({ id: saleItems.id })
      .all();

    if (!inserted) {
      throw new Error('Failed to add item to order.');
    }

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
      })
      .where(eq(sales.id, orderId))
      .run();

    return inserted.id;
  }

  async removeItemFromOrder(payload: RemoveItemFromOrderPayload): Promise<void> {
    const { orderId, saleItemId } = payload;

    const order = db.select({ status: sales.status }).from(sales).where(eq(sales.id, orderId)).get();

    if (!order) {
      throw new Error(salesErrorMessage('orderNotFound', { orderId }));
    }

    if (order.status !== 'draft') {
      throw new Error(salesErrorMessage('removeItemsDraftOnly', { status: order.status }));
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
      })
      .where(eq(sales.id, orderId))
      .run();
  }

  async cancelOrder(orderId: string): Promise<void> {
    const order = db
      .select({ status: sales.status })
      .from(sales)
      .where(eq(sales.id, orderId))
      .get();

    if (!order) {
      throw new Error(salesErrorMessage('orderNotFound', { orderId }));
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new Error(salesErrorMessage('cancelInvalidStatus', { status: order.status }));
    }

    const cancelledAt = Math.floor(Date.now() / 1000);
    db.update(sales)
      .set({
        status: 'cancelled',
        cancelledAt,
      })
      .where(eq(sales.id, orderId))
      .run();

    // If order was in-progress or ready, restore inventory
    if (['in-progress', 'ready'].includes(order.status)) {
      const orderItems = db
        .select({
          productId: saleItems.productId,
          quantity: saleItems.quantity,
          removedIngredientIds: saleItems.removedIngredientIds,
          selectedAdditionalIngredients: saleItems.selectedAdditionalIngredients,
        })
        .from(saleItems)
        .where(eq(saleItems.saleId, orderId))
        .all();

      db.transaction((tx) => {
        for (const item of orderItems) {
          const removedIngredientIds = this.parseRemovedIngredientIds(item.removedIngredientIds);
          const selectedAdditionalIngredients = this.parseSelectedAdditionalIngredients(item.selectedAdditionalIngredients);
          const selectedAdditionalByIngredient = new Map(selectedAdditionalIngredients.map((entry) => [entry.ingredientId, entry.quantity]));

          const recipeEdges = tx
            .select({ ingredientId: productIngredients.ingredientId, quantityUsed: productIngredients.quantityUsed })
            .from(productIngredients)
            .where(eq(productIngredients.productId, item.productId))
            .all();
          const additionalEdges = tx
            .select({ ingredientId: productAdditionalIngredients.ingredientId, quantityUsed: productAdditionalIngredients.quantityUsed })
            .from(productAdditionalIngredients)
            .where(eq(productAdditionalIngredients.productId, item.productId))
            .all();

          const leafRestorations = recipeEdges
            .filter(({ ingredientId }) => !removedIngredientIds.includes(ingredientId))
            .map(({ ingredientId, quantityUsed }) => ({ ingredientId, quantity: quantityUsed * item.quantity }));
          const leafAdditionalRestorations = additionalEdges
            .map(({ ingredientId, quantityUsed }) => ({
              ingredientId,
              quantity: quantityUsed * (selectedAdditionalByIngredient.get(ingredientId) ?? 0) * item.quantity,
            }))
            .filter((leaf) => leaf.quantity > 0);

          const restorationByIngredient = new Map<string, number>();
          for (const leaf of [...leafRestorations, ...leafAdditionalRestorations]) {
            const current = restorationByIngredient.get(leaf.ingredientId) ?? 0;
            restorationByIngredient.set(leaf.ingredientId, current + leaf.quantity);
          }

          for (const [ingredientId, quantity] of restorationByIngredient.entries()) {
            tx.update(ingredients)
              .set({
                quantity: sql`${ingredients.quantity} + ${quantity}`,
                updatedAt: sql`cast(strftime('%s', 'now') as int)`,
              })
              .where(eq(ingredients.id, ingredientId))
              .run();
          }
        }
      });
    }
  }
}
