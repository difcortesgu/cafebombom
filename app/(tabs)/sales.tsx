import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ReceiptPreview } from '@/components/receipt-preview';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
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

function formatPaymentMethod(method: string) {
  if (method === 'card') {
    return t('sales.payment.card');
  }
  if (method === 'transfer') {
    return t('sales.payment.transfer');
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
  if (status === 'paid') {
    return t('sales.status.paid');
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
  if (status === 'paid') {
    return { backgroundColor: '#2E7D32', color: '#FFFFFF', borderColor: '#2E7D32' };
  }
  if (status === 'cancelled') {
    return { backgroundColor: '#B71C1C', color: '#FFFFFF', borderColor: '#B71C1C' };
  }
  if (status === 'in-progress') {
    return { backgroundColor: '#1565C0', color: '#FFFFFF', borderColor: '#1565C0' };
  }
  return { backgroundColor: palette.border, color: palette.text, borderColor: palette.border };
}

type SaleFilter = 'all' | 'active' | OrderStatus;

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
    markOrderPaid,
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
  } = useSettingsStore();

  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [expandedSaleItems, setExpandedSaleItems] = useState<string>('');
  const [expandedSalePricing, setExpandedSalePricing] = useState<string>('');
  const [saleProductsById, setSaleProductsById] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<SaleFilter>('active');
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [receiptPreviewVisible, setReceiptPreviewVisible] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptMessage, setReceiptMessage] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [printingBusy, setPrintingBusy] = useState(false);

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

  const filteredSales = useMemo(() => {
    if (filter === 'all') {
      return sales;
    }

    if (filter === 'active') {
      return sales.filter((sale) => !['completed', 'cancelled'].includes(sale.status));
    }

    return sales.filter((sale) => sale.status === filter);
  }, [filter, sales]);

  const salesByTable = useMemo(() => {
    return filteredSales.reduce<Record<string, Sale[]>>((acc, sale) => {
      const tableName = sale.table_name;
      if (!acc[tableName]) {
        acc[tableName] = [];
      }
      acc[tableName].push(sale);
      return acc;
    }, {});
  }, [filteredSales]);

  const runOrderAction = async (saleId: string, action: () => Promise<void>) => {
    setBusyOrderId(saleId);
    try {
      await action();
    } finally {
      setBusyOrderId(null);
    }
  };

  const canPrintReceipt = (sale: Sale) => sale.status === 'paid' || sale.status === 'completed' || Boolean(sale.paid_at);

  const openReceiptPreview = async (sale: Sale) => {
    setReceiptPreviewVisible(true);
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

  const handlePrintReceipt = async () => {
    if (!receiptData) {
      return;
    }

    setPrintingBusy(true);
    try {
      await printService.printReceipt(receiptData);
      const status = await printService.getStatus();
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

  const renderOrderActions = (sale: Sale) => {
    const isBusy = busyOrderId === sale.id;

    if (sale.status === 'draft') {
      return (
        <View style={styles.orderActions}>
          <ThemedButton variant="secondary" style={styles.actionButton} label={t('sales.action.openTab')} onPress={() => router.push(`/sale-form?orderId=${sale.id}`)} disabled={isBusy} />
          <ThemedButton style={styles.actionButton} label={t('sales.action.sendToKitchen')} onPress={() => void runOrderAction(sale.id, () => sendToKitchen(sale.id))} disabled={isBusy} />
          <ThemedButton variant="secondary" style={styles.actionButton} label={t('sales.action.payNow')} onPress={() => void runOrderAction(sale.id, () => markOrderPaid(sale.id))} disabled={isBusy} />
          <ThemedButton variant="secondary" style={styles.actionButton} label={t('sales.action.cancel')} onPress={() => void runOrderAction(sale.id, () => cancelOrder(sale.id))} disabled={isBusy} />
        </View>
      );
    }

    if (sale.status === 'in-progress') {
      return (
        <View style={styles.orderActions}>
          <ThemedButton style={styles.actionButton} label={t('sales.action.markReady')} onPress={() => void runOrderAction(sale.id, () => markOrderReady(sale.id))} disabled={isBusy} />
          {!sale.paid_at ? (
            <ThemedButton variant="secondary" style={styles.actionButton} label={t('sales.action.payNow')} onPress={() => void runOrderAction(sale.id, () => markOrderPaid(sale.id))} disabled={isBusy} />
          ) : null}
          {sale.paid_at ? (
            <ThemedButton variant="secondary" style={styles.actionButton} label={t('sales.action.previewReceipt')} onPress={() => void openReceiptPreview(sale)} disabled={isBusy} />
          ) : null}
          <ThemedButton variant="secondary" style={styles.actionButton} label={t('sales.action.cancel')} onPress={() => void runOrderAction(sale.id, () => cancelOrder(sale.id))} disabled={isBusy} />
        </View>
      );
    }

    if (sale.status === 'ready') {
      return (
        <View style={styles.orderActions}>
          <ThemedButton style={styles.actionButton} label={t('sales.action.receivePayment')} onPress={() => void runOrderAction(sale.id, () => markOrderPaid(sale.id))} disabled={isBusy} />
          <ThemedButton variant="secondary" style={styles.actionButton} label={t('sales.action.cancel')} onPress={() => void runOrderAction(sale.id, () => cancelOrder(sale.id))} disabled={isBusy} />
        </View>
      );
    }

    if (sale.status === 'paid' && !sale.ready_at) {
      return (
        <View style={styles.orderActions}>
          <ThemedButton style={styles.actionButton} label={t('sales.action.kitchenReady')} onPress={() => void runOrderAction(sale.id, () => markOrderReady(sale.id))} disabled={isBusy} />
          <ThemedButton variant="secondary" style={styles.actionButton} label={t('sales.action.previewReceipt')} onPress={() => void openReceiptPreview(sale)} disabled={isBusy} />
        </View>
      );
    }

    if (canPrintReceipt(sale)) {
      return (
        <View style={styles.orderActions}>
          <ThemedButton variant="secondary" style={styles.actionButton} label={t('sales.action.previewReceipt')} onPress={() => void openReceiptPreview(sale)} disabled={isBusy} />
        </View>
      );
    }

    return null;
  };

  const showSaleDetail = async (saleId: string) => {
    if (expandedSaleId === saleId) {
      setExpandedSaleId(null);
      setExpandedSaleItems('');
      setExpandedSalePricing('');
      return;
    }

    const [items, pricing] = await Promise.all([
      salesService.getSaleItems(saleId),
      salesService.getSalePricingSummary(saleId),
    ]);

    const selectedSale = sales.find((sale) => sale.id === saleId);
    const surchargeLines = pricing && selectedSale
      ? getSaleSurchargeLines(pricing, selectedSale.table_name, tables, toGoSurcharge)
      : [];

    setExpandedSaleId(saleId);
    setExpandedSaleItems(items.map((item) => `${item.product_name} x${item.quantity} @ $${Number(item.unit_price).toFixed(2)} | -$${Number(item.discount_amount).toFixed(2)} = $${Number(item.final_line_total).toFixed(2)}`).join('\n'));
    setExpandedSalePricing(
      pricing
        ? [
            `${t('sales.pricing.subtotal')}: $${Number(pricing.subtotal).toFixed(2)}`,
            `${t('sales.pricing.itemDiscounts')}: -$${Number(pricing.item_discount_total).toFixed(2)}`,
            `${pricing.global_discount_name ?? t('sales.pricing.globalDiscount')}: -$${Number(pricing.global_discount_amount).toFixed(2)}`,
            ...surchargeLines,
            `${t('sales.pricing.finalTotal')}: $${Number(pricing.total).toFixed(2)}`,
            pricing.discount_applied_by ? `${t('sales.pricing.appliedBy')}: ${pricing.discount_applied_by}` : '',
          ]
            .filter(Boolean)
            .join('\n')
        : '',
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{t('sales.title')}</ThemedText>
      <ThemedText>{t('sales.subtitle')}</ThemedText>

      <View style={styles.headerActions}>
        <ThemedButton label={t('sales.newSale')} onPress={() => router.push('/sale-form')} />
        <ThemedButton variant="secondary" style={styles.logoutButton} label={t('sales.logout')} onPress={logout} />
      </View>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">{t('sales.orders')}</ThemedText>
        <View style={styles.filterRow}>
          <ThemedChip label={t('sales.filter.active')} active={filter === 'active'} onPress={() => setFilter('active')} />
          <ThemedChip label={t('sales.filter.all')} active={filter === 'all'} onPress={() => setFilter('all')} />
          <ThemedChip label={t('sales.filter.draft')} active={filter === 'draft'} onPress={() => setFilter('draft')} />
          <ThemedChip label={t('sales.filter.kitchen')} active={filter === 'in-progress'} onPress={() => setFilter('in-progress')} />
          <ThemedChip label={t('sales.filter.ready')} active={filter === 'ready'} onPress={() => setFilter('ready')} />
          <ThemedChip label={t('sales.filter.paid')} active={filter === 'paid'} onPress={() => setFilter('paid')} />
          <ThemedChip label={t('sales.filter.completed')} active={filter === 'completed'} onPress={() => setFilter('completed')} />
        </View>
        {filteredSales.length === 0 ? (
          <ThemedText style={styles.smallText}>{t('sales.empty')}</ThemedText>
        ) : (
          Object.entries(salesByTable).map(([tableName, tableSales]) => (
            <View key={tableName} style={styles.historyGroup}>
              <ThemedText type="defaultSemiBold" style={styles.historyGroupTitle}>
                {tableName}
              </ThemedText>
              {tableSales.map((sale) => {
                const statusLabel = sale.status === 'in-progress' && sale.paid_at ? t('sales.status.inProgressPaid') : formatStatusLabel(sale.status);

                return (
                  <Pressable key={sale.id} style={[styles.historyItem, { borderColor: palette.border }]} onPress={() => showSaleDetail(sale.id)}>
                    <View style={styles.statusRow}>
                      <ThemedText style={styles.smallText}>{t('sales.order')} #{sale.id.slice(0, 6)}</ThemedText>
                      <View style={[styles.statusBadge, getStatusTone(sale.status, palette)]}>
                        <ThemedText style={[styles.statusBadgeText, { color: getStatusTone(sale.status, palette).color }]}>{statusLabel}</ThemedText>
                      </View>
                    </View>
                    <ThemedText type="defaultSemiBold">{saleProductsById[sale.id] || t('sales.loadingProducts')}</ThemedText>
                    <ThemedText style={styles.smallText}>{t('sales.total')}: ${Number(sale.total).toFixed(2)}</ThemedText>
                    <ThemedText style={styles.smallText}>{t('sales.payment')}: {formatPaymentMethod(sale.payment_method)}</ThemedText>
                    <ThemedText style={styles.smallText}>{new Date(Number(sale.created_at) * 1000).toLocaleString()} {t('sales.by')} {sale.staff_name}</ThemedText>
                    {renderOrderActions(sale)}
                    {expandedSaleId === sale.id && expandedSaleItems.length > 0 ? (
                      <>
                        <ThemedText style={styles.detailText}>{expandedSaleItems}</ThemedText>
                        {expandedSalePricing ? <ThemedText style={styles.detailText}>{expandedSalePricing}</ThemedText> : null}
                      </>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ThemedCard>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  card: {
    gap: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  logoutButton: {
    paddingVertical: 10,
  },
  smallText: {
    opacity: 0.9,
    fontSize: 13,
  },
  historyItem: {
    borderWidth: 1,
    borderColor: '#C5AA90',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  historyGroup: {
    gap: 8,
  },
  historyGroupTitle: {
    opacity: 0.95,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
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
  orderActions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  actionButton: {
    paddingVertical: 8,
  },
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
  modalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  detailText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.9,
  },
});
