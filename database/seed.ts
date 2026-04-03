import { hashPin } from '@/utils/hash';
import { count, eq } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import type * as schema from './schema';
import { categories, products, restaurantTables, users } from './schema';

export function seedDefaults(db: ExpoSQLiteDatabase<typeof schema>) {
  const owner = db.select({ id: users.id })
    .from(users)
    .where(eq(users.name, 'Owner'))
    .get();

  if (!owner) {
    // Hashes PINs using bcryptjs with 10 salt rounds
    db.insert(users).values([
      { name: 'Owner', role: 'owner', pinHash: hashPin('1234') },
      { name: 'Staff', role: 'staff', pinHash: hashPin('2222') },
    ]).run();
  }

  const defaultCategories = ['Coffee', 'Tea', 'Pastry', 'Snacks'];
  for (const name of defaultCategories) {
    db.insert(categories).values({ name }).onConflictDoNothing().run();
  }
  const [{ total }] = db.select({ total: count() }).from(products).all();
  if (total === 0) {
    const coffeeCategory = db.select({ id: categories.id })
      .from(categories)
      .where(eq(categories.name, 'Coffee'))
      .get();
    const teaCategory = db.select({ id: categories.id })
      .from(categories)
      .where(eq(categories.name, 'Tea'))
      .get();
    const pastryCategory = db.select({ id: categories.id })
      .from(categories)
      .where(eq(categories.name, 'Pastry'))
      .get();

    if (coffeeCategory && teaCategory && pastryCategory) {
      db.insert(products).values([
        { name: 'Cappuccino', categoryId: coffeeCategory.id, price: 4.5 },
        { name: 'Latte', categoryId: coffeeCategory.id, price: 4.25 },
        { name: 'Thai Milk Tea', categoryId: teaCategory.id, price: 3.9 },
        { name: 'Butter Croissant', categoryId: pastryCategory.id, price: 2.8 },
      ]).run();
    }
  }

  const [{ total: tablesTotal }] = db.select({ total: count() }).from(restaurantTables).all();
  if (tablesTotal === 0) {
    db.insert(restaurantTables)
      .values([
        { name: 'Para llevar' },
        { name: 'Domicilio' },
        { name: 'Mesa 1' },
        { name: 'Mesa 2' },
        { name: 'Mesa 3' },
        { name: 'Mesa 4' },
      ])
      .onConflictDoNothing()
      .run();
  }
}
