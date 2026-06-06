import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { DiscountForm, type DiscountScope } from '@/components/operations/discount-form';
import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { t } from '@/i18n';
import { useProductsStore } from '@/stores/products';
import { useSalesStore } from '@/stores/sales';

export default function DiscountFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string; scope?: string }>();

    const { discounts } = useSalesStore();
    const { hydrate: hydrateProducts } = useProductsStore();

    const editingDiscount = params.id ? discounts.find((d) => d.id === params.id) : undefined;
    const isEdit = editingDiscount !== undefined;
    const initialScope: DiscountScope = params.scope === 'product' ? 'product' : 'global';

    useFocusEffect(
        useCallback(() => {
            void hydrateProducts();
        }, [hydrateProducts]),
    );

    return (
        <FormScreen>
            <ThemedText type="title">
                {isEdit ? t('products.discounts.title') : t('products.discounts.create')}
            </ThemedText>
            <DiscountForm onClose={() => router.back()} initialScope={initialScope} discount={editingDiscount} />
        </FormScreen>
    );
}
