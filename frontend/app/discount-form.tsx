import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DateInput } from '@/components/ui/date-input';
import { FormScreen } from '@/components/ui/form-screen';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useProductsStore } from '@/stores/products';
import { useSalesStore } from '@/stores/sales';
import type { DiscountType } from '@/types/types';
import { validateForm } from '@/utils/validation';
import { discountFormSchema } from '@/utils/validation/schemas';

type DiscountScope = 'global' | 'product';

export default function DiscountFormScreen() {
    const router = useRouter();
    const palette = useAppColors();
    const params = useLocalSearchParams<{ id?: string; scope?: string }>();

    const { discounts, createDiscount, updateDiscount } = useSalesStore();
    const { products, hydrate: hydrateProducts } = useProductsStore();

    const editingDiscount = params.id ? discounts.find((d) => d.id === params.id) : undefined;
    const isEdit = editingDiscount !== undefined;
    const initialScope: DiscountScope =
        editingDiscount?.scope ??
        (params.scope === 'product' ? 'product' : 'global');

    const [name, setName] = useState(editingDiscount?.name ?? '');
    const [type, setType] = useState<DiscountType>(editingDiscount?.type ?? 'percentage');
    const [value, setValue] = useState(editingDiscount ? String(editingDiscount.value) : '');
    const [productId, setProductId] = useState<string | null>(editingDiscount?.productId ?? null);
    const [startsAt, setStartsAt] = useState<number | null>(
        editingDiscount?.startsAt ?? Math.floor(Date.now() / 1000),
    );
    const [endsAt, setEndsAt] = useState<number | null>(editingDiscount?.endsAt ?? null);
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    useFocusEffect(
        useCallback(() => {
            void hydrateProducts();
        }, [hydrateProducts]),
    );

    useEffect(() => {
        if (!editingDiscount) return;
        setName(editingDiscount.name);
        setType(editingDiscount.type);
        setValue(String(editingDiscount.value));
        setProductId(editingDiscount.productId ?? null);
        setStartsAt(editingDiscount.startsAt ?? Math.floor(Date.now() / 1000));
        setEndsAt(editingDiscount.endsAt ?? null);
        setMessage('');
    }, [editingDiscount]);

    const typeItems = [
        { label: t('products.discounts.typePercentage'), value: 'percentage' as DiscountType },
        { label: t('products.discounts.typeFixed'), value: 'fixed' as DiscountType },
    ];

    const productItems = products.map((p) => ({ label: p.name, value: p.id }));

    async function submit() {
        const result = validateForm(discountFormSchema, {
            name,
            scope: initialScope,
            productId: initialScope === 'product' ? (productId ?? '') : undefined,
            type,
            value,
        });
        if (!result.ok) {
            setErrors(result.errors);
            if (result.errors.productId) setMessage(t('products.discounts.productInvalid'));
            return;
        }
        if (initialScope === 'product' && !startsAt) {
            setMessage(t('products.discounts.productInvalid'));
            return;
        }
        setErrors({});
        setMessage('');
        const numericValue = result.data.value;
        if (isEdit && editingDiscount) {
            await updateDiscount({
                id: editingDiscount.id,
                name: name.trim(),
                scope: initialScope,
                productId: initialScope === 'product' ? productId : null,
                type,
                value: numericValue,
                startsAt: initialScope === 'product' ? (startsAt ?? 0) : 0,
                endsAt: initialScope === 'product' ? endsAt : null,
                isActive: editingDiscount.isActive,
            });
        } else {
            await createDiscount({
                name: name.trim(),
                scope: initialScope,
                productId: initialScope === 'product' ? productId : null,
                type,
                value: numericValue,
                startsAt: initialScope === 'product' ? (startsAt ?? 0) : 0,
                endsAt: initialScope === 'product' ? endsAt : null,
                isActive: true,
            });
        }
        router.back();
    }

    return (
        <FormScreen>
            <ThemedText type="title">
                {isEdit ? t('products.discounts.title') : t('products.discounts.create')}
            </ThemedText>

            {message ? (
                <ThemedCard style={styles.card}>
                    <ThemedText style={{ color: palette.danger }}>{message}</ThemedText>
                </ThemedCard>
            ) : null}

            <ThemedCard style={styles.card}>
                {initialScope === 'product' ? (
                    <View style={styles.fieldGroup}>
                        <View style={styles.labelRow}>
                            <Ionicons name="fast-food-outline" size={14} color={palette.mutedText} />
                            <ThemedText style={styles.smallLabel}>{t('products.discounts.selectProduct')}</ThemedText>
                        </View>
                        <ThemedSelect
                            value={productId ?? ''}
                            onValueChange={(v) => setProductId(v || null)}
                            items={productItems}
                            placeholder={t('products.discounts.selectProduct')}
                            modalTitle={t('products.discounts.selectProduct')}
                        />
                    </View>
                ) : null}

                <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                        <Ionicons name="text-outline" size={14} color={palette.mutedText} />
                        <ThemedText style={styles.smallLabel}>{t('products.discounts.namePlaceholder')}</ThemedText>
                    </View>
                    <ThemedInput
                        value={name}
                        onChangeText={setName}
                        placeholder={t('products.discounts.namePlaceholder')}
                        error={errors.name}
                    />
                </View>

                <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                        <Ionicons name="calculator-outline" size={14} color={palette.mutedText} />
                        <ThemedText style={styles.smallLabel}>{t('products.discounts.valuePlaceholder')}</ThemedText>
                    </View>
                    <ThemedSelect
                        value={type}
                        onValueChange={(v) => setType(v as DiscountType)}
                        items={typeItems}
                    />
                    <ThemedInput
                        value={value}
                        onChangeText={setValue}
                        keyboardType="decimal-pad"
                        placeholder={t('products.discounts.valuePlaceholder')}
                        error={errors.value}
                    />
                </View>

                {initialScope === 'product' ? (
                    <View style={styles.fieldGroup}>
                        <View style={styles.labelRow}>
                            <Ionicons name="calendar-outline" size={14} color={palette.mutedText} />
                            <ThemedText style={styles.smallLabel}>{t('productForm.discounts.startDate')}</ThemedText>
                        </View>
                        <DateInput
                            value={startsAt}
                            onChangeValue={setStartsAt}
                            placeholder={t('productForm.discounts.startDate')}
                        />
                        <View style={styles.labelRow}>
                            <Ionicons name="calendar-outline" size={14} color={palette.mutedText} />
                            <ThemedText style={styles.smallLabel}>{t('productForm.discounts.endDate')}</ThemedText>
                        </View>
                        <DateInput
                            value={endsAt}
                            onChangeValue={setEndsAt}
                            endOfDay
                            placeholder={t('productForm.discounts.endDate')}
                        />
                    </View>
                ) : null}

                <View style={styles.actionsRow}>
                    <ThemedButton
                        style={styles.primaryButton}
                        icon="checkmark-circle"
                        label={isEdit ? t('common.saveChanges') : t('products.discounts.create')}
                        onPress={() => void submit()}
                    />
                    <ThemedButton
                        variant="secondary"
                        style={styles.secondaryButton}
                        icon="arrow-back"
                        label={t('common.back')}
                        onPress={() => router.back()}
                    />
                </View>
            </ThemedCard>
        </FormScreen>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 12,
    },
    fieldGroup: {
        gap: 6,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    smallLabel: {
        fontSize: 12,
        opacity: 0.7,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    primaryButton: {
        flex: 1,
    },
    secondaryButton: {
        flex: 1,
    },
});
