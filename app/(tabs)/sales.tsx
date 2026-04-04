import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { useAppColors } from '@/hooks/use-theme-color';
import { salesService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useSalesStore } from '@/stores/sales';

export default function SalesScreen() {
  const palette = useAppColors();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const { hydrate, sales } = useSalesStore();

  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [expandedSaleItems, setExpandedSaleItems] = useState<string>('');
  const [expandedSalePricing, setExpandedSalePricing] = useState<string>('');
  const [saleProductsById, setSaleProductsById] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate]),
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

  const salesByTable = useMemo(() => {
    return sales.reduce<Record<string, typeof sales>>((acc, sale) => {
      const tableName = sale.table_name;
      if (!acc[tableName]) {
        acc[tableName] = [];
      }
      acc[tableName].push(sale);
      return acc;
    }, {});
  }, [sales]);

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
    setExpandedSaleId(saleId);
    setExpandedSaleItems(items.map((item) => `${item.product_name} x${item.quantity} @ $${Number(item.unit_price).toFixed(2)} | -$${Number(item.discount_amount).toFixed(2)} = $${Number(item.final_line_total).toFixed(2)}`).join('\n'));
    setExpandedSalePricing(
      pricing
        ? [
            `Subtotal: $${Number(pricing.subtotal).toFixed(2)}`,
            `Item discounts: -$${Number(pricing.item_discount_total).toFixed(2)}`,
            `${pricing.global_discount_name ?? 'Global discount'}: -$${Number(pricing.global_discount_amount).toFixed(2)}`,
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
      <ThemedText>List view with quick actions.</ThemedText>

      <View style={styles.headerActions}>
        <ThemedButton label="New sale" onPress={() => router.push('/sale-form')} />
        <ThemedButton variant="secondary" style={styles.logoutButton} label="Logout" onPress={logout} />
      </View>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Daily sales history</ThemedText>
        {sales.length === 0 ? (
          <ThemedText style={styles.smallText}>No sales yet.</ThemedText>
        ) : (
          Object.entries(salesByTable).map(([tableName, tableSales]) => (
            <View key={tableName} style={styles.historyGroup}>
              <ThemedText type="defaultSemiBold" style={styles.historyGroupTitle}>
                {tableName}
              </ThemedText>
              {tableSales.map((sale) => (
                <Pressable key={sale.id} style={[styles.historyItem, { borderColor: palette.border }]} onPress={() => showSaleDetail(sale.id)}>
                  <ThemedText type="defaultSemiBold">{saleProductsById[sale.id] || 'Loading products...'}</ThemedText>
                  <ThemedText style={styles.smallText}>Total: ${Number(sale.total).toFixed(2)}</ThemedText>
                  <ThemedText style={styles.smallText}>{new Date(Number(sale.created_at) * 1000).toLocaleString()} by {sale.staff_name}</ThemedText>
                  {expandedSaleId === sale.id && expandedSaleItems.length > 0 ? (
                    <>
                      <ThemedText style={styles.detailText}>{expandedSaleItems}</ThemedText>
                      {expandedSalePricing ? <ThemedText style={styles.detailText}>{expandedSalePricing}</ThemedText> : null}
                    </>
                  ) : null}
                </Pressable>
              ))}
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
  detailText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.9,
  },
});
