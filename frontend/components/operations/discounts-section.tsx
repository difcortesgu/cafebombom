import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useProductsStore } from '@/stores/products';
import { useSalesStore } from '@/stores/sales';
import type { Discount } from '@/types/types';

type DiscountsSectionProps = {
    cardWidth: number;
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

function DiscountCard({ discount, productName, cardWidth, onToggle, onEdit, onDelete }: {
    discount: Discount;
    productName?: string;
    cardWidth: number;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const palette = useAppColors();
    const valueLabel = discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value.toFixed(2)}`;

    return (
        <View style={[styles.discountCard, { width: cardWidth, borderColor: discount.isActive ? palette.border : `${palette.border}66` }]}>
            <View style={[styles.cardInfo, !discount.isActive && { opacity: 0.45 }]}>
                <View style={styles.cardNameRow}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.cardName}>
                        {discount.name}
                    </ThemedText>
                    <View style={[styles.valueBadge, { backgroundColor: `${palette.tint}22`, borderColor: `${palette.tint}44` }]}>
                        <ThemedText style={[styles.valueLabel, { color: palette.tint }]}>{valueLabel}</ThemedText>
                    </View>
                </View>
                {productName ? (
                    <View style={styles.metaRow}>
                        <Ionicons name="fast-food-outline" size={12} color={palette.mutedText} />
                        <ThemedText style={styles.metaText} numberOfLines={1}>{productName}</ThemedText>
                    </View>
                ) : null}
                {discount.scope === 'product' ? (
                    <View style={styles.metaRow}>
                        <Ionicons name="calendar-outline" size={12} color={palette.mutedText} />
                        <ThemedText style={styles.metaText} numberOfLines={1}>
                            {formatDiscountDate(discount.startsAt)} {t('productForm.discounts.to')} {formatDiscountDate(discount.endsAt)}
                        </ThemedText>
                    </View>
                ) : null}
            </View>

            <View style={styles.cardActions}>
                <ThemedButton
                    variant="secondary"
                    style={[
                        styles.toggleButton,
                        {
                            borderColor: discount.isActive ? palette.danger : palette.success,
                            backgroundColor: discount.isActive ? `${palette.danger}18` : `${palette.success}18`,
                        },
                    ]}
                    icon={discount.isActive ? 'pause-circle-outline' : 'checkmark-circle-outline'}
                    iconColor={discount.isActive ? palette.danger : palette.success}
                    labelStyle={{ color: discount.isActive ? palette.danger : palette.success }}
                    label={discount.isActive ? t('products.discounts.deactivate') : t('products.discounts.activate')}
                    onPress={onToggle}
                />
                <ThemedButton
                    variant="secondary"
                    style={[styles.editButton, { borderColor: `${palette.border}88` }]}
                    icon="create-outline"
                    label={t('products.list.edit')}
                    onPress={onEdit}
                />
                <ThemedButton
                    variant="secondary"
                    tone="danger"
                    style={styles.editButton}
                    icon="trash-outline"
                    label={t('products.discounts.delete')}
                    onPress={onDelete}
                />
            </View>
        </View>
    );
}

export function DiscountsSection({ cardWidth, gap, onAddGlobal, onAddProduct, onEdit }: DiscountsSectionProps) {
    const palette = useAppColors();
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
            isActive: !discount.isActive,
        });

    return (
        <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">{t('products.discounts.title')}</ThemedText>

            <View style={styles.subSection}>
                <View style={styles.subHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>{t('products.discounts.title')}</ThemedText>
                    <ThemedButton icon="add-circle-outline" label={t('products.discounts.create')} onPress={onAddGlobal} />
                </View>
                {globalDiscounts.length === 0 ? (
                    <ThemedText style={styles.muted}>{t('products.discounts.subtitle')}</ThemedText>
                ) : (
                    <View style={[styles.grid, { gap }]}>
                        {globalDiscounts.map((discount) => (
                            <DiscountCard
                                key={discount.id}
                                discount={discount}
                                cardWidth={cardWidth}
                                onToggle={() => handleToggle(discount)}
                                onEdit={() => onEdit(discount)}
                                onDelete={() => void deleteDiscount(discount.id)}
                            />
                        ))}
                    </View>
                )}
            </View>

            <View style={[styles.divider, { borderTopColor: palette.border }]} />

            <View style={styles.subSection}>
                <View style={styles.subHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>{t('products.discounts.productSection')}</ThemedText>
                    <ThemedButton icon="add-circle-outline" label={t('products.discounts.createProduct')} onPress={onAddProduct} />
                </View>
                {productDiscounts.length === 0 ? (
                    <ThemedText style={styles.muted}>{t('products.discounts.productSubtitle')}</ThemedText>
                ) : (
                    <View style={[styles.grid, { gap }]}>
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
                                    onDelete={() => void deleteDiscount(discount.id)}
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
    discountCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        gap: 10,
    },
    cardInfo: {
        gap: 5,
    },
    cardNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    cardName: {
        flex: 1,
        minWidth: 0,
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
    cardActions: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 7,
        paddingHorizontal: 10,
    },
    editButton: {
        borderRadius: 10,
        paddingVertical: 7,
        paddingHorizontal: 10,
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
