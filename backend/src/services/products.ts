import { db } from '../database';
import { categories, comboGroupOptions, comboGroups, discounts, ingredients, productAdditionalIngredients, productIngredients, products, saleItems } from '../database/schema';
import type {
  AddCategoryPayload,
  CategoryOption,
  ComboGroupOption,
  CreateComboGroupInput,
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
} from '../types/products';
import { randomUUID } from 'crypto';
import { extractManagedImageId, ProductImageService } from './product-image';

const productImages = new ProductImageService();
import { and, eq, inArray, sql } from 'drizzle-orm';
import { countDependencies, deleteOrSoftDelete, notDeleted } from './soft-delete';

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
        isCombo: products.isCombo,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(notDeleted(products))
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

    const comboGroupsList = db
      .select({
        id: comboGroups.id,
        comboProductId: comboGroups.comboProductId,
        name: comboGroups.name,
        minQuantity: comboGroups.minQuantity,
        maxQuantity: comboGroups.maxQuantity,
      })
      .from(comboGroups)
      .orderBy(comboGroups.comboProductId, comboGroups.id)
      .all();

    const comboGroupOptionsList = db
      .select({
        id: comboGroupOptions.id,
        groupId: comboGroupOptions.groupId,
        productId: comboGroupOptions.productId,
        additionalPrice: comboGroupOptions.additionalPrice,
        isDefault: comboGroupOptions.isDefault,
      })
      .from(comboGroupOptions)
      .orderBy(comboGroupOptions.groupId)
      .all();

    return {
      categories: categoryOptions,
      products: productsList,
      productIngredients: ingredientLinks,
      productAdditionalIngredients: productAdditionalIngredientLinks,
      comboGroups: comboGroupsList,
      comboGroupOptions: comboGroupOptionsList,
    };
  }

  async createProduct({ name, categoryId, price, imageUri, isCombo = false, recipe, additionalIngredients = [], comboGroups: groupsInput = [] }: CreateProductPayload): Promise<string | null> {
    if (!isCombo) {
      const normalizedRecipe = this.normalizeRecipe(recipe || []);
      if (normalizedRecipe.length === 0) {
        return null;
      }
    }

    const productId = randomUUID();
    db.transaction((tx) => {
      tx.insert(products)
        .values({ id: productId, name, categoryId: categoryId ?? null, price, imageUri: imageUri ?? null, isActive: true, isCombo })
        .run();

      if (!isCombo) {
        const normalizedRecipe = this.normalizeRecipe(recipe || []);
        tx.insert(productIngredients)
          .values(
            normalizedRecipe.map((entry) => ({
              productId,
              ingredientId: entry.ingredientId,
              quantityUsed: entry.quantityUsed,
            })),
          )
          .run();

        const normalizedAdditionalIngredients = this.normalizeAdditionalIngredients(additionalIngredients);
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
      } else {
        for (const group of groupsInput) {
          const groupId = randomUUID();
          tx.insert(comboGroups)
            .values({
              id: groupId,
              comboProductId: productId,
              name: group.name,
              minQuantity: group.minQuantity,
              maxQuantity: group.maxQuantity,
            })
            .run();

          tx.insert(comboGroupOptions)
            .values(
              group.options.map((opt) => ({
                id: randomUUID(),
                groupId,
                productId: opt.productId,
                additionalPrice: opt.additionalPrice,
                isDefault: opt.isDefault,
              })),
            )
            .run();
        }
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
      .where(notDeleted(products, eq(products.id, id)))
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

    // If the image was replaced/removed, delete the now-orphaned server file.
    if (payload.imageUri !== undefined && payload.imageUri !== existing.imageUri) {
      const oldImageId = extractManagedImageId(existing.imageUri);
      const newImageId = extractManagedImageId(payload.imageUri);
      if (oldImageId && oldImageId !== newImageId) {
        productImages.deleteImage(oldImageId);
      }
    }
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

  async setComboGroup({ comboProductId, name, minQuantity, maxQuantity, groupId }: { comboProductId: string; name: string; minQuantity: number; maxQuantity: number; groupId?: string }): Promise<string> {
    if (groupId) {
      db.update(comboGroups)
        .set({ name, minQuantity, maxQuantity, updatedAt: sql`cast(strftime('%s', 'now') as int)` })
        .where(eq(comboGroups.id, groupId))
        .run();
      return groupId;
    }

    const newGroupId = randomUUID();
    db.insert(comboGroups)
      .values({ id: newGroupId, comboProductId, name, minQuantity, maxQuantity })
      .run();
    return newGroupId;
  }

  async removeComboGroup(groupId: string): Promise<void> {
    db.delete(comboGroupOptions).where(eq(comboGroupOptions.groupId, groupId)).run();
    db.delete(comboGroups).where(eq(comboGroups.id, groupId)).run();
  }

  async setComboGroupOption({ groupId, productId, additionalPrice, isDefault, optionId }: { groupId: string; productId: string; additionalPrice: number; isDefault: boolean; optionId?: string }): Promise<string> {
    if (optionId) {
      db.update(comboGroupOptions)
        .set({ productId, additionalPrice, isDefault, updatedAt: sql`cast(strftime('%s', 'now') as int)` })
        .where(eq(comboGroupOptions.id, optionId))
        .run();
      return optionId;
    }

    const newOptionId = randomUUID();
    db.insert(comboGroupOptions)
      .values({ id: newOptionId, groupId, productId, additionalPrice, isDefault })
      .run();
    return newOptionId;
  }

  async removeComboGroupOption(optionId: string): Promise<void> {
    db.delete(comboGroupOptions).where(eq(comboGroupOptions.id, optionId)).run();
  }

  /**
   * Deletes a product. Soft-deletes if it has sales history or is used as an
   * option inside another product's combo; otherwise hard-deletes, cleaning up
   * its own recipe links, additional ingredients, owned combo groups/options
   * and discounts first.
   */
  async deleteProduct(id: string): Promise<'soft' | 'hard' | 'not-found'> {
    const existing = db
      .select({ imageUri: products.imageUri })
      .from(products)
      .where(notDeleted(products, eq(products.id, id)))
      .get();
    if (!existing) {
      return 'not-found';
    }

    const result = deleteOrSoftDelete(
      products,
      products.id,
      id,
      [
        { table: saleItems, column: saleItems.productId, value: id },
        { table: comboGroupOptions, column: comboGroupOptions.productId, value: id },
      ],
      () => {
        // Owned children, safe to drop on a true hard delete.
        db.delete(productIngredients).where(eq(productIngredients.productId, id)).run();
        db.delete(productAdditionalIngredients).where(eq(productAdditionalIngredients.productId, id)).run();
        db.delete(discounts).where(eq(discounts.productId, id)).run();
        const ownedGroups = db
          .select({ id: comboGroups.id })
          .from(comboGroups)
          .where(eq(comboGroups.comboProductId, id))
          .all();
        if (ownedGroups.length > 0) {
          const groupIds = ownedGroups.map((g) => g.id);
          db.delete(comboGroupOptions).where(inArray(comboGroupOptions.groupId, groupIds)).run();
          db.delete(comboGroups).where(eq(comboGroups.comboProductId, id)).run();
        }
      },
    );

    if (result === 'hard') {
      const imageId = extractManagedImageId(existing.imageUri);
      if (imageId) {
        productImages.deleteImage(imageId);
      }
    }
    return result;
  }

}
