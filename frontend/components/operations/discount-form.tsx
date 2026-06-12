import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

import { ThemedText } from '@/components/themed-text';
import { DateInput } from '@/components/ui/date-input';
import { PanelActionRow } from '@/components/ui/panel-action-row';
import { ThemedChip } from '@/components/ui/themed-chip';
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
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>(discount?.daysOfWeek ?? []);
    const [daysOfMonth, setDaysOfMonth] = useState<number[]>(discount?.daysOfMonth ?? []);
    const [hourStart, setHourStart] = useState<number | null>(discount?.hourStart ?? null);
    const [hourEnd, setHourEnd] = useState<number | null>(discount?.hourEnd ?? null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setName(discount?.name ?? '');
        setType(discount?.type ?? 'percentage');
        setValue(discount ? String(discount.value) : '');
        setProductId(discount?.productId ?? null);
        setStartsAt(discount?.startsAt ?? Math.floor(Date.now() / 1000));
        setEndsAt(discount?.endsAt ?? null);
        setDaysOfWeek(discount?.daysOfWeek ?? []);
        setDaysOfMonth(discount?.daysOfMonth ?? []);
        setHourStart(discount?.hourStart ?? null);
        setHourEnd(discount?.hourEnd ?? null);
        setErrors({});
    }, [discount]);

    const typeItems = [
        { label: t('products.discounts.typePercentage'), value: 'percentage' as DiscountType },
        { label: t('products.discounts.typeFixed'), value: 'fixed' as DiscountType },
    ];

    const productItems = products.map((p) => ({ label: p.name, value: p.id }));

    const hourItems = [
        { label: t('products.discounts.noRestriction'), value: '' },
        ...Array.from({ length: 25 }, (_, h) => ({ label: `${String(h).padStart(2, '0')}:00`, value: String(h) })),
    ];

    function toggleDay(list: number[], day: number, setter: (v: number[]) => void) {
        setter(list.includes(day) ? list.filter((d) => d !== day) : [...list, day].sort((a, b) => a - b));
    }

    async function submit() {
        const result = validateForm(discountFormSchema, {
            name,
            scope,
            productId: scope === 'product' ? (productId ?? '') : undefined,
            type,
            value,
            hourStart,
            hourEnd,
        });
        if (!result.ok) {
            setErrors(result.errors);
            return;
        }
        if (scope === 'product' && !startsAt) {
            setErrors((e) => ({ ...e, productId: t('products.discounts.productInvalid') }));
            return;
        }
        setErrors({});
        const numericValue = result.data.value;
        const schedule = {
            startsAt: startsAt ?? 0,
            endsAt,
            daysOfWeek,
            daysOfMonth,
            hourStart,
            hourEnd,
        };
        try {
            if (isEdit && discount) {
                await updateDiscount({
                    id: discount.id,
                    name: name.trim(),
                    scope,
                    productId: scope === 'product' ? productId : null,
                    type,
                    value: numericValue,
                    ...schedule,
                    isActive: discount.isActive,
                });
                toast.success(t('toast.updated'));
            } else {
                await createDiscount({
                    name: name.trim(),
                    scope,
                    productId: scope === 'product' ? productId : null,
                    type,
                    value: numericValue,
                    ...schedule,
                    isActive: true,
                });
                toast.success(t('toast.created'));
            }
            onClose();
        } catch {
            toast.error(t('toast.error'));
        }
    }

    return (
        <>
            {scope === 'product' ? (
                <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                        <Ionicons name="fast-food-outline" size={14} color={palette.mutedText} />
                        <ThemedText style={styles.smallLabel}>{t('products.discounts.selectProduct')}</ThemedText>
                    </View>
                    <ThemedSelect
                        value={productId ?? ''}
                        onValueChange={(v) => { setProductId(v || null); setErrors((e) => ({ ...e, productId: '' })); }}
                        items={productItems}
                        placeholder={t('products.discounts.selectProduct')}
                        modalTitle={t('products.discounts.selectProduct')}
                        error={errors.productId}
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

            <View style={styles.scheduleHeader}>
                <Ionicons name="time-outline" size={16} color={palette.tint} />
                <ThemedText type="defaultSemiBold">{t('products.discounts.scheduleSection')}</ThemedText>
            </View>

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="calendar-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallLabel}>{t('productForm.discounts.startDate')}</ThemedText>
                </View>
                <DateInput
                    value={startsAt}
                    onChangeValue={setStartsAt}
                    maximumDate={endsAt}
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
                    minimumDate={startsAt}
                    placeholder={t('productForm.discounts.endDate')}
                />
            </View>

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="today-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallLabel}>{t('products.discounts.daysOfWeek')}</ThemedText>
                </View>
                <View style={styles.chipWrap}>
                    {Array.from({ length: 7 }, (_, day) => (
                        <ThemedChip
                            key={day}
                            label={t(`products.discounts.weekdayShort.${day}`)}
                            active={daysOfWeek.includes(day)}
                            onPress={() => toggleDay(daysOfWeek, day, setDaysOfWeek)}
                        />
                    ))}
                </View>
            </View>

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="calendar-number-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallLabel}>{t('products.discounts.daysOfMonth')}</ThemedText>
                </View>
                <View style={styles.chipWrap}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <ThemedChip
                            key={day}
                            label={String(day)}
                            active={daysOfMonth.includes(day)}
                            onPress={() => toggleDay(daysOfMonth, day, setDaysOfMonth)}
                            style={styles.dayChip}
                        />
                    ))}
                </View>
            </View>

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="hourglass-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallLabel}>{t('products.discounts.hourRange')}</ThemedText>
                </View>
                <View style={styles.hourRow}>
                    <View style={styles.hourField}>
                        <ThemedText style={styles.smallLabel}>{t('products.discounts.hourStart')}</ThemedText>
                        <ThemedSelect
                            value={hourStart == null ? '' : String(hourStart)}
                            onValueChange={(v) => setHourStart(v === '' ? null : Number(v))}
                            items={hourItems}
                        />
                    </View>
                    <View style={styles.hourField}>
                        <ThemedText style={styles.smallLabel}>{t('products.discounts.hourEnd')}</ThemedText>
                        <ThemedSelect
                            value={hourEnd == null ? '' : String(hourEnd)}
                            onValueChange={(v) => setHourEnd(v === '' ? null : Number(v))}
                            items={hourItems}
                            error={errors.hourEnd}
                        />
                    </View>
                </View>
            </View>

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
    scheduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    chipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    dayChip: {
        minWidth: 38,
        paddingHorizontal: 8,
    },
    hourRow: {
        flexDirection: 'row',
        gap: 8,
    },
    hourField: {
        flex: 1,
        gap: 4,
    },
});
