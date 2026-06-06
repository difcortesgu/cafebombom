import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DateInput } from '@/components/ui/date-input';
import { FormFeedback } from '@/components/ui/form-feedback';
import { PanelActionRow } from '@/components/ui/panel-action-row';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useProductsStore } from '@/stores/products';
import { useSalesStore } from '@/stores/sales';
import type { Discount, DiscountType } from '@/types/types';
import { validateForm } from '@/utils/validation';
import { discountFormSchema } from '@/utils/validation/schemas';

export type DiscountScope = 'global' | 'product';

export type DiscountFormProps = {
    onClose: () => void;
    initialScope?: DiscountScope;
    discount?: Discount;
};

export function DiscountForm({ onClose, initialScope = 'global', discount }: DiscountFormProps) {
    const palette = useAppColors();
    const { createDiscount, updateDiscount } = useSalesStore();
    const { products } = useProductsStore();

    const isEdit = discount !== undefined;
    const scope: DiscountScope = discount?.scope ?? initialScope;

    const [name, setName] = useState(discount?.name ?? '');
    const [type, setType] = useState<DiscountType>(discount?.type ?? 'percentage');
    const [value, setValue] = useState(discount ? String(discount.value) : '');
    const [productId, setProductId] = useState<string | null>(discount?.productId ?? null);
    const [startsAt, setStartsAt] = useState<number | null>(discount?.startsAt ?? Math.floor(Date.now() / 1000));
    const [endsAt, setEndsAt] = useState<number | null>(discount?.endsAt ?? null);
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setName(discount?.name ?? '');
        setType(discount?.type ?? 'percentage');
        setValue(discount ? String(discount.value) : '');
        setProductId(discount?.productId ?? null);
        setStartsAt(discount?.startsAt ?? Math.floor(Date.now() / 1000));
        setEndsAt(discount?.endsAt ?? null);
        setMessage('');
    }, [discount]);

    const typeItems = [
        { label: t('products.discounts.typePercentage'), value: 'percentage' as DiscountType },
        { label: t('products.discounts.typeFixed'), value: 'fixed' as DiscountType },
    ];

    const productItems = products.map((p) => ({ label: p.name, value: p.id }));

    async function submit() {
        const result = validateForm(discountFormSchema, {
            name,
            scope,
            productId: scope === 'product' ? (productId ?? '') : undefined,
            type,
            value,
        });
        if (!result.ok) {
            setErrors(result.errors);
            if (result.errors.productId) {
                setMessage(t('products.discounts.productInvalid'));
            }
            return;
        }
        if (scope === 'product' && !startsAt) {
            setMessage(t('products.discounts.productInvalid'));
            return;
        }
        setErrors({});
        setMessage('');
        const numericValue = result.data.value;
        if (isEdit && discount) {
            await updateDiscount({
                id: discount.id,
                name: name.trim(),
                scope,
                productId: scope === 'product' ? productId : null,
                type,
                value: numericValue,
                startsAt: scope === 'product' ? (startsAt ?? 0) : 0,
                endsAt: scope === 'product' ? endsAt : null,
                isActive: discount.isActive,
            });
        } else {
            await createDiscount({
                name: name.trim(),
                scope,
                productId: scope === 'product' ? productId : null,
                type,
                value: numericValue,
                startsAt: scope === 'product' ? (startsAt ?? 0) : 0,
                endsAt: scope === 'product' ? endsAt : null,
                isActive: true,
            });
        }
        onClose();
    }

    return (
        <>
            <FormFeedback message={message} />

            {scope === 'product' ? (
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
                    numeric={type === 'percentage' ? 'percent' : 'currency'}
                    placeholder={t('products.discounts.valuePlaceholder')}
                    error={errors.value}
                />
            </View>

            {scope === 'product' ? (
                <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                        <Ionicons name="calendar-outline" size={14} color={palette.mutedText} />
                        <ThemedText style={styles.smallLabel}>{t('productForm.discounts.startDate')}</ThemedText>
                    </View>
                    <DateInput value={startsAt} onChangeValue={setStartsAt} placeholder={t('productForm.discounts.startDate')} />
                    <View style={styles.labelRow}>
                        <Ionicons name="calendar-outline" size={14} color={palette.mutedText} />
                        <ThemedText style={styles.smallLabel}>{t('productForm.discounts.endDate')}</ThemedText>
                    </View>
                    <DateInput value={endsAt} onChangeValue={setEndsAt} endOfDay placeholder={t('productForm.discounts.endDate')} />
                </View>
            ) : null}

            <View style={styles.actionsRow}>
                <PanelActionRow
                    primaryLabel={isEdit ? t('common.saveChanges') : t('products.discounts.create')}
                    secondaryLabel={t('common.back')}
                    onPrimaryPress={() => void submit()}
                    onSecondaryPress={onClose}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    fieldGroup: {
        gap: 8,
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
});
