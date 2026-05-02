import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { PaymentModal } from '@/components/payment-modal';
import { ReceiptPreview } from '@/components/receipt-preview';
import { SaleCanvasCard, type CanvasCardAction } from '@/components/sale-canvas-card';
import { SaleStatusLane } from '@/components/sale-status-lane';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { printService, salesService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useSalesStore } from '@/stores/sales';
import { useSettingsStore } from '@/stores/settings';
import type { ReceiptData } from '@/types/receipt';
import type { SaleItemDetail, SalePricingSummary } from '@/types/sales';
import type { OrderStatus, RestaurantTable, Sale } from '@/types/types';
import { buildReceiptData } from '@/utils/receipt';

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

function formatPaymentMethod(method: string | null | undefined) {
  if (method === 'card') {
    return t('sales.payment.card');
  }
  if (method === 'transfer') {
    return t('sales.payment.transfer');
  }
  if (!method) {
    return '';
  }
  return t('sales.payment.cash');
}

function formatStatusLabel(status: OrderStatus) {
  if (status === 'draft') {
    return t('sales.status.draft');
  }
  if (status === 'in-progress') {
    return t('sales.status.inProgress');
  }
  if (status === 'ready') {
    return t('sales.status.ready');
  }
  if (status === 'completed') {
    return t('sales.status.completed');
  }
  if (status === 'cancelled') {
    return t('sales.status.cancelled');
  }
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

const LANE_CONFIG: { status: OrderStatus; defaultExpanded: boolean }[] = [
  { status: 'draft', defaultExpanded: true },
  { status: 'in-progress', defaultExpanded: true },
  { status: 'ready', defaultExpanded: true },
  { status: 'completed', defaultExpanded: false },
  { status: 'cancelled', defaultExpanded: false },
];

function getLaneToneColor(status: OrderStatus, palette: ReturnType<typeof useAppColors>): string {
  if (status === 'draft') return palette.border;
  if (status === 'in-progress') return '#1565C0';
  if (status === 'ready') return palette.accent;
  if (status === 'completed') return palette.tint;
  if (status === 'cancelled') return '#B71C1C';
  return palette.border;
}

function getValidTargets(sale: Sale): OrderStatus[] {
  switch (sale.status) {
    case 'draft': return ['in-progress', 'cancelled'];
    case 'in-progress': return ['ready', 'cancelled'];
    case 'ready': return ['cancelled'];
    default: return [];
  }
}

function getTransitionAction(from: OrderStatus, to: OrderStatus): 'sendToKitchen' | 'markOrderReady' | 'cancelOrder' | null {
  if (to === 'in-progress' && from === 'draft') return 'sendToKitchen';
  if (to === 'ready') return 'markOrderReady';
  if (to === 'cancelled') return 'cancelOrder';
  return null;
}

export default function SalesScreen() {
  const palette = useAppColors();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const {
    hydrate,
    sales,
    tables,
    sendToKitchen,
    markOrderReady,
    cancelOrder,
  } = useSalesStore();
  const {
    toGoSurcharge,
    hydrateFromDb,
    businessName,
    businessAddress,
    businessPhone,
    businessLogoUri,
    receiptFooterMessage,
    printerPaperWidth,
    taxRate,
    printerDeviceName,
    printerDeviceAddress,
  } = useSettingsStore();

  const [saleProductsById, setSaleProductsById] = useState<Record<string, string>>({});
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [receiptPreviewVisible, setReceiptPreviewVisible] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptMessage, setReceiptMessage] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [printingBusy, setPrintingBusy] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentModalSale, setPaymentModalSale] = useState<Sale | null>(null);
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [detailItems, setDetailItems] = useState<SaleItemDetail[]>([]);
  const [detailPricing, setDetailPricing] = useState<SalePricingSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [draggingSale, setDraggingSale] = useState<Sale | null>(null);
  const [moveOrderSale, setMoveOrderSale] = useState<Sale | null>(null);

  useFocusEffect(
    useCallback(() => {
      void hydrate();
      void hydrateFromDb();
    }, [hydrate, hydrateFromDb]),
  );

  useEffect(() => {
    let isMounted = true;

    const loadSaleProducts = async () => {
      if (sales.length === 0) {
        if (isMounted) {
          setSaleProductsById({});
        }
        return;
      }

      const summaries = await Promise.all(
        sales.map(async (sale) => {
          const items = await salesService.getSaleItems(sale.id);
          const summary = items.map((item) => `${item.product_name} x${item.quantity}`).join(', ');
          return [sale.id, summary || t('sales.noProducts')] as const;
        }),
      );

      if (!isMounted) {
        return;
      }

      setSaleProductsById(Object.fromEntries(summaries));
    };

    void loadSaleProducts();

    return () => {
      isMounted = false;
    };
  }, [sales]);

  const salesByStatus = useMemo(() => {
    const map: Partial<Record<OrderStatus, Sale[]>> = {};
    for (const sale of sales) {
      if (!map[sale.status]) {
        map[sale.status] = [];
      }
      map[sale.status]!.push(sale);
    }
    return map;
  }, [sales]);

  const runOrderAction = async (saleId: string, action: () => Promise<void>) => {
    setBusyOrderId(saleId);
    try {
      await action();
    } finally {
      setBusyOrderId(null);
    }
  };

  const getActions = (sale: Sale): CanvasCardAction[] => {
    const disabled = busyOrderId === sale.id;

    if (sale.status === 'draft') {
      return [
        { label: t('sales.action.sendToKitchen'), onPress: () => void runOrderAction(sale.id, () => sendToKitchen(sale.id)), disabled },
        { label: t('sales.action.openTab'), variant: 'secondary', onPress: () => router.push(`/sale-form?orderId=${sale.id}`), disabled },
        { label: t('sales.action.payNow'), variant: 'secondary', onPress: () => void openPaymentFlow(sale), disabled },
        { label: t('sales.action.cancel'), variant: 'secondary', onPress: () => void runOrderAction(sale.id, () => cancelOrder(sale.id)), disabled },
      ];
    }

    if (sale.status === 'in-progress') {
      const actions: CanvasCardAction[] = [
        { label: t('sales.action.markReady'), onPress: () => void runOrderAction(sale.id, () => markOrderReady(sale.id)), disabled },
      ];
      if (!sale.paid_at) {
        actions.push({ label: t('sales.action.payNow'), variant: 'secondary', onPress: () => void openPaymentFlow(sale), disabled });
      } else {
        actions.push({ label: t('sales.action.previewReceipt'), variant: 'secondary', onPress: () => void openReceiptPreview(sale), disabled });
      }
      actions.push({ label: t('sales.action.cancel'), variant: 'secondary', onPress: () => void runOrderAction(sale.id, () => cancelOrder(sale.id)), disabled });
      return actions;
    }

    if (sale.status === 'ready') {
      const actions: CanvasCardAction[] = [];
      if (!sale.paid_at) {
        actions.push({ label: t('sales.action.receivePayment'), onPress: () => void openPaymentFlow(sale), disabled });
      } else {
        actions.push({ label: t('sales.action.previewReceipt'), variant: 'secondary', onPress: () => void openReceiptPreview(sale), disabled });
      }
      actions.push({ label: t('sales.action.cancel'), variant: 'secondary', onPress: () => void runOrderAction(sale.id, () => cancelOrder(sale.id)), disabled });
      return actions;
    }

    if (sale.status === 'completed' || Boolean(sale.paid_at)) {
      return [
        { label: t('sales.action.previewReceipt'), variant: 'secondary', onPress: () => void openReceiptPreview(sale), disabled },
      ];
    }

    return [];
  };

  const openDetail = async (sale: Sale) => {
    setDetailSale(sale);
    setDetailLoading(true);
    try {
      const [items, pricing] = await Promise.all([
        salesService.getSaleItems(sale.id),
        salesService.getSalePricingSummary(sale.id),
      ]);
      setDetailItems(items);
      setDetailPricing(pricing);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailSale(null);
    setDetailItems([]);
    setDetailPricing(null);
  };

  const loadReceiptData = async (sale: Sale) => {
    setReceiptData(null);
    setReceiptLoading(true);
    setReceiptMessage(null);

    try {
      const [items, pricing] = await Promise.all([
        salesService.getSaleItems(sale.id),
        salesService.getSalePricingSummary(sale.id),
      ]);

      const pricingSummary = pricing ?? buildFallbackPricingSummary(sale, items);
      const surchargeBreakdown = getReceiptSurchargeBreakdown(
        pricingSummary,
        sale.table_name,
        tables,
        toGoSurcharge,
      );

      const receipt = buildReceiptData({
        sale,
        items,
        pricing: pricingSummary,
        business: {
          name: businessName,
          address: businessAddress,
          phone: businessPhone,
          logoUri: businessLogoUri,
          footerMessage: receiptFooterMessage,
        },
        taxConfig: {
          label: 'IVA',
          rate: taxRate,
          inclusive: true,
        },
        paperWidth: printerPaperWidth,
        surchargeBreakdown,
      });

      setReceiptData(receipt);
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

  const openReceiptPreview = async (sale: Sale) => {
    setReceiptPreviewVisible(true);
    await loadReceiptData(sale);
  };

  const openPaymentFlow = (sale: Sale) => {
    setPaymentModalSale(sale);
    setPaymentModalVisible(true);
  };

  const handlePrintReceipt = async () => {
    if (!receiptData) {
      return;
    }

    setPrintingBusy(true);
    try {
      await printService.printReceipt(receiptData, {
        name: printerDeviceName,
        address: printerDeviceAddress,
      });
      const status = await printService.getStatus({
        name: printerDeviceName,
        address: printerDeviceAddress,
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

  const isWeb = Platform.OS === 'web';

  const handleDropOnLane = async (saleId: string, targetStatus: OrderStatus) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    const action = getTransitionAction(sale.status, targetStatus);
    if (!action) return;
    const actionMap = { sendToKitchen, markOrderReady, cancelOrder };
    await runOrderAction(saleId, () => actionMap[action](saleId));
  };

  const handleMoveOrder = async (targetStatus: OrderStatus) => {
    if (!moveOrderSale) return;
    const action = getTransitionAction(moveOrderSale.status, targetStatus);
    if (!action) return;
    const saleId = moveOrderSale.id;
    setMoveOrderSale(null);
    const actionMap = { sendToKitchen, markOrderReady, cancelOrder };
    await runOrderAction(saleId, () => actionMap[action](saleId));
  };

  const renderCard = (sale: Sale) => {
    const statusLabel = formatStatusLabel(sale.status);

    return (
      <SaleCanvasCard
        key={sale.id}
        orderId={sale.id}
        tableName={sale.table_name}
        productSummary={saleProductsById[sale.id] || t('sales.loadingProducts')}
        total={Number(sale.total)}
        paymentLabel={formatPaymentMethod(sale.payment_method)}
        isPaid={Boolean(sale.paid_at)}
        staffName={sale.staff_name}
        statusLabel={statusLabel}
        statusTone={getStatusTone(sale.status, palette)}
        actions={getActions(sale)}
        onPress={() => void openDetail(sale)}
        draggable={isWeb}
        isDragging={draggingSale?.id === sale.id}
        onDragStart={() => setDraggingSale(sale)}
        onDragEnd={() => setDraggingSale(null)}
        onLongPress={!isWeb ? () => setMoveOrderSale(sale) : undefined}
      />
    );
  };

  /* ── Shared modals ───────────────────────────────────── */

  const detailModal = (
    <Modal visible={detailSale !== null} transparent animationType="slide" onRequestClose={closeDetail}>
      <View style={styles.modalBackdrop}>
        <ThemedCard style={styles.modalCard}>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {detailSale && (
              <>
                <View style={styles.detailHeader}>
                  <ThemedText type="subtitle">
                    {t('sales.order')} #{detailSale.id.slice(0, 6)}
                  </ThemedText>
                  <View style={[styles.statusBadge, getStatusTone(detailSale.status, palette)]}>
                    <ThemedText style={[styles.statusBadgeText, { color: getStatusTone(detailSale.status, palette).color }]}>
                      {formatStatusLabel(detailSale.status)}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText style={styles.detailMeta}>
                  {detailSale.table_name}
                  {detailSale.paid_at && ' · Pagado'}
                  {detailSale.payment_method && ' · ' + formatPaymentMethod(detailSale.payment_method)}
                  {' · ' + detailSale.staff_name}
                </ThemedText>
                <ThemedText style={styles.detailMeta}>
                  {new Date(Number(detailSale.created_at) * 1000).toLocaleString()}
                </ThemedText>

                {detailLoading ? (
                  <ThemedText style={styles.smallText}>{t('sales.loadingProducts')}</ThemedText>
                ) : (
                  <>
                    {detailItems.length > 0 && (
                      <View style={styles.detailSection}>
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
                    )}

                    {detailPricing && (
                      <View style={styles.detailSection}>
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
                        {getSaleSurchargeLines(detailPricing, detailSale.table_name, tables, toGoSurcharge).map((line) => (
                          <ThemedText key={line} style={styles.detailRowLabel}>{line}</ThemedText>
                        ))}
                        <View style={[styles.detailRow, styles.totalRow]}>
                          <ThemedText type="defaultSemiBold">{t('sales.pricing.finalTotal')}</ThemedText>
                          <ThemedText type="defaultSemiBold">${Number(detailPricing.total).toFixed(2)}</ThemedText>
                        </View>
                        {detailPricing.discount_applied_by && (
                          <ThemedText style={styles.detailMeta}>
                            {t('sales.pricing.appliedBy')}: {detailPricing.discount_applied_by}
                          </ThemedText>
                        )}
                      </View>
                    )}
                  </>
                )}

                <View style={styles.detailActions}>
                  {getActions(detailSale).map((action) => (
                    <ThemedButton
                      key={action.label}
                      label={action.label}
                      variant={action.variant ?? 'primary'}
                      style={styles.actionButton}
                      onPress={action.onPress}
                      disabled={action.disabled}
                    />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
          <ThemedButton
            variant="secondary"
            label={t('sales.receipt.close')}
            onPress={closeDetail}
          />
        </ThemedCard>
      </View>
    </Modal>
  );

  const receiptModal = (
    <Modal visible={receiptPreviewVisible} transparent animationType="slide" onRequestClose={() => setReceiptPreviewVisible(false)}>
      <View style={styles.modalBackdrop}>
        <ThemedCard style={styles.modalCard}>
          <ThemedText type="subtitle">{t('sales.receipt.title')}</ThemedText>
          {receiptLoading ? <ThemedText style={styles.smallText}>{t('sales.receipt.loading')}</ThemedText> : null}
          {receiptData ? <ReceiptPreview receipt={receiptData} /> : null}
          {receiptMessage ? <ThemedText style={[styles.smallText, { color: palette.danger }]}>{receiptMessage}</ThemedText> : null}
          <View style={styles.modalActions}>
            <ThemedButton
              label={printingBusy ? `${t('sales.action.printReceipt')}...` : t('sales.action.printReceipt')}
              disabled={!receiptData || printingBusy || receiptLoading}
              onPress={() => void handlePrintReceipt()}
            />
            <ThemedButton
              variant="secondary"
              label={t('sales.receipt.close')}
              onPress={() => {
                setReceiptPreviewVisible(false);
                setReceiptMessage(null);
              }}
            />
          </View>
        </ThemedCard>
      </View>
    </Modal>
  );

  const paymentModal = (
    <PaymentModal
      visible={paymentModalVisible}
      sale={paymentModalSale}
      onClose={() => {
        setPaymentModalVisible(false);
        setPaymentModalSale(null);
      }}
      business={{
        name: businessName,
        address: businessAddress,
        phone: businessPhone,
        logoUri: businessLogoUri,
        footerMessage: receiptFooterMessage,
        taxRate,
        paperWidth: printerPaperWidth,
        printerDeviceName,
        printerDeviceAddress,
      }}
    />
  );

  /* ── Web: horizontal kanban ──────────────────────────── */

  if (isWeb) {
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <ThemedText type="title">{t('sales.title')}</ThemedText>
          <View style={styles.headerActions}>
            <ThemedButton label={t('sales.newSale')} onPress={() => router.push('/sale-form')} />
            <ThemedButton variant="secondary" style={styles.logoutButton} label={t('sales.logout')} onPress={logout} />
          </View>
        </View>
        <ScrollView
          horizontal
          style={styles.lanesScroll}
          contentContainerStyle={styles.lanesRow}
          showsHorizontalScrollIndicator={false}
        >
          {LANE_CONFIG.map(({ status }) => {
            const laneSales = salesByStatus[status] ?? [];
            const isValidTarget = Boolean(draggingSale && getValidTargets(draggingSale).includes(status));
            return (
              <SaleStatusLane
                key={status}
                title={formatStatusLabel(status)}
                count={laneSales.length}
                toneColor={getLaneToneColor(status, palette)}
                collapsible={false}
                bodyScrollable
                style={styles.webLane}
                onCardDrop={(saleId) => void handleDropOnLane(saleId, status)}
                isValidDropTarget={isValidTarget}
                emptyMessage={t('sales.lane.empty')}
              >
                {laneSales.map(renderCard)}
              </SaleStatusLane>
            );
          })}
        </ScrollView>
        {detailModal}
        {receiptModal}
        {paymentModal}
      </View>
    );
  }

  /* ── Native: vertical lanes + long-press move ────────── */

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{t('sales.title')}</ThemedText>

      <View style={styles.headerActions}>
        <ThemedButton label={t('sales.newSale')} onPress={() => router.push('/sale-form')} />
        <ThemedButton variant="secondary" style={styles.logoutButton} label={t('sales.logout')} onPress={logout} />
      </View>

      {LANE_CONFIG.map(({ status, defaultExpanded }) => {
        const laneSales = salesByStatus[status] ?? [];
        return (
          <SaleStatusLane
            key={status}
            title={formatStatusLabel(status)}
            count={laneSales.length}
            toneColor={getLaneToneColor(status, palette)}
            defaultExpanded={defaultExpanded}
            emptyMessage={t('sales.lane.empty')}
          >
            {laneSales.map(renderCard)}
          </SaleStatusLane>
        );
      })}

      {sales.length === 0 && (
        <ThemedText style={styles.emptyText}>{t('sales.empty')}</ThemedText>
      )}

      {/* Move Order Modal (native long-press) */}
      <Modal visible={moveOrderSale !== null} transparent animationType="fade" onRequestClose={() => setMoveOrderSale(null)}>
        <View style={styles.modalBackdrop}>
          <ThemedCard style={styles.moveCard}>
            <ThemedText type="subtitle">{t('sales.move.title')}</ThemedText>
            {moveOrderSale && (
              <>
                <ThemedText style={styles.smallText}>
                  {t('sales.order')} #{moveOrderSale.id.slice(0, 6)} — {formatStatusLabel(moveOrderSale.status)}
                </ThemedText>
                <View style={styles.moveTargets}>
                  {getValidTargets(moveOrderSale).map((target) => (
                    <ThemedButton
                      key={target}
                      label={formatStatusLabel(target)}
                      style={[styles.moveTarget, { borderColor: getLaneToneColor(target, palette) }]}
                      onPress={() => void handleMoveOrder(target)}
                      disabled={busyOrderId === moveOrderSale.id}
                    />
                  ))}
                </View>
              </>
            )}
            <ThemedButton
              variant="secondary"
              label={t('sales.receipt.close')}
              onPress={() => setMoveOrderSale(null)}
            />
          </ThemedCard>
        </View>
      </Modal>

      {detailModal}
      {receiptModal}
      {paymentModal}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  /* Shared */
  container: {
    padding: 16,
    gap: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  logoutButton: {
    paddingVertical: 10,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    paddingVertical: 20,
  },
  smallText: {
    opacity: 0.9,
    fontSize: 13,
  },
  /* Web horizontal layout */
  root: {
    flex: 1,
  },
  topBar: {
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  lanesScroll: {
    flex: 1,
  },
  lanesRow: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    alignItems: 'stretch',
  },
  webLane: {
    width: 320,
  },
  /* Detail modal */
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailMeta: {
    fontSize: 13,
    opacity: 0.7,
  },
  detailSection: {
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.12)',
    paddingTop: 8,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRowLabel: {
    fontSize: 13,
    flexShrink: 1,
  },
  detailRowValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.12)',
    paddingTop: 6,
    marginTop: 4,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 8,
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
  /* Move order modal (native) */
  moveCard: {
    gap: 10,
  },
  moveTargets: {
    gap: 8,
  },
  moveTarget: {
    borderWidth: 2,
  },
  /* Common modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: 12,
  },
  modalCard: {
    maxHeight: '90%',
    gap: 8,
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
  },
});
