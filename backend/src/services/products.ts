import { db } from '@/database';
import { categories, ingredientCompositions, ingredients, productIngredients, products } from '@/database/schema';
import type {
  CategoryOption,
  CreateProductPayload,
  IngredientCompositionLink,
  ProductDetail,
  ProductIngredientLink,
  ProductRecipeInput,
  RemoveCompositionPayload,
  RemoveProductIngredientPayload,
  SetCompositionPayload,
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

  async getHydrationData() {
    const categoryOptions = db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(categories.name)
      .all() as CategoryOption[];

    const ingredientOptions = db
      .select({ id: ingredients.id, name: ingredients.name })
      .from(ingredients)
      .all();

    const ingredientNameById = new Map(ingredientOptions.map((ingredient) => [ingredient.id, ingredient.name]));

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

    const compositionRows = db
      .select({
        id: ingredientCompositions.id,
        parentIngredientId: ingredientCompositions.parentIngredientId,
        childIngredientId: ingredientCompositions.childIngredientId,
        quantityNeeded: ingredientCompositions.quantityNeeded,
      })
      .from(ingredientCompositions)
      .orderBy(ingredientCompositions.parentIngredientId, ingredientCompositions.childIngredientId)
      .all();

    const compositionLinks = compositionRows.map((row) => ({
      ...row,
      parentIngredientName: ingredientNameById.get(row.parentIngredientId) ?? 'Unknown',
      childIngredientName: ingredientNameById.get(row.childIngredientId) ?? 'Unknown',
    })) as IngredientCompositionLink[];

    return {
      categories: categoryOptions,
      products: productsList,
      productIngredients: ingredientLinks,
      compositions: compositionLinks,
    };
  }

  async createProduct({ name, categoryId, price, imageUri, recipe }: CreateProductPayload): Promise<string | null> {
    const normalizedRecipe = this.normalizeRecipe(recipe);
    if (normalizedRecipe.length === 0) {
      return null;
    }

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
    });

      return productId;
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
        syncedAt: null,
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
        .set({ quantityUsed, updatedAt: sql`cast(strftime('%s', 'now') as int)`, syncedAt: null })
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

  async setComposition({ parentIngredientId, childIngredientId, quantityNeeded }: SetCompositionPayload): Promise<void> {
    if (parentIngredientId === childIngredientId) {
      console.warn('[products] Rejecting self-reference composition.');
      return;
    }
    if (quantityNeeded <= 0) {
      return;
    }

    const existing = db
      .select({ id: ingredientCompositions.id })
      .from(ingredientCompositions)
      .where(
        and(
          eq(ingredientCompositions.parentIngredientId, parentIngredientId),
          eq(ingredientCompositions.childIngredientId, childIngredientId),
        ),
      )
      .get();

    if (existing) {
      db.update(ingredientCompositions)
        .set({ quantityNeeded, updatedAt: sql`cast(strftime('%s', 'now') as int)`, syncedAt: null })
        .where(eq(ingredientCompositions.id, existing.id))
        .run();
    } else {
      db.insert(ingredientCompositions)
        .values({ parentIngredientId, childIngredientId, quantityNeeded })
        .run();
    }
  }

  async removeComposition({ parentIngredientId, childIngredientId }: RemoveCompositionPayload): Promise<void> {
    db.delete(ingredientCompositions)
      .where(
        and(
          eq(ingredientCompositions.parentIngredientId, parentIngredientId),
          eq(ingredientCompositions.childIngredientId, childIngredientId),
        ),
      )
      .run();
  }
}
