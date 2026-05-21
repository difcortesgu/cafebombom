import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PaymentMethodBadge } from '@/components/payment-method-display';
import { PendingPaymentItemRow, SelectedPaymentItemRow } from '@/components/payment-split-rows';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { printService, salesService } from '@/services';
import { usePaymentMethodsStore } from '@/stores/payment-methods';
import { useSalesStore } from '@/stores/sales';
import type { SalePayment, SalePaymentBoard, SalePaymentBoardItem, SalePricingSummary } from '@/types/sales';
import type { Sale } from '@/types/types';
import {
    addSelectedLine,
    adjustSelectedLine,
    buildSelectedItems,
    computeSelectedTotal,
    getAvailableQty,
    removeSelectedLine,
} from '@/utils/payment-allocation';
import { buildPartialReceiptData } from '@/utils/receipt';
import { buildFallbackPricingSummary } from '@/utils/sale-pricing';

import type { PaymentModalBusiness } from './types';

type ByItemsTabProps = {
    sale: Sale;
    business: PaymentModalBusiness;
    onPaymentComplete?: () => void;
};

type PaidPaymentCardProps = {
    payment: SalePayment;
    index: number;
    onPrint: () => void;
    printBusy: boolean;
    printMessage: string | null;
};

function PaidPaymentCard({ payment, index, onPrint, printBusy, printMessage }: PaidPaymentCardProps) {
    const palette = useAppColors();

    return (
        <View style={[byItemsStyles.paidCard, { borderColor: palette.border }]}>
            <View style={byItemsStyles.paidHeader}>
                <ThemedText type="defaultSemiBold" style={byItemsStyles.paidTitle}>
                    {t('sales.splitPayment.payment')} {index + 1}
                </ThemedText>
                <PaymentMethodBadge methodId={payment.payment_method} containerStyle={byItemsStyles.methodBadge} />
            </View>
            {payment.lines.map((line) => (
                <View key={line.payment_item_id} style={byItemsStyles.paidLine}>
                    <ThemedText style={byItemsStyles.paidLineName}>
                        {line.product_name} x{line.quantity_paid}
                    </ThemedText>
                    <ThemedText style={byItemsStyles.paidLineAmount}>${line.line_total.toFixed(2)}</ThemedText>
                </View>
            ))}
            <View style={[byItemsStyles.paidLine, byItemsStyles.paidTotalRow]}>
                <ThemedText type="defaultSemiBold">{t('sales.receipt.totalLabel')}</ThemedText>
                <ThemedText type="defaultSemiBold">${payment.total.toFixed(2)}</ThemedText>
            </View>
            {printMessage ? <ThemedText style={byItemsStyles.paidPrintMessage}>{printMessage}</ThemedText> : null}
            <ThemedButton
                label={printBusy ? `${t('sales.splitPayment.printPartial')}...` : t('sales.splitPayment.printPartial')}
                variant="secondary"
                disabled={printBusy}
                onPress={onPrint}
            />
        </View>
    );
}

