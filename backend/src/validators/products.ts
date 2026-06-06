import { z } from 'zod';
import { id, money, nameField, nonNegativeQuantity, positiveQuantity } from './rules';

const recipeItemSchema = z.object({
    ingredientId: id('ingredientId'),
    quantityUsed: positiveQuantity('quantityUsed'),
});

export const createProductSchema = z
    .object({
        name: nameField,
        categoryId: id('categoryId').optional(),
        price: money('price'),
        imageUri: z.string().trim().optional(),
        isCombo: z.boolean().optional(),
        recipe: z.array(recipeItemSchema).optional(),
        additionalIngredients: z
            .array(
                z.object({
                    ingredientId: id('ingredientId'),
                    quantityUsed: positiveQuantity('quantityUsed'),
                    additionalPrice: money('additionalPrice'),
                }),
            )
            .default([]),
    })
    .refine((p) => p.isCombo || (Array.isArray(p.recipe) && p.recipe.length > 0), {
        message: 'recipe (non-empty array) is required for non-combo products.',
        path: ['recipe'],
    });
export type CreateProductPayload = z.infer<typeof createProductSchema>;

export const addCategorySchema = z.object({ name: nameField });
export type AddCategoryPayload = z.infer<typeof addCategorySchema>;

export const setIngredientSchema = z.object({
    ingredientId: id('ingredientId'),
    quantityUsed: positiveQuantity('quantityUsed'),
});
export type SetIngredientPayload = z.infer<typeof setIngredientSchema>;

export const setAdditionalIngredientSchema = z.object({
    quantityUsed: positiveQuantity('quantityUsed'),
    additionalPrice: money('additionalPrice'),
});
export type SetAdditionalIngredientPayload = z.infer<typeof setAdditionalIngredientSchema>;

export const comboGroupSchema = z
    .object({
        name: nameField,
        minQuantity: nonNegativeQuantity('minQuantity'),
        maxQuantity: nonNegativeQuantity('maxQuantity'),
    })
    .refine((g) => g.minQuantity <= g.maxQuantity, {
        message: 'minQuantity must be less than or equal to maxQuantity.',
        path: ['maxQuantity'],
    });
export type ComboGroupPayload = z.infer<typeof comboGroupSchema>;

export const comboGroupOptionSchema = z.object({
    productId: id('productId'),
    additionalPrice: money('additionalPrice'),
    isDefault: z.boolean({ message: 'isDefault is required.' }),
});
export type ComboGroupOptionPayload = z.infer<typeof comboGroupOptionSchema>;
