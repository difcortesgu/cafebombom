import type { SalesService } from '@/services/interfaces/sales';
import type {
    CreateDiscountPayload,
    CreateSalePayload,
    CreateTablePayload,
    SaleItemDetail,
    SalePricingSummary,
    UpdateDiscountPayload,
    UpdateTablePayload,
} from '@/types/sales';
import type { Discount, RestaurantTable } from '@/types/types';
import { calculateSaleDiscountBreakdown } from '@/utils/discounts';

import { getDb } from './storage';

export class SalesWebService implements SalesService {
  async getHydrationData() {
    const db = await getDb();
    const [products, categories, sales, users, tables, discounts] = await Promise.all([
      db.products.toArray(),
      db.categories.toArray(),
      db.sales.toArray(),
      db.users.toArray(),
      db.restaurantTables.toArray(),
      db.discounts.toArray(),
    ]);

    return {
      products: products
        .filter((product) => product.isActive)
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((product) => ({
          id: product.id,
          name: product.name,
          category: categories.find((category) => category.id === product.categoryId)?.name ?? '',
          price: product.price,
        })),
      sales: sales
        .slice()
        .sort((left, right) => right.createdAt - left.createdAt)
        .slice(0, 50)
        .map((sale) => ({
          id: sale.id,
          created_at: sale.createdAt,
          staff_name: users.find((user) => user.id === sale.staffId)?.name ?? 'Unknown',
          table_name: tables.find((table) => table.id === sale.tableId)?.name ?? 'Unknown table',
          total: sale.total,
        })),
      tables: tables
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((table) => ({
          id: table.id,
          name: table.name,
          table_type: table.tableType,
          created_at: table.createdAt,
        })),
      discounts: discounts
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((discount) => ({
          id: discount.id,
          name: discount.name,
          scope: discount.scope,
          productId: discount.productId,
          type: discount.type,
          value: discount.value,
          startsAt: discount.startsAt,
          endsAt: discount.endsAt,
          isActive: discount.isActive,
        })),
    };
  }

  async getDiscounts(): Promise<Discount[]> {
    const db = await getDb();
    return (await db.discounts.toArray())
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((discount) => ({
        id: discount.id,
        name: discount.name,
        scope: discount.scope,
        productId: discount.productId,
        type: discount.type,
        value: discount.value,
        startsAt: discount.startsAt,
        endsAt: discount.endsAt,
        isActive: discount.isActive,
      }));
  }

