import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PaymentMethodBadge } from '@/components/payment-method-display';
import { PendingPaymentItemRow, SelectedPaymentItemRow } from '@/components/payment-split-rows';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { printService, salesService } from '@/services';
import { usePaymentMethodsStore } from '@/stores/payment-methods';
import { useSalesStore } from '@/stores/sales';
import type { ReceiptPaperWidth } from '@/types/receipt';
import type { SalePayment, SalePaymentBoard, SalePaymentBoardItem } from '@/types/sales';
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

export type SplitPaymentBusiness = {
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
        <View style={[styles.paidCard, { borderColor: palette.border }]}>
            <View style={styles.paidHeader}>
                <ThemedText type="defaultSemiBold" style={styles.paidTitle}>
                    {t('sales.splitPayment.payment')} {index + 1}
                </ThemedText>
                <PaymentMethodBadge
                    methodId={payment.payment_method}
                    containerStyle={styles.methodBadge}
                />
            </View>
            {payment.lines.map((line) => (
                <View key={line.payment_item_id} style={styles.paidLine}>
                    <ThemedText style={styles.paidLineName}>
                        {line.product_name} x{line.quantity_paid}
                    </ThemedText>
                    <ThemedText style={styles.paidLineAmount}>${line.line_total.toFixed(2)}</ThemedText>
                </View>
            ))}
            <View style={[styles.paidLine, styles.paidTotalRow]}>
                <ThemedText type="defaultSemiBold">{t('sales.receipt.totalLabel')}</ThemedText>
                <ThemedText type="defaultSemiBold">${payment.total.toFixed(2)}</ThemedText>
            </View>
            {printMessage ? (
                <ThemedText style={styles.paidPrintMessage}>{printMessage}</ThemedText>
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

type Props = {
    visible: boolean;
    sale: Sale | null;
    onClose: () => void;
    business: SplitPaymentBusiness;
};

export function SplitPaymentModal({ visible, sale, onClose, business }: Props) {
    const palette = useAppColors();
    const isWeb = Platform.OS === 'web';
    const { getSalePaymentBoard, createPartialPayment } = useSalesStore();
    const { methods } = usePaymentMethodsStore();
    const activeMethods = methods.filter((m) => m.is_active);
    const displayMethods = activeMethods.length > 0 ? activeMethods : methods;

    const [board, setBoard] = useState<SalePaymentBoard | null>(null);
    const [boardLoading, setBoardLoading] = useState(false);
    const [selectedLines, setSelectedLines] = useState<Record<string, number>>({});
    const [paymentMethodId, setPaymentMethodId] = useState<string>('');
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [printingPaymentId, setPrintingPaymentId] = useState<string | null>(null);
    const [printMessages, setPrintMessages] = useState<Record<string, string>>({});
    const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

    // Stable ref for drag-drop closure
    const boardRef = useRef<SalePaymentBoard | null>(null);
    boardRef.current = board;

    // Drop-zone ref for column 2 (web)
    const col2Ref = useRef<View>(null);

    useEffect(() => {
        if (!visible || !sale) return;
        setBoard(null);
        setSelectedLines({});
        setPaymentMethodId(sale.payment_method ?? displayMethods[0]?.id ?? '');
        setPrintingPaymentId(null);
        setPrintMessages({});
        setBoardLoading(true);
        void getSalePaymentBoard(sale.id)
            .then((b) => setBoard(b))
            .catch(() => { })
            .finally(() => setBoardLoading(false));
    }, [sale.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const hasSelected = displayMethods.some((m) => m.id === paymentMethodId);
        if (!hasSelected) {
            setPaymentMethodId(displayMethods[0]?.id ?? '');
        }
    }, [displayMethods, paymentMethodId]);

    // Register drop zone on col2 (web only, stable effect)
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

    const selectedItems = buildSelectedItems(selectedLines, pendingItems);

    const selectedTotal = computeSelectedTotal(selectedItems);

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

    const allPaid =
        !boardLoading && board !== null && board.pending.every((i) => i.quantity_pending === 0);

    /* ── Column 1: Pending ──────────────────────────────────────────────── */
    const col1 = (
        <View style={[styles.column, { borderColor: palette.border }]}>
            <ThemedText type="defaultSemiBold" style={styles.columnTitle}>
                {t('sales.splitPayment.pendingColumn')}
            </ThemedText>
            {boardLoading && <ThemedText style={styles.dimText}>{t('sales.loadingProducts')}</ThemedText>}
            {!boardLoading && pendingItems.length === 0 && (
                <ThemedText style={styles.dimText}>{t('sales.splitPayment.noPending')}</ThemedText>
            )}
            {!boardLoading &&
                pendingItems.length > 0 &&
                pendingItems.every((i) => getAvailableQty(i) === 0) && (
                    <ThemedText style={[styles.dimText, { color: palette.tint }]}>
                        {t('sales.splitPayment.allPaid')}
                    </ThemedText>
                )}
            {pendingItems.map((item) => (
                <PendingPaymentItemRow
                    key={item.sale_item_id}
                    item={item}
                    availableQty={getAvailableQty(item, selectedLines)}
                    rowStyles={styles}
                    isWeb={isWeb}
                    onAdd={() => handleAddItem(item)}
                    onAddAll={() => handleAddItem(item, item.quantity_pending)}
                    onDragStart={(id) => setDraggingItemId(id)}
                    onDragEnd={() => setDraggingItemId(null)}
                    showButtonsOnWeb={false}
                />
            ))}
        </View>
    );

    /* ── Column 2: Selected / To Pay ────────────────────────────────────── */
    const col2 = (
        <View
            ref={col2Ref}
            style={[
                styles.column,
                styles.selectedColumn,
                { borderColor: palette.border },
                draggingItemId !== null && isWeb
                    ? { borderColor: palette.tint, borderWidth: 2, backgroundColor: `${palette.tint}10` }
                    : null,
            ]}
        >
            <ThemedText type="defaultSemiBold" style={styles.columnTitle}>
                {t('sales.splitPayment.selectedColumn')}
            </ThemedText>
            {selectedItems.length === 0 && (
                <ThemedText style={styles.dimText}>{t('sales.splitPayment.noSelected')}</ThemedText>
            )}
            {selectedItems.map(({ boardItem, qty }) => (
                <SelectedPaymentItemRow
                    key={boardItem.sale_item_id}
                    item={boardItem}
                    qty={qty}
                    rowStyles={styles}
                    onRemove={() => handleRemoveSelected(boardItem.sale_item_id)}
                    onAdjust={(delta) => handleAdjustSelectedQty(boardItem.sale_item_id, delta)}
                />
            ))}
            {selectedItems.length > 0 && (
                <View style={styles.selectedFooter}>
                    <View style={[styles.itemRow, styles.totalRow, { borderColor: palette.border }]}>
                        <ThemedText type="defaultSemiBold">{t('sales.receipt.totalLabel')}</ThemedText>
                        <ThemedText type="defaultSemiBold">${selectedTotal.toFixed(2)}</ThemedText>
                    </View>
                    <ThemedText style={styles.smallLabel}>{t('sales.paymentMethod')}</ThemedText>
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
                                    size={16}
                                    color={paymentMethodId === method.id ? palette.text : palette.mutedText}
                                />
                                <ThemedText style={[styles.paymentChipLabel, paymentMethodId === method.id && { color: palette.text }]}>
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
    );

    /* ── Column 3: Paid ─────────────────────────────────────────────────── */
    const col3 = (
        <View style={[styles.column, { borderColor: palette.border }]}>
            <ThemedText type="defaultSemiBold" style={styles.columnTitle}>
                {t('sales.splitPayment.paidColumn')}
            </ThemedText>
            {(board?.paid.length ?? 0) === 0 && (
                <ThemedText style={styles.dimText}>{t('sales.splitPayment.noPaid')}</ThemedText>
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
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <ThemedCard style={[styles.boardCard, isWeb && styles.boardCardWeb]}>
                    <View style={styles.boardHeader}>
                        <ThemedText type="subtitle">
                            {t('sales.splitPayment.title')}
                            {sale ? ` #${sale.id.slice(0, 6)}` : ''}
                        </ThemedText>
                        {allPaid && (
                            <ThemedText style={[styles.allPaidLabel, { color: palette.tint }]}>
                                {t('sales.splitPayment.allPaid')}
                            </ThemedText>
                        )}
                    </View>
                    <ScrollView
                        style={styles.boardScroll}
                        contentContainerStyle={isWeb ? styles.contentWeb : styles.contentMobile}
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                    >
                        {isWeb ? (
                            <View style={styles.boardRow}>
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
                    <ThemedButton variant="secondary" label={t('shared.close')} onPress={onClose} />
                </ThemedCard>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: 12,
    },
    boardCard: {
        maxHeight: '95%',
        gap: 8,
    },
    boardCardWeb: {
        maxWidth: 1100,
        alignSelf: 'center',
        width: '100%',
    },
    boardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    allPaidLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
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
