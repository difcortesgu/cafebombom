import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { useAuthStore } from '@/stores/auth';
import { useInventoryStore } from '@/stores/inventory';
import { useSalesStore } from '@/stores/sales';
import type { DashboardRangeKey, DashboardSalesSummary, DashboardTrendBucket } from '@/types/sales';
import { dayRangeUnix, monthRangeUnix, previousRangeUnix, weekRangeUnix } from '@/utils/date';

function getRangeConfig(rangeKey: DashboardRangeKey) {
  const range = rangeKey === 'week' ? weekRangeUnix() : rangeKey === 'month' ? monthRangeUnix() : dayRangeUnix();
  return {
    range,
    previousRange: previousRangeUnix(range),
    bucket: (rangeKey === 'today' ? 'hour' : 'day') as DashboardTrendBucket,
  };
}

function formatCurrency(value: number) {
  return `$${Number(value).toFixed(2)}`;
}

function formatChangeLabel(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? t('dashboard.change.noChange') : t('dashboard.change.newActivity');
  }

  const delta = ((current - previous) / previous) * 100;
  const prefix = delta > 0 ? '+' : '';
  const digits = Math.abs(delta) >= 10 ? 0 : 1;
  return t('dashboard.change.vsPrevious', { value: `${prefix}${delta.toFixed(digits)}%` });
}

function formatTrendLabel(bucketStart: number, bucket: DashboardTrendBucket, rangeKey: DashboardRangeKey) {
  const date = new Date(bucketStart * 1000);

  if (bucket === 'hour') {
    return `${String(date.getHours()).padStart(2, '0')}:00`;
  }

  if (rangeKey === 'week') {
    return new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date).replace('.', '');
  }

  return `${date.getDate()}`;
}

function formatPaymentMethodLabel(method: 'cash' | 'card' | 'transfer') {
  if (method === 'card') {
    return t('sales.payment.card');
  }

  if (method === 'transfer') {
    return t('sales.payment.transfer');
  }

  return t('sales.payment.cash');
}

