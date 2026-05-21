import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';

import { PaymentMethodBadge } from '@/components/payment-method-display';
import { ReceiptPreview } from '@/components/receipt-preview';
import { ThemedText } from '@/components/themed-text';
import { SlidePanelShell } from '@/components/ui/slide-panel';
import { ThemedButton } from '@/components/ui/themed-button';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { printService, salesService } from '@/services';
import { usePaymentMethodsStore } from '@/stores/payment-methods';
import { useSalesStore } from '@/stores/sales';
import { useSettingsStore } from '@/stores/settings';
import type { ReceiptData, ReceiptPaperWidth } from '@/types/receipt';
import type { SaleItemDetail, SalePayment, SalePaymentBoard, SalePaymentBoardItem, SalePricingSummary } from '@/types/sales';
import type { OrderStatus, RestaurantTable, Sale } from '@/types/types';
import { buildPartialReceiptData, buildReceiptData, isSinglePaymentForWholeSale } from '@/utils/receipt';

export type PaymentModalBusiness = {
    name: string;
    address: string;
    phone: string;
    nit: string;
    logoUri: string | null;
    footerMessage: string;
    taxRate: number;
    paperWidth: ReceiptPaperWidth;
    printerDeviceName: string | null;
    printerDeviceAddress: string | null;
};

type PanelView = 'detail' | 'payment' | 'receipt';
type PaymentMode = 'full' | 'by-items' | 'equal';

type ReceiptVariant = {
    id: string;
    label: string;
    receipt: ReceiptData;
};

type OrderPanelProps = {
    visible: boolean;
    sale: Sale | null;
    onClose: () => void;
    onExited: () => void;
    business: PaymentModalBusiness;
};

function buildFallbackPricingSummary(sale: Sale, items: SaleItemDetail[]): SalePricingSummary {
    const subtotal = items.reduce((sum, item) => sum + Number(item.line_subtotal ?? 0), 0);
    const itemDiscountTotal = items.reduce((sum, item) => sum + Number(item.discount_amount ?? 0), 0);
    const total = Number(sale.total ?? 0);
    const orderTypeSurcharge = Math.max(0, total - Math.max(0, subtotal - itemDiscountTotal));

    return {
        subtotal,
        item_discount_total: itemDiscountTotal,
        global_discount_name: null,
        global_discount_type: null,
        global_discount_value: null,
        global_discount_amount: 0,
        order_type_surcharge: orderTypeSurcharge,
        total,
        discount_applied_by: null,
    };
}

function getReceiptSurchargeBreakdown(
    pricing: SalePricingSummary,
    tableName: string,
    tables: RestaurantTable[],
    configuredToGoSurcharge: number,
) {
    const totalSurcharge = Math.max(0, Number(pricing.order_type_surcharge));
    if (totalSurcharge <= 0) {
        return [] as { label: string; description?: string | null; amount: number }[];
    }

    const tableType = tables.find((table) => table.name === tableName)?.table_type;

    if (tableType === 'delivery') {
        const toGoAmount = Math.min(Math.max(0, configuredToGoSurcharge), totalSurcharge);
        const deliveryAmount = Math.max(0, totalSurcharge - toGoAmount);

        return [
            toGoAmount > 0
                ? { label: t('sales.surcharge.toGo'), description: t('tables.type.toGo'), amount: toGoAmount }
                : null,
            deliveryAmount > 0
                ? { label: t('sales.surcharge.delivery'), description: t('tables.type.delivery'), amount: deliveryAmount }
                : null,
        ].filter(Boolean) as { label: string; description?: string | null; amount: number }[];
    }

    if (tableType === 'to-go') {
        return [{ label: t('sales.surcharge.toGo'), description: t('tables.type.toGo'), amount: totalSurcharge }];
    }

    return [{ label: t('sales.surcharge.generic'), description: t('tables.type.dineIn'), amount: totalSurcharge }];
}

function getSaleSurchargeLines(pricing: SalePricingSummary, tableName: string, tables: RestaurantTable[], configuredToGoSurcharge: number) {
    const totalSurcharge = Math.max(0, Number(pricing.order_type_surcharge));
    if (totalSurcharge <= 0) {
        return [] as string[];
    }

    const tableType = tables.find((table) => table.name === tableName)?.table_type;
    if (tableType === 'delivery') {
        const toGoSurcharge = Math.min(Math.max(0, configuredToGoSurcharge), totalSurcharge);
        const deliverySurcharge = Math.max(0, totalSurcharge - toGoSurcharge);

        return [
            toGoSurcharge > 0 ? `${t('sales.surcharge.toGo')}: +$${toGoSurcharge.toFixed(2)}` : '',
            deliverySurcharge > 0 ? `${t('sales.surcharge.delivery')}: +$${deliverySurcharge.toFixed(2)}` : '',
        ].filter(Boolean);
    }

    if (tableType === 'to-go') {
        return [`${t('sales.surcharge.toGo')}: +$${totalSurcharge.toFixed(2)}`];
    }

    return [`${t('sales.surcharge.generic')}: +$${totalSurcharge.toFixed(2)}`];
}

function formatStatusLabel(status: OrderStatus) {
    if (status === 'draft') return t('sales.status.draft');
    if (status === 'in-progress') return t('sales.status.inProgress');
    if (status === 'ready') return t('sales.status.ready');
    if (status === 'completed') return t('sales.status.completed');
    if (status === 'cancelled') return t('sales.status.cancelled');
    return status;
}

function getStatusTone(status: OrderStatus, palette: ReturnType<typeof useAppColors>) {
    if (status === 'completed') {
        return { backgroundColor: palette.tint, color: palette.card, borderColor: palette.tint };
    }
    if (status === 'ready') {
        return { backgroundColor: palette.accent, color: palette.background, borderColor: palette.accent };
    }
    if (status === 'cancelled') {
        return { backgroundColor: '#B71C1C', color: '#FFFFFF', borderColor: '#B71C1C' };
    }
    if (status === 'in-progress') {
        return { backgroundColor: '#1565C0', color: '#FFFFFF', borderColor: '#1565C0' };
    }
    return { backgroundColor: palette.border, color: palette.text, borderColor: palette.border };
}

