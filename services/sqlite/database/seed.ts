import { hashPin } from '@/utils/hash';
import { count, eq } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import type * as schema from './schema';
import { categories, discounts, ingredients, productIngredients, products, restaurantTables, surcharges, users } from './schema';

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
    const espresso = db.select({ id: ingredients.id })
      .from(ingredients)
      .where(eq(ingredients.name, 'Espresso Beans'))
      .get();
    const milk = db.select({ id: ingredients.id })
      .from(ingredients)
      .where(eq(ingredients.name, 'Milk'))
      .get();
    const teaBlend = db.select({ id: ingredients.id })
      .from(ingredients)
      .where(eq(ingredients.name, 'Tea Blend'))
      .get();
    const pastryDough = db.select({ id: ingredients.id })
      .from(ingredients)
      .where(eq(ingredients.name, 'Pastry Dough'))
      .get();

    if (!espresso) {
      db.insert(ingredients).values({ name: 'Espresso Beans', unit: 'grams', quantity: 0, lowStockThreshold: 500 }).run();
    }
    if (!milk) {
      db.insert(ingredients).values({ name: 'Milk', unit: 'liters', quantity: 0, lowStockThreshold: 2 }).run();
    }
    if (!teaBlend) {
      db.insert(ingredients).values({ name: 'Tea Blend', unit: 'grams', quantity: 0, lowStockThreshold: 400 }).run();
    }
    if (!pastryDough) {
      db.insert(ingredients).values({ name: 'Pastry Dough', unit: 'grams', quantity: 0, lowStockThreshold: 1000 }).run();
    }

    const espressoSeed = db.select({ id: ingredients.id })
      .from(ingredients)
      .where(eq(ingredients.name, 'Espresso Beans'))
      .get();
    const milkSeed = db.select({ id: ingredients.id })
      .from(ingredients)
      .where(eq(ingredients.name, 'Milk'))
      .get();
    const teaBlendSeed = db.select({ id: ingredients.id })
      .from(ingredients)
      .where(eq(ingredients.name, 'Tea Blend'))
      .get();
    const pastryDoughSeed = db.select({ id: ingredients.id })
      .from(ingredients)
      .where(eq(ingredients.name, 'Pastry Dough'))
      .get();

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

    if (coffeeCategory && teaCategory && pastryCategory && espressoSeed && milkSeed && teaBlendSeed && pastryDoughSeed) {
      db.insert(products).values([
        { name: 'Cappuccino', categoryId: coffeeCategory.id, price: 4.5 },
        { name: 'Latte', categoryId: coffeeCategory.id, price: 4.25 },
        { name: 'Thai Milk Tea', categoryId: teaCategory.id, price: 3.9 },
        { name: 'Butter Croissant', categoryId: pastryCategory.id, price: 2.8 },
      ]).run();

      const cappuccino = db.select({ id: products.id }).from(products).where(eq(products.name, 'Cappuccino')).get();
      const latte = db.select({ id: products.id }).from(products).where(eq(products.name, 'Latte')).get();
      const thaiMilkTea = db.select({ id: products.id }).from(products).where(eq(products.name, 'Thai Milk Tea')).get();
      const butterCroissant = db.select({ id: products.id }).from(products).where(eq(products.name, 'Butter Croissant')).get();

      if (cappuccino && latte && thaiMilkTea && butterCroissant) {
        db.insert(productIngredients)
          .values([
            { productId: cappuccino.id, ingredientId: espressoSeed.id, quantityUsed: 18 },
            { productId: latte.id, ingredientId: espressoSeed.id, quantityUsed: 18 },
            { productId: thaiMilkTea.id, ingredientId: teaBlendSeed.id, quantityUsed: 10 },
            { productId: butterCroissant.id, ingredientId: pastryDoughSeed.id, quantityUsed: 80 },
          ])
          .onConflictDoNothing()
          .run();

        db.insert(productIngredients)
          .values([
            { productId: cappuccino.id, ingredientId: milkSeed.id, quantityUsed: 150 },
            { productId: latte.id, ingredientId: milkSeed.id, quantityUsed: 180 },
            { productId: thaiMilkTea.id, ingredientId: milkSeed.id, quantityUsed: 120 },
          ])
          .onConflictDoNothing()
          .run();
      }
    }
  }

  const [{ total: tablesTotal }] = db.select({ total: count() }).from(restaurantTables).all();
  if (tablesTotal === 0) {
    db.insert(restaurantTables)
      .values([
        { name: 'Para llevar', tableType: 'to-go' },
        { name: 'Domicilio', tableType: 'delivery' },
        { name: 'Mesa 1', tableType: 'dine-in' },
        { name: 'Mesa 2', tableType: 'dine-in' },
        { name: 'Mesa 3', tableType: 'dine-in' },
        { name: 'Mesa 4', tableType: 'dine-in' },
      ])
      .onConflictDoNothing()
      .run();
  }

  const [{ total: discountsTotal }] = db.select({ total: count() }).from(discounts).all();
  if (discountsTotal === 0) {
    const now = Math.floor(Date.now() / 1000);
    db.insert(discounts)
      .values([
        { name: 'Grand Opening 5%', scope: 'global', productId: null, type: 'percentage', value: 5, startsAt: now, endsAt: null, isActive: true },
        { name: 'Happy Hour $1', scope: 'global', productId: null, type: 'fixed', value: 1, startsAt: now, endsAt: null, isActive: true },
      ])
      .onConflictDoNothing()
      .run();
  }

  db.insert(surcharges)
    .values([
      { name: 'to-go', value: 0 },
      { name: 'delivery', value: 0 },
    ])
    .onConflictDoNothing()
    .run();
}
