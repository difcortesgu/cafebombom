import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { OrderPanel } from '@/components/order-panel';
import { SaleCanvasCard, type CanvasCardAction, type ProductItem } from '@/components/sale-canvas-card';
import { SaleFormPanel } from '@/components/sale-form-panel';
import { SaleStatusLane } from '@/components/sale-status-lane';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { usePanelLifecycle } from '@/hooks/use-panel-lifecycle';
import { useResponsiveOpen } from '@/hooks/use-responsive-open';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { salesService } from '@/services';
import { usePaymentMethodsStore } from '@/stores/payment-methods';
import { useSalesStore } from '@/stores/sales';
import { useSettingsStore } from '@/stores/settings';
import type { OrderStatus, Sale } from '@/types/types';

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
  const {
    hydrate,
    sales,
    sendToKitchen,
    markOrderReady,
    cancelOrder,
  } = useSalesStore();
  const {
    hydrateFromDb,
    businessName,
    businessAddress,
    businessPhone,
    businessNit,
    businessLogoUri,
    receiptFooterMessage,
    printerPaperWidth,
    taxRate,
    printerDeviceName,
    printerDeviceAddress,
  } = useSettingsStore();
  const { hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

  const { openOrNavigate } = useResponsiveOpen();
  const orderPanel = usePanelLifecycle();

  const [saleProductsById, setSaleProductsById] = useState<Record<string, ProductItem[]>>({});
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [orderPanelSale, setOrderPanelSale] = useState<Sale | null>(null);
  const [draggingSale, setDraggingSale] = useState<Sale | null>(null);
  const [moveOrderSale, setMoveOrderSale] = useState<Sale | null>(null);
  // null = not showing; '' = new sale; non-empty string = editing draft
  const [inlineSaleFormId, setInlineSaleFormId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void hydrate();
      void hydrateFromDb();
      void hydratePaymentMethods();
    }, [hydrate, hydrateFromDb, hydratePaymentMethods]),
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
          const productItems: ProductItem[] = items.map((item) => ({
            name: item.product_name,
            qty: Number(item.quantity),
          }));
          return [sale.id, productItems] as [string, ProductItem[]];
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
        { label: t('sales.action.sendToKitchen'), icon: 'flame-outline', onPress: () => void runOrderAction(sale.id, () => sendToKitchen(sale.id)), disabled },
        {
          label: t('sales.action.openTab'),
          icon: 'create-outline',
          variant: 'secondary' as const,
          onPress: () => openOrNavigate(() => setInlineSaleFormId(sale.id), `/sale-form?orderId=${sale.id}`),
          disabled,
        },
        { label: t('sales.action.payNow'), icon: 'card-outline', variant: 'secondary' as const, onPress: () => openOrderPanel(sale), disabled },
      ];
    }

    if (sale.status === 'in-progress') {
      const actions: CanvasCardAction[] = [
        { label: t('sales.action.markReady'), icon: 'checkmark-circle-outline', onPress: () => void runOrderAction(sale.id, () => markOrderReady(sale.id)), disabled },
      ];
      if (!sale.paid_at) {
        actions.push({ label: t('sales.action.payNow'), icon: 'card-outline', variant: 'secondary', onPress: () => openOrderPanel(sale), disabled });
      }
      return actions;
    }

    if (sale.status === 'ready') {
      const actions: CanvasCardAction[] = [];
      if (!sale.paid_at) {
        actions.push({ label: t('sales.action.receivePayment'), icon: 'card-outline', onPress: () => openOrderPanel(sale), disabled });
      }
      return actions;
    }

    return [];
  };

  const openOrderPanel = (sale: Sale) => {
    setOrderPanelSale(sale);
    orderPanel.open();
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
    return (
      <SaleCanvasCard
        key={sale.id}
        orderId={sale.id}
        tableName={sale.table_name}
        productItems={saleProductsById[sale.id]}
        total={Number(sale.total)}
        isPaid={Boolean(sale.paid_at)}
        staffName={sale.staff_name}
        actions={getActions(sale)}
        onPress={() => openOrderPanel(sale)}
        draggable={isWeb}
        isDragging={draggingSale?.id === sale.id}
        onDragStart={() => setDraggingSale(sale)}
        onDragEnd={() => setDraggingSale(null)}
        onLongPress={!isWeb ? () => setMoveOrderSale(sale) : undefined}
      />
    );
  };

  /* ── Web: horizontal kanban ──────────────────────────── */

  if (isWeb) {
    // Large screen: show sale form inline replacing the kanban
    if (inlineSaleFormId !== null) {
      return (
        <View style={styles.root}>
          <SaleFormPanel
            orderId={inlineSaleFormId || null}
            onComplete={() => {
              setInlineSaleFormId(null);
              void hydrate();
            }}
          />
        </View>
      );
    }

    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <ThemedText type="title">{t('sales.title')}</ThemedText>
          <View style={styles.headerActions}>
            <ThemedButton
              label={t('sales.newSale')}
              icon="add-outline"
              onPress={() => openOrNavigate(() => setInlineSaleFormId(''), '/sale-form')}
            />
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
        {orderPanel.mounted && (
          <OrderPanel
            visible={orderPanel.visible}
            sale={orderPanelSale}
            onClose={orderPanel.close}
            onExited={() => {
              orderPanel.onExited();
              setOrderPanelSale(null);
            }}
            business={{
              name: businessName,
              address: businessAddress,
              phone: businessPhone,
              nit: businessNit,
              logoUri: businessLogoUri,
              footerMessage: receiptFooterMessage,
              taxRate,
              paperWidth: printerPaperWidth,
              printerDeviceName,
              printerDeviceAddress,
            }}
          />
        )}
      </View>
    );
  }

  /* ── Native: vertical lanes + long-press move ────────── */

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{t('sales.title')}</ThemedText>

      <View style={styles.headerActions}>
        <ThemedButton
          label={t('sales.newSale')}
          icon="add-outline"
          onPress={() => openOrNavigate(() => setInlineSaleFormId(''), '/sale-form')}
        />
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

      {orderPanel.mounted && (
        <OrderPanel
          visible={orderPanel.visible}
          sale={orderPanelSale}
          onClose={orderPanel.close}
          onExited={() => {
            orderPanel.onExited();
            setOrderPanelSale(null);
          }}
          business={{
            name: businessName,
            address: businessAddress,
            phone: businessPhone,
            nit: businessNit,
            logoUri: businessLogoUri,
            footerMessage: receiptFooterMessage,
            taxRate,
            paperWidth: printerPaperWidth,
            printerDeviceName,
            printerDeviceAddress,
          }}
        />
      )}
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
});
