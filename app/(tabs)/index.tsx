import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useInventoryStore } from '@/lib/stores/inventory-store';
import { useSalesStore } from '@/lib/stores/sales-store';

export default function DashboardScreen() {
  const router = useRouter();
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
      frontColor: '#D16A2F',
    }));
  }, [sales]);

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
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">${todayRevenue.toFixed(2)}</ThemedText>
          <ThemedText>Today&apos;s revenue</ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">{sales.length}</ThemedText>
          <ThemedText>Recent sales</ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">{lowStock}</ThemedText>
          <ThemedText>Low-stock alerts</ThemedText>
        </ThemedView>
      </View>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Sales trend</ThemedText>
        <ThemedText style={styles.muted}>Last 7 sales totals</ThemedText>
        <BarChart
          data={salesBarData.length > 0 ? salesBarData : [{ value: 0, label: '0', frontColor: '#D16A2F' }]}
          barWidth={24}
          spacing={18}
          isAnimated
          noOfSections={4}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor="#BFA48A"
          yAxisTextStyle={{ color: '#8B8179' }}
        />
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Quick actions</ThemedText>
        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={() => router.push('/(tabs)/sales')}>
            <ThemedText style={styles.actionText}>New Sale</ThemedText>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => router.push('/(tabs)/inventory')}>
            <ThemedText style={styles.actionText}>Stock In</ThemedText>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => router.push('/(tabs)/accounts')}>
            <ThemedText style={styles.actionText}>View P&amp;L</ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Low stock watchlist</ThemedText>
        {topLowStock.length === 0 ? (
          <ThemedText style={styles.muted}>All ingredients above threshold.</ThemedText>
        ) : (
          topLowStock.map((name) => (
            <ThemedText key={name} style={styles.warningText}>
              - {name}
            </ThemedText>
          ))
        )}
      </ThemedView>
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1D4C8',
    padding: 12,
    gap: 8,
    minWidth: '48%',
  },
  muted: {
    opacity: 0.7,
  },
  actions: {
    gap: 8,
  },
  actionButton: {
    borderRadius: 10,
    backgroundColor: '#B64D1A',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  warningText: {
    color: '#B25A12',
    fontWeight: '600',
  },
});