export function ByItemsTab({ sale, business, onPaymentComplete }: ByItemsTabProps) {
    const palette = useAppColors();
    const { getSalePaymentBoard, createPartialPayment } = useSalesStore();
    const { methods } = usePaymentMethodsStore();
    const activeMethods = methods.filter((m) => m.is_active);
    const displayMethods = activeMethods.length > 0 ? activeMethods : methods;

    const [board, setBoard] = useState<SalePaymentBoard | null>(null);
    const [boardLoading, setBoardLoading] = useState(false);
    const [pricing, setPricing] = useState<SalePricingSummary | null>(null);
    const [selectedLines, setSelectedLines] = useState<Record<string, number>>({});
    const [paymentMethodId, setPaymentMethodId] = useState<string>('');
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [printingPaymentId, setPrintingPaymentId] = useState<string | null>(null);
    const [printMessages, setPrintMessages] = useState<Record<string, string>>({});
    const [showPaidSection, setShowPaidSection] = useState(false);

    useEffect(() => {
        setBoard(null);
        setPricing(null);
        setSelectedLines({});
        setPaymentMethodId(sale.payment_method ?? displayMethods[0]?.id ?? '');
        setPrintingPaymentId(null);
        setPrintMessages({});
        setShowPaidSection(false);
        setBoardLoading(true);
        Promise.all([getSalePaymentBoard(sale.id), salesService.getSalePricingSummary(sale.id)])
            .then(([b, p]) => {
                setBoard(b);
                setPricing(p ?? buildFallbackPricingSummary(sale, []));
            })
            .catch(() => { })
            .finally(() => setBoardLoading(false));
    }, [sale.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const hasSelected = displayMethods.some((m) => m.id === paymentMethodId);
        if (!hasSelected) {
            setPaymentMethodId(displayMethods[0]?.id ?? '');
        }
    }, [displayMethods, paymentMethodId]);

    const pendingItems = board?.pending ?? [];

    const selectedItems = buildSelectedItems(selectedLines, pendingItems);

    const selectedTotal = computeSelectedTotal(selectedItems);

    const displayPendingItems = pendingItems.filter((item) => getAvailableQty(item, selectedLines) > 0);

    const handleAddItem = (item: SalePaymentBoardItem, qty = 1) => {
        setSelectedLines((prev) => addSelectedLine(prev, item, qty));
    };

    const handleRemoveSelected = (saleItemId: string) => {
        setSelectedLines((prev) => removeSelectedLine(prev, saleItemId));
    };

    const handleAdjustSelectedQty = (saleItemId: string, delta: number) => {
        setSelectedLines((prev) => adjustSelectedLine(prev, pendingItems, saleItemId, delta));
    };

    const handleConfirm = async () => {
        if (selectedItems.length === 0 || confirmBusy) return;
        const lines = selectedItems.map(({ boardItem, qty }) => ({ saleItemId: boardItem.sale_item_id, quantity: qty }));
        setConfirmBusy(true);
        try {
            await createPartialPayment({ orderId: sale.id, paymentMethodId, lines });
            const newBoard = await getSalePaymentBoard(sale.id);
            setBoard(newBoard);
            setSelectedLines({});
            if (newBoard.pending.length === 0 || newBoard.pending.every((item) => item.quantity_pending === 0)) {
                onPaymentComplete?.();
            }
        } finally {
            setConfirmBusy(false);
        }
    };

    const handlePrintPayment = async (payment: SalePayment) => {
        if (printingPaymentId !== null) return;
        setPrintingPaymentId(payment.id);
        setPrintMessages((prev) => {
            const next = { ...prev };
            delete next[payment.id];
            return next;
        });
        try {
            const saleItems = await salesService.getSaleItems(sale.id);
            const receiptData = buildPartialReceiptData({
                sale,
                payment,
                saleItems,
                business: {
                    name: business.name,
                    address: business.address,
                    phone: business.phone,
                    nit: business.nit,
                    logoUri: business.logoUri,
                    footerMessage: business.footerMessage,
                },
                taxConfig: { label: 'IVA', rate: business.taxRate, inclusive: true },
                paperWidth: business.paperWidth,
                globalDiscountName: payment.global_discount_amount > 0 ? t('sales.pricing.globalDiscount') : null,
            });
            await printService.printReceipt(receiptData, {
                name: business.printerDeviceName ?? undefined,
                address: business.printerDeviceAddress ?? undefined,
            });
            const status = await printService.getStatus({
                name: business.printerDeviceName ?? undefined,
                address: business.printerDeviceAddress ?? undefined,
            });
            if (status.mode === 'native-pending') {
                setPrintMessages((prev) => ({ ...prev, [payment.id]: t('sales.receipt.pendingAdapter') }));
            }
        } catch (err) {
            setPrintMessages((prev) => ({ ...prev, [payment.id]: String((err as Error).message || t('sales.receipt.error')) }));
        } finally {
            setPrintingPaymentId(null);
        }
    };

    const allPaid = !boardLoading && board !== null && board.pending.every((i) => i.quantity_pending === 0);

    return (
        <ScrollView style={byItemsStyles.boardScroll} contentContainerStyle={byItemsStyles.contentVertical} showsVerticalScrollIndicator={false}>
            {allPaid && (
                <ThemedText style={[byItemsStyles.allPaidLabel, { color: palette.tint }]}>{t('sales.splitPayment.allPaid')}</ThemedText>
            )}

            <View style={[byItemsStyles.section, { borderColor: palette.border }]}>
                <ThemedText type="defaultSemiBold" style={byItemsStyles.columnTitle}>
                    {t('sales.splitPayment.pendingColumn')}
                </ThemedText>
                {boardLoading && <ThemedText style={byItemsStyles.dimText}>{t('sales.loadingProducts')}</ThemedText>}
                {!boardLoading && displayPendingItems.length === 0 && (
                    <ThemedText style={byItemsStyles.dimText}>{t('sales.splitPayment.noPending')}</ThemedText>
                )}
                {displayPendingItems.map((item) => (
                    <PendingPaymentItemRow
                        key={item.sale_item_id}
                        item={item}
                        availableQty={getAvailableQty(item, selectedLines)}
                        rowStyles={byItemsStyles}
                        onAdd={() => handleAddItem(item)}
                        onAddAll={() => handleAddItem(item, item.quantity_pending)}
                    />
                ))}
            </View>

            <View style={[byItemsStyles.section, { borderColor: palette.border }]}>
                <ThemedText type="defaultSemiBold" style={byItemsStyles.columnTitle}>
                    {t('sales.splitPayment.selectedColumn')}
                </ThemedText>
                {selectedItems.length === 0 && (
                    <ThemedText style={byItemsStyles.dimText}>{t('sales.splitPayment.noSelected')}</ThemedText>
                )}
                {selectedItems.map(({ boardItem, qty }) => (
                    <SelectedPaymentItemRow
                        key={boardItem.sale_item_id}
                        item={boardItem}
                        qty={qty}
                        rowStyles={byItemsStyles}
                        onRemove={() => handleRemoveSelected(boardItem.sale_item_id)}
                        onAdjust={(delta) => handleAdjustSelectedQty(boardItem.sale_item_id, delta)}
                    />
                ))}
                {selectedItems.length > 0 && (
                    <View style={byItemsStyles.selectedFooter}>
                        {pricing && (
                            <View style={[byItemsStyles.pricingSection, { borderColor: palette.border }]}>
                                {pricing.item_discount_total > 0 && (
                                    <View style={byItemsStyles.pricingRow}>
                                        <ThemedText style={byItemsStyles.pricingLabel}>{t('sales.pricing.itemDiscounts')}</ThemedText>
                                        <ThemedText style={{ color: palette.tint, fontSize: 12 }}>-${pricing.item_discount_total.toFixed(2)}</ThemedText>
                                    </View>
                                )}
                                {pricing.global_discount_amount > 0 && (
                                    <View style={byItemsStyles.pricingRow}>
                                        <ThemedText style={byItemsStyles.pricingLabel}>{pricing.global_discount_name || t('sales.pricing.globalDiscount')}</ThemedText>
                                        <ThemedText style={{ color: palette.tint, fontSize: 12 }}>-${pricing.global_discount_amount.toFixed(2)}</ThemedText>
                                    </View>
                                )}
                                {pricing.order_type_surcharge > 0 && (
                                    <View style={byItemsStyles.pricingRow}>
                                        <ThemedText style={byItemsStyles.pricingLabel}>{t('sales.surcharge.generic')}</ThemedText>
                                        <ThemedText style={{ color: palette.danger, fontSize: 12 }}>+${pricing.order_type_surcharge.toFixed(2)}</ThemedText>
                                    </View>
                                )}
                            </View>
                        )}
                        <View style={[byItemsStyles.itemRow, byItemsStyles.totalRow, { borderColor: palette.border }]}>
                            <ThemedText type="defaultSemiBold">{t('sales.receipt.totalLabel')}</ThemedText>
                            <ThemedText type="defaultSemiBold">${selectedTotal.toFixed(2)}</ThemedText>
                        </View>
                        <ThemedText style={byItemsStyles.smallLabel}>{t('sales.paymentMethod')}</ThemedText>
                        <View style={byItemsStyles.paymentMethodsRow}>
                            {displayMethods.map((method) => (
                                <Pressable
                                    key={method.id}
                                    style={[
                                        byItemsStyles.paymentChip,
                                        { borderColor: palette.border },
                                        paymentMethodId === method.id && { backgroundColor: palette.accent, borderColor: palette.accent },
                                    ]}
                                    onPress={() => setPaymentMethodId(method.id)}
                                >
                                    <Ionicons
                                        name={method.icon as any}
                                        size={16}
                                        color={paymentMethodId === method.id ? palette.text : palette.mutedText}
                                    />
                                    <ThemedText style={[byItemsStyles.paymentChipLabel, paymentMethodId === method.id && { color: palette.text }]}>
                                        {method.name}
                                    </ThemedText>
                                </Pressable>
                            ))}
                        </View>
                        <ThemedButton
                            label={confirmBusy ? t('sales.splitPayment.confirmingPartial') : t('sales.splitPayment.confirmPartial')}
                            disabled={confirmBusy || selectedItems.length === 0 || !paymentMethodId}
                            onPress={() => void handleConfirm()}
                        />
                    </View>
                )}
            </View>

            <View style={[byItemsStyles.section, { borderColor: palette.border }]}>
                <Pressable style={byItemsStyles.paidHeaderToggle} onPress={() => setShowPaidSection((prev) => !prev)}>
                    <ThemedText type="defaultSemiBold" style={byItemsStyles.columnTitle}>
                        {t('sales.splitPayment.paidColumn')}
                    </ThemedText>
                    <Ionicons name={showPaidSection ? 'chevron-up' : 'chevron-down'} size={16} color={palette.mutedText} />
                </Pressable>
                {showPaidSection && (
                    <>
                        {(board?.paid.length ?? 0) === 0 && (
                            <ThemedText style={byItemsStyles.dimText}>{t('sales.splitPayment.noPaid')}</ThemedText>
                        )}
                        {board?.paid.map((payment, idx) => (
                            <PaidPaymentCard
                                key={payment.id}
                                payment={payment}
                                index={idx}
                                onPrint={() => void handlePrintPayment(payment)}
                                printBusy={printingPaymentId === payment.id}
                                printMessage={printMessages[payment.id] ?? null}
                            />
                        ))}
                    </>
                )}
            </View>
        </ScrollView>
    );
}

