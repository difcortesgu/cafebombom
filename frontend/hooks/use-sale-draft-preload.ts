import { useEffect, useState } from 'react';

import { salesService } from '@/services';
import type { Discount, Product, RestaurantTable, Sale } from '@/types/types';
import { mapDraftItemsToCart, type SaleFormCartItem } from '@/utils/cart-normalization';

type UseSaleDraftPreloadParams = {
    editingOrderId: string | null;
    isDraftInitialized: boolean;
    setIsDraftInitialized: (value: boolean) => void;
    selectedDraftSale: Sale | null;
    tables: RestaurantTable[];
    discounts: Discount[];
    products: Product[];
    setCart: (value: SaleFormCartItem[]) => void;
    setSelectedTableId: (value: string | null) => void;
    setSelectedGlobalDiscountId: (value: string) => void;
};

export function useSaleDraftPreload({
    editingOrderId,
    isDraftInitialized,
    setIsDraftInitialized,
    selectedDraftSale,
    tables,
    discounts,
    products,
    setCart,
    setSelectedTableId,
    setSelectedGlobalDiscountId,
}: UseSaleDraftPreloadParams) {
    const [loadingDraft, setLoadingDraft] = useState(false);

    useEffect(() => {
        if (!editingOrderId || isDraftInitialized || !selectedDraftSale) return;

        let isMounted = true;

        const preloadDraft = async () => {
            setLoadingDraft(true);
            try {
                const [items, pricingSummary] = await Promise.all([
                    salesService.getSaleItems(editingOrderId),
                    salesService.getSalePricingSummary(editingOrderId),
                ]);

                if (!isMounted) return;

                setCart(
                    mapDraftItemsToCart(items, (productId) => {
                        const product = products.find((p) => p.id === productId);
                        return product ? Number(product.price) : null;
                    }),
                );

                const matchedTable = tables.find((table) => table.name === selectedDraftSale.table_name) ?? null;
                setSelectedTableId(matchedTable?.id ?? null);

                const discountName = pricingSummary?.global_discount_name ?? null;
                const matchedGlobalDiscount = discountName
                    ? discounts.find((d) => d.scope === 'global' && d.name === discountName)
                    : null;
                setSelectedGlobalDiscountId(matchedGlobalDiscount?.id ?? '');
                setIsDraftInitialized(true);
            } finally {
                if (isMounted) setLoadingDraft(false);
            }
        };

        void preloadDraft();
        return () => {
            isMounted = false;
        };
    }, [
        discounts,
        editingOrderId,
        isDraftInitialized,
        products,
        selectedDraftSale,
        setCart,
        setIsDraftInitialized,
        setSelectedGlobalDiscountId,
        setSelectedTableId,
        tables,
    ]);

    return { loadingDraft };
}
