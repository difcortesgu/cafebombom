import { useCallback, useState } from 'react';

import {
    createCartItemId,
    mergeCartLines,
    normalizeAdditionalIngredients,
    normalizeIngredientIds,
    type SaleFormCartItem,
} from '@/utils/cart-normalization';

type AdditionalOption = {
    ingredientName: string;
    additionalPrice: number;
};

type AdditionalOptionsByProductId = Map<string, Map<string, AdditionalOption>>;

export function useSaleCart(additionalOptionsByProductId: AdditionalOptionsByProductId) {
    const [cart, setCart] = useState<SaleFormCartItem[]>([]);

    const getCartItemUnitPrice = useCallback(
        (productId: string, basePrice: number, additionalIngredients: { ingredientId: string; quantity: number }[]) => {
            const options = additionalOptionsByProductId.get(productId) ?? new Map<string, AdditionalOption>();
            const additionalPrice = normalizeAdditionalIngredients(additionalIngredients).reduce(
                (sum, entry) => sum + (options.get(entry.ingredientId)?.additionalPrice ?? 0) * entry.quantity,
                0,
            );
            return Number((basePrice + additionalPrice).toFixed(2));
        },
        [additionalOptionsByProductId],
    );

    const addToCart = useCallback((productId: string, name: string, basePrice: number) => {
        setCart((prev) => {
            const existing = prev.find(
                (item) =>
                    item.productId === productId &&
                    !item.observation &&
                    item.removedIngredientIds.length === 0 &&
                    item.additionalIngredients.length === 0,
            );
            if (existing) {
                return prev.map((item) => (item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item));
            }
            return [
                ...prev,
                {
                    id: createCartItemId(),
                    productId,
                    name,
                    basePrice,
                    unitPrice: Number(basePrice.toFixed(2)),
                    quantity: 1,
                    observation: null,
                    removedIngredientIds: [],
                    additionalIngredients: [],
                },
            ];
        });
    }, []);

    const getProductTotalQuantity = useCallback(
        (productId: string): number => cart.filter((item) => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0),
        [cart],
    );

    const updateQty = useCallback((cartItemId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => (item.id === cartItemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
                .filter((item) => item.quantity > 0),
        );
    }, []);

    const toggleRemovedIngredient = useCallback((cartItemId: string, ingredientId: string) => {
        setCart((prev) => {
            const next = prev.map((item) => {
                if (item.id !== cartItemId) return item;
                const hasIngredient = item.removedIngredientIds.includes(ingredientId);
                return {
                    ...item,
                    removedIngredientIds: normalizeIngredientIds(
                        hasIngredient
                            ? item.removedIngredientIds.filter((id) => id !== ingredientId)
                            : [...item.removedIngredientIds, ingredientId],
                    ),
                };
            });
            return mergeCartLines(next);
        });
    }, []);

    const updateAdditionalIngredientQty = useCallback(
        (cartItemId: string, ingredientId: string, delta: number) => {
            setCart((prev) => {
                const next = prev.map((item) => {
                    if (item.id !== cartItemId) return item;
                    const currentQty = item.additionalIngredients.find((e) => e.ingredientId === ingredientId)?.quantity ?? 0;
                    const nextQty = Math.max(0, currentQty + delta);
                    const additionalIngredients = normalizeAdditionalIngredients(
                        nextQty > 0
                            ? [...item.additionalIngredients.filter((e) => e.ingredientId !== ingredientId), { ingredientId, quantity: nextQty }]
                            : item.additionalIngredients.filter((e) => e.ingredientId !== ingredientId),
                    );
                    return {
                        ...item,
                        additionalIngredients,
                        unitPrice: getCartItemUnitPrice(item.productId, item.basePrice, additionalIngredients),
                    };
                });
                return mergeCartLines(next);
            });
        },
        [getCartItemUnitPrice],
    );

    const updateObservation = useCallback((cartItemId: string, observation: string) => {
        setCart((prev) => {
            const next = prev.map((item) => {
                if (item.id !== cartItemId) return item;
                const normalized = observation.trim();
                return { ...item, observation: normalized.length > 0 ? normalized : null };
            });
            return mergeCartLines(next);
        });
    }, []);

    return {
        cart,
        setCart,
        addToCart,
        getProductTotalQuantity,
        updateQty,
        toggleRemovedIngredient,
        updateAdditionalIngredientQty,
        updateObservation,
    };
}