export default function DashboardScreen() {
  const router = useRouter();
  const palette = useAppColors();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { getPnL } = useAccountsStore();
  const { lowStockCount, hydrate: hydrateInventory, getLowStockItems } = useInventoryStore();
  const {
    hydrate: hydrateSales,
    getDashboardSummary,
    getDraftOrders,
    getInProgressOrders,
    getPendingPaymentOrders,
    getReadyOrders,
  } = useSalesStore();

  const [rangeKey, setRangeKey] = useState<DashboardRangeKey>('today');
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSalesSummary | null>(null);
  const [previousSummary, setPreviousSummary] = useState<DashboardSalesSummary | null>(null);
  const [financeSummary, setFinanceSummary] = useState({ income: 0, expenses: 0, net: 0 });
  const [previousFinanceSummary, setPreviousFinanceSummary] = useState({ income: 0, expenses: 0, net: 0 });
  const [loading, setLoading] = useState(true);

  const { range, previousRange, bucket } = useMemo(() => getRangeConfig(rangeKey), [rangeKey]);

  const lowStockItems = getLowStockItems(4);
  const lowStock = lowStockCount();
  const draftCount = getDraftOrders().length;
  const inProgressCount = getInProgressOrders().length;
  const readyCount = getReadyOrders().length;
  const pendingPaymentCount = getPendingPaymentOrders().length;

  const lowStockUrgentCount = lowStockItems.filter((item) => Number(item.quantity) === 0 || Number(item.quantity) <= Number(item.low_stock_threshold) * 0.5).length;

  const revenueChangeLabel = formatChangeLabel(dashboardSummary?.revenue ?? 0, previousSummary?.revenue ?? 0);
  const ordersChangeLabel = formatChangeLabel(dashboardSummary?.salesCount ?? 0, previousSummary?.salesCount ?? 0);
  const aovChangeLabel = formatChangeLabel(dashboardSummary?.averageOrderValue ?? 0, previousSummary?.averageOrderValue ?? 0);
  const netChangeLabel = formatChangeLabel(financeSummary.net, previousFinanceSummary.net);

  const salesBarData = useMemo(() => {
    const trend = dashboardSummary?.trend ?? [];

    return trend.length > 0
      ? trend.map((point, index) => ({
        value: Number(point.total),
        label: formatTrendLabel(point.bucket_start, bucket, rangeKey),
        frontColor: index === trend.length - 1 ? palette.tint : palette.accent,
      }))
      : [{ value: 0, label: rangeKey === 'today' ? '00:00' : '0', frontColor: palette.accent }];
  }, [bucket, dashboardSummary?.trend, palette.accent, palette.tint, rangeKey]);

  const paymentMax = Math.max(1, ...(dashboardSummary?.paymentBreakdown.map((item) => item.total) ?? [0]));

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadDashboard = async () => {
        setLoading(true);

        try {
          const [currentSummary, previousPeriodSummary, currentPnL, previousPnL] = await Promise.all([
            getDashboardSummary(range.start, range.end, bucket),
            getDashboardSummary(previousRange.start, previousRange.end, bucket),
            Promise.all([hydrateInventory(), hydrateSales()]).then(() => (
              currentUser?.role === 'owner' ? getPnL({ startUnix: range.start, endUnix: range.end }) : null
            )),
            currentUser?.role === 'owner' ? getPnL({ startUnix: previousRange.start, endUnix: previousRange.end }) : Promise.resolve(null),
          ]);

          if (!isActive) {
            return;
          }

          setDashboardSummary(currentSummary);
          setPreviousSummary(previousPeriodSummary);
          setFinanceSummary(currentPnL ?? { income: 0, expenses: 0, net: 0 });
          setPreviousFinanceSummary(previousPnL ?? { income: 0, expenses: 0, net: 0 });
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      void loadDashboard();

      return () => {
        isActive = false;
      };
    }, [bucket, currentUser?.role, getDashboardSummary, getPnL, hydrateInventory, hydrateSales, previousRange.end, previousRange.start, range.end, range.start])
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{t('dashboard.title')}</ThemedText>
      <ThemedText>{t('dashboard.subtitle')}</ThemedText>

      <View style={styles.filterRow}>
        {(['today', 'week', 'month'] as DashboardRangeKey[]).map((item) => (
          <ThemedChip
            key={item}
            style={styles.filterChip}
            label={t(`dashboard.range.${item}`)}
            active={rangeKey === item}
            tone="accent"
            onPress={() => setRangeKey(item)}
          />
        ))}
      </View>

      <View style={styles.grid}>
        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">{formatCurrency(dashboardSummary?.revenue ?? 0)}</ThemedText>
          <ThemedText>{t('dashboard.kpi.revenue')}</ThemedText>
          <ThemedText style={[styles.helperText, styles.successText]}>{revenueChangeLabel}</ThemedText>
        </ThemedCard>

        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">{dashboardSummary?.salesCount ?? 0}</ThemedText>
          <ThemedText>{t('dashboard.kpi.orders')}</ThemedText>
          <ThemedText style={[styles.helperText, styles.successText]}>{ordersChangeLabel}</ThemedText>
        </ThemedCard>

        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">{formatCurrency(dashboardSummary?.averageOrderValue ?? 0)}</ThemedText>
          <ThemedText>{t('dashboard.kpi.avgOrderValue')}</ThemedText>
          <ThemedText style={[styles.helperText, styles.successText]}>{aovChangeLabel}</ThemedText>
        </ThemedCard>

        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">{lowStock}</ThemedText>
          <ThemedText>{t('dashboard.kpi.lowStock')}</ThemedText>
          <ThemedText style={[styles.helperText, { color: palette.warning }]}>Urgentes: {lowStockUrgentCount}</ThemedText>
        </ThemedCard>
      </View>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">{t('dashboard.liveQueue')}</ThemedText>
        <ThemedText style={styles.muted}>{t('dashboard.liveQueueSubtitle')}</ThemedText>
        <View style={styles.queueGrid}>
          <View style={[styles.queueCard, { borderColor: palette.border }]}> 
            <ThemedText type="subtitle">{draftCount}</ThemedText>
            <ThemedText style={styles.helperText}>{t('dashboard.queue.draft')}</ThemedText>
          </View>
          <View style={[styles.queueCard, { borderColor: palette.border }]}> 
            <ThemedText type="subtitle">{inProgressCount}</ThemedText>
            <ThemedText style={styles.helperText}>{t('dashboard.queue.inProgress')}</ThemedText>
          </View>
          <View style={[styles.queueCard, { borderColor: palette.border }]}> 
            <ThemedText type="subtitle">{readyCount}</ThemedText>
            <ThemedText style={styles.helperText}>{t('dashboard.queue.ready')}</ThemedText>
          </View>
          <View style={[styles.queueCard, { borderColor: palette.border }]}> 
            <ThemedText type="subtitle">{pendingPaymentCount}</ThemedText>
            <ThemedText style={styles.helperText}>{t('dashboard.queue.pendingPayment')}</ThemedText>
          </View>
        </View>
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">{t('dashboard.salesTrend')}</ThemedText>
        <ThemedText style={styles.muted}>{t('dashboard.salesTrendSubtitle', { range: t(`dashboard.range.${rangeKey}`) })}</ThemedText>
        <BarChart
          data={salesBarData}
          barWidth={bucket === 'hour' ? 10 : 22}
          spacing={bucket === 'hour' ? 6 : 16}
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
        <ThemedText type="subtitle">{t('dashboard.quickActions')}</ThemedText>
        <ThemedText style={styles.muted}>{t('dashboard.quickActionsSubtitle')}</ThemedText>
        <View style={styles.actionsGrid}>
          <ThemedButton style={styles.actionButton} label={t('dashboard.newSale')} onPress={() => router.push('/sale-form')} />
          <ThemedButton style={styles.actionButton} label={t('dashboard.stockIn')} onPress={() => router.push({ pathname: '/inventory-form', params: { section: 'restock' } })} />
          <ThemedButton variant="secondary" style={styles.actionButton} label={t('dashboard.manageOrders')} onPress={() => router.push('/(tabs)/sales')} />
          {currentUser?.role === 'owner' ? (
            <ThemedButton variant="secondary" style={styles.actionButton} label={t('dashboard.addExpense')} onPress={() => router.push({ pathname: '/accounts-form', params: { section: 'expenses' } })} />
          ) : null}
        </View>
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">{t('dashboard.lowStockSeverity')}</ThemedText>
        <ThemedText style={styles.muted}>{t('dashboard.lowStockSeveritySubtitle')}</ThemedText>
        {lowStockItems.length === 0 ? (
          <ThemedText style={styles.muted}>{t('dashboard.lowStockSeverityEmpty')}</ThemedText>
        ) : (
          lowStockItems.map((item) => (
            <View key={item.id} style={[styles.listItem, { borderColor: palette.border }]}> 
              <View style={styles.rowBetween}>
                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                <ThemedText style={{ color: palette.warning }}>{t('dashboard.remainingLabel')}: {Number(item.quantity).toFixed(1)} {item.unit}</ThemedText>
              </View>
              <ThemedText style={styles.helperText}>{t('dashboard.thresholdLabel')}: {Number(item.low_stock_threshold).toFixed(1)} {item.unit}</ThemedText>
            </View>
          ))
        )}
      </ThemedCard>

      {currentUser?.role === 'owner' ? (
        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">{t('dashboard.ownerInsights')}</ThemedText>
          <ThemedText style={styles.muted}>{t('dashboard.ownerInsightsSubtitle')}</ThemedText>
          <View style={styles.financeRow}>
            <View style={styles.financeMetric}>
              <ThemedText style={styles.helperText}>{t('dashboard.finance.income')}</ThemedText>
              <ThemedText type="defaultSemiBold">{formatCurrency(financeSummary.income)}</ThemedText>
            </View>
            <View style={styles.financeMetric}>
              <ThemedText style={styles.helperText}>{t('dashboard.finance.expenses')}</ThemedText>
              <ThemedText type="defaultSemiBold">{formatCurrency(financeSummary.expenses)}</ThemedText>
            </View>
            <View style={styles.financeMetric}>
              <ThemedText style={styles.helperText}>{t('dashboard.finance.net')}</ThemedText>
              <ThemedText type="defaultSemiBold">{formatCurrency(financeSummary.net)}</ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.helperText, financeSummary.net >= previousFinanceSummary.net ? styles.successText : styles.dangerText]}>{netChangeLabel}</ThemedText>
        </ThemedCard>
      ) : null}

      <View style={styles.analyticsGrid}>
        <ThemedCard style={styles.analyticsCard}>
          <ThemedText type="subtitle">{t('dashboard.topProducts')}</ThemedText>
          {dashboardSummary?.topProducts.length ? (
            dashboardSummary.topProducts.map((product) => (
              <View key={product.name} style={[styles.listItem, { borderColor: palette.border }]}> 
                <View style={styles.rowBetween}>
                  <ThemedText type="defaultSemiBold">{product.name}</ThemedText>
                  <ThemedText>{product.quantity}x</ThemedText>
                </View>
                <ThemedText style={styles.helperText}>{formatCurrency(product.revenue)}</ThemedText>
              </View>
            ))
          ) : (
            <ThemedText style={styles.muted}>{loading ? t('dashboard.loading') : t('dashboard.topProductsEmpty')}</ThemedText>
          )}
        </ThemedCard>

        <ThemedCard style={styles.analyticsCard}>
          <ThemedText type="subtitle">{t('dashboard.paymentMix')}</ThemedText>
          {dashboardSummary?.paymentBreakdown.some((item) => item.count > 0) ? (
            dashboardSummary.paymentBreakdown.map((item) => (
              <View key={item.method} style={styles.paymentRow}>
                <View style={styles.rowBetween}>
                  <ThemedText type="defaultSemiBold">{formatPaymentMethodLabel(item.method)}</ThemedText>
                  <ThemedText>{formatCurrency(item.total)}</ThemedText>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
                  <View style={[styles.progressFill, { backgroundColor: palette.accent, width: `${Math.max(8, (item.total / paymentMax) * 100)}%` }]} />
                </View>
                <ThemedText style={styles.helperText}>{item.count} {item.count === 1 ? 'venta' : 'ventas'}</ThemedText>
              </View>
            ))
          ) : (
            <ThemedText style={styles.muted}>{loading ? t('dashboard.loading') : t('dashboard.paymentMixEmpty')}</ThemedText>
          )}
        </ThemedCard>
      </View>
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderRadius: 10,
  },
  card: {
    gap: 8,
    minWidth: '48%',
  },
  muted: {
    opacity: 0.9,
  },
  helperText: {
    fontSize: 13,
    opacity: 0.9,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    minWidth: '48%',
    flexGrow: 1,
  },
  queueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  queueCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    minWidth: '48%',
    gap: 2,
  },
  listItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  financeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  financeMetric: {
    minWidth: '30%',
    gap: 2,
  },
  analyticsGrid: {
    gap: 12,
  },
  analyticsCard: {
    gap: 10,
  },
  paymentRow: {
    gap: 6,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  successText: {
    color: '#2E7D32',
  },
  dangerText: {
    color: '#B42318',
  },
});
