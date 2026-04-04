import type { SalesService } from '@/services/interfaces/sales';
import type { CreateSalePayload, CreateTablePayload, SaleItemDetail, UpdateTablePayload } from '@/types/sales';
import type { RestaurantTable } from '@/types/types';

import { getDb } from './storage';

export class SalesWebService implements SalesService {
  async getHydrationData() {
    const db = await getDb();
    const [products, categories, sales, users, tables] = await Promise.all([
      db.products.toArray(),
      db.categories.toArray(),
      db.sales.toArray(),
      db.users.toArray(),
      db.restaurantTables.toArray(),
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
          created_at: table.createdAt,
        })),
    };
  }

  async getTables(): Promise<RestaurantTable[]> {
    const db = await getDb();
    return (await db.restaurantTables.toArray())
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((table) => ({
        id: table.id,
        name: table.name,
        created_at: table.createdAt,
      }));
  }

  async createTable({ name }: CreateTablePayload): Promise<void> {
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
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateTable({ id, name }: UpdateTablePayload): Promise<void> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }
    const db = await getDb();
    await db.restaurantTables.update(id, {
      name: normalizedName,
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

  async createSale({ staffId, items, tableId }: CreateSalePayload): Promise<void> {
    if (items.length === 0 || !tableId) {
      return;
    }

    const db = await getDb();
    const [productIngredients, ingredients] = await Promise.all([
      db.productIngredients.toArray(),
      db.ingredients.toArray(),
    ]);

    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const recipeByProductId = new Map<string, Array<{ ingredientId: string; quantityUsed: number }>>();

    const saleId = await db.sales.add({
      createdAt: Math.floor(Date.now() / 1000),
      staffId,
      tableId,
      total,
    });

    for (const item of items) {
      await db.saleItems.add({
        saleId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
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
      .map((item) => ({
        id: item.id,
        product_name: products.find((product) => product.id === item.productId)?.name ?? 'Unknown',
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));
  }

  async getRevenueInRange(startUnix: number, endUnix: number): Promise<number> {
    const db = await getDb();
    return (await db.sales
      .where('createdAt')
      .between(startUnix, endUnix)
      .toArray())
      .reduce((sum, sale) => sum + Number(sale.total), 0);
  }
}