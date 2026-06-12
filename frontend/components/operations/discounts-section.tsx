import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { EntityCard } from '@/components/ui/entity-card';
import { useMeasuredGrid } from '@/hooks/use-measured-grid';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useProductsStore } from '@/stores/products';
import { useSalesStore } from '@/stores/sales';
import type { Discount } from '@/types/types';
import { money } from '@/utils/money';

type DiscountsSectionProps = {
    gap: number;
    onAddGlobal: () => void;
    onAddProduct: () => void;
    onEdit: (discount: Discount) => void;
};

const formatDiscountDate = (unix: number | null): string => {
    if (!unix) return t('productForm.discounts.open');
    const date = new Date(unix * 1000);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatSchedule = (discount: Discount): string | null => {
    const parts: string[] = [];
    if (discount.daysOfWeek?.length) {
        parts.push(discount.daysOfWeek.map((d) => t(`products.discounts.weekdayShort.${d}`)).join(', '));
    }
    if (discount.daysOfMonth?.length) {
        parts.push(discount.daysOfMonth.join(', '));
    }
    if (discount.hourStart != null && discount.hourEnd != null) {
        parts.push(`${String(discount.hourStart).padStart(2, '0')}–${String(discount.hourEnd).padStart(2, '0')}h`);
    }
    return parts.length ? parts.join(' · ') : null;
};

function DiscountCard({ discount, productName, cardWidth, onToggle, onEdit, onDelete }: {
    discount: Discount;
    productName?: string;
    cardWidth: number | undefined;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const palette = useAppColors();
    const valueLabel = discount.type === 'percentage' ? `${discount.value}%` : money(discount.value);

    return (
        <EntityCard
            width={cardWidth}
            title={discount.name}
            titleNumberOfLines={1}
            style={{ borderColor: discount.isActive ? palette.border : `${palette.border}66`, opacity: discount.isActive ? 1 : 0.6 }}
            info={(
                <View style={[styles.valueBadge, { backgroundColor: `${palette.tint}22`, borderColor: `${palette.tint}44` }]}>
                    <ThemedText style={[styles.valueLabel, { color: palette.tint }]}>{valueLabel}</ThemedText>
                </View>
            )}
            actions={[
                {
                    icon: discount.isActive ? 'pause-circle-outline' : 'checkmark-circle-outline',
                    label: discount.isActive ? t('products.discounts.deactivate') : t('products.discounts.activate'),
                    tone: discount.isActive ? 'warning' : 'success',
                    onPress: onToggle,
                },
                {
                    icon: 'create-outline',
                    label: t('products.list.edit'),
                    style: { borderColor: `${palette.border}88` },
                    onPress: onEdit,
                },
                {
                    icon: 'trash-outline',
                    label: t('products.discounts.delete'),
                    tone: 'danger',
                    collapseOnNarrow: true,
                    onPress: onDelete,
                },
            ]}
        >
            {productName ? (
                <View style={styles.metaRow}>
                    <Ionicons name="fast-food-outline" size={12} color={palette.mutedText} />
                    <ThemedText style={styles.metaText} numberOfLines={1}>{productName}</ThemedText>
                </View>
            ) : null}
            {discount.startsAt || discount.endsAt ? (
                <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={12} color={palette.mutedText} />
                    <ThemedText style={styles.metaText} numberOfLines={1}>
                        {formatDiscountDate(discount.startsAt)} {t('productForm.discounts.to')} {formatDiscountDate(discount.endsAt)}
                    </ThemedText>
                </View>
            ) : null}
            {formatSchedule(discount) ? (
                <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={12} color={palette.mutedText} />
                    <ThemedText style={styles.metaText} numberOfLines={1}>{formatSchedule(discount)}</ThemedText>
                </View>
            ) : null}
        </EntityCard>
    );
}

export function DiscountsSection({ gap, onAddGlobal, onAddProduct, onEdit }: DiscountsSectionProps) {
    const palette = useAppColors();
    const { onLayout, cardWidth } = useMeasuredGrid(gap);
    const { discounts, updateDiscount, deleteDiscount } = useSalesStore();
    const { products } = useProductsStore();

    const globalDiscounts = discounts.filter((d) => d.scope === 'global');
    const productDiscounts = discounts.filter((d) => d.scope === 'product');

    const handleToggle = (discount: Discount) =>
        void updateDiscount({
            id: discount.id,
            name: discount.name,
            scope: discount.scope,
            productId: discount.productId,
            type: discount.type,
            value: discount.value,
            startsAt: discount.startsAt,
            endsAt: discount.endsAt,
            daysOfWeek: discount.daysOfWeek,
            daysOfMonth: discount.daysOfMonth,
            hourStart: discount.hourStart,
            hourEnd: discount.hourEnd,
            isActive: !discount.isActive,
        }).then(() => toast.success(discount.isActive ? `Descuento "${discount.name}" deshabilitado.` : `Descuento "${discount.name}" habilitado.`));

    return (
        <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">{t('products.discounts.title')}</ThemedText>

            <View style={styles.subSection}>
                <View style={styles.subHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>{t('products.discounts.title')}</ThemedText>
                    <ThemedButton icon="add-circle-outline" size="sm" label={t('products.discounts.create')} onPress={onAddGlobal} />
                </View>
                {globalDiscounts.length === 0 ? (
                    <ThemedText style={styles.muted}>{t('products.discounts.subtitle')}</ThemedText>
                ) : (
                    <View style={[styles.grid, { gap }]} onLayout={onLayout}>
                        {globalDiscounts.map((discount) => (
                            <DiscountCard
                                key={discount.id}
                                discount={discount}
                                cardWidth={cardWidth}
                                onToggle={() => handleToggle(discount)}
                                onEdit={() => onEdit(discount)}
                                onDelete={() => void (async () => { try { await deleteDiscount(discount.id); toast.success(`Descuento "${discount.name}" eliminado.`); } catch { toast.error('Ocurrió un error. Intenta de nuevo.'); } })()}
                            />
                        ))}
                    </View>
                )}
            </View>

            <View style={[styles.divider, { borderTopColor: palette.border }]} />

            <View style={styles.subSection}>
                <View style={styles.subHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>{t('products.discounts.productSection')}</ThemedText>
                    <ThemedButton icon="add-circle-outline" size="sm" label={t('products.discounts.createProduct')} onPress={onAddProduct} />
                </View>
                {productDiscounts.length === 0 ? (
                    <ThemedText style={styles.muted}>{t('products.discounts.productSubtitle')}</ThemedText>
                ) : (
                    <View style={[styles.grid, { gap }]} onLayout={onLayout}>
                        {productDiscounts.map((discount) => {
                            const productName = products.find((p) => p.id === discount.productId)?.name;
                            return (
                                <DiscountCard
                                    key={discount.id}
                                    discount={discount}
                                    productName={productName}
                                    cardWidth={cardWidth}
                                    onToggle={() => handleToggle(discount)}
                                    onEdit={() => onEdit(discount)}
                                    onDelete={() => void (async () => { try { await deleteDiscount(discount.id); toast.success(`Descuento "${discount.name}" eliminado.`); } catch { toast.error('Ocurrió un error. Intenta de nuevo.'); } })()}
                                />
                            );
                        })}
                    </View>
                )}
            </View>
        </ThemedCard>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 10,
    },
    subSection: {
        gap: 8,
    },
    subHeader: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    sectionLabel: {
        fontSize: 14,
        flex: 1,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    valueBadge: {
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    valueLabel: {
        fontSize: 12,
        fontWeight: '700',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        opacity: 0.7,
        flex: 1,
    },
    divider: {
        borderTopWidth: 1,
        marginVertical: 2,
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
});
