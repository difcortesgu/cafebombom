import { db } from '@/database';
import { categories, ingredients, productAdditionalIngredients, productIngredients, products } from '@/database/schema';
import type {
  AddCategoryPayload,
  CategoryOption,
  CreateProductPayload,
  ProductAdditionalIngredientInput,
  ProductAdditionalIngredientLink,
  ProductDetail,
  ProductIngredientLink,
  ProductRecipeInput,
  RemoveProductAdditionalIngredientPayload,
  RemoveProductIngredientPayload,
  SetProductAdditionalIngredientPayload,
  SetProductIngredientPayload,
  UpdateProductPayload,
} from '@/types/products';
import { randomUUID } from 'crypto';
import { and, eq, sql } from 'drizzle-orm';

export class ProductsSqliteService {
  private normalizeRecipe(recipe: ProductRecipeInput[]): ProductRecipeInput[] {
    const deduped = new Map<string, number>();
    for (const entry of recipe) {
      if (!entry.ingredientId || entry.quantityUsed <= 0) {
        continue;
      }
      deduped.set(entry.ingredientId, entry.quantityUsed);
    }

    return Array.from(deduped.entries()).map(([ingredientId, quantityUsed]) => ({ ingredientId, quantityUsed }));
  }

  private normalizeAdditionalIngredients(items: ProductAdditionalIngredientInput[]): ProductAdditionalIngredientInput[] {
    const deduped = new Map<string, ProductAdditionalIngredientInput>();
    for (const entry of items) {
      if (!entry.ingredientId || entry.quantityUsed <= 0 || entry.additionalPrice < 0) {
        continue;
      }

      deduped.set(entry.ingredientId, {
        ingredientId: entry.ingredientId,
        quantityUsed: entry.quantityUsed,
        additionalPrice: entry.additionalPrice,
      });
    }

    return Array.from(deduped.values());
  }