type PendingItemRowProps = {
    item: SalePaymentBoardItem;
    availableQty: number;
    onAdd: () => void;
    onAddAll: () => void;
};

function PendingItemRow({ item, availableQty, onAdd, onAddAll }: PendingItemRowProps) {
    const palette = useAppColors();
    const unitTotal = item.quantity_total > 0 ? item.line_total_total / item.quantity_total : 0;
    const dimmed = availableQty <= 0;

    return (
        <Pressable
            onPress={availableQty > 0 ? onAdd : undefined}
            style={[byItemsStyles.itemRow, { borderColor: palette.border, opacity: dimmed ? 0.4 : 1 }]}
        >
            <View style={byItemsStyles.itemInfo}>
                <ThemedText style={byItemsStyles.itemName}>{item.product_name}</ThemedText>
                <ThemedText style={byItemsStyles.itemMeta}>
                    x{availableQty} · ${unitTotal.toFixed(2)} c/u
                </ThemedText>
            </View>
            {availableQty > 0 && (
                <View style={byItemsStyles.itemActions}>
                    <ThemedButton label="+" style={byItemsStyles.smallBtn} onPress={onAdd} />
                    {availableQty > 1 && (
                        <ThemedButton
                            label={t('sales.splitPayment.addAll')}
                            variant="secondary"
                            style={byItemsStyles.smallBtn}
                            onPress={onAddAll}
                        />
                    )}
                </View>
            )}
        </Pressable>
    );
}

type SelectedItemRowProps = {
    item: SalePaymentBoardItem;
    qty: number;
    onRemove: () => void;
    onAdjust: (delta: number) => void;
};

function SelectedItemRow({ item, qty, onRemove, onAdjust }: SelectedItemRowProps) {
    const palette = useAppColors();
    const unitTotal = item.quantity_total > 0 ? item.line_total_total / item.quantity_total : 0;

    return (
        <View style={[byItemsStyles.itemRow, { borderColor: palette.border }]}>
            <View style={byItemsStyles.itemInfo}>
                <ThemedText style={byItemsStyles.itemName}>{item.product_name}</ThemedText>
                <ThemedText style={byItemsStyles.itemMeta}>${(unitTotal * qty).toFixed(2)}</ThemedText>
            </View>
            <View style={byItemsStyles.itemActions}>
                <ThemedButton label="-" style={byItemsStyles.smallBtn} onPress={() => onAdjust(-1)} disabled={qty <= 1} />
                <ThemedText style={byItemsStyles.qtyLabel}>{qty}</ThemedText>
                <ThemedButton label="+" style={byItemsStyles.smallBtn} onPress={() => onAdjust(1)} disabled={qty >= item.quantity_pending} />
                <ThemedButton label="✕" variant="secondary" style={byItemsStyles.smallBtn} onPress={onRemove} />
            </View>
        </View>
    );
}

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

type FullPaymentTabProps = {
    sale: Sale;
    business: PaymentModalBusiness;
    onPaymentComplete?: () => void;
};

