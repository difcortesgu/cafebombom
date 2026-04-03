import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { useAppColors } from '@/hooks/use-theme-color';
import { useInventoryStore } from '@/stores/inventory';
import { useSalesStore } from '@/stores/sales';

export default function DashboardScreen() {
  const router = useRouter();
  const palette = useAppColors();
  const { lowStockCount, hydrate: hydrateInventory, ingredients } = useInventoryStore();
  const { hydrate: hydrateSales, sales, getTodayRevenue, getTopSelling } = useSalesStore();
  const todayRevenue = getTodayRevenue();
  const lowStock = lowStockCount();

  const topLowStock = useMemo(
    () =>
      ingredients
        .filter((item) => item.quantity <= item.low_stock_threshold)
        .slice(0, 3)
        .map((item) => item.name),
    [ingredients]
  );

  const salesBarData = useMemo(() => {
    return sales.slice(0, 7).reverse().map((sale, idx) => ({
      value: Number(sale.total),
      label: `${idx + 1}`,
      frontColor: palette.accent,
    }));
  }, [sales, palette.accent]);

  useFocusEffect(
    useCallback(() => {
      hydrateInventory();
      hydrateSales();
    }, [hydrateInventory, hydrateSales])
  );

  useFocusEffect(
    useCallback(() => {
      getTopSelling();
    }, [getTopSelling])
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Dashboard</ThemedText>
      <ThemedText>Today at a glance</ThemedText>

      <View style={styles.grid}>
        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">${todayRevenue.toFixed(2)}</ThemedText>
          <ThemedText>Today&apos;s revenue</ThemedText>
        </ThemedCard>

        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">{sales.length}</ThemedText>
          <ThemedText>Recent sales</ThemedText>
        </ThemedCard>

        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">{lowStock}</ThemedText>
          <ThemedText>Low-stock alerts</ThemedText>
        </ThemedCard>
      </View>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Sales trend</ThemedText>
        <ThemedText style={styles.muted}>Last 7 sales totals</ThemedText>
        <BarChart
          data={salesBarData.length > 0 ? salesBarData : [{ value: 0, label: '0', frontColor: palette.accent }]}
          barWidth={24}
          spacing={18}
          isAnimated
          noOfSections={4}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={palette.border}
          yAxisTextStyle={{ color: palette.mutedText }}
          xAxisLabelTextStyle={{ color: palette.mutedText }}
        />
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Quick actions</ThemedText>
        <View style={styles.actions}>
          <ThemedButton style={styles.actionButton} label="New Sale" onPress={() => router.push('/(tabs)/sales')} />
          <ThemedButton style={styles.actionButton} label="Stock In" onPress={() => router.push('/(tabs)/inventory')} />
          <ThemedButton style={styles.actionButton} label="View P&amp;L" onPress={() => router.push('/(tabs)/accounts')} />
        </View>
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Low stock watchlist</ThemedText>
        {topLowStock.length === 0 ? (
          <ThemedText style={styles.muted}>All ingredients above threshold.</ThemedText>
        ) : (
          topLowStock.map((name) => (
            <ThemedText key={name} style={[styles.warningText, { color: palette.warning }]}>
              - {name}
            </ThemedText>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    gap: 8,
    minWidth: '48%',
  },
  muted: {
    opacity: 0.9,
  },
  actions: {
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
  },
  warningText: {
    color: '#B25A12',
    fontWeight: '600',
  },
});
