import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DateInput } from '@/components/ui/date-input';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useProductsStore } from '@/stores/products';
import { useSalesStore } from '@/stores/sales';
import type { Discount, DiscountType } from '@/types/types';

type DiscountScope = 'global' | 'product';

type DiscountPanelFormProps = {
    onClose: () => void;
    initialScope?: DiscountScope;
    discount?: Discount;
};

export function DiscountPanelForm({ onClose, initialScope = 'global', discount }: DiscountPanelFormProps) {
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

    useEffect(() => {
        setName(discount?.name ?? '');
        setType(discount?.type ?? 'percentage');
        setValue(discount ? String(discount.value) : '');
        setProductId(discount?.productId ?? null);
        setStartsAt(discount?.startsAt ?? Math.floor(Date.now() / 1000));
        setEndsAt(discount?.endsAt ?? null);
        setMessage('');
    }, [discount]); // eslint-disable-line react-hooks/exhaustive-deps

    const typeItems = [
        { label: t('products.discounts.typePercentage'), value: 'percentage' as DiscountType },
        { label: t('products.discounts.typeFixed'), value: 'fixed' as DiscountType },
    ];

    const productItems = products.map((p) => ({ label: p.name, value: p.id }));

    async function submit() {
        const numericValue = Number(value);
        if (!name.trim() || !Number.isFinite(numericValue) || numericValue <= 0) {
            setMessage(scope === 'global' ? t('products.discounts.invalid') : t('products.discounts.productInvalid'));
            return;
        }
        if (scope === 'product' && (!productId || !startsAt)) {
            setMessage(t('products.discounts.productInvalid'));
            return;
        }
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
            <View style={[styles.panelHeader, { borderBottomColor: palette.border }]}>
                <View style={styles.panelHeaderTitle}>
                    <Ionicons name="pricetag-outline" size={20} color={palette.tint} />
                    <ThemedText type="subtitle">
                        {isEdit ? t('products.discounts.title') : t('products.discounts.create')}
                    </ThemedText>
                </View>
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={palette.text} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
                {message ? (
                    <View style={[styles.messageBanner, { backgroundColor: `${palette.danger}22`, borderColor: `${palette.danger}44` }]}>
                        <ThemedText style={{ color: palette.danger, fontSize: 13 }}>{message}</ThemedText>
                    </View>
                ) : null}

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
                        style={styles.input}
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
                        style={styles.input}
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
            </ScrollView>

            <View style={[styles.panelFooter, { borderTopColor: palette.border }]}>
                <ThemedButton label={isEdit ? t('common.saveChanges') : t('products.discounts.create')} onPress={() => void submit()} />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    panelHeaderTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    closeButton: {
        padding: 4,
    },
    panelContent: {
        padding: 20,
        gap: 16,
    },
    messageBanner: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
    },
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
    input: {
        marginTop: 0,
    },
    panelFooter: {
        padding: 16,
        borderTopWidth: 1,
    },
});
