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

import { nextId, readWebData, updateWebData } from './storage';

export class ProductsWebService implements ProductsService {
  async getHydrationData() {
    const data = readWebData();

    const categories: CategoryOption[] = data.categories
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));

    const productsList: ProductDetail[] = data.products
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((product) => ({
        id: product.id,
        name: product.name,
        categoryId: product.categoryId,
        category: data.categories.find((c) => c.id === product.categoryId)?.name ?? '',
        price: product.price,
        isActive: product.isActive,
      }));

    const ingredientLinks: ProductIngredientLink[] = data.productIngredients.map((pi) => ({
      id: pi.id,
      productId: pi.productId,
      ingredientId: pi.ingredientId,
      ingredientName: data.ingredients.find((ing) => ing.id === pi.ingredientId)?.name ?? 'Unknown',
      quantityUsed: pi.quantityUsed,
    }));

    const compositionLinks: IngredientCompositionLink[] = data.ingredientCompositions.map((comp) => ({
      id: comp.id,
      parentIngredientId: comp.parentIngredientId,
      parentIngredientName: data.ingredients.find((ing) => ing.id === comp.parentIngredientId)?.name ?? 'Unknown',
      childIngredientId: comp.childIngredientId,
      childIngredientName: data.ingredients.find((ing) => ing.id === comp.childIngredientId)?.name ?? 'Unknown',
      quantityNeeded: comp.quantityNeeded,
    }));

    return { categories, products: productsList, productIngredients: ingredientLinks, compositions: compositionLinks };
  }

  async createProduct({ name, categoryId, price }: CreateProductPayload): Promise<void> {
    updateWebData((data) => {
      if (data.products.some((p) => p.name === name)) {
        return;
      }
      data.products.push({
        id: nextId(data, 'products'),
        name,
        categoryId: categoryId ?? null,
        price,
        isActive: true,
      });
    });
  }

  async updateProduct({ id, ...payload }: UpdateProductPayload): Promise<void> {
    updateWebData((data) => {
      const product = data.products.find((p) => p.id === id);
      if (!product) {
        return;
      }
      product.name = payload.name ?? product.name;
      product.categoryId = payload.categoryId !== undefined ? payload.categoryId : product.categoryId;
      product.price = payload.price ?? product.price;
      product.isActive = payload.isActive !== undefined ? payload.isActive : product.isActive;
    });
  }

  async setProductIngredient({ productId, ingredientId, quantityUsed }: SetProductIngredientPayload): Promise<void> {
    if (quantityUsed <= 0) {
      return;
    }
    updateWebData((data) => {
      const existing = data.productIngredients.find(
        (pi) => pi.productId === productId && pi.ingredientId === ingredientId,
      );
      if (existing) {
        existing.quantityUsed = quantityUsed;
      } else {
        data.productIngredients.push({
          id: nextId(data, 'productIngredients'),
          productId,
          ingredientId,
          quantityUsed,
        });
      }
    });
  }

  async removeProductIngredient({ productId, ingredientId }: RemoveProductIngredientPayload): Promise<void> {
    updateWebData((data) => {
      data.productIngredients = data.productIngredients.filter(
        (pi) => !(pi.productId === productId && pi.ingredientId === ingredientId),
      );
    });
  }

  async setComposition({ parentIngredientId, childIngredientId, quantityNeeded }: SetCompositionPayload): Promise<void> {
    if (parentIngredientId === childIngredientId) {
      console.warn('[products] Rejecting self-reference composition.');
      return;
    }
    if (quantityNeeded <= 0) {
      return;
    }
    updateWebData((data) => {
      const existing = data.ingredientCompositions.find(
        (c) => c.parentIngredientId === parentIngredientId && c.childIngredientId === childIngredientId,
      );
      if (existing) {
        existing.quantityNeeded = quantityNeeded;
      } else {
        data.ingredientCompositions.push({
          id: nextId(data, 'ingredientCompositions'),
          parentIngredientId,
          childIngredientId,
          quantityNeeded,
        });
      }
    });
  }

  async removeComposition({ parentIngredientId, childIngredientId }: RemoveCompositionPayload): Promise<void> {
    updateWebData((data) => {
      data.ingredientCompositions = data.ingredientCompositions.filter(
        (c) => !(c.parentIngredientId === parentIngredientId && c.childIngredientId === childIngredientId),
      );
    });
  }
}