function FullPaymentTab({ sale, business, onPaymentComplete }: FullPaymentTabProps) {
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
        Promise.all([
            salesService.getSaleItems(sale.id),
            salesService.getSalePricingSummary(sale.id),
        ])
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
        <ScrollView style={fullStyles.scroll} contentContainerStyle={fullStyles.container} showsVerticalScrollIndicator={false}>
            {alreadyPaid ? (
                <View style={[fullStyles.paidBadge, { backgroundColor: `${palette.tint}20`, borderColor: palette.tint }]}>
                    <ThemedText style={[fullStyles.paidBadgeText, { color: palette.tint }]}>
                        {t('sales.payment.paid')}
                    </ThemedText>
                </View>
            ) : (
                <>
                    {loading ? (
                        <ThemedText style={fullStyles.label}>{t('sales.loadingProducts')}</ThemedText>
                    ) : (
                        <>
                            {/* Items */}
                            {items.length > 0 && (
                                <View>
                                    <ThemedText type="defaultSemiBold" style={fullStyles.sectionTitle}>
                                        {t('sales.items')}
                                    </ThemedText>
                                    {items.map((item) => (
                                        <View key={item.id} style={[fullStyles.itemRow, { borderColor: palette.border }]}>
                                            <View style={fullStyles.itemInfo}>
                                                <ThemedText style={fullStyles.itemName}>{item.product_name}</ThemedText>
                                                <ThemedText style={fullStyles.itemMeta}>x{item.quantity}</ThemedText>
                                            </View>
                                            <ThemedText style={fullStyles.itemPrice}>${Number(item.final_line_total ?? 0).toFixed(2)}</ThemedText>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Pricing Breakdown */}
                            {pricing && (
                                <View style={[fullStyles.pricingSection, { borderColor: palette.border }]}>
                                    <View style={fullStyles.pricingRow}>
                                        <ThemedText style={fullStyles.pricingLabel}>{t('sales.pricing.subtotal')}</ThemedText>
                                        <ThemedText>${pricing.subtotal.toFixed(2)}</ThemedText>
                                    </View>

                                    {pricing.item_discount_total > 0 && (
                                        <View style={fullStyles.pricingRow}>
                                            <ThemedText style={fullStyles.pricingLabel}>{t('sales.pricing.itemDiscounts')}</ThemedText>
                                            <ThemedText style={{ color: palette.tint }}>-${pricing.item_discount_total.toFixed(2)}</ThemedText>
                                        </View>
                                    )}

                                    {pricing.global_discount_amount > 0 && (
                                        <View style={fullStyles.pricingRow}>
                                            <ThemedText style={fullStyles.pricingLabel}>{pricing.global_discount_name || t('sales.pricing.globalDiscount')}</ThemedText>
                                            <ThemedText style={{ color: palette.tint }}>-${pricing.global_discount_amount.toFixed(2)}</ThemedText>
                                        </View>
                                    )}

                                    {pricing.order_type_surcharge > 0 && (
                                        <View style={fullStyles.pricingRow}>
                                            <ThemedText style={fullStyles.pricingLabel}>{t('sales.surcharge.generic')}</ThemedText>
                                            <ThemedText style={{ color: palette.danger }}>+${pricing.order_type_surcharge.toFixed(2)}</ThemedText>
                                        </View>
                                    )}

                                    <View style={[fullStyles.pricingRow, fullStyles.totalRow, { borderColor: palette.border }]}>
                                        <ThemedText type="defaultSemiBold" style={fullStyles.totalLabel}>
                                            {t('sales.receipt.totalLabel')}
                                        </ThemedText>
                                        <ThemedText type="defaultSemiBold" style={fullStyles.totalValue}>
                                            ${pricing.total.toFixed(2)}
                                        </ThemedText>
                                    </View>
                                </View>
                            )}

                            {/* Payment Method Selection */}
                            <ThemedText style={fullStyles.label}>{t('sales.paymentMethod')}</ThemedText>
                            <View style={fullStyles.paymentMethodsRow}>
                                {displayMethods.map((method) => (
                                    <Pressable
                                        key={method.id}
                                        style={[
                                            fullStyles.paymentChip,
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
                                        <ThemedText style={[fullStyles.paymentChipLabel, paymentMethodId === method.id && { color: palette.text }]}>
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

type ByItemsTabProps = {
    sale: Sale;
    business: PaymentModalBusiness;
    onPaymentComplete?: () => void;
};

function ByItemsTab({ sale, business, onPaymentComplete }: ByItemsTabProps) {
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
        Promise.all([
            getSalePaymentBoard(sale.id),
            salesService.getSalePricingSummary(sale.id),
        ])
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

    const getAvailableQty = (item: SalePaymentBoardItem) =>
        Math.max(0, item.quantity_pending - (selectedLines[item.sale_item_id] ?? 0));

    const selectedItems = Object.entries(selectedLines)
        .filter(([, qty]) => qty > 0)
        .map(([saleItemId, qty]) => {
            const boardItem = pendingItems.find((i) => i.sale_item_id === saleItemId);
            return boardItem ? { boardItem, qty } : null;
        })
        .filter((x): x is { boardItem: SalePaymentBoardItem; qty: number } => x !== null);

    const selectedTotal = selectedItems.reduce((sum, { boardItem, qty }) => {
        const unit = boardItem.quantity_total > 0 ? boardItem.line_total_total / boardItem.quantity_total : 0;
        return sum + unit * qty;
    }, 0);

    const displayPendingItems = pendingItems.filter((item) => getAvailableQty(item) > 0);

    const handleAddItem = (item: SalePaymentBoardItem, qty = 1) => {
        const available = getAvailableQty(item);
        const toAdd = Math.min(qty, available);
        if (toAdd <= 0) return;
        setSelectedLines((prev) => ({ ...prev, [item.sale_item_id]: (prev[item.sale_item_id] ?? 0) + toAdd }));
    };

    const handleRemoveSelected = (saleItemId: string) => {
        setSelectedLines((prev) => {
            const next = { ...prev };
            delete next[saleItemId];
            return next;
        });
    };

    const handleAdjustSelectedQty = (saleItemId: string, delta: number) => {
        setSelectedLines((prev) => {
            const boardItem = pendingItems.find((i) => i.sale_item_id === saleItemId);
            if (!boardItem) return prev;
            const next = Math.min(Math.max(1, (prev[saleItemId] ?? 1) + delta), boardItem.quantity_pending);
            return { ...prev, [saleItemId]: next };
        });
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
        <ScrollView
            style={byItemsStyles.boardScroll}
            contentContainerStyle={byItemsStyles.contentVertical}
            showsVerticalScrollIndicator={false}
        >
            {allPaid && (
                <ThemedText style={[byItemsStyles.allPaidLabel, { color: palette.tint }]}>
                    {t('sales.splitPayment.allPaid')}
                </ThemedText>
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
                    <PendingItemRow
                        key={item.sale_item_id}
                        item={item}
                        availableQty={getAvailableQty(item)}
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
                    <SelectedItemRow
                        key={boardItem.sale_item_id}
                        item={boardItem}
                        qty={qty}
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

type EqualPart = {
    method: string;
    confirmed: boolean;
};

type EqualSplitTabProps = {
    sale: Sale;
    business: PaymentModalBusiness;
    onPaymentComplete?: () => void;
};

function EqualSplitTab({ sale, business, onPaymentComplete }: EqualSplitTabProps) {
    const palette = useAppColors();
    const { markOrderPaid } = useSalesStore();
    const { methods } = usePaymentMethodsStore();
    const activeMethods = methods.filter((m) => m.is_active);
    const displayMethods = activeMethods.length > 0 ? activeMethods : methods;

    const alreadyPaid = !!sale.paid_at;
    const [numParts, setNumParts] = useState(2);
    const [pricing, setPricing] = useState<SalePricingSummary | null>(null);
    const [parts, setParts] = useState<EqualPart[]>(() => [
        { method: displayMethods[0]?.id ?? '', confirmed: false },
        { method: displayMethods[0]?.id ?? '', confirmed: false },
    ]);

    useEffect(() => {
        salesService.getSalePricingSummary(sale.id)
            .then(p => setPricing(p ?? buildFallbackPricingSummary(sale, [])))
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
            return next.slice(0, numParts).map((part) => (
                part.method ? part : { ...part, method: displayMethods[0]?.id ?? '' }
            ));
        });
    }, [displayMethods, numParts]);

    const allConfirmed = parts.length > 0 && parts.every((p) => p.confirmed);
    const perPartAmount = numParts > 0 ? Number(sale.total) / numParts : 0;

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
            await markOrderPaid(sale.id, dominantMethodId);
            setFinalized(true);
            onPaymentComplete?.();
        } finally {
            setFinalizeBusy(false);
        }
    };

    return (
        <ScrollView style={equalStyles.scroll} contentContainerStyle={equalStyles.container} showsVerticalScrollIndicator={false}>
            {!finalized && (
                <View style={equalStyles.partsControl}>
                    <ThemedText style={equalStyles.label}>{t('sales.payment.equal.parts')}</ThemedText>
                    <View style={equalStyles.partsRow}>
                        <ThemedButton
                            label="−"
                            variant="secondary"
                            style={equalStyles.stepBtn}
                            onPress={() => setNumParts((n) => Math.max(2, n - 1))}
                            disabled={numParts <= 2}
                        />
                        <ThemedText style={equalStyles.partsCount}>{numParts}</ThemedText>
                        <ThemedButton
                            label="+"
                            variant="secondary"
                            style={equalStyles.stepBtn}
                            onPress={() => setNumParts((n) => Math.min(10, n + 1))}
                            disabled={numParts >= 10}
                        />
                    </View>
                    <ThemedText style={equalStyles.perPart}>
                        {t('sales.payment.equal.perPart')}: ${perPartAmount.toFixed(2)}
                    </ThemedText>
                </View>
            )}

            {/* Pricing Breakdown */}
            {pricing && (
                <View style={[equalStyles.pricingSummary, { borderColor: palette.border }]}>
                    <View style={equalStyles.pricingSummaryRow}>
                        <ThemedText style={equalStyles.pricingSummaryLabel}>{t('sales.pricing.subtotal')}</ThemedText>
                        <ThemedText>${pricing.subtotal.toFixed(2)}</ThemedText>
                    </View>

                    {pricing.item_discount_total > 0 && (
                        <View style={equalStyles.pricingSummaryRow}>
                            <ThemedText style={equalStyles.pricingSummaryLabel}>{t('sales.pricing.itemDiscounts')}</ThemedText>
                            <ThemedText style={{ color: palette.tint }}>-${pricing.item_discount_total.toFixed(2)}</ThemedText>
                        </View>
                    )}

                    {pricing.global_discount_amount > 0 && (
                        <View style={equalStyles.pricingSummaryRow}>
                            <ThemedText style={equalStyles.pricingSummaryLabel}>{pricing.global_discount_name || t('sales.pricing.globalDiscount')}</ThemedText>
                            <ThemedText style={{ color: palette.tint }}>-${pricing.global_discount_amount.toFixed(2)}</ThemedText>
                        </View>
                    )}

                    {pricing.order_type_surcharge > 0 && (
                        <View style={equalStyles.pricingSummaryRow}>
                            <ThemedText style={equalStyles.pricingSummaryLabel}>{t('sales.surcharge.generic')}</ThemedText>
                            <ThemedText style={{ color: palette.danger }}>+${pricing.order_type_surcharge.toFixed(2)}</ThemedText>
                        </View>
                    )}

                    <View style={[equalStyles.pricingSummaryRow, equalStyles.totalRow, { borderColor: palette.border }]}>
                        <ThemedText type="defaultSemiBold">{t('sales.receipt.totalLabel')}</ThemedText>
                        <ThemedText type="defaultSemiBold">${pricing.total.toFixed(2)}</ThemedText>
                    </View>
                </View>
            )}

            {parts.map((part, idx) => (
                <View
                    key={idx}
                    style={[
                        equalStyles.partCard,
                        { borderColor: part.confirmed ? palette.tint : palette.border },
                        part.confirmed && { backgroundColor: `${palette.tint}10` },
                    ]}
                >
                    <View style={equalStyles.partHeader}>
                        <ThemedText type="defaultSemiBold" style={equalStyles.partTitle}>
                            {t('sales.payment.equal.part')} {idx + 1}
                        </ThemedText>
                        <ThemedText style={equalStyles.partAmount}>${perPartAmount.toFixed(2)}</ThemedText>
                    </View>
                    {part.confirmed ? (
                        <ThemedText style={[equalStyles.confirmedLabel, { color: palette.tint }]}>
                            {t('sales.payment.equal.confirmed')}
                        </ThemedText>
                    ) : (
                        <View style={equalStyles.partActions}>
                            <View style={equalStyles.paymentMethodsRow}>
                                {displayMethods.map((method) => (
                                    <Pressable
                                        key={method.id}
                                        style={[
                                            equalStyles.paymentChip,
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
                                        <ThemedText style={[equalStyles.paymentChipLabel, part.method === method.id && { color: palette.text }]}>
                                            {method.name}
                                        </ThemedText>
                                    </Pressable>
                                ))}
                            </View>
                            <ThemedButton
                                label={t('sales.payment.equal.confirmPart')}
                                onPress={() => handleConfirmPart(idx)}
                                disabled={finalized}
                            />
                        </View>
                    )}
                </View>
            ))}

            {allConfirmed && !finalized && (
                <ThemedButton
                    label={finalizeBusy ? t('sales.payment.confirming') : t('sales.payment.equal.finalize')}
                    disabled={finalizeBusy}
                    onPress={() => void finalizeEqualSplit()}
                />
            )}

            {finalized && (
                <View style={[fullStyles.paidBadge, { backgroundColor: `${palette.tint}20`, borderColor: palette.tint }]}>
                    <ThemedText style={[fullStyles.paidBadgeText, { color: palette.tint }]}>
                        {t('sales.payment.paid')}
                    </ThemedText>
                </View>
            )}
        </ScrollView>
    );
}

type ModeTabProps = {
    label: string;
    active: boolean;
    onPress: () => void;
};

function ModeTab({ label, active, onPress }: ModeTabProps) {
    const palette = useAppColors();
    return (
        <Pressable
            style={[
                modeStyles.tab,
                { borderColor: active ? palette.tint : palette.border },
                active && { backgroundColor: palette.tint },
            ]}
            onPress={onPress}
        >
            <ThemedText style={[modeStyles.tabLabel, active && { color: palette.card }]}>{label}</ThemedText>
        </Pressable>
    );
}

export function OrderPanel({ visible, sale, onClose, onExited, business }: OrderPanelProps) {
    const router = useRouter();
    const palette = useAppColors();
    const { width: screenWidth } = useWindowDimensions();
    const panelWidth = Math.min(Math.floor(screenWidth * 0.42), 520);
    const toGoSurcharge = useSettingsStore((state) => state.toGoSurcharge);

    const { tables, sendToKitchen, markOrderReady, cancelOrder } = useSalesStore();

    const viewOffset = useRef(new Animated.Value(0)).current;
    const prevVisibleRef = useRef(false);

    const [activeView, setActiveView] = useState<PanelView>('detail');
    const [receiptFromPayment, setReceiptFromPayment] = useState(false);
    const [mode, setMode] = useState<PaymentMode>('full');

    const [detailItems, setDetailItems] = useState<SaleItemDetail[]>([]);
    const [detailPricing, setDetailPricing] = useState<SalePricingSummary | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [actionBusy, setActionBusy] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);

    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
    const [receiptVariants, setReceiptVariants] = useState<ReceiptVariant[]>([]);
    const [receiptMessage, setReceiptMessage] = useState<string | null>(null);
    const [receiptLoading, setReceiptLoading] = useState(false);
    const [printingBusy, setPrintingBusy] = useState(false);

    const orderId = sale?.id ?? null;

    const resetReceipt = () => {
        setReceiptData(null);
        setReceiptVariants([]);
        setReceiptMessage(null);
        setReceiptLoading(false);
        setPrintingBusy(false);
    };

    const loadDetailData = async (nextSale: Sale) => {
        setDetailLoading(true);
        try {
            const [items, pricing] = await Promise.all([
                salesService.getSaleItems(nextSale.id),
                salesService.getSalePricingSummary(nextSale.id),
            ]);
            setDetailItems(items);
            setDetailPricing(pricing);
        } finally {
            setDetailLoading(false);
        }
    };

    const loadReceiptData = async (nextSale: Sale) => {
        resetReceipt();
        setReceiptLoading(true);

        try {
            const [items, pricing, payments] = await Promise.all([
                salesService.getSaleItems(nextSale.id),
                salesService.getSalePricingSummary(nextSale.id),
                salesService.getSalePayments(nextSale.id),
            ]);

            const pricingSummary = pricing ?? buildFallbackPricingSummary(nextSale, items);
            const surchargeBreakdown = getReceiptSurchargeBreakdown(
                pricingSummary,
                nextSale.table_name,
                tables,
                toGoSurcharge,
            );

            const receipt = buildReceiptData({
                sale: nextSale,
                items,
                pricing: pricingSummary,
                business: {
                    name: business.name,
                    address: business.address,
                    phone: business.phone,
                    nit: business.nit,
                    logoUri: business.logoUri,
                    footerMessage: business.footerMessage,
                },
                taxConfig: {
                    label: 'IVA',
                    rate: business.taxRate,
                    inclusive: true,
                },
                paperWidth: business.paperWidth,
                surchargeBreakdown,
            });

            const fullOrderPaidInSinglePayment = isSinglePaymentForWholeSale(items, payments);

            const variants: ReceiptVariant[] = [
                { id: 'full', label: t('sales.receipt.fullReceipt'), receipt },
                ...(!fullOrderPaidInSinglePayment
                    ? payments.map((payment, index) => ({
                        id: payment.id,
                        label: t('sales.receipt.partialReceipt', { number: index + 1 }),
                        receipt: buildPartialReceiptData({
                            sale: nextSale,
                            payment,
                            saleItems: items,
                            business: {
                                name: business.name,
                                address: business.address,
                                phone: business.phone,
                                nit: business.nit,
                                logoUri: business.logoUri,
                                footerMessage: business.footerMessage,
                            },
                            taxConfig: {
                                label: 'IVA',
                                rate: business.taxRate,
                                inclusive: true,
                            },
                            paperWidth: business.paperWidth,
                            globalDiscountName: payment.global_discount_amount > 0 ? t('sales.pricing.globalDiscount') : null,
                        }),
                    }))
                    : []),
            ];

            setReceiptVariants(variants);
            setReceiptData(variants[0]?.receipt ?? receipt);
            if (!pricing) {
                setReceiptMessage(t('sales.receipt.fallbackPricing'));
            }
        } catch (error) {
            const details = String((error as Error)?.message ?? '').trim();
            setReceiptMessage(details ? `${t('sales.receipt.error')} (${details})` : t('sales.receipt.error'));
        } finally {
            setReceiptLoading(false);
        }
    };

    const handlePrintReceipt = async (targetReceipt?: ReceiptData) => {
        const toPrint = targetReceipt ?? receiptData;
        if (!toPrint) return;
        setPrintingBusy(true);
        try {
            await printService.printReceipt(toPrint, {
                name: business.printerDeviceName ?? undefined,
                address: business.printerDeviceAddress ?? undefined,
            });
            const status = await printService.getStatus({
                name: business.printerDeviceName ?? undefined,
                address: business.printerDeviceAddress ?? undefined,
            });
            if (status.mode === 'native-pending') {
                setReceiptMessage(t('sales.receipt.pendingAdapter'));
            } else {
                setReceiptMessage(null);
            }
        } catch (error) {
            setReceiptMessage(String((error as Error).message || t('sales.receipt.error')));
        } finally {
            setPrintingBusy(false);
        }
    };

    const handleExited = () => {
        resetReceipt();
        setDetailItems([]);
        setDetailPricing(null);
        onExited();
    };

    useEffect(() => {
        const wasVisible = prevVisibleRef.current;
        prevVisibleRef.current = visible;

        if (visible && !wasVisible && sale) {
            setActiveView('detail');
            setReceiptFromPayment(false);
            setMode('full');
            setMenuVisible(false);
            viewOffset.setValue(0);
            void loadDetailData(sale);
        }
    }, [visible, panelWidth, sale]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!visible || !sale || orderId === null) return;
        void loadDetailData(sale);
    }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (activeView === 'payment') {
            setMode('full');
        }
    }, [activeView]);

    const navigateTo = (nextView: PanelView, direction: 'forward' | 'back' = 'forward') => {
        const outValue = direction === 'forward' ? -panelWidth : panelWidth;
        const inValue = direction === 'forward' ? panelWidth : -panelWidth;

        Animated.timing(viewOffset, {
            toValue: outValue,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setActiveView(nextView);
            setMenuVisible(false);
            viewOffset.setValue(inValue);
            Animated.spring(viewOffset, {
                toValue: 0,
                tension: 80,
                friction: 12,
                useNativeDriver: true,
            }).start();
        });
    };

    const runStatusAction = async (action: () => Promise<void>) => {
        if (actionBusy) return;
        setActionBusy(true);
        try {
            await action();
            if (sale) {
                void loadDetailData(sale);
            }
        } finally {
            setActionBusy(false);
        }
    };

    const handlePaymentComplete = async () => {
        if (!sale) return;
        await loadReceiptData(sale);
        setReceiptFromPayment(true);
        navigateTo('receipt', 'forward');
    };

    if (!sale) {
        return null;
    }

    const statusTone = getStatusTone(sale.status, palette);
    const detailTotal = Number(detailPricing?.total ?? sale.total ?? 0);

    const getPrimaryActionIcon = (status: OrderStatus): keyof typeof Ionicons.glyphMap => {
        if (status === 'draft') return 'flame-outline';
        if (status === 'in-progress') return 'checkmark-circle-outline';
        if (status === 'ready') return 'card-outline';
        return 'ellipsis-vertical';
    };

    const detailPrimaryAction = (() => {
        // No primary action for final states
        if (sale.status === 'completed' || sale.status === 'cancelled') {
            return { label: '', onPress: () => { }, visible: false };
        }
        if (sale.status === 'draft') {
            return {
                label: t('sales.action.sendToKitchen'),
                onPress: () => void runStatusAction(() => sendToKitchen(sale.id)),
                visible: true,
            };
        }
        if (sale.status === 'in-progress') {
            return {
                label: t('sales.action.markReady'),
                onPress: () => void runStatusAction(() => markOrderReady(sale.id)),
                visible: true,
            };
        }
        if (sale.status === 'ready' && !sale.paid_at) {
            return {
                label: t('sales.action.receivePayment'),
                onPress: () => navigateTo('payment', 'forward'),
                visible: true,
            };
        }
        return { label: '', onPress: () => { }, visible: false };
    })();

    const isFinalState = sale.status === 'completed' || sale.status === 'cancelled';
    const isCompleted = sale.status === 'completed';

    return (
        <SlidePanelShell
            visible={visible}
            onClose={onClose}
            onExited={handleExited}
            width={panelWidth}
            backdropStyle={styles.backdrop}
            panelStyle={styles.panel}
        >
            <Animated.View style={[styles.viewContainer, { transform: [{ translateX: viewOffset }] }]}>
                {activeView === 'detail' && (
                    <>
                        <View style={[styles.header, { borderBottomColor: palette.border }]}>
                            <View style={styles.headerLeft}>
                                <ThemedText type="subtitle">#{sale.id.slice(0, 6)}</ThemedText>
                                <View style={[styles.statusBadge, statusTone]}>
                                    <ThemedText style={[styles.statusBadgeText, { color: statusTone.color }]}>
                                        {formatStatusLabel(sale.status)}
                                    </ThemedText>
                                </View>
                            </View>
                            <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                                <Ionicons name="close" size={22} color={palette.text} />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
                            <ThemedText style={styles.metaText}>
                                {sale.table_name} · {sale.staff_name} · {new Date(Number(sale.created_at) * 1000).toLocaleString()}
                            </ThemedText>

                            {detailLoading ? (
                                <ThemedText style={styles.smallText}>{t('sales.loadingProducts')}</ThemedText>
                            ) : (
                                <>
                                    <View style={[styles.section, { borderColor: palette.border }]}>
                                        {detailItems.map((item) => (
                                            <View key={item.id} style={styles.detailRow}>
                                                <ThemedText style={styles.detailRowLabel}>
                                                    {item.product_name} x{item.quantity}
                                                </ThemedText>
                                                <ThemedText style={styles.detailRowValue}>
                                                    ${Number(item.final_line_total).toFixed(2)}
                                                </ThemedText>
                                            </View>
                                        ))}
                                    </View>

                                    {detailPricing && (
                                        <View style={[styles.section, { borderColor: palette.border }]}>
                                            <View style={styles.detailRow}>
                                                <ThemedText style={styles.detailRowLabel}>{t('sales.pricing.subtotal')}</ThemedText>
                                                <ThemedText style={styles.detailRowValue}>${Number(detailPricing.subtotal).toFixed(2)}</ThemedText>
                                            </View>
                                            {Number(detailPricing.item_discount_total) > 0 && (
                                                <View style={styles.detailRow}>
                                                    <ThemedText style={styles.detailRowLabel}>{t('sales.pricing.itemDiscounts')}</ThemedText>
                                                    <ThemedText style={[styles.detailRowValue, { color: palette.danger }]}>
                                                        -${Number(detailPricing.item_discount_total).toFixed(2)}
                                                    </ThemedText>
                                                </View>
                                            )}
                                            {Number(detailPricing.global_discount_amount) > 0 && (
                                                <View style={styles.detailRow}>
                                                    <ThemedText style={styles.detailRowLabel}>
                                                        {detailPricing.global_discount_name ?? t('sales.pricing.globalDiscount')}
                                                    </ThemedText>
                                                    <ThemedText style={[styles.detailRowValue, { color: palette.danger }]}>
                                                        -${Number(detailPricing.global_discount_amount).toFixed(2)}
                                                    </ThemedText>
                                                </View>
                                            )}
                                            {getSaleSurchargeLines(detailPricing, sale.table_name, tables, toGoSurcharge).map((line) => (
                                                <ThemedText key={line} style={styles.detailRowLabel}>{line}</ThemedText>
                                            ))}
                                            <View style={[styles.detailRow, styles.totalRow, { borderTopColor: palette.border }]}>
                                                <ThemedText type="defaultSemiBold">{t('sales.pricing.finalTotal')}</ThemedText>
                                                <ThemedText type="defaultSemiBold">${Number(detailPricing.total).toFixed(2)}</ThemedText>
                                            </View>
                                        </View>
                                    )}
                                </>
                            )}
                        </ScrollView>

                        <View style={[styles.footer, { borderTopColor: palette.border }]}>
                            <View style={styles.footerTotal}>
                                <ThemedText style={styles.totalLabel}>{t('sales.pricing.finalTotal')}</ThemedText>
                                <ThemedText style={styles.totalValue}>${detailTotal.toFixed(2)}</ThemedText>
                            </View>

                            <View style={styles.footerActions}>
                                {!isFinalState ? (
                                    <>
                                        {detailPrimaryAction.visible && (
                                            <Pressable
                                                style={[styles.actionButton, styles.actionButtonPrimary, { borderColor: palette.tint, backgroundColor: palette.tint, opacity: actionBusy ? 0.6 : 1 }]}
                                                onPress={detailPrimaryAction.onPress}
                                            >
                                                <Ionicons
                                                    name={getPrimaryActionIcon(sale.status)}
                                                    size={18}
                                                    color={palette.card}
                                                />
                                                <ThemedText style={[styles.actionButtonLabel, { color: palette.card }]}>{detailPrimaryAction.label}</ThemedText>
                                            </Pressable>
                                        )}

                                        {!sale.paid_at && sale.status !== 'ready' && (
                                            <Pressable
                                                style={[styles.actionButton, styles.actionButtonSecondary, { borderColor: palette.border, opacity: actionBusy ? 0.6 : 1 }]}
                                                onPress={() => !actionBusy && navigateTo('payment', 'forward')}
                                            >
                                                <Ionicons name="card-outline" size={18} color={palette.mutedText} />
                                                <ThemedText style={[styles.actionButtonLabel, { color: palette.mutedText }]}>{t('sales.action.payNow')}</ThemedText>
                                            </Pressable>
                                        )}

                                        {!sale.paid_at && (
                                            <Pressable
                                                style={[styles.actionButton, styles.actionButtonSecondary, { borderColor: palette.border, flex: 0, paddingHorizontal: 10 }]}
                                                onPress={() => router.push(`/sale-form?orderId=${sale.id}`)}
                                                accessibilityLabel="editar cuenta"
                                                accessibilityHint="editar cuenta"
                                                {...(Platform.OS === 'web' ? { title: 'editar cuenta' } : {})}
                                            >
                                                <Ionicons name="create-outline" size={18} color={palette.mutedText} />
                                            </Pressable>
                                        )}

                                        <Pressable
                                            style={[styles.actionButton, styles.actionButtonSecondary, { borderColor: palette.border, flex: 0, paddingHorizontal: 10 }]}
                                            onPress={() => setMenuVisible((prev) => !prev)}
                                        >
                                            <Ionicons name="ellipsis-vertical" size={18} color={palette.mutedText} />
                                        </Pressable>

                                        {menuVisible && (
                                            <View style={[styles.menu, { borderColor: palette.border, backgroundColor: palette.card }]}>
                                                <Pressable
                                                    style={styles.menuItem}
                                                    onPress={() => {
                                                        setMenuVisible(false);
                                                        void runStatusAction(async () => {
                                                            await cancelOrder(sale.id);
                                                            onClose();
                                                        });
                                                    }}
                                                >
                                                    <Ionicons name="close-circle-outline" size={16} color={palette.danger} />
                                                    <ThemedText style={[styles.menuItemText, { color: palette.danger }]}>{t('sales.action.cancel')}</ThemedText>
                                                </Pressable>
                                                <Pressable
                                                    style={styles.menuItem}
                                                    onPress={() => {
                                                        setMenuVisible(false);
                                                        setReceiptFromPayment(false);
                                                        void loadReceiptData(sale).then(() => navigateTo('receipt', 'forward'));
                                                    }}
                                                >
                                                    <Ionicons name="receipt-outline" size={16} color={palette.tint} />
                                                    <ThemedText style={[styles.menuItemText, { color: palette.tint }]}>{t('sales.action.previewReceipt')}</ThemedText>
                                                </Pressable>
                                            </View>
                                        )}
                                    </>
                                ) : isCompleted ? (
                                    <Pressable
                                        style={[styles.actionButton, styles.actionButtonPrimary, { borderColor: palette.tint, backgroundColor: palette.tint, flex: 1 }]}
                                        onPress={() => {
                                            setReceiptFromPayment(false);
                                            void loadReceiptData(sale).then(() => navigateTo('receipt', 'forward'));
                                        }}
                                    >
                                        <Ionicons name="receipt-outline" size={18} color={palette.card} />
                                        <ThemedText style={[styles.actionButtonLabel, { color: palette.card }]}>{t('sales.action.previewReceipt')}</ThemedText>
                                    </Pressable>
                                ) : null}
                            </View>
                        </View>
                    </>
                )}

                {activeView === 'payment' && (
                    <>
                        <View style={[styles.header, { borderBottomColor: palette.border }]}>
                            <Pressable style={styles.backButton} onPress={() => navigateTo('detail', 'back')}>
                                <ThemedText type="defaultSemiBold">{`< ${t('common.back')}`}</ThemedText>
                            </Pressable>
                            <ThemedText type="subtitle">{`${t('sales.action.payNow')} - ${sale.table_name}`}</ThemedText>
                            <View style={styles.headerRightSpacer} />
                        </View>

                        <View style={[styles.modeTabs, { borderBottomColor: palette.border }]}>
                            <ModeTab label={t('sales.payment.modeFull')} active={mode === 'full'} onPress={() => setMode('full')} />
                            <ModeTab label={t('sales.payment.modeByItems')} active={mode === 'by-items'} onPress={() => setMode('by-items')} />
                            <ModeTab label={t('sales.payment.modeEqual')} active={mode === 'equal'} onPress={() => setMode('equal')} />
                        </View>

                        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
                            {mode === 'full' && (
                                <FullPaymentTab key={`full-${sale.id}`} sale={sale} business={business} onPaymentComplete={() => void handlePaymentComplete()} />
                            )}
                            {mode === 'by-items' && (
                                <ByItemsTab key={`by-items-${sale.id}`} sale={sale} business={business} onPaymentComplete={() => void handlePaymentComplete()} />
                            )}
                            {mode === 'equal' && (
                                <EqualSplitTab key={`equal-${sale.id}`} sale={sale} business={business} onPaymentComplete={() => void handlePaymentComplete()} />
                            )}
                        </ScrollView>
                    </>
                )}

                {activeView === 'receipt' && (
                    <>
                        <View style={[styles.header, { borderBottomColor: palette.border }]}>
                            <Pressable
                                style={styles.backButton}
                                onPress={() => {
                                    if (receiptFromPayment) {
                                        onClose();
                                        return;
                                    }
                                    navigateTo('detail', 'back');
                                }}
                            >
                                <ThemedText type="defaultSemiBold">{receiptFromPayment ? '< Cerrar' : `< ${t('common.back')}`}</ThemedText>
                            </Pressable>
                            <ThemedText type="subtitle">{`${t('sales.receipt.title')} #${sale.id.slice(0, 6)}`}</ThemedText>
                            <View style={styles.headerRightSpacer} />
                        </View>

                        <View style={styles.receiptBodyContainer}>
                            <ScrollView style={styles.body} contentContainerStyle={styles.receiptPaperContainer} showsVerticalScrollIndicator={false}>
                                {receiptLoading ? <ThemedText style={styles.smallText}>{t('sales.receipt.loading')}</ThemedText> : null}

                                {!receiptLoading && receiptVariants.length > 1
                                    ? receiptVariants.filter((v) => v.id !== 'full').map((variant) => (
                                        <View key={variant.id} style={styles.partialReceiptBlock}>
                                            <View style={styles.partialReceiptHeader}>
                                                <ThemedText style={styles.partialReceiptLabel}>{variant.label}</ThemedText>
                                                <ThemedButton
                                                    label={printingBusy ? `${t('sales.action.printReceipt')}...` : t('sales.action.printReceipt')}
                                                    disabled={printingBusy || receiptLoading}
                                                    style={styles.partialPrintButton}
                                                    onPress={() => void handlePrintReceipt(variant.receipt)}
                                                />
                                            </View>
                                            <View style={styles.receiptPaper}>
                                                <ReceiptPreview receipt={variant.receipt} />
                                                <View style={styles.receiptPaperTear}>
                                                    {Array.from({ length: 24 }).map((_, index) => (
                                                        <View key={index} style={styles.tearTooth} />
                                                    ))}
                                                </View>
                                            </View>
                                        </View>
                                    ))
                                    : !receiptLoading
                                        ? (
                                            <View style={styles.receiptPaper}>
                                                {receiptData ? <ReceiptPreview receipt={receiptData} /> : null}
                                                <View style={styles.receiptPaperTear}>
                                                    {Array.from({ length: 24 }).map((_, index) => (
                                                        <View key={index} style={styles.tearTooth} />
                                                    ))}
                                                </View>
                                            </View>
                                        )
                                        : null
                                }

                                {receiptMessage ? (
                                    <ThemedText style={[styles.smallText, { color: palette.danger }]}>{receiptMessage}</ThemedText>
                                ) : null}
                            </ScrollView>
                        </View>

                        {receiptVariants.length <= 1 ? (
                            <View style={[styles.footer, { borderTopColor: palette.border }]}>
                                <ThemedButton
                                    label={printingBusy ? `${t('sales.action.printReceipt')}...` : t('sales.action.printReceipt')}
                                    disabled={!receiptData || printingBusy || receiptLoading}
                                    onPress={() => void handlePrintReceipt()}
                                />
                            </View>
                        ) : null}
                    </>
                )}
            </Animated.View>
        </SlidePanelShell>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        backgroundColor: 'rgba(0,0,0,0.38)',
    },
    panel: {
        borderLeftWidth: StyleSheet.hairlineWidth,
    },
    viewContainer: {
        flex: 1,
    },
    header: {
        minHeight: 58,
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 1,
    },
    closeButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButton: {
        minWidth: 82,
    },
    headerRightSpacer: {
        width: 24,
    },
    modeTabs: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    body: {
        flex: 1,
    },
    bodyContent: {
        padding: 12,
        gap: 10,
        paddingBottom: 24,
    },
    footer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        padding: 12,
        gap: 12,
    },
    footerTotal: {
        gap: 4,
        marginBottom: 4,
    },
    totalLabel: {
        fontSize: 12,
        opacity: 0.7,
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '800',
    },
    footerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderRadius: 8,
        minHeight: 40,
    },
    actionButtonPrimary: {
        borderWidth: 0,
    },
    actionButtonSecondary: {
        backgroundColor: 'transparent',
    },
    actionButtonLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusBadge: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    metaText: {
        fontSize: 13,
        opacity: 0.75,
    },
    section: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 10,
        padding: 10,
        gap: 6,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    detailRowLabel: {
        fontSize: 13,
        flex: 1,
    },
    detailRowValue: {
        fontSize: 13,
        fontWeight: '600',
    },
    totalRow: {
        borderTopWidth: StyleSheet.hairlineWidth,
        marginTop: 4,
        paddingTop: 6,
    },
    smallText: {
        opacity: 0.8,
        fontSize: 13,
    },
    menu: {
        position: 'absolute',
        right: 0,
        bottom: 50,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 10,
        minWidth: 200,
        overflow: 'hidden',
        zIndex: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    menuItemText: {
        fontSize: 14,
        fontWeight: '500',
    },
    receiptBodyContainer: {
        flex: 1,
        backgroundColor: '#EAEAEA',
    },
    receiptPaperContainer: {
        padding: 16,
        gap: 10,
    },
    receiptPaper: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        overflow: 'hidden',
        ...(Platform.OS === 'web'
            ? { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
            : {
                elevation: 4,
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
            }),
    },
    receiptPaperTear: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginTop: 2,
        paddingBottom: 2,
    },
    tearTooth: {
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#EAEAEA',
    },
    receiptVariantTabs: {
        gap: 8,
        paddingBottom: 6,
    },
    receiptVariantButton: {
        minWidth: 132,
    },
    partialReceiptBlock: {
        gap: 6,
    },
    partialReceiptHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    partialReceiptLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    partialPrintButton: {
        minWidth: 0,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
});

const modeStyles = StyleSheet.create({
    tab: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
});

const fullStyles = StyleSheet.create({
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

const equalStyles = StyleSheet.create({
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
});

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