  async getHydrationData() {
    const categoryOptions = db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(categories.name)
      .all() as CategoryOption[];

    const productsList = db
      .select({
        id: products.id,
        name: products.name,
        categoryId: products.categoryId,
        category: categories.name,
        price: products.price,
        imageUri: products.imageUri,
        isActive: products.isActive,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .orderBy(products.name)
      .all()
      .map((row) => ({
        ...row,
        category: row.category ?? '',
      })) as ProductDetail[];

    const ingredientLinks = db
      .select({
        id: productIngredients.id,
        productId: productIngredients.productId,
        ingredientId: productIngredients.ingredientId,
        ingredientName: ingredients.name,
        quantityUsed: productIngredients.quantityUsed,
      })
      .from(productIngredients)
      .innerJoin(ingredients, eq(ingredients.id, productIngredients.ingredientId))
      .orderBy(productIngredients.productId, ingredients.name)
      .all() as ProductIngredientLink[];

    const productAdditionalIngredientLinks = db
      .select({
        id: productAdditionalIngredients.id,
        productId: productAdditionalIngredients.productId,
        ingredientId: productAdditionalIngredients.ingredientId,
        ingredientName: ingredients.name,
        quantityUsed: productAdditionalIngredients.quantityUsed,
        additionalPrice: productAdditionalIngredients.additionalPrice,
      })
      .from(productAdditionalIngredients)
      .innerJoin(ingredients, eq(ingredients.id, productAdditionalIngredients.ingredientId))
      .orderBy(productAdditionalIngredients.productId, ingredients.name)
      .all() as ProductAdditionalIngredientLink[];

    return {
      categories: categoryOptions,
      products: productsList,
      productIngredients: ingredientLinks,
      productAdditionalIngredients: productAdditionalIngredientLinks,
    };
  }

  async createProduct({ name, categoryId, price, imageUri, recipe, additionalIngredients = [] }: CreateProductPayload): Promise<string | null> {
    const normalizedRecipe = this.normalizeRecipe(recipe);
    if (normalizedRecipe.length === 0) {
      return null;
    }
    const normalizedAdditionalIngredients = this.normalizeAdditionalIngredients(additionalIngredients);

    const productId = randomUUID();
    db.transaction((tx) => {
      tx.insert(products)
        .values({ id: productId, name, categoryId: categoryId ?? null, price, imageUri: imageUri ?? null, isActive: true })
        .run();

      tx.insert(productIngredients)
        .values(
          normalizedRecipe.map((entry) => ({
            productId,
            ingredientId: entry.ingredientId,
            quantityUsed: entry.quantityUsed,
          })),
        )
        .run();

      if (normalizedAdditionalIngredients.length > 0) {
        tx.insert(productAdditionalIngredients)
          .values(
            normalizedAdditionalIngredients.map((entry) => ({
              productId,
              ingredientId: entry.ingredientId,
              quantityUsed: entry.quantityUsed,
              additionalPrice: entry.additionalPrice,
            })),
          )
          .run();
      }
    });

    return productId;
  }

  async addCategory({ name }: AddCategoryPayload): Promise<string | null> {
    const [inserted] = db.insert(categories)
      .values({ name })
      .onConflictDoNothing()
      .returning({ id: categories.id })
      .all();

    return inserted?.id ?? null;
  }

  async updateProduct({ id, ...payload }: UpdateProductPayload): Promise<void> {
    const existing = db
      .select({ name: products.name, categoryId: products.categoryId, price: products.price, imageUri: products.imageUri, isActive: products.isActive })
      .from(products)
      .where(eq(products.id, id))
      .get();

    if (!existing) {
      return;
    }

    db.update(products)
      .set({
        name: payload.name ?? existing.name,
        categoryId: payload.categoryId !== undefined ? payload.categoryId : existing.categoryId,
        price: payload.price ?? existing.price,
        imageUri: payload.imageUri !== undefined ? payload.imageUri : existing.imageUri,
        isActive: payload.isActive !== undefined ? payload.isActive : existing.isActive,
        updatedAt: sql`cast(strftime('%s', 'now') as int)`,
      })
      .where(eq(products.id, id))
      .run();
  }

  async setProductIngredient({ productId, ingredientId, quantityUsed }: SetProductIngredientPayload): Promise<void> {
    if (quantityUsed <= 0) {
      return;
    }

    const existing = db
      .select({ id: productIngredients.id })
      .from(productIngredients)
      .where(and(eq(productIngredients.productId, productId), eq(productIngredients.ingredientId, ingredientId)))
      .get();

    if (existing) {
      db.update(productIngredients)
        .set({ quantityUsed, updatedAt: sql`cast(strftime('%s', 'now') as int)` })
        .where(eq(productIngredients.id, existing.id))
        .run();
    } else {
      db.insert(productIngredients)
        .values({ productId, ingredientId, quantityUsed })
        .run();
    }
  }

  async removeProductIngredient({ productId, ingredientId }: RemoveProductIngredientPayload): Promise<void> {
    const [{ total }] = db.select({ total: sql<number>`cast(count(*) as int)` })
      .from(productIngredients)
      .where(eq(productIngredients.productId, productId))
      .all();

    if (total <= 1) {
      return;
    }

    db.delete(productIngredients)
      .where(and(eq(productIngredients.productId, productId), eq(productIngredients.ingredientId, ingredientId)))
      .run();
  }

  async setProductAdditionalIngredient({ productId, ingredientId, quantityUsed, additionalPrice }: SetProductAdditionalIngredientPayload): Promise<void> {
    if (quantityUsed <= 0 || additionalPrice < 0) {
      return;
    }

    const existing = db
      .select({ id: productAdditionalIngredients.id })
      .from(productAdditionalIngredients)
      .where(and(eq(productAdditionalIngredients.productId, productId), eq(productAdditionalIngredients.ingredientId, ingredientId)))
      .get();

    if (existing) {
      db.update(productAdditionalIngredients)
        .set({ quantityUsed, additionalPrice, updatedAt: sql`cast(strftime('%s', 'now') as int)` })
        .where(eq(productAdditionalIngredients.id, existing.id))
        .run();
    } else {
      db.insert(productAdditionalIngredients)
        .values({ productId, ingredientId, quantityUsed, additionalPrice })
        .run();
    }
  }

  async removeProductAdditionalIngredient({ productId, ingredientId }: RemoveProductAdditionalIngredientPayload): Promise<void> {
    db.delete(productAdditionalIngredients)
      .where(and(eq(productAdditionalIngredients.productId, productId), eq(productAdditionalIngredients.ingredientId, ingredientId)))
      .run();
  }

}
