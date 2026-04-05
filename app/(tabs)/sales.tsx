import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { useAppColors } from '@/hooks/use-theme-color';
import { salesService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useSalesStore } from '@/stores/sales';
import { useSettingsStore } from '@/stores/settings';
import type { SalePricingSummary } from '@/types/sales';
import type { OrderStatus, RestaurantTable, Sale } from '@/types/types';

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
      toGoSurcharge > 0 ? `To-Go surcharge: +$${toGoSurcharge.toFixed(2)}` : '',
      deliverySurcharge > 0 ? `Delivery surcharge: +$${deliverySurcharge.toFixed(2)}` : '',
    ].filter(Boolean);
  }

  if (tableType === 'to-go') {
    return [`To-Go surcharge: +$${totalSurcharge.toFixed(2)}`];
  }

  return [`Surcharge: +$${totalSurcharge.toFixed(2)}`];
}

function formatPaymentMethod(method: string) {
  if (method === 'card') {
    return 'Card';
  }
  if (method === 'transfer') {
    return 'Transfer';
  }
  return 'Cash';
}

function formatStatusLabel(status: OrderStatus) {
  if (status === 'in-progress') {
    return 'In progress';
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
  const { toGoSurcharge, hydrateFromDb } = useSettingsStore();

  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [expandedSaleItems, setExpandedSaleItems] = useState<string>('');
  const [expandedSalePricing, setExpandedSalePricing] = useState<string>('');
  const [saleProductsById, setSaleProductsById] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<SaleFilter>('active');
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

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
          return [sale.id, summary || 'No products'] as const;
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

  const renderOrderActions = (sale: Sale) => {
    const isBusy = busyOrderId === sale.id;

    if (sale.status === 'draft') {
      return (
        <View style={styles.orderActions}>
          <ThemedButton variant="secondary" style={styles.actionButton} label="Open tab" onPress={() => router.push(`/sale-form?orderId=${sale.id}`)} disabled={isBusy} />
          <ThemedButton style={styles.actionButton} label="Send to kitchen" onPress={() => void runOrderAction(sale.id, () => sendToKitchen(sale.id))} disabled={isBusy} />
          <ThemedButton variant="secondary" style={styles.actionButton} label="Pay now" onPress={() => void runOrderAction(sale.id, () => markOrderPaid(sale.id))} disabled={isBusy} />
          <ThemedButton variant="secondary" style={styles.actionButton} label="Cancel" onPress={() => void runOrderAction(sale.id, () => cancelOrder(sale.id))} disabled={isBusy} />
        </View>
      );
    }

    if (sale.status === 'in-progress') {
      return (
        <View style={styles.orderActions}>
          <ThemedButton style={styles.actionButton} label="Mark ready" onPress={() => void runOrderAction(sale.id, () => markOrderReady(sale.id))} disabled={isBusy} />
          {!sale.paid_at ? (
            <ThemedButton variant="secondary" style={styles.actionButton} label="Pay now" onPress={() => void runOrderAction(sale.id, () => markOrderPaid(sale.id))} disabled={isBusy} />
          ) : null}
          <ThemedButton variant="secondary" style={styles.actionButton} label="Cancel" onPress={() => void runOrderAction(sale.id, () => cancelOrder(sale.id))} disabled={isBusy} />
        </View>
      );
    }

    if (sale.status === 'ready') {
      return (
        <View style={styles.orderActions}>
          <ThemedButton style={styles.actionButton} label="Receive payment" onPress={() => void runOrderAction(sale.id, () => markOrderPaid(sale.id))} disabled={isBusy} />
          <ThemedButton variant="secondary" style={styles.actionButton} label="Cancel" onPress={() => void runOrderAction(sale.id, () => cancelOrder(sale.id))} disabled={isBusy} />
        </View>
      );
    }

    if (sale.status === 'paid' && !sale.ready_at) {
      return (
        <View style={styles.orderActions}>
          <ThemedButton style={styles.actionButton} label="Kitchen ready" onPress={() => void runOrderAction(sale.id, () => markOrderReady(sale.id))} disabled={isBusy} />
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
            `Subtotal: $${Number(pricing.subtotal).toFixed(2)}`,
            `Item discounts: -$${Number(pricing.item_discount_total).toFixed(2)}`,
            `${pricing.global_discount_name ?? 'Global discount'}: -$${Number(pricing.global_discount_amount).toFixed(2)}`,
            ...surchargeLines,
            `Final total: $${Number(pricing.total).toFixed(2)}`,
            pricing.discount_applied_by ? `Applied by: ${pricing.discount_applied_by}` : '',
          ]
            .filter(Boolean)
            .join('\n')
        : '',
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Sales</ThemedText>
      <ThemedText>Track draft tabs, kitchen progress, and payment flow.</ThemedText>

      <View style={styles.headerActions}>
        <ThemedButton label="New sale" onPress={() => router.push('/sale-form')} />
        <ThemedButton variant="secondary" style={styles.logoutButton} label="Logout" onPress={logout} />
      </View>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Orders</ThemedText>
        <View style={styles.filterRow}>
          <ThemedChip label="Active" active={filter === 'active'} onPress={() => setFilter('active')} />
          <ThemedChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
          <ThemedChip label="Draft" active={filter === 'draft'} onPress={() => setFilter('draft')} />
          <ThemedChip label="Kitchen" active={filter === 'in-progress'} onPress={() => setFilter('in-progress')} />
          <ThemedChip label="Ready" active={filter === 'ready'} onPress={() => setFilter('ready')} />
          <ThemedChip label="Paid" active={filter === 'paid'} onPress={() => setFilter('paid')} />
          <ThemedChip label="Done" active={filter === 'completed'} onPress={() => setFilter('completed')} />
        </View>
        {filteredSales.length === 0 ? (
          <ThemedText style={styles.smallText}>No sales yet.</ThemedText>
        ) : (
          Object.entries(salesByTable).map(([tableName, tableSales]) => (
            <View key={tableName} style={styles.historyGroup}>
              <ThemedText type="defaultSemiBold" style={styles.historyGroupTitle}>
                {tableName}
              </ThemedText>
              {tableSales.map((sale) => {
                const statusLabel = sale.status === 'in-progress' && sale.paid_at ? 'In progress (paid)' : formatStatusLabel(sale.status);

                return (
                  <Pressable key={sale.id} style={[styles.historyItem, { borderColor: palette.border }]} onPress={() => showSaleDetail(sale.id)}>
                    <View style={styles.statusRow}>
                      <ThemedText style={styles.smallText}>Order #{sale.id.slice(0, 6)}</ThemedText>
                      <View style={[styles.statusBadge, getStatusTone(sale.status, palette)]}>
                        <ThemedText style={[styles.statusBadgeText, { color: getStatusTone(sale.status, palette).color }]}>{statusLabel}</ThemedText>
                      </View>
                    </View>
                    <ThemedText type="defaultSemiBold">{saleProductsById[sale.id] || 'Loading products...'}</ThemedText>
                    <ThemedText style={styles.smallText}>Total: ${Number(sale.total).toFixed(2)}</ThemedText>
                    <ThemedText style={styles.smallText}>Payment: {formatPaymentMethod(sale.payment_method)}</ThemedText>
                    <ThemedText style={styles.smallText}>{new Date(Number(sale.created_at) * 1000).toLocaleString()} by {sale.staff_name}</ThemedText>
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
  detailText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.9,
  },
});
