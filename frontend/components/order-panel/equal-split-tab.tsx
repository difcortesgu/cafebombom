import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { salesService } from '@/services';
import { usePaymentMethodsStore } from '@/stores/payment-methods';
import { useSalesStore } from '@/stores/sales';
import type { SalePricingSummary } from '@/types/sales';
import type { Sale } from '@/types/types';
import { money } from '@/utils/money';
import { buildFallbackPricingSummary } from '@/utils/sale-pricing';

type EqualPart = {
    method: string;
    confirmed: boolean;
};

type EqualSplitTabProps = {
    sale: Sale;
    tipAmount: number;
    onPaymentComplete?: () => void;
};

export function EqualSplitTab({ sale, tipAmount, onPaymentComplete }: EqualSplitTabProps) {
    const palette = useAppColors();
    const { markOrderPaid } = useSalesStore();
    const { methods } = usePaymentMethodsStore();
    const activeMethods = useMemo(() => methods.filter((m) => m.is_active), [methods]);
    const displayMethods = useMemo(
        () => (activeMethods.length > 0 ? activeMethods : methods),
        [activeMethods, methods],
    );

    const alreadyPaid = !!sale.paid_at;
    const [numParts, setNumParts] = useState(2);
    const [pricing, setPricing] = useState<SalePricingSummary | null>(null);
    const [parts, setParts] = useState<EqualPart[]>(() => [
        { method: displayMethods[0]?.id ?? '', confirmed: false },
        { method: displayMethods[0]?.id ?? '', confirmed: false },
    ]);

    useEffect(() => {
        salesService
            .getSalePricingSummary(sale.id)
            .then((p) => setPricing(p ?? buildFallbackPricingSummary(sale, [])))
            .catch(() => { });
    }, [sale]);
    const [finalizeBusy, setFinalizeBusy] = useState(false);
    const [finalized, setFinalized] = useState(alreadyPaid);

    useEffect(() => {
        setParts((prev) => {
            const next = [...prev];
            while (next.length < numParts) {
                next.push({ method: displayMethods[0]?.id ?? '', confirmed: false });
            }
            return next.slice(0, numParts).map((part) => (part.method ? part : { ...part, method: displayMethods[0]?.id ?? '' }));
        });
    }, [displayMethods, numParts]);

    const allConfirmed = parts.length > 0 && parts.every((p) => p.confirmed);
    const perPartTip = numParts > 0 ? tipAmount / numParts : 0;
    const perPartAmount = numParts > 0 ? (Number(sale.total) + tipAmount) / numParts : 0;

    const handleConfirmPart = (idx: number) => {
        setParts((prev) => prev.map((p, i) => (i === idx ? { ...p, confirmed: true } : p)));
    };

    const handleSetMethod = (idx: number, method: string) => {
        setParts((prev) => prev.map((p, i) => (i === idx ? { ...p, method } : p)));
    };

    const finalizeEqualSplit = async () => {
        if (finalizeBusy || !allConfirmed || finalized) return;
        setFinalizeBusy(true);
        const dominantMethodId = parts[0]?.method ?? (activeMethods[0]?.id ?? '');
        try {
            await markOrderPaid(sale.id, dominantMethodId, tipAmount > 0 ? tipAmount : undefined);
            setFinalized(true);
            onPaymentComplete?.();
        } finally {
            setFinalizeBusy(false);
        }
    };

    // Once every part is confirmed, finalize the payment automatically and show the receipt.
    useEffect(() => {
        if (allConfirmed && !finalized && !finalizeBusy) {
            void finalizeEqualSplit();
        }
    }, [allConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {!finalized && (
                <View style={styles.partsControl}>
                    <ThemedText style={styles.label}>{t('sales.payment.equal.parts')}</ThemedText>
                    <View style={styles.partsRow}>
                        <ThemedButton
                            label="−"
                            variant="secondary"
                            style={styles.stepBtn}
                            onPress={() => setNumParts((n) => Math.max(2, n - 1))}
                            disabled={numParts <= 2}
                        />
                        <ThemedText style={styles.partsCount}>{numParts}</ThemedText>
                        <ThemedButton
                            label="+"
                            variant="secondary"
                            style={styles.stepBtn}
                            onPress={() => setNumParts((n) => Math.min(10, n + 1))}
                            disabled={numParts >= 10}
                        />
                    </View>
                    <ThemedText style={styles.perPart}>
                        {t('sales.payment.equal.perPart')}: {money(perPartAmount)}
                    </ThemedText>
                </View>
            )}

            {pricing && (
                <View style={[styles.pricingSummary, { borderColor: palette.border }]}>
                    <View style={styles.pricingSummaryRow}>
                        <ThemedText style={styles.pricingSummaryLabel}>{t('sales.pricing.subtotal')}</ThemedText>
                        <ThemedText>{money(pricing.subtotal)}</ThemedText>
                    </View>

                    {pricing.item_discount_total > 0 && (
                        <View style={styles.pricingSummaryRow}>
                            <ThemedText style={styles.pricingSummaryLabel}>{t('sales.pricing.itemDiscounts')}</ThemedText>
                            <ThemedText style={{ color: palette.tint }}>-{money(pricing.item_discount_total)}</ThemedText>
                        </View>
                    )}

                    {pricing.global_discount_amount > 0 && (
                        <View style={styles.pricingSummaryRow}>
                            <ThemedText style={styles.pricingSummaryLabel}>{pricing.global_discount_name || t('sales.pricing.globalDiscount')}</ThemedText>
                            <ThemedText style={{ color: palette.tint }}>-{money(pricing.global_discount_amount)}</ThemedText>
                        </View>
                    )}

                    {pricing.order_type_surcharge > 0 && (
                        <View style={styles.pricingSummaryRow}>
                            <ThemedText style={styles.pricingSummaryLabel}>{t('sales.surcharge.generic')}</ThemedText>
                            <ThemedText style={{ color: palette.danger }}>+{money(pricing.order_type_surcharge)}</ThemedText>
                        </View>
                    )}

                    {tipAmount > 0 && (
                        <View style={styles.pricingSummaryRow}>
                            <ThemedText style={styles.pricingSummaryLabel}>{t('sales.tip.label')}</ThemedText>
                            <ThemedText style={{ color: palette.tint }}>+{money(tipAmount)}</ThemedText>
                        </View>
                    )}

                    <View style={[styles.pricingSummaryRow, styles.totalRow, { borderColor: palette.border }]}>
                        <ThemedText type="defaultSemiBold">{t('sales.receipt.totalLabel')}</ThemedText>
                        <ThemedText type="defaultSemiBold">{money(pricing.total + tipAmount)}</ThemedText>
                    </View>
                </View>
            )}

            {parts.map((part, idx) => (
                <View
                    key={idx}
                    style={[
                        styles.partCard,
                        { borderColor: part.confirmed ? palette.tint : palette.border },
                        part.confirmed && { backgroundColor: `${palette.tint}10` },
                    ]}
                >
                    <View style={styles.partHeader}>
                        <ThemedText type="defaultSemiBold" style={styles.partTitle}>
                            {t('sales.payment.equal.part')} {idx + 1}
                        </ThemedText>
                        <ThemedText style={styles.partAmount}>
                            {money(perPartAmount)}
                        </ThemedText>
                    </View>
                    {perPartTip > 0 && (
                        <ThemedText style={[styles.tipNote, { color: palette.mutedText }]}>
                            {t('sales.tip.label')}: {money(perPartTip)}
                        </ThemedText>
                    )}
                    {part.confirmed ? (
                        <ThemedText style={[styles.confirmedLabel, { color: palette.tint }]}>{t('sales.payment.equal.confirmed')}</ThemedText>
                    ) : (
                        <View style={styles.partActions}>
                            <View style={styles.paymentMethodsRow}>
                                {displayMethods.map((method) => (
                                    <Pressable
                                        key={method.id}
                                        style={[
                                            styles.paymentChip,
                                            { borderColor: palette.border },
                                            part.method === method.id && { backgroundColor: palette.accent, borderColor: palette.accent },
                                        ]}
                                        onPress={() => handleSetMethod(idx, method.id)}
                                    >
                                        <Ionicons
                                            name={method.icon as any}
                                            size={16}
                                            color={part.method === method.id ? palette.text : palette.mutedText}
                                        />
                                        <ThemedText style={[styles.paymentChipLabel, part.method === method.id && { color: palette.text }]}>
                                            {method.name}
                                        </ThemedText>
                                    </Pressable>
                                ))}
                            </View>
                            <ThemedButton label={t('sales.payment.equal.confirmPart')} onPress={() => handleConfirmPart(idx)} disabled={finalized} />
                        </View>
                    )}
                </View>
            ))}

            {allConfirmed && !finalized && (
                <ThemedText style={[styles.finalizingLabel, { color: palette.mutedText }]}>
                    {t('sales.payment.confirming')}
                </ThemedText>
            )}

            {finalized && (
                <View style={[styles.paidBadge, { backgroundColor: `${palette.tint}20`, borderColor: palette.tint }]}>
                    <ThemedText style={[styles.paidBadgeText, { color: palette.tint }]}>{t('sales.payment.paid')}</ThemedText>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 10,
    },
    partsControl: {
        gap: 6,
    },
    label: {
        fontSize: 13,
        opacity: 0.8,
    },
    finalizingLabel: {
        fontSize: 13,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    partsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stepBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        minWidth: 36,
    },
    partsCount: {
        fontSize: 18,
        fontWeight: '700',
        minWidth: 28,
        textAlign: 'center',
    },
    perPart: {
        fontSize: 13,
        fontWeight: '600',
    },
    partCard: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        gap: 6,
    },
    partHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    partTitle: {
        fontSize: 13,
    },
    partAmount: {
        fontSize: 15,
        fontWeight: '700',
    },
    partActions: {
        gap: 6,
    },
    confirmedLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    tipNote: {
        fontSize: 12,
        marginTop: 2,
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
    scroll: {
        flex: 1,
    },
    pricingSummary: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingVertical: 8,
        paddingHorizontal: 0,
        gap: 6,
    },
    pricingSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    pricingSummaryLabel: {
        fontSize: 12,
        opacity: 0.7,
    },
    totalRow: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 8,
        marginTop: 4,
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
});