const byItemsStyles = StyleSheet.create({
    boardScroll: {
        flexShrink: 1,
    },
    contentVertical: {
        gap: 12,
        paddingBottom: 8,
    },
    allPaidLabel: {
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'right',
        marginBottom: 4,
    },
    section: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 10,
        padding: 10,
        gap: 8,
    },
    columnTitle: {
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    dimText: {
        opacity: 0.5,
        fontSize: 13,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 8,
        padding: 8,
        gap: 6,
    },
    itemInfo: {
        flex: 1,
        gap: 2,
    },
    itemName: {
        fontSize: 13,
        fontWeight: '600',
    },
    itemMeta: {
        fontSize: 12,
        opacity: 0.7,
    },
    itemActions: {
        flexDirection: 'row',
        gap: 4,
        alignItems: 'center',
    },
    smallBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        minWidth: 28,
    },
    qtyLabel: {
        minWidth: 20,
        textAlign: 'center',
        fontWeight: '600',
        fontSize: 13,
    },
    selectedFooter: {
        gap: 8,
        marginTop: 4,
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 8,
    },
    totalRow: {
        padding: 8,
    },
    smallLabel: {
        fontSize: 13,
        opacity: 0.8,
    },
    paidHeaderToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    paidCard: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 8,
        padding: 8,
        gap: 4,
    },
    paidHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    paidTitle: {
        fontSize: 13,
    },
    methodBadge: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    paidLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    paidLineName: {
        fontSize: 12,
        opacity: 0.8,
        flex: 1,
    },
    paidLineAmount: {
        fontSize: 12,
        fontWeight: '600',
    },
    paidTotalRow: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 4,
        marginTop: 2,
    },
    paidPrintMessage: {
        fontSize: 12,
        opacity: 0.8,
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
});