  async createDiscount(payload: CreateDiscountPayload): Promise<void> {
    const db = await getDb();
    const now = Math.floor(Date.now() / 1000);
    const startsAt = payload.scope === 'global' ? 0 : payload.startsAt;
    const endsAt = payload.scope === 'global' ? null : payload.endsAt;
    await db.discounts.add({
      name: payload.name.trim(),
      scope: payload.scope,
      productId: payload.scope === 'product' ? (payload.productId ?? null) : null,
      type: payload.type,
      value: payload.value,
      startsAt,
      endsAt,
      isActive: payload.isActive,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateDiscount(payload: UpdateDiscountPayload): Promise<void> {
    const db = await getDb();
    const startsAt = payload.scope === 'global' ? 0 : payload.startsAt;
    const endsAt = payload.scope === 'global' ? null : payload.endsAt;
    await db.discounts.update(payload.id, {
      name: payload.name.trim(),
      scope: payload.scope,
      productId: payload.scope === 'product' ? (payload.productId ?? null) : null,
      type: payload.type,
      value: payload.value,
      startsAt,
      endsAt,
      isActive: payload.isActive,
      updatedAt: Math.floor(Date.now() / 1000),
    });
  }

  async deleteDiscount(id: string): Promise<void> {
    const db = await getDb();
    await db.discounts.delete(id);
  }

  async getTables(): Promise<RestaurantTable[]> {
    const db = await getDb();
    return (await db.restaurantTables.toArray())
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((table) => ({
        id: table.id,
        name: table.name,
        table_type: table.tableType,
        created_at: table.createdAt,
      }));
  }

  async createTable({ name, tableType }: CreateTablePayload): Promise<void> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }
    const db = await getDb();
    const existing = await db.restaurantTables.where('name').equals(normalizedName).first();
    if (existing) {
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    await db.restaurantTables.add({
      name: normalizedName,
      tableType,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateTable({ id, name, tableType }: UpdateTablePayload): Promise<void> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }
    const db = await getDb();
    await db.restaurantTables.update(id, {
      name: normalizedName,
      tableType,
      updatedAt: Math.floor(Date.now() / 1000),
    });
  }

  async deleteTable(id: string): Promise<void> {
    const db = await getDb();
    const linkedSales = await db.sales.where('tableId').equals(id).count();
    if (linkedSales > 0) {
      throw new Error('Cannot delete a table that has linked sales.');
    }
    await db.restaurantTables.delete(id);
  }

  async createSale({ staffId, items, tableId, globalDiscountId, orderTypeSurcharge }: CreateSalePayload): Promise<void> {
    if (items.length === 0 || !tableId) {
      return;
    }

    const db = await getDb();
    const [productIngredients, ingredients, discounts] = await Promise.all([
      db.productIngredients.toArray(),
      db.ingredients.toArray(),
      db.discounts.toArray(),
    ]);

    const now = Math.floor(Date.now() / 1000);
    const breakdown = calculateSaleDiscountBreakdown(items, discounts, now, globalDiscountId ?? null);
    const normalizedSurcharge = Number.isFinite(orderTypeSurcharge) ? Math.max(0, Number(orderTypeSurcharge)) : 0;
    const recipeByProductId = new Map<string, Array<{ ingredientId: string; quantityUsed: number }>>();

    const saleId = await db.sales.add({
      createdAt: now,
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
    });

    for (const item of breakdown.items) {
      await db.saleItems.add({
        saleId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineSubtotal: item.lineSubtotal,
        discountName: item.discountSnapshot.discountName,
        discountType: item.discountSnapshot.discountType,
        discountValue: item.discountSnapshot.discountValue,
        discountAmount: item.discountSnapshot.discountAmount,
      });
    }

    for (const item of items) {
      const recipeEdges = recipeByProductId.get(item.productId) ?? productIngredients
        .filter((pi) => pi.productId === item.productId)
        .map((pi) => ({ ingredientId: pi.ingredientId, quantityUsed: pi.quantityUsed }));

      recipeByProductId.set(item.productId, recipeEdges);

      const leafConsumptions = recipeEdges.map(({ ingredientId, quantityUsed }) => ({ ingredientId, quantity: quantityUsed * item.quantity }));

      for (const leaf of leafConsumptions) {
        const ingredient = ingredients.find((ing) => ing.id === leaf.ingredientId);
        if (ingredient) {
          ingredient.quantity = Math.max(0, ingredient.quantity - leaf.quantity);
          await db.ingredients.update(ingredient.id, ingredient);
        }
      }
    }
  }

  async getTopSelling(limit = 5): Promise<Array<{ name: string; quantity: number }>> {
    const db = await getDb();
    const [saleItems, products] = await Promise.all([db.saleItems.toArray(), db.products.toArray()]);
    const totals = new Map<string, number>();

    for (const item of saleItems) {
      totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
    }

    return [...totals.entries()]
      .map(([productId, quantity]) => ({
        name: products.find((product) => product.id === productId)?.name ?? 'Unknown',
        quantity,
      }))
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, limit);
  }

  async getSaleItems(saleId: string): Promise<SaleItemDetail[]> {
    const db = await getDb();
    const [saleItems, products] = await Promise.all([db.saleItems.toArray(), db.products.toArray()]);

    return saleItems
      .filter((item) => item.saleId === saleId)
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((item) => {
        const lineSubtotal = Number(item.lineSubtotal ?? Number(item.unitPrice) * item.quantity);
        const discountAmount = Number(item.discountAmount ?? 0);
        const finalLineTotal = Math.max(0, lineSubtotal - discountAmount);
        return {
          id: item.id,
          product_name: products.find((product) => product.id === item.productId)?.name ?? 'Unknown',
          quantity: item.quantity,
          unit_price: item.unitPrice,
          line_subtotal: lineSubtotal,
          discount_name: item.discountName ?? null,
          discount_type: item.discountType ?? null,
          discount_value: item.discountValue == null ? null : Number(item.discountValue),
          discount_amount: discountAmount,
          final_line_total: finalLineTotal,
          final_unit_price: item.quantity > 0 ? finalLineTotal / item.quantity : 0,
        };
      });
  }

  async getSalePricingSummary(saleId: string): Promise<SalePricingSummary | null> {
    const db = await getDb();
    const [sale, users] = await Promise.all([db.sales.get(saleId), db.users.toArray()]);
    if (!sale) {
      return null;
    }

    const subtotal = Number(sale.subtotal ?? 0);
    const itemDiscountTotal = Number(sale.itemDiscountTotal ?? 0);
    const globalDiscountAmount = Number(sale.orderDiscountAmount ?? 0);
    const total = Number(sale.total ?? 0);
    const discountedSubtotal = Math.max(0, subtotal - itemDiscountTotal - globalDiscountAmount);
    const orderTypeSurcharge = Math.max(0, total - discountedSubtotal);

    return {
      subtotal,
      item_discount_total: itemDiscountTotal,
      global_discount_name: sale.orderDiscountName ?? null,
      global_discount_type: sale.orderDiscountType ?? null,
      global_discount_value: sale.orderDiscountValue == null ? null : Number(sale.orderDiscountValue),
      global_discount_amount: globalDiscountAmount,
      order_type_surcharge: orderTypeSurcharge,
      total,
      discount_applied_by: sale.discountAppliedBy ? users.find((user) => user.id === sale.discountAppliedBy)?.name ?? null : null,
    };
  }

  async getRevenueInRange(startUnix: number, endUnix: number): Promise<number> {
    const db = await getDb();
    return (await db.sales
      .where('createdAt')
      .between(startUnix, endUnix)
      .toArray())
      .reduce((sum, sale) => sum + Number(sale.total), 0);
  }

  async getOrderTypeSurchargeConfig(): Promise<{ toGoSurcharge: number; deliverySurcharge: number }> {
    const db = await getDb();
    const [toGo, delivery] = await Promise.all([
      db.surcharges.get('to-go'),
      db.surcharges.get('delivery'),
    ]);

    const toGoSurcharge = Number(toGo?.value ?? 0);
    const deliverySurcharge = Number(delivery?.value ?? 0);

    return {
      toGoSurcharge: Number.isFinite(toGoSurcharge) ? Math.max(0, toGoSurcharge) : 0,
      deliverySurcharge: Number.isFinite(deliverySurcharge) ? Math.max(0, deliverySurcharge) : 0,
    };
  }

  async saveOrderTypeSurchargeConfig(payload: { toGoSurcharge: number; deliverySurcharge: number }): Promise<void> {
    const db = await getDb();
    const now = Math.floor(Date.now() / 1000);
    const safeToGo = Number.isFinite(payload.toGoSurcharge) ? Math.max(0, payload.toGoSurcharge) : 0;
    const safeDelivery = Number.isFinite(payload.deliverySurcharge) ? Math.max(0, payload.deliverySurcharge) : 0;

    await db.surcharges.bulkPut([
      { name: 'to-go', value: safeToGo, updatedAt: now },
      { name: 'delivery', value: safeDelivery, updatedAt: now },
    ]);
  }
}