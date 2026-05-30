import type { SaleItemDetail } from '@/types/sales';
import type { SaleItemAdditionalIngredientInput } from '@/types/types';

export type SaleFormCartItem = {
    id: string;
    productId: string;
    name: string;
    basePrice: number;
    unitPrice: number;
    quantity: number;
    observation: string | null;
    removedIngredientIds: string[];
    additionalIngredients: SaleItemAdditionalIngredientInput[];
};

export function createCartItemId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeIngredientIds(ids: string[]): string[] {
    return Array.from(new Set(ids.map((v) => v.trim()).filter((v) => v.length > 0))).sort();
}

export function normalizeAdditionalIngredients(entries: SaleItemAdditionalIngredientInput[]): SaleItemAdditionalIngredientInput[] {
    const deduped = new Map<string, number>();
    for (const entry of entries) {
        const ingredientId = String(entry.ingredientId ?? '').trim();
        const quantity = Math.max(0, Math.floor(Number(entry.quantity ?? 0)));
        if (!ingredientId || quantity <= 0) continue;
        deduped.set(ingredientId, quantity);
    }
    return Array.from(deduped.entries())
        .map(([ingredientId, quantity]) => ({ ingredientId, quantity }))
        .sort((a, b) => a.ingredientId.localeCompare(b.ingredientId));
}

function buildCustomizationKey(
    productId: string,
    observation: string | null,
    removedIngredientIds: string[],
    additionalIngredients: SaleItemAdditionalIngredientInput[],
): string {
    const normalizedAdditional = normalizeAdditionalIngredients(additionalIngredients)
        .map((e) => `${e.ingredientId}:${e.quantity}`)
        .join(',');
    const normalizedObservation = typeof observation === 'string' ? observation.trim() : '';
    return `${productId}::${normalizedObservation}::${normalizeIngredientIds(removedIngredientIds).join(',')}::${normalizedAdditional}`;
}

export function mergeCartLines(items: SaleFormCartItem[]): SaleFormCartItem[] {
    const grouped = new Map<string, SaleFormCartItem>();
    for (const item of items) {
        const removedIngredientIds = normalizeIngredientIds(item.removedIngredientIds);
        const additionalIngredients = normalizeAdditionalIngredients(item.additionalIngredients);
        const observation = typeof item.observation === 'string' ? item.observation.trim() : '';
        const key = buildCustomizationKey(item.productId, observation, removedIngredientIds, additionalIngredients);
        const existing = grouped.get(key);
        if (existing) {
            existing.quantity += item.quantity;
            continue;
        }
        grouped.set(key, {
            ...item,
            observation: observation.length > 0 ? observation : null,
            removedIngredientIds,
            additionalIngredients,
        });
    }
    return [...grouped.values()];
}

export function mapDraftItemsToCart(
    items: SaleItemDetail[],
    getProductPrice: (productId: string) => number | null,
): SaleFormCartItem[] {
    const itemMap = new Map<string, SaleFormCartItem>();
    for (const item of items) {
        const removedIngredientIds = normalizeIngredientIds(item.removed_ingredient_ids ?? []);
        const additionalIngredients = normalizeAdditionalIngredients(item.selected_additional_ingredients ?? []);
        const observation = typeof item.observation === 'string' ? item.observation.trim() : '';
        const key = buildCustomizationKey(item.product_id, observation, removedIngredientIds, additionalIngredients);
        const existing = itemMap.get(key);
        if (existing) {
            existing.quantity += item.quantity;
        } else {
            itemMap.set(key, {
                id: createCartItemId(),
                productId: item.product_id,
                name: item.product_name,
                basePrice: Number(getProductPrice(item.product_id) ?? item.unit_price),
                unitPrice: Number(item.unit_price),
                quantity: item.quantity,
                observation: observation.length > 0 ? observation : null,
                removedIngredientIds,
                additionalIngredients,
            });
        }
    }
    return [...itemMap.values()];
}
