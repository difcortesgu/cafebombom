import { execute, queryAll, queryFirst } from '@/database/db';
import type { SalesService } from '@/services/interfaces/sales';
import type { CreateSalePayload, SaleItemDetail } from '@/types/sales';
import type { Product, Sale, SaleItemInput } from '@/types/types';

export class SalesSqliteService implements SalesService {
  async getHydrationData() {
    const [products, sales] = await Promise.all([
      queryAll<Product>(
        `SELECT p.id, p.name, c.name as category, p.price
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.is_active = 1
         ORDER BY p.name;`
      ),
      queryAll<Sale>(
        `SELECT s.id, s.created_at, u.name as staff_name, s.total
         FROM sales s
         JOIN users u ON u.id = s.staff_id
         ORDER BY s.created_at DESC
         LIMIT 50;`
      ),
    ]);

    return { products, sales };
  }

  async createSale({ staffId, items }: CreateSalePayload) {
    if (items.length === 0) {
      return;
    }

    const total = items.reduce((sum: number, item: SaleItemInput) => sum + item.unitPrice * item.quantity, 0);
    const createdAt = Math.floor(Date.now() / 1000);

    const insert = await execute(
      'INSERT INTO sales (created_at, staff_id, total, synced_at) VALUES (?, ?, ?, NULL);',
      [createdAt, staffId, total]
    );

    const saleId = insert.lastInsertRowId;

    for (const item of items) {
      await execute(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?);',
        [saleId, item.productId, item.quantity, item.unitPrice]
      );

      const recipe = await queryAll<{ ingredient_id: number; quantity_used: number }>(
        'SELECT ingredient_id, quantity_used FROM product_ingredients WHERE product_id = ?;',
        [item.productId]
      );

      for (const ingredient of recipe) {
        await execute(
          `UPDATE ingredients
           SET quantity = MAX(0, quantity - ?),
               updated_at = cast(strftime('%s', 'now') as int),
               synced_at = NULL
           WHERE id = ?;`,
          [ingredient.quantity_used * item.quantity, ingredient.ingredient_id]
        );
      }
    }
  }

  async getTopSelling(limit = 5) {
    return queryAll<{ name: string; quantity: number }>(
      `SELECT p.name, SUM(si.quantity) as quantity
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       GROUP BY si.product_id
       ORDER BY quantity DESC
       LIMIT ?;`,
      [limit]
    );
  }

  async getSaleItems(saleId: number) {
    return queryAll<SaleItemDetail>(
      `SELECT si.id, p.name as product_name, si.quantity, si.unit_price
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?
       ORDER BY si.id;`,
      [saleId]
    );
  }

  async getRevenueInRange(startUnix: number, endUnix: number) {
    const row = await queryFirst<{ income: number }>(
      'SELECT COALESCE(SUM(total), 0) as income FROM sales WHERE created_at BETWEEN ? AND ?;',
      [startUnix, endUnix]
    );
    return row?.income ?? 0;
  }
}
