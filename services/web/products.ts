import type { ProductsService } from '@/services/interfaces/products';
import type {
  CategoryOption,
  CreateProductPayload,
  IngredientCompositionLink,
  ProductDetail,
  ProductIngredientLink,
  RemoveCompositionPayload,
  RemoveProductIngredientPayload,
  SetCompositionPayload,
  SetProductIngredientPayload,
  UpdateProductPayload,
} from '@/types/products';

import { getDb, generateId } from './storage';

export class ProductsWebService implements ProductsService {
  async getHydrationData() {
    const db = await getDb();
    const [categoriesData, productsData, ingredients, productIngredientsData, compositionsData] = await Promise.all([
      db.categories.toArray(),
      db.products.toArray(),
      db.ingredients.toArray(),
      db.productIngredients.toArray(),
      db.ingredientCompositions.toArray(),
    ]);

    const categories: CategoryOption[] = categoriesData
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));

    const productsList: ProductDetail[] = productsData
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((product) => ({
        id: product.id,
        name: product.name,
        categoryId: product.categoryId,
        category: categoriesData.find((c) => c.id === product.categoryId)?.name ?? '',
        price: product.price,
        isActive: product.isActive,
      }));

    const ingredientLinks: ProductIngredientLink[] = productIngredientsData.map((pi) => ({
      id: pi.id,
      productId: pi.productId,
      ingredientId: pi.ingredientId,
      ingredientName: ingredients.find((ing) => ing.id === pi.ingredientId)?.name ?? 'Unknown',
      quantityUsed: pi.quantityUsed,
    }));

    const compositionLinks: IngredientCompositionLink[] = compositionsData.map((comp) => ({
      id: comp.id,
      parentIngredientId: comp.parentIngredientId,
      parentIngredientName: ingredients.find((ing) => ing.id === comp.parentIngredientId)?.name ?? 'Unknown',
      childIngredientId: comp.childIngredientId,
      childIngredientName: ingredients.find((ing) => ing.id === comp.childIngredientId)?.name ?? 'Unknown',
      quantityNeeded: comp.quantityNeeded,
    }));

    return { categories, products: productsList, productIngredients: ingredientLinks, compositions: compositionLinks };
  }

  async createProduct({ name, categoryId, price }: CreateProductPayload): Promise<void> {
    const db = await getDb();
    const existing = await db.products
      .where('name')
      .equals(name)
      .count();

    if (existing > 0) {
      return;
    }

    await db.products.add({
      id: generateId(),
      name,
      categoryId: categoryId ?? null,
      price,
      isActive: true,
    });
  }

  async updateProduct({ id, ...payload }: UpdateProductPayload): Promise<void> {
    const db = await getDb();
    const product = await db.products.get(id);
    if (!product) {
      return;
    }
    product.name = payload.name ?? product.name;
    product.categoryId = payload.categoryId !== undefined ? payload.categoryId : product.categoryId;
    product.price = payload.price ?? product.price;
    product.isActive = payload.isActive !== undefined ? payload.isActive : product.isActive;

    await db.products.update(id, product);
  }

  async setProductIngredient({ productId, ingredientId, quantityUsed }: SetProductIngredientPayload): Promise<void> {
    if (quantityUsed <= 0) {
      return;
    }
    const db = await getDb();
    const existing = await db.productIngredients
      .where('[productId+ingredientId]')
      .equals([productId, ingredientId])
      .first();

    if (existing) {
      await db.productIngredients.update(existing.id, { quantityUsed });
    } else {
      await db.productIngredients.add({
        id: generateId(),
        productId,
        ingredientId,
        quantityUsed,
      });
    }
  }

  async removeProductIngredient({ productId, ingredientId }: RemoveProductIngredientPayload): Promise<void> {
    const db = await getDb();
    const existing = await db.productIngredients
      .where('[productId+ingredientId]')
      .equals([productId, ingredientId])
      .first();

    if (existing) {
      await db.productIngredients.delete(existing.id);
    }
  }

  async setComposition({ parentIngredientId, childIngredientId, quantityNeeded }: SetCompositionPayload): Promise<void> {
    if (parentIngredientId === childIngredientId) {
      console.warn('[products] Rejecting self-reference composition.');
      return;
    }
    if (quantityNeeded <= 0) {
      return;
    }
    const db = await getDb();
    const existing = await db.ingredientCompositions
      .where('[parentIngredientId+childIngredientId]')
      .equals([parentIngredientId, childIngredientId])
      .first();

    if (existing) {
      await db.ingredientCompositions.update(existing.id, { quantityNeeded });
    } else {
      await db.ingredientCompositions.add({
        id: generateId(),
        parentIngredientId,
        childIngredientId,
        quantityNeeded,
      });
    }
  }

  async removeComposition({ parentIngredientId, childIngredientId }: RemoveCompositionPayload): Promise<void> {
    const db = await getDb();
    const existing = await db.ingredientCompositions
      .where('[parentIngredientId+childIngredientId]')
      .equals([parentIngredientId, childIngredientId])
      .first();

    if (existing) {
      await db.ingredientCompositions.delete(existing.id);
    }
  }
}
