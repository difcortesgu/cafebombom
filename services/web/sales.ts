import type { SalesService } from '@/services/interfaces/sales';
import type { CreateSalePayload, SaleItemDetail } from '@/types/sales';

import { resolveRecipe } from '@/services/recipe-resolver';
import { nextId, readWebData, updateWebData } from './storage';

export class SalesWebService implements SalesService {
  async getHydrationData() {
    const data = readWebData();

    return {
      products: data.products
        .filter((product) => product.isActive)
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((product) => ({
          id: product.id,
          name: product.name,
          category: data.categories.find((category) => category.id === product.categoryId)?.name ?? '',
          price: product.price,
        })),
      sales: data.sales
        .slice()
        .sort((left, right) => right.createdAt - left.createdAt)
        .slice(0, 50)
        .map((sale) => ({
          id: sale.id,
          created_at: sale.createdAt,
          staff_name: data.users.find((user) => user.id === sale.staffId)?.name ?? 'Unknown',
          total: sale.total,
        })),
    };
  }

  async createSale({ staffId, items }: CreateSalePayload): Promise<void> {
    if (items.length === 0) {
      return;
    }

    updateWebData((data) => {
      const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const saleId = nextId(data, 'sales');
      const recipeByProductId = new Map<number, Array<{ ingredientId: number; quantityUsed: number }>>();

      data.sales.push({
        id: saleId,
        createdAt: Math.floor(Date.now() / 1000),
        staffId,
        total,
      });

      for (const item of items) {
        data.saleItems.push({
          id: nextId(data, 'saleItems'),
          saleId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      }

      for (const item of items) {
        const recipeEdges = recipeByProductId.get(item.productId) ?? data.productIngredients
          .filter((pi) => pi.productId === item.productId)
          .map((pi) => ({ ingredientId: pi.ingredientId, quantityUsed: pi.quantityUsed }));

        recipeByProductId.set(item.productId, recipeEdges);

        const leafConsumptions = resolveRecipe(recipeEdges, item.quantity, data.ingredientCompositions);

        for (const leaf of leafConsumptions) {
          const ingredient = data.ingredients.find((ing) => ing.id === leaf.ingredientId);
          if (ingredient) {
            ingredient.quantity = Math.max(0, ingredient.quantity - leaf.quantity);
          }
        }
      }
    });
  }

  async getTopSelling(limit = 5): Promise<Array<{ name: string; quantity: number }>> {
    const data = readWebData();
    const totals = new Map<number, number>();

    for (const item of data.saleItems) {
      totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
    }

    return [...totals.entries()]
      .map(([productId, quantity]) => ({
        name: data.products.find((product) => product.id === productId)?.name ?? 'Unknown',
        quantity,
      }))
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, limit);
  }

  async getSaleItems(saleId: number): Promise<SaleItemDetail[]> {
    const data = readWebData();

    return data.saleItems
      .filter((item) => item.saleId === saleId)
      .slice()
      .sort((left, right) => left.id - right.id)
      .map((item) => ({
        id: item.id,
        product_name: data.products.find((product) => product.id === item.productId)?.name ?? 'Unknown',
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));
  }

  async getRevenueInRange(startUnix: number, endUnix: number): Promise<number> {
    return readWebData().sales
      .filter((sale) => sale.createdAt >= startUnix && sale.createdAt <= endUnix)
      .reduce((sum, sale) => sum + Number(sale.total), 0);
  }
}