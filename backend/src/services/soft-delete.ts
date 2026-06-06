import { and, eq, isNull, sql, type SQL } from 'drizzle-orm';
import type { AnySQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { db } from '../database';

/**
 * Soft-delete shared helpers.
 *
 * Two independent concepts live in the affected tables:
 * - `deletedAt` (timestamp, NULL = alive): logical deletion. Soft-deleted rows
 *   must disappear from EVERY read query; they are only visible by inspecting
 *   the database directly.
 * - `isActive` (boolean): the admin-facing enable/disable toggle, handled per
 *   service — NOT touched here.
 *
 * Drizzle has no adapter-level global filter, so reads opt in via `notDeleted()`.
 */

/** Column shape every soft-deletable table exposes. */
type SoftDeletableTable = SQLiteTable & { deletedAt: AnySQLiteColumn };

/**
 * Wraps a table's read filter so soft-deleted rows are excluded.
 * Use inside `.where(...)` for every read of a soft-deletable table:
 *   `.where(notDeleted(products))`
 *   `.where(notDeleted(products, eq(products.categoryId, id)))`
 */
export function notDeleted(table: SoftDeletableTable, ...conds: (SQL | undefined)[]): SQL {
  const filters = [isNull(table.deletedAt), ...conds.filter((c): c is SQL => c !== undefined)];
  return and(...filters) as SQL;
}

/** A single dependency check: count rows in `table` where `column` equals `value`. */
export type DependencyCheck = {
  table: SQLiteTable;
  column: AnySQLiteColumn;
  value: string;
};

/**
 * Total number of rows referencing the target id across all checks.
 *
 * IMPORTANT: dependency rows are counted even if they are themselves
 * soft-deleted — a soft-deleted product still holds a FK to its ingredient, so
 * that ingredient can never be hard-deleted. Callers therefore pass the raw
 * child table without a `deletedAt` filter.
 */
export function countDependencies(checks: DependencyCheck[]): number {
  let total = 0;
  for (const { table, column, value } of checks) {
    const row = db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(table)
      .where(eq(column, value))
      .get() as { count: number } | undefined;
    total += Number(row?.count ?? 0);
  }
  return total;
}

/**
 * Deletes a row, choosing the strategy automatically:
 * - If it has dependencies → SOFT delete (set `deletedAt = now`).
 * - If it has none → HARD delete (real DELETE), running `cleanupChildren`
 *   first inside the same transaction to remove rows that are safe to drop.
 *
 * Returns `'soft'` or `'hard'` so callers/tests can assert the path taken.
 */
export function deleteOrSoftDelete(
  table: SoftDeletableTable,
  idColumn: AnySQLiteColumn,
  id: string,
  dependencyChecks: DependencyCheck[],
  cleanupChildren?: () => void,
): 'soft' | 'hard' {
  const dependencies = countDependencies(dependencyChecks);

  if (dependencies > 0) {
    db.update(table)
      .set({ deletedAt: sql`cast(strftime('%s', 'now') as int)` })
      .where(eq(idColumn, id))
      .run();
    return 'soft';
  }

  db.transaction(() => {
    cleanupChildren?.();
    db.delete(table).where(eq(idColumn, id)).run();
  });
  return 'hard';
}
