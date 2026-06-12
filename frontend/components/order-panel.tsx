import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { toast } from 'sonner-native';

import { ByItemsTab } from '@/components/order-panel/by-items-tab';
import { EqualSplitTab } from '@/components/order-panel/equal-split-tab';
import { FullPaymentTab } from '@/components/order-panel/full-payment-tab';
import { OrderDetailView } from '@/components/order-panel/order-detail-view';
import { OrderReceiptView } from '@/components/order-panel/order-receipt-view';
import type { PaymentModalBusiness, ReceiptVariant } from '@/components/order-panel/types';
import { ThemedText } from '@/components/themed-text';
import { TipSelectorModal } from '@/components/tip-selector-modal';
import { SlidePanelShell } from '@/components/ui/slide-panel';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { printService, salesService } from '@/services';
import { useSalesStore } from '@/stores/sales';
import { useSettingsStore } from '@/stores/settings';
import type { ReceiptData } from '@/types/receipt';
import type { SaleItemDetail, SalePricingSummary } from '@/types/sales';
import type { Sale } from '@/types/types';
import { money } from '@/utils/money';
import { printSaleComanda } from '@/utils/print-comanda';
import { buildPartialReceiptData, buildReceiptData } from '@/utils/receipt';
import { buildFallbackPricingSummary } from '@/utils/sale-pricing';
import { getReceiptSurchargeBreakdown } from '@/utils/surcharge';

type PanelView = 'detail' | 'payment' | 'receipt';
type PaymentMode = 'full' | 'by-items' | 'equal';

type OrderPanelProps = {
    visible: boolean;
    sale: Sale | null;
    onClose: () => void;
    onExited: () => void;
    business: PaymentModalBusiness;
    /** When true, renders content directly without SlidePanelShell (for full-screen stack screens). */
    standalone?: boolean;
    /** Opens the draft editor inline (preferred on wide screens). Falls back to route navigation when omitted. */
    onEditOrder?: (saleId: string) => void;
    /** Which view to show when the panel opens. Defaults to 'detail'. */
    initialView?: 'detail' | 'payment';
};

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

