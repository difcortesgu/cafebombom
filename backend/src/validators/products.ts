import type { ProductAdditionalIngredientInput, ProductRecipeInput } from '../types/products';
import type { ValidationResult } from './types';

export type CreateProductPayload = {
    name: string;
    categoryId: string | undefined;
    price: number;
    imageUri: string | undefined;
    recipe: [ProductRecipeInput, ...ProductRecipeInput[]];
    additionalIngredients: ProductAdditionalIngredientInput[];
};

export function validateCreateProduct(body: Record<string, unknown>): ValidationResult<CreateProductPayload> {
    const { name, categoryId, price, imageUri, recipe, additionalIngredients } = body;
    if (!name || price == null || !Array.isArray(recipe) || recipe.length === 0) {
        return { valid: false, error: 'name, price, and recipe (non-empty array) are required.' };
    }
    return {
        valid: true,
        data: {
            name: String(name),
            categoryId: categoryId != null ? String(categoryId) : undefined,
            price: Number(price),
            imageUri: imageUri != null ? String(imageUri) : undefined,
            recipe: recipe as [ProductRecipeInput, ...ProductRecipeInput[]],
            additionalIngredients: Array.isArray(additionalIngredients)
                ? (additionalIngredients as ProductAdditionalIngredientInput[])
                : [],
        },
    };
}

export type AddCategoryPayload = { name: string };

export function validateAddCategory(body: Record<string, unknown>): ValidationResult<AddCategoryPayload> {
    const { name } = body;
    if (!name) {
        return { valid: false, error: 'name is required.' };
    }
    return { valid: true, data: { name: String(name) } };
}

export type SetIngredientPayload = { ingredientId: string; quantityUsed: number };

export function validateSetIngredient(body: Record<string, unknown>): ValidationResult<SetIngredientPayload> {
    const { ingredientId, quantityUsed } = body;
    if (!ingredientId || quantityUsed == null) {
        return { valid: false, error: 'ingredientId and quantityUsed are required.' };
    }
    return { valid: true, data: { ingredientId: String(ingredientId), quantityUsed: Number(quantityUsed) } };
}

export type SetAdditionalIngredientPayload = {
    ingredientId: string;
    quantityUsed: number;
    additionalPrice: number;
};

export function validateSetAdditionalIngredient(
    params: Record<string, unknown>,
    body: Record<string, unknown>,
): ValidationResult<SetAdditionalIngredientPayload> {
    const { ingredientId } = params;
    const { quantityUsed, additionalPrice } = body;
    if (!ingredientId || quantityUsed == null || additionalPrice == null) {
        return { valid: false, error: 'ingredientId, quantityUsed, and additionalPrice are required.' };
    }
    return {
        valid: true,
        data: {
            ingredientId: String(ingredientId),
            quantityUsed: Number(quantityUsed),
            additionalPrice: Number(additionalPrice),
        },
    };
}
