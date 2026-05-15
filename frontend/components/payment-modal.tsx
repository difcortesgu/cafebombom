import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ReceiptPreview } from '@/components/receipt-preview';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { printService, salesService } from '@/services';
import { usePaymentMethodsStore } from '@/stores/payment-methods';
import { useSalesStore } from '@/stores/sales';
import type { ReceiptData, ReceiptPaperWidth } from '@/types/receipt';
import type { SalePayment, SalePaymentBoard, SalePaymentBoardItem } from '@/types/sales';
import type { Sale } from '@/types/types';
import { buildPartialReceiptData, buildReceiptData } from '@/utils/receipt';

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

/** @deprecated Use PaymentModalBusiness */
export type SplitPaymentBusiness = PaymentModalBusiness;

type PaymentMode = 'full' | 'by-items' | 'equal';



// ─── By-items sub-components ─────────────────────────────────────────────────

type PendingItemRowProps = {
    item: SalePaymentBoardItem;
    availableQty: number;
    isWeb: boolean;
    onAdd: () => void;
    onAddAll: () => void;
    onDragStart: (itemId: string) => void;
    onDragEnd: () => void;
};

function PendingItemRow({ item, availableQty, isWeb, onAdd, onAddAll, onDragStart, onDragEnd }: PendingItemRowProps) {
    const palette = useAppColors();
    const ref = useRef<View>(null);

    useEffect(() => {
        if (!isWeb) return;
        const el = ref.current as unknown as HTMLElement | null;
        if (!el) return;

        el.draggable = availableQty > 0;
        el.style.cursor = availableQty > 0 ? 'grab' : 'default';

        const handleDragStart = (e: DragEvent) => {
            e.dataTransfer?.setData('application/x-payment-item-id', item.sale_item_id);
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
            onDragStart(item.sale_item_id);
        };
        const handleDragEnd = () => onDragEnd();

        el.addEventListener('dragstart', handleDragStart);
        el.addEventListener('dragend', handleDragEnd);
        return () => {
            el.removeEventListener('dragstart', handleDragStart);
            el.removeEventListener('dragend', handleDragEnd);
        };
    }, [item.sale_item_id, availableQty, isWeb, onDragStart, onDragEnd]);

    const unitTotal = item.quantity_total > 0 ? item.line_total_total / item.quantity_total : 0;
    const dimmed = availableQty <= 0;

    return (
        <Pressable
            ref={ref}
            onPress={availableQty > 0 ? onAdd : undefined}
            style={[byItemsStyles.itemRow, { borderColor: palette.border, opacity: dimmed ? 0.4 : 1 }]}
        >
            <View style={byItemsStyles.itemInfo}>
                <ThemedText style={byItemsStyles.itemName}>{item.product_name}</ThemedText>
                <ThemedText style={byItemsStyles.itemMeta}>
                    x{availableQty} · ${unitTotal.toFixed(2)} c/u
                </ThemedText>
            </View>
            {!isWeb && availableQty > 0 && (
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
    const methodLabel =
        payment.payment_method === 'card'
            ? t('sales.payment.card')
            : payment.payment_method === 'transfer'
                ? t('sales.payment.transfer')
                : t('sales.payment.cash');

    return (
        <View style={[byItemsStyles.paidCard, { borderColor: palette.border }]}>
            <View style={byItemsStyles.paidHeader}>
                <ThemedText type="defaultSemiBold" style={byItemsStyles.paidTitle}>
                    {t('sales.splitPayment.payment')} {index + 1}
                </ThemedText>
                <View style={[byItemsStyles.methodBadge, { backgroundColor: palette.tint }]}>
                    <ThemedText style={[byItemsStyles.methodBadgeText, { color: palette.card }]}>{methodLabel}</ThemedText>
                </View>
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
            {printMessage ? (
                <ThemedText style={byItemsStyles.paidPrintMessage}>{printMessage}</ThemedText>
            ) : null}
            <ThemedButton
                label={printBusy ? `${t('sales.splitPayment.printPartial')}...` : t('sales.splitPayment.printPartial')}
                variant="secondary"
                disabled={printBusy}
                onPress={onPrint}
            />
        </View>
    );
}

// ─── Full Payment Tab ─────────────────────────────────────────────────────────

type FullPaymentTabProps = {
    sale: Sale;
    business: PaymentModalBusiness;
};

function FullPaymentTab({ sale, business }: FullPaymentTabProps) {
    const palette = useAppColors();
    const { markOrderPaid } = useSalesStore();
    const { methods } = usePaymentMethodsStore();
    const activeMethods = methods.filter((m) => m.is_active);

    const alreadyPaid = !!sale.paid_at;
    const [paymentMethodId, setPaymentMethodId] = useState<string>(
        sale.payment_method ?? (activeMethods[0]?.id ?? ''),
    );
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [confirmed, setConfirmed] = useState(alreadyPaid);
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
    const [receiptLoading, setReceiptLoading] = useState(false);
    const [printBusy, setPrintBusy] = useState(false);
    const [printMessage, setPrintMessage] = useState<string | null>(null);

    const loadReceipt = async (overrideMethodId?: string) => {
        setReceiptLoading(true);
        setPrintMessage(null);
        try {
            const [items, pricing] = await Promise.all([
                salesService.getSaleItems(sale.id),
                salesService.getSalePricingSummary(sale.id),
            ]);

            const effectiveId = overrideMethodId ?? paymentMethodId;
            const effectiveMethod = methods.find(m => m.id === effectiveId)?.name ?? effectiveId;
            const pricingSummary = pricing ?? {
                subtotal: items.reduce((s, i) => s + Number(i.line_subtotal ?? 0), 0),
                item_discount_total: items.reduce((s, i) => s + Number(i.discount_amount ?? 0), 0),
                global_discount_name: null,
                global_discount_type: null,
                global_discount_value: null,
                global_discount_amount: 0,
                order_type_surcharge: 0,
                total: Number(sale.total ?? 0),
                discount_applied_by: null,
            };

            const receipt = buildReceiptData({
                sale: {
                    id: sale.id,
                    created_at: Number(sale.created_at),
                    staff_name: sale.staff_name,
                    table_name: sale.table_name,
                    payment_method: effectiveMethod,
                    status: sale.status,
                    paid_at: sale.paid_at ?? null,
                },
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
                taxConfig: { label: 'IVA', rate: business.taxRate, inclusive: true },
                paperWidth: business.paperWidth,
            });
            setReceiptData(receipt);
        } finally {
            setReceiptLoading(false);
        }
    };

    useEffect(() => {
        const hasSelected = activeMethods.some((m) => m.id === paymentMethodId);
        if (!hasSelected) {
            setPaymentMethodId(activeMethods[0]?.id ?? '');
        }
    }, [activeMethods, paymentMethodId]);

    useEffect(() => {
        void loadReceipt();
    }, [sale.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleConfirm = async () => {
        if (confirmBusy || confirmed) return;
        setConfirmBusy(true);
        try {
            await markOrderPaid(sale.id, paymentMethodId);
            setConfirmed(true);
            await loadReceipt(paymentMethodId);
        } finally {
            setConfirmBusy(false);
        }
    };

    const handlePrint = async () => {
        if (!receiptData || printBusy) return;
        setPrintBusy(true);
        setPrintMessage(null);
        try {
            await printService.printReceipt(receiptData, {
                name: business.printerDeviceName ?? undefined,
                address: business.printerDeviceAddress ?? undefined,
            });
            const status = await printService.getStatus({
                name: business.printerDeviceName ?? undefined,
                address: business.printerDeviceAddress ?? undefined,
            });
            if (status.mode === 'native-pending') {
                setPrintMessage(t('sales.receipt.pendingAdapter'));
            }
        } catch (err) {
            setPrintMessage(String((err as Error).message || t('sales.receipt.error')));
        } finally {
            setPrintBusy(false);
        }
    };

    return (
        <View style={fullStyles.container}>
            {receiptLoading && (
                <ThemedText style={fullStyles.dimText}>{t('sales.receipt.loading')}</ThemedText>
            )}
            {receiptData && <ReceiptPreview receipt={receiptData} />}
            {!receiptLoading && !confirmed && (
                <View style={fullStyles.paySection}>
                    <ThemedText style={fullStyles.label}>{t('sales.paymentMethod')}</ThemedText>
                    <ThemedSelect
                        value={paymentMethodId}
                        onValueChange={(v) => setPaymentMethodId(v)}
                        items={activeMethods.map((m) => ({ label: m.name, value: m.id }))}
                        placeholder={t('shared.select.placeholder')}
                    />
                    <ThemedButton
                        label={confirmBusy ? t('sales.payment.confirming') : t('sales.payment.confirmFull')}
                        disabled={confirmBusy || !paymentMethodId}
                        onPress={() => void handleConfirm()}
                    />
                </View>
            )}
            {!receiptLoading && confirmed && (
                <View style={[fullStyles.paidBadge, { backgroundColor: `${palette.tint}20`, borderColor: palette.tint }]}>
                    <ThemedText style={[fullStyles.paidBadgeText, { color: palette.tint }]}>
                        {t('sales.payment.paid')}
                    </ThemedText>
                </View>
            )}
            {printMessage ? (
                <ThemedText style={fullStyles.printMessage}>{printMessage}</ThemedText>
            ) : null}
            <ThemedButton
                label={printBusy ? `${t('sales.action.printReceipt')}...` : t('sales.action.printReceipt')}
                variant="secondary"
                disabled={!receiptData || printBusy}
                onPress={() => void handlePrint()}
            />
        </View>
    );
}

// ─── By-Items Tab ─────────────────────────────────────────────────────────────

type ByItemsTabProps = {
    sale: Sale;
    business: PaymentModalBusiness;
};

function ByItemsTab({ sale, business }: ByItemsTabProps) {
    const palette = useAppColors();
    const isWeb = Platform.OS === 'web';
    const { getSalePaymentBoard, createPartialPayment } = useSalesStore();

    const { methods } = usePaymentMethodsStore();
    const activeMethods = methods.filter((m) => m.is_active);
    const [board, setBoard] = useState<SalePaymentBoard | null>(null);
    const [boardLoading, setBoardLoading] = useState(false);
    const [selectedLines, setSelectedLines] = useState<Record<string, number>>({});
    const [paymentMethodId, setPaymentMethodId] = useState<string>('');
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [printingPaymentId, setPrintingPaymentId] = useState<string | null>(null);
    const [printMessages, setPrintMessages] = useState<Record<string, string>>({});
    const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

    const boardRef = useRef<SalePaymentBoard | null>(null);
    boardRef.current = board;

    const col2Ref = useRef<View>(null);

    useEffect(() => {
        setBoard(null);
        setSelectedLines({});
        setPaymentMethodId(sale.payment_method ?? activeMethods[0]?.id ?? '');
        setPrintingPaymentId(null);
        setPrintMessages({});
        setBoardLoading(true);
        void getSalePaymentBoard(sale.id)
            .then((b) => setBoard(b))
            .catch(() => { })
            .finally(() => setBoardLoading(false));
    }, [sale.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const hasSelected = activeMethods.some((m) => m.id === paymentMethodId);
        if (!hasSelected) {
            setPaymentMethodId(activeMethods[0]?.id ?? '');
        }
    }, [activeMethods, paymentMethodId]);

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const el = col2Ref.current as unknown as HTMLElement | null;
        if (!el) return;

        const handleDragOver = (e: DragEvent) => {
            if (!e.dataTransfer?.types.includes('application/x-payment-item-id')) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        };

        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            const itemId = e.dataTransfer?.getData('application/x-payment-item-id');
            if (!itemId || !boardRef.current) return;
            const boardItem = boardRef.current.pending.find((i) => i.sale_item_id === itemId);
            if (!boardItem) return;
            setSelectedLines((prev) => {
                const current = prev[itemId] ?? 0;
                const available = boardItem.quantity_pending - current;
                if (available <= 0) return prev;
                return { ...prev, [itemId]: current + 1 };
            });
        };

        el.addEventListener('dragover', handleDragOver);
        el.addEventListener('drop', handleDrop);
        return () => {
            el.removeEventListener('dragover', handleDragOver);
            el.removeEventListener('drop', handleDrop);
        };
    }, []);

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
        if (!sale || selectedItems.length === 0 || confirmBusy) return;
        const lines = selectedItems.map(({ boardItem, qty }) => ({ saleItemId: boardItem.sale_item_id, quantity: qty }));
        setConfirmBusy(true);
        try {
            await createPartialPayment({ orderId: sale.id, paymentMethodId, lines });
            const newBoard = await getSalePaymentBoard(sale.id);
            setBoard(newBoard);
            setSelectedLines({});
        } finally {
            setConfirmBusy(false);
        }
    };

    const handlePrintPayment = async (payment: SalePayment) => {
        if (!sale || printingPaymentId !== null) return;
        setPrintingPaymentId(payment.id);
        setPrintMessages((prev) => { const next = { ...prev }; delete next[payment.id]; return next; });
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

    const col1 = (
        <View style={[byItemsStyles.column, { borderColor: palette.border }]}>
            <ThemedText type="defaultSemiBold" style={byItemsStyles.columnTitle}>
                {t('sales.splitPayment.pendingColumn')}
            </ThemedText>
            {boardLoading && <ThemedText style={byItemsStyles.dimText}>{t('sales.loadingProducts')}</ThemedText>}
            {!boardLoading && pendingItems.length === 0 && (
                <ThemedText style={byItemsStyles.dimText}>{t('sales.splitPayment.noPending')}</ThemedText>
            )}
            {!boardLoading && pendingItems.length > 0 && pendingItems.every((i) => getAvailableQty(i) === 0) && (
                <ThemedText style={[byItemsStyles.dimText, { color: palette.tint }]}>
                    {t('sales.splitPayment.allPaid')}
                </ThemedText>
            )}
            {pendingItems.map((item) => (
                <PendingItemRow
                    key={item.sale_item_id}
                    item={item}
                    availableQty={getAvailableQty(item)}
                    isWeb={isWeb}
                    onAdd={() => handleAddItem(item)}
                    onAddAll={() => handleAddItem(item, item.quantity_pending)}
                    onDragStart={(id) => setDraggingItemId(id)}
                    onDragEnd={() => setDraggingItemId(null)}
                />
            ))}
        </View>
    );

    const col2 = (
        <View
            ref={col2Ref}
            style={[
                byItemsStyles.column,
                byItemsStyles.selectedColumn,
                { borderColor: palette.border },
                draggingItemId !== null && isWeb
                    ? { borderColor: palette.tint, borderWidth: 2, backgroundColor: `${palette.tint}10` }
                    : null,
            ]}
        >
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
                    <View style={[byItemsStyles.itemRow, byItemsStyles.totalRow, { borderColor: palette.border }]}>
                        <ThemedText type="defaultSemiBold">{t('sales.receipt.totalLabel')}</ThemedText>
                        <ThemedText type="defaultSemiBold">${selectedTotal.toFixed(2)}</ThemedText>
                    </View>
                    <ThemedText style={byItemsStyles.smallLabel}>{t('sales.paymentMethod')}</ThemedText>
                    <ThemedSelect
                        value={paymentMethodId}
                        onValueChange={(v) => setPaymentMethodId(v)}
                        items={activeMethods.map((m) => ({ label: m.name, value: m.id }))}
                        placeholder={t('shared.select.placeholder')}
                    />
                    <ThemedButton
                        label={confirmBusy ? t('sales.splitPayment.confirmingPartial') : t('sales.splitPayment.confirmPartial')}
                        disabled={confirmBusy || selectedItems.length === 0 || !paymentMethodId}
                        onPress={() => void handleConfirm()}
                    />
                </View>
            )}
        </View>
    );

    const col3 = (
        <View style={[byItemsStyles.column, { borderColor: palette.border }]}>
            <ThemedText type="defaultSemiBold" style={byItemsStyles.columnTitle}>
                {t('sales.splitPayment.paidColumn')}
            </ThemedText>
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
        </View>
    );

    return (
        <View>
            {allPaid && (
                <ThemedText style={[byItemsStyles.allPaidLabel, { color: palette.tint }]}>
                    {t('sales.splitPayment.allPaid')}
                </ThemedText>
            )}
            <ScrollView
                style={byItemsStyles.boardScroll}
                contentContainerStyle={isWeb ? byItemsStyles.contentWeb : byItemsStyles.contentMobile}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
            >
                {isWeb ? (
                    <View style={byItemsStyles.boardRow}>
                        {col1}
                        {col2}
                        {col3}
                    </View>
                ) : (
                    <>
                        {col1}
                        {col2}
                        {col3}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

// ─── Equal Split Tab ──────────────────────────────────────────────────────────

type EqualPart = {
    method: string;
    confirmed: boolean;
};

type EqualSplitTabProps = {
    sale: Sale;
    business: PaymentModalBusiness;
};

function EqualSplitTab({ sale, business }: EqualSplitTabProps) {
    const palette = useAppColors();
    const { markOrderPaid } = useSalesStore();
    const { methods } = usePaymentMethodsStore();
    const activeMethods = methods.filter((m) => m.is_active);

    const alreadyPaid = !!sale.paid_at;
    const [numParts, setNumParts] = useState(2);
    const [parts, setParts] = useState<EqualPart[]>(() => [
        { method: activeMethods[0]?.id ?? '', confirmed: false },
        { method: activeMethods[0]?.id ?? '', confirmed: false },
    ]);
    const [finalizeBusy, setFinalizeBusy] = useState(false);
    const [finalized, setFinalized] = useState(alreadyPaid);
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
    const [receiptLoading, setReceiptLoading] = useState(false);
    const [printBusy, setPrintBusy] = useState(false);
    const [printMessage, setPrintMessage] = useState<string | null>(null);

    useEffect(() => {
        setParts((prev) => {
            const next = [...prev];
            while (next.length < numParts) {
                next.push({ method: activeMethods[0]?.id ?? '', confirmed: false });
            }

            return next.slice(0, numParts).map((part) => (
                part.method ? part : { ...part, method: activeMethods[0]?.id ?? '' }
            ));
        });
    }, [activeMethods, numParts]);

    const loadReceipt = async (methodId: string) => {
        setReceiptLoading(true);
        setPrintMessage(null);
        try {
            const [items, pricing] = await Promise.all([
                salesService.getSaleItems(sale.id),
                salesService.getSalePricingSummary(sale.id),
            ]);
            const pricingSummary = pricing ?? {
                subtotal: items.reduce((s, i) => s + Number(i.line_subtotal ?? 0), 0),
                item_discount_total: items.reduce((s, i) => s + Number(i.discount_amount ?? 0), 0),
                global_discount_name: null,
                global_discount_type: null,
                global_discount_value: null,
                global_discount_amount: 0,
                order_type_surcharge: 0,
                total: Number(sale.total ?? 0),
                discount_applied_by: null,
            };
            const receipt = buildReceiptData({
                sale: {
                    id: sale.id,
                    created_at: Number(sale.created_at),
                    staff_name: sale.staff_name,
                    table_name: sale.table_name,
                    payment_method: methods.find(m => m.id === methodId)?.name ?? methodId,
                    status: sale.status,
                    paid_at: sale.paid_at ?? null,
                },
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
                taxConfig: { label: 'IVA', rate: business.taxRate, inclusive: true },
                paperWidth: business.paperWidth,
            });
            setReceiptData(receipt);
        } finally {
            setReceiptLoading(false);
        }
    };

    useEffect(() => {
        if (alreadyPaid) {
            void loadReceipt(sale.payment_method ?? activeMethods[0]?.id ?? '');
        }
    }, [sale.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const allConfirmed = parts.length > 0 && parts.every((p) => p.confirmed);
    const perPartAmount = numParts > 0 ? Number(sale.total) / numParts : 0;

    const handleConfirmPart = (idx: number) => {
        setParts((prev) => prev.map((p, i) => (i === idx ? { ...p, confirmed: true } : p)));
    };

    const handleSetMethod = (idx: number, method: string) => {
        setParts((prev) => prev.map((p, i) => (i === idx ? { ...p, method } : p)));
    };

    const handleFinalize = async () => {
        if (finalizeBusy || !allConfirmed || finalized) return;
        setFinalizeBusy(true);
        const dominantMethodId = parts[0]?.method ?? (activeMethods[0]?.id ?? '');
        try {
            await markOrderPaid(sale.id, dominantMethodId);
            setFinalized(true);
            await loadReceipt(dominantMethodId);
        } finally {
            setFinalizeBusy(false);
        }
    };

    const handlePrint = async () => {
        if (!receiptData || printBusy) return;
        setPrintBusy(true);
        setPrintMessage(null);
        try {
            await printService.printReceipt(receiptData, {
                name: business.printerDeviceName ?? undefined,
                address: business.printerDeviceAddress ?? undefined,
            });
            const status = await printService.getStatus({
                name: business.printerDeviceName ?? undefined,
                address: business.printerDeviceAddress ?? undefined,
            });
            if (status.mode === 'native-pending') {
                setPrintMessage(t('sales.receipt.pendingAdapter'));
            }
        } catch (err) {
            setPrintMessage(String((err as Error).message || t('sales.receipt.error')));
        } finally {
            setPrintBusy(false);
        }
    };

    return (
        <View style={equalStyles.container}>
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
                            <ThemedSelect
                                value={part.method}
                                onValueChange={(v) => handleSetMethod(idx, v)}
                                items={activeMethods.map((m) => ({ label: m.name, value: m.id }))}
                                placeholder={t('shared.select.placeholder')}
                            />
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
                    onPress={() => void handleFinalize()}
                />
            )}

            {finalized && (
                <>
                    <View style={[fullStyles.paidBadge, { backgroundColor: `${palette.tint}20`, borderColor: palette.tint }]}>
                        <ThemedText style={[fullStyles.paidBadgeText, { color: palette.tint }]}>
                            {t('sales.payment.paid')}
                        </ThemedText>
                    </View>
                    {receiptLoading && (
                        <ThemedText style={equalStyles.label}>{t('sales.receipt.loading')}</ThemedText>
                    )}
                    {receiptData && <ReceiptPreview receipt={receiptData} />}
                    {printMessage ? (
                        <ThemedText style={fullStyles.printMessage}>{printMessage}</ThemedText>
                    ) : null}
                    <ThemedButton
                        label={printBusy ? `${t('sales.action.printReceipt')}...` : t('sales.action.printReceipt')}
                        variant="secondary"
                        disabled={!receiptData || printBusy}
                        onPress={() => void handlePrint()}
                    />
                </>
            )}
        </View>
    );
}

// ─── Mode Selector ────────────────────────────────────────────────────────────

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
            <ThemedText style={[modeStyles.tabLabel, active && { color: palette.card }]}>
                {label}
            </ThemedText>
        </Pressable>
    );
}

// ─── Main PaymentModal ────────────────────────────────────────────────────────

type Props = {
    visible: boolean;
    sale: Sale | null;
    onClose: () => void;
    business: PaymentModalBusiness;
};

export function PaymentModal({ visible, sale, onClose, business }: Props) {
    const isWeb = Platform.OS === 'web';
    const [mode, setMode] = useState<PaymentMode>('full');

    useEffect(() => {
        if (visible) setMode('full');
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={modalStyles.backdrop}>
                <ThemedCard style={[modalStyles.card, isWeb && modalStyles.cardWeb]}>
                    <View style={modalStyles.header}>
                        <ThemedText type="subtitle">
                            {t('sales.payment.modalTitle')}
                            {sale ? ` #${sale.id.slice(0, 6)}` : ''}
                        </ThemedText>
                    </View>

                    <View style={modalStyles.modeTabs}>
                        <ModeTab
                            label={t('sales.payment.modeFull')}
                            active={mode === 'full'}
                            onPress={() => setMode('full')}
                        />
                        <ModeTab
                            label={t('sales.payment.modeByItems')}
                            active={mode === 'by-items'}
                            onPress={() => setMode('by-items')}
                        />
                        <ModeTab
                            label={t('sales.payment.modeEqual')}
                            active={mode === 'equal'}
                            onPress={() => setMode('equal')}
                        />
                    </View>

                    <ScrollView
                        style={modalStyles.content}
                        contentContainerStyle={modalStyles.contentInner}
                        showsVerticalScrollIndicator={false}
                    >
                        {sale && mode === 'full' && (
                            <FullPaymentTab key={`full-${sale.id}`} sale={sale} business={business} />
                        )}
                        {sale && mode === 'by-items' && (
                            <ByItemsTab key={`by-items-${sale.id}`} sale={sale} business={business} />
                        )}
                        {sale && mode === 'equal' && (
                            <EqualSplitTab key={`equal-${sale.id}`} sale={sale} business={business} />
                        )}
                    </ScrollView>

                    <ThemedButton variant="secondary" label={t('shared.close')} onPress={onClose} />
                </ThemedCard>
            </View>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: 12,
    },
    card: {
        maxHeight: '95%',
        gap: 8,
    },
    cardWeb: {
        maxWidth: 1100,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modeTabs: {
        flexDirection: 'row',
        gap: 6,
    },
    content: {
        flexShrink: 1,
    },
    contentInner: {
        gap: 12,
        paddingBottom: 8,
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
    container: {
        gap: 10,
    },
    dimText: {
        opacity: 0.5,
        fontSize: 13,
    },
    label: {
        fontSize: 13,
        opacity: 0.8,
    },
    paySection: {
        gap: 8,
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
    printMessage: {
        fontSize: 12,
        opacity: 0.8,
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
});

const byItemsStyles = StyleSheet.create({
    boardScroll: {
        flexShrink: 1,
    },
    contentWeb: {
        gap: 12,
        paddingBottom: 8,
    },
    contentMobile: {
        gap: 12,
        paddingBottom: 8,
    },
    boardRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    allPaidLabel: {
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'right',
        marginBottom: 4,
    },
    column: {
        flex: 1,
        minWidth: 220,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 10,
        padding: 10,
        gap: 8,
    },
    selectedColumn: {
        flex: 1.3,
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
    methodBadgeText: {
        fontSize: 11,
        fontWeight: '700',
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
});