export function OrderPanel({ visible, sale: saleProp, onClose, onExited, business, standalone, onEditOrder, initialView }: OrderPanelProps) {
    const palette = useAppColors();
    const { width: screenWidth } = useWindowDimensions();
    const panelWidth = standalone ? screenWidth : Math.min(Math.floor(screenWidth * 0.42), 520);
    const toGoSurcharge = useSettingsStore((state) => state.toGoSurcharge);

    const { tables, sendToKitchen, markOrderReady, cancelOrder } = useSalesStore();

    // The prop is a snapshot captured when the panel was opened. Subscribe to the
    // live order from the store so status changes (e.g. after marking ready or
    // paid) immediately update the action buttons instead of showing stale ones.
    const liveSale = useSalesStore((state) => state.sales.find((s) => s.id === saleProp?.id));
    const sale = liveSale ?? saleProp;

    const viewOffset = useRef(new Animated.Value(0)).current;
    const prevVisibleRef = useRef(false);

    const [activeView, setActiveView] = useState<PanelView>('detail');
    const [receiptFromPayment, setReceiptFromPayment] = useState(false);
    const [mode, setMode] = useState<PaymentMode>('full');
    const [tipAmount, setTipAmount] = useState(0);
    const [tipPercent, setTipPercent] = useState<number | null>(null);
    const [tipModalVisible, setTipModalVisible] = useState(false);

    const [detailItems, setDetailItems] = useState<SaleItemDetail[]>([]);
    const [detailPricing, setDetailPricing] = useState<SalePricingSummary | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [actionBusy, setActionBusy] = useState(false);

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
            const totalTip = payments.reduce((sum, p) => sum + Number(p.tip_amount ?? 0), 0);

            const receipt = buildReceiptData({
                sale: nextSale,
                items,
                pricing: pricingSummary,
                tipAmount: totalTip,
                business: {
                    name: business.name,
                    address: business.address,
                    phone: business.phone,
                    nit: business.nit,
                    logoUri: business.logoUri,
                    logoRasterUrl: business.logoRasterUrl ?? null,
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

            // Multiple receipts only make sense when the order was split into
            // several payments (the by-items flow). Full and equal-split each
            // produce a single payment, so they show one consolidated receipt.
            const hasMultiplePayments = payments.length > 1;

            const variants: ReceiptVariant[] = [
                { id: 'full', label: t('sales.receipt.fullReceipt'), receipt },
                ...(hasMultiplePayments
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
                                logoRasterUrl: business.logoRasterUrl ?? null,
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

    const handlePrintComanda = (currentSale: Sale) =>
        printSaleComanda(currentSale, business, { items: detailItems, pricing: detailPricing });

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
            const startView = initialView ?? 'detail';
            setActiveView(startView);
            setReceiptFromPayment(false);
            setMode('full');
            setTipAmount(0);
            setTipPercent(null);
            // Opening straight to payment mirrors the in-panel pay flow: prompt for the tip.
            setTipModalVisible(startView === 'payment');
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
        } catch {
            toast.error(t('toast.error'));
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

    const innerContent = (
        <Animated.View style={[styles.viewContainer, { transform: [{ translateX: viewOffset }] }]}>
            {activeView === 'detail' && (
                <OrderDetailView
                    sale={sale}
                    items={detailItems}
                    pricing={detailPricing}
                    loading={detailLoading}
                    actionBusy={actionBusy}
                    tables={tables}
                    toGoSurcharge={toGoSurcharge}
                    onClose={onClose}
                    onNavigateToPayment={() => {
                        navigateTo('payment', 'forward');
                        setTipModalVisible(true);
                    }}
                    onNavigateToReceipt={() => {
                        setReceiptFromPayment(false);
                        void loadReceiptData(sale).then(() => navigateTo('receipt', 'forward'));
                    }}
                    onSendToKitchen={() => void runStatusAction(async () => {
                        await sendToKitchen(sale.id);
                        toast.success(t('toast.sendToKitchen'));
                    }).then(() => handlePrintComanda(sale))}
                    onMarkReady={() => void runStatusAction(async () => {
                        await markOrderReady(sale.id);
                        toast.success(t('toast.orderReady'));
                    })}
                    onCancelOrder={() => void runStatusAction(async () => {
                        await cancelOrder(sale.id);
                        toast.success(t('toast.orderCancelled'));
                        onClose();
                    })}
                    onPrintComanda={() => void handlePrintComanda(sale)}
                    onEditOrder={onEditOrder}
                />
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

                    <Pressable
                        style={[
                            styles.tipBar,
                            {
                                backgroundColor: tipAmount > 0 ? `${palette.tint}1A` : palette.card,
                                borderColor: palette.tint,
                            },
                        ]}
                        onPress={() => setTipModalVisible(true)}
                    >
                        <View style={[styles.tipIconCircle, { backgroundColor: `${palette.tint}26` }]}>
                            <Ionicons name="cash-outline" size={20} color={palette.tint} />
                        </View>
                        <View style={styles.tipBarTextWrap}>
                            <ThemedText style={[styles.tipBarTitle, { color: palette.tint }]}>
                                {t('sales.tip.label')}
                            </ThemedText>
                            {tipAmount > 0 ? (
                                <View style={styles.tipBarAmountRow}>
                                    <ThemedText style={[styles.tipBarAmount, { color: palette.text }]}>
                                        {money(tipAmount)}
                                    </ThemedText>
                                    {(() => {
                                        // Use the exact selected percentage for presets; only derive for a custom amount.
                                        const tipBase = detailPricing?.total ?? sale.total;
                                        const tipPct = tipPercent ?? (tipBase > 0 ? Math.round((tipAmount / tipBase) * 100) : 0);
                                        return tipPct > 0 ? (
                                            <View style={[styles.tipPctBadge, { backgroundColor: palette.tint }]}>
                                                <ThemedText style={[styles.tipPctBadgeText, { color: palette.card }]}>
                                                    {tipPct}%
                                                </ThemedText>
                                            </View>
                                        ) : null;
                                    })()}
                                </View>
                            ) : (
                                <ThemedText style={[styles.tipBarHint, { color: palette.mutedText }]}>
                                    {t('sales.tip.addButton')}
                                </ThemedText>
                            )}
                        </View>
                        <View style={[styles.tipEditButton, { borderColor: palette.tint }]}>
                            <Ionicons name="pencil" size={14} color={palette.tint} />
                            <ThemedText style={[styles.tipEditLabel, { color: palette.tint }]}>
                                {tipAmount > 0 ? t('common.edit') : t('common.add')}
                            </ThemedText>
                        </View>
                    </Pressable>

                    <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
                        {mode === 'full' && (
                            <FullPaymentTab key={`full-${sale.id}`} sale={sale} tipAmount={tipAmount} onPaymentComplete={() => void handlePaymentComplete()} />
                        )}
                        {mode === 'by-items' && (
                            <ByItemsTab key={`by-items-${sale.id}`} sale={sale} business={business} tipAmount={tipAmount} onPaymentComplete={() => void handlePaymentComplete()} />
                        )}
                        {mode === 'equal' && (
                            <EqualSplitTab key={`equal-${sale.id}`} sale={sale} tipAmount={tipAmount} onPaymentComplete={() => void handlePaymentComplete()} />
                        )}
                    </ScrollView>

                    <TipSelectorModal
                        visible={tipModalVisible}
                        baseAmount={detailPricing?.total ?? sale.total}
                        initialAmount={tipAmount}
                        onConfirm={(amount, percent) => { setTipAmount(amount); setTipPercent(percent); setTipModalVisible(false); }}
                        onCancel={() => setTipModalVisible(false)}
                        palette={palette}
                    />
                </>
            )}

            {activeView === 'receipt' && (
                <OrderReceiptView
                    sale={sale}
                    receiptData={receiptData}
                    receiptVariants={receiptVariants}
                    receiptMessage={receiptMessage}
                    loading={receiptLoading}
                    printingBusy={printingBusy}
                    fromPayment={receiptFromPayment}
                    onBack={() => {
                        if (receiptFromPayment) {
                            onClose();
                            return;
                        }
                        navigateTo('detail', 'back');
                    }}
                    onPrint={(receipt) => void handlePrintReceipt(receipt)}
                />
            )}
        </Animated.View>
    );

    if (standalone) {
        return innerContent;
    }

    return (
        <SlidePanelShell
            visible={visible}
            onClose={onClose}
            onExited={handleExited}
            width={panelWidth}
            backdropStyle={styles.backdrop}
            panelStyle={styles.panel}
        >
            {innerContent}
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
    tipBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: 12,
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    tipIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tipBarTextWrap: {
        flex: 1,
        gap: 1,
    },
    tipBarTitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tipBarAmountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tipBarAmount: {
        fontSize: 18,
        fontWeight: '800',
    },
    tipPctBadge: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    tipPctBadgeText: {
        fontSize: 12,
        fontWeight: '800',
    },
    tipBarHint: {
        fontSize: 13,
    },
    tipEditButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    tipEditLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    body: {
        flex: 1,
    },
    bodyContent: {
        padding: 12,
        gap: 10,
        paddingBottom: 24,
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

