import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { salesService } from '@/services';
import { usePaymentMethodsStore } from '@/stores/payment-methods';
import { useSalesStore } from '@/stores/sales';
import type { SaleItemDetail, SalePricingSummary } from '@/types/sales';
import type { Sale } from '@/types/types';
import { buildFallbackPricingSummary } from '@/utils/sale-pricing';

type FullPaymentTabProps = {
    sale: Sale;
    onPaymentComplete?: () => void;
};

export function FullPaymentTab({ sale, onPaymentComplete }: FullPaymentTabProps) {
    const palette = useAppColors();
    const { markOrderPaid } = useSalesStore();
    const { methods } = usePaymentMethodsStore();
    const activeMethods = methods.filter((m) => m.is_active);
    const displayMethods = activeMethods.length > 0 ? activeMethods : methods;

    const [paymentMethodId, setPaymentMethodId] = useState<string>(sale.payment_method ?? (displayMethods[0]?.id ?? ''));
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [items, setItems] = useState<SaleItemDetail[]>([]);
    const [pricing, setPricing] = useState<SalePricingSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const alreadyPaid = Boolean(sale.paid_at);

    useEffect(() => {
        const hasSelected = displayMethods.some((m) => m.id === paymentMethodId);
        if (!hasSelected) {
            setPaymentMethodId(displayMethods[0]?.id ?? '');
        }
    }, [displayMethods, paymentMethodId]);

    useEffect(() => {
        setLoading(true);
        Promise.all([salesService.getSaleItems(sale.id), salesService.getSalePricingSummary(sale.id)])
            .then(([loadedItems, loadedPricing]) => {
                setItems(loadedItems);
                setPricing(loadedPricing ?? buildFallbackPricingSummary(sale, loadedItems));
            })
            .finally(() => setLoading(false));
    }, [sale]);

    const handleConfirm = async () => {
        if (confirmBusy || alreadyPaid) return;
        setConfirmBusy(true);
        try {
            await markOrderPaid(sale.id, paymentMethodId);
            onPaymentComplete?.();
        } finally {
            setConfirmBusy(false);
        }
    };

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {alreadyPaid ? (
                <View style={[styles.paidBadge, { backgroundColor: `${palette.tint}20`, borderColor: palette.tint }]}>
                    <ThemedText style={[styles.paidBadgeText, { color: palette.tint }]}>{t('sales.payment.paid')}</ThemedText>
                </View>
            ) : (
                <>
                    {loading ? (
                        <ThemedText style={styles.label}>{t('sales.loadingProducts')}</ThemedText>
                    ) : (
                        <>
                            {items.length > 0 && (
                                <View>
                                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                                        {t('sales.items')}
                                    </ThemedText>
                                    {items.map((item) => (
                                        <View key={item.id} style={[styles.itemRow, { borderColor: palette.border }]}>
                                            <View style={styles.itemInfo}>
                                                <ThemedText style={styles.itemName}>{item.product_name}</ThemedText>
                                                <ThemedText style={styles.itemMeta}>x{item.quantity}</ThemedText>
                                            </View>
                                            <ThemedText style={styles.itemPrice}>${Number(item.final_line_total ?? 0).toFixed(2)}</ThemedText>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {pricing && (
                                <View style={[styles.pricingSection, { borderColor: palette.border }]}>
                                    <View style={styles.pricingRow}>
                                        <ThemedText style={styles.pricingLabel}>{t('sales.pricing.subtotal')}</ThemedText>
                                        <ThemedText>${pricing.subtotal.toFixed(2)}</ThemedText>
                                    </View>

                                    {pricing.item_discount_total > 0 && (
                                        <View style={styles.pricingRow}>
                                            <ThemedText style={styles.pricingLabel}>{t('sales.pricing.itemDiscounts')}</ThemedText>
                                            <ThemedText style={{ color: palette.tint }}>-${pricing.item_discount_total.toFixed(2)}</ThemedText>
                                        </View>
                                    )}

                                    {pricing.global_discount_amount > 0 && (
                                        <View style={styles.pricingRow}>
                                            <ThemedText style={styles.pricingLabel}>{pricing.global_discount_name || t('sales.pricing.globalDiscount')}</ThemedText>
                                            <ThemedText style={{ color: palette.tint }}>-${pricing.global_discount_amount.toFixed(2)}</ThemedText>
                                        </View>
                                    )}

                                    {pricing.order_type_surcharge > 0 && (
                                        <View style={styles.pricingRow}>
                                            <ThemedText style={styles.pricingLabel}>{t('sales.surcharge.generic')}</ThemedText>
                                            <ThemedText style={{ color: palette.danger }}>+${pricing.order_type_surcharge.toFixed(2)}</ThemedText>
                                        </View>
                                    )}

                                    <View style={[styles.pricingRow, styles.totalRow, { borderColor: palette.border }]}>
                                        <ThemedText type="defaultSemiBold" style={styles.totalLabel}>
                                            {t('sales.receipt.totalLabel')}
                                        </ThemedText>
                                        <ThemedText type="defaultSemiBold" style={styles.totalValue}>
                                            ${pricing.total.toFixed(2)}
                                        </ThemedText>
                                    </View>
                                </View>
                            )}

                            <ThemedText style={styles.label}>{t('sales.paymentMethod')}</ThemedText>
                            <View style={styles.paymentMethodsRow}>
                                {displayMethods.map((method) => (
                                    <Pressable
                                        key={method.id}
                                        style={[
                                            styles.paymentChip,
                                            { borderColor: palette.border },
                                            paymentMethodId === method.id && { backgroundColor: palette.accent, borderColor: palette.accent },
                                        ]}
                                        onPress={() => setPaymentMethodId(method.id)}
                                    >
                                        <Ionicons
                                            name={method.icon as any}
                                            size={18}
                                            color={paymentMethodId === method.id ? palette.text : palette.mutedText}
                                        />
                                        <ThemedText style={[styles.paymentChipLabel, paymentMethodId === method.id && { color: palette.text }]}>
                                            {method.name}
                                        </ThemedText>
                                    </Pressable>
                                ))}
                            </View>
                            <ThemedButton
                                label={confirmBusy ? t('sales.payment.confirming') : t('sales.payment.confirmFull')}
                                disabled={confirmBusy || !paymentMethodId}
                                onPress={() => void handleConfirm()}
                            />
                        </>
                    )}
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
    },
    container: {
        gap: 10,
        paddingBottom: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemInfo: {
        flex: 1,
        gap: 2,
    },
    itemName: {
        fontSize: 12,
        fontWeight: '500',
    },
    itemMeta: {
        fontSize: 11,
        opacity: 0.6,
    },
    itemPrice: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'right',
    },
    pricingSection: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingVertical: 8,
        paddingHorizontal: 0,
        gap: 6,
    },
    pricingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    pricingLabel: {
        fontSize: 12,
        opacity: 0.7,
    },
    totalRow: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 8,
        marginTop: 4,
    },
    totalLabel: {
        fontSize: 13,
    },
    totalValue: {
        fontSize: 16,
    },
    label: {
        fontSize: 13,
        opacity: 0.8,
    },
    paidBadge: {
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    paidBadgeText: {
        fontWeight: '700',
        fontSize: 14,
    },
    paymentMethodsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    paymentChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderRadius: 8,
    },
    paymentChipLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
});
