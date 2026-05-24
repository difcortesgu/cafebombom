import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

import { PaymentMethodDisplay } from '@/components/payment-method-display';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { useInventoryStore } from '@/stores/inventory';
import { useSalesStore } from '@/stores/sales';
import type { DashboardRangeKey, DashboardSalesSummary, DashboardTrendBucket } from '@/types/sales';
import { dayRangeUnix, monthRangeUnix, previousRangeUnix, weekRangeUnix } from '@/utils/date';

const PIE_COLORS = ['#14B8A6', '#F5C842', '#E05252', '#818CF8', '#34D399', '#FB923C'];
const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

const RANGE_LABELS: Record<DashboardRangeKey, string> = {
    today: 'Hoy',
    week: 'Últimos 7 días',
    month: 'Este mes',
};

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

function getChangeIndicator(current: number, previous: number, successColor: string, dangerColor: string) {
    if (previous === 0) {
        return current === 0 ? { label: '—', color: '#888888' } : { label: '▲ nuevo', color: successColor };
    }
    const delta = ((current - previous) / previous) * 100;
    const up = delta >= 0;
    const digits = Math.abs(delta) >= 10 ? 0 : 1;
    return { label: `${up ? '▲' : '▼'} ${Math.abs(delta).toFixed(digits)}%`, color: up ? successColor : dangerColor };
}

function formatTrendLabel(bucketStart: number, bucket: DashboardTrendBucket, rangeKey: DashboardRangeKey) {
    const date = new Date(bucketStart * 1000);
    if (bucket === 'hour') return `${String(date.getHours()).padStart(2, '0')}:00`;
    if (rangeKey === 'week') return new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date).replace('.', '');
    return `${date.getDate()}`;
}

function getWeekdayIndexMondayFirst(unixSeconds: number) {
    const day = new Date(unixSeconds * 1000).getDay();
    return day === 0 ? 6 : day - 1;
}

type KpiCardProps = {
    label: string;
    value: string;
    change: { label: string; color: string };
    palette: ReturnType<typeof useAppColors>;
};

type ProductRankingCardProps = {
    title: string;
    emptyLabel: string;
    products: DashboardSalesSummary['topProducts'];
    loading: boolean;
    palette: ReturnType<typeof useAppColors>;
};

function KpiCard({ label, value, change, palette }: KpiCardProps) {
    return (
        <ThemedCard style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: palette.mutedText }]}>{label}</Text>
            <ThemedText type="subtitle" style={styles.kpiValue}>{value}</ThemedText>
            <Text style={[styles.kpiChange, { color: change.color }]}>{change.label}</Text>
        </ThemedCard>
    );
}

function ProductRankingCard({ title, emptyLabel, products, loading, palette }: ProductRankingCardProps) {
    return (
        <ThemedCard style={[styles.sideCard, styles.analyticsCard]}>
            <ThemedText type="subtitle">{title}</ThemedText>
            {products.length ? (
                <View>
                    <View style={[styles.tableHeader, { borderBottomColor: palette.border }]}>
                        <Text style={[styles.colHead, { flex: 3, color: palette.mutedText }]}>Producto</Text>
                        <Text style={[styles.colHead, { flex: 1, textAlign: 'center', color: palette.mutedText }]}>Cant.</Text>
                        <Text style={[styles.colHead, { flex: 1, textAlign: 'right', color: palette.mutedText }]}>Ingreso</Text>
                    </View>
                    {products.map((product, index) => (
                        <View key={product.name} style={[styles.tableRow, { borderBottomColor: palette.border }]}>
                            <ThemedText style={{ flex: 3, fontSize: 13 }}>{index + 1}. {product.name}</ThemedText>
                            <ThemedText style={{ flex: 1, fontSize: 13, textAlign: 'center', color: palette.mutedText }}>{product.quantity} unit</ThemedText>
                            <ThemedText style={{ flex: 1, fontSize: 13, textAlign: 'right' }}>{formatCurrency(product.revenue)}</ThemedText>
                        </View>
                    ))}
                </View>
            ) : (
                <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                    {loading ? t('dashboard.loading') : emptyLabel}
                </Text>
            )}
        </ThemedCard>
    );
}

export default function DashboardScreen() {
    const router = useRouter();
    const palette = useAppColors();
    const { width } = useWindowDimensions();
    const isWide = width >= 768;

    const { getPnL, hydrate: hydrateAccounts } = useAccountsStore();
    const { lowStockCount, hydrate: hydrateInventory, getLowStockItems } = useInventoryStore();
    const { hydrate: hydrateSales, getDashboardSummary } = useSalesStore();

    const [rangeKey, setRangeKey] = useState<DashboardRangeKey>('today');
    const [dashboardSummary, setDashboardSummary] = useState<DashboardSalesSummary | null>(null);
    const [previousSummary, setPreviousSummary] = useState<DashboardSalesSummary | null>(null);
    const [financeSummary, setFinanceSummary] = useState({ income: 0, expenses: 0, net: 0 });
    const [previousFinanceSummary, setPreviousFinanceSummary] = useState({ income: 0, expenses: 0, net: 0 });
    const [loading, setLoading] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const { range, previousRange, bucket } = useMemo(() => getRangeConfig(rangeKey), [rangeKey]);

    const lowStockItems = getLowStockItems(5);
    const lowStock = lowStockCount();

    const revenueChange = getChangeIndicator(financeSummary.income, previousFinanceSummary.income, palette.success, palette.danger);
    const netChange = getChangeIndicator(financeSummary.net, previousFinanceSummary.net, palette.success, palette.danger);
    const ordersChange = getChangeIndicator(dashboardSummary?.salesCount ?? 0, previousSummary?.salesCount ?? 0, palette.success, palette.danger);
    const aovChange = getChangeIndicator(dashboardSummary?.averageOrderValue ?? 0, previousSummary?.averageOrderValue ?? 0, palette.success, palette.danger);

    const trendChart = useMemo(() => {
        const trend = dashboardSummary?.trend ?? [];
        if (trend.length === 0) {
            return {
                data: [{ value: 0, label: '' }],
                maxValue: 1,
                stepValue: 0.25,
                roundToDigits: 2,
                showFractionalValues: true,
                spacing: bucket === 'hour' ? 14 : 32,
                xAxisLabelFontSize: bucket === 'hour' ? 9 : 11,
            };
        }

        const totalPoints = trend.length;
        const maxPointValue = trend.reduce((highest, point) => Math.max(highest, Number(point.total)), 0);
        const maxValue = maxPointValue > 0 ? maxPointValue * 1.25 : 1;
        const stepValue = maxValue / 4;
        const hasFractionalScale = !Number.isInteger(stepValue) || maxValue < 10;
        const isDailyRange = bucket === 'day';
        const shouldUseReferenceLabels = isDailyRange && totalPoints > 15;
        const maxLabels = width >= 768 ? 8 : 6;
        const referenceStep = shouldUseReferenceLabels
            ? Math.max(1, Math.ceil((totalPoints - 1) / Math.max(1, maxLabels - 1)))
            : 1;

        const data = trend.map((point, index) => {
            const isEdgePoint = index === 0 || index === totalPoints - 1;
            const isReferencePoint = referenceStep > 0 && index % referenceStep === 0;
            const showLabel = !shouldUseReferenceLabels || isEdgePoint || isReferencePoint;

            return {
                value: Number(point.total),
                label: showLabel ? formatTrendLabel(point.bucket_start, bucket, rangeKey) : '',
            };
        });

        const spacing = bucket === 'hour'
            ? 14
            : totalPoints > 24
                ? (width >= 768 ? 18 : 12)
                : totalPoints > 15
                    ? (width >= 768 ? 24 : 16)
                    : 32;

        return {
            data,
            maxValue,
            stepValue,
            roundToDigits: hasFractionalScale ? 2 : 0,
            showFractionalValues: hasFractionalScale,
            spacing,
            xAxisLabelFontSize: bucket === 'hour' ? 9 : shouldUseReferenceLabels ? 10 : 11,
        };
    }, [bucket, dashboardSummary?.trend, rangeKey, width]);

    const pieData = useMemo(() => {
        const breakdown = dashboardSummary?.paymentBreakdown.filter((item) => item.total > 0) ?? [];
        return breakdown.map((item, i) => ({
            value: item.total,
            color: PIE_COLORS[i % PIE_COLORS.length],
            _method: item.method,
        }));
    }, [dashboardSummary?.paymentBreakdown]);

    const topProducts = dashboardSummary?.topProducts ?? [];
    const leastProducts = dashboardSummary?.leastProducts ?? [];

    const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

    const weekdaySalesChart = useMemo(() => {
        const totalsByDay = WEEKDAY_LABELS.map(() => 0);

        for (const point of dashboardSummary?.trend ?? []) {
            const weekdayIndex = getWeekdayIndexMondayFirst(point.bucket_start);
            totalsByDay[weekdayIndex] += Number(point.total);
        }

        const highestValue = totalsByDay.reduce((highest, value) => Math.max(highest, value), 0);
        const maxValue = highestValue > 0 ? highestValue * 1.25 : 1;
        const stepValue = maxValue / 4;
        const hasFractionalScale = !Number.isInteger(stepValue) || maxValue < 10;

        return {
            hasSales: highestValue > 0,
            data: WEEKDAY_LABELS.map((label, index) => ({
                label,
                value: Number(totalsByDay[index].toFixed(2)),
                frontColor: palette.tint,
            })),
            maxValue,
            stepValue,
            roundToDigits: hasFractionalScale ? 2 : 0,
            showFractionalValues: hasFractionalScale,
        };
    }, [dashboardSummary?.trend, palette.tint]);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const loadDashboard = async () => {
                setLoading(true);
                try {
                    const [currentSummary, previousPeriodSummary, currentPnL, previousPnL] = await Promise.all([
                        getDashboardSummary(range.start, range.end, bucket),
                        getDashboardSummary(previousRange.start, previousRange.end, bucket),
                        Promise.all([hydrateInventory(), hydrateSales(), hydrateAccounts()]).then(() =>
                            getPnL({ startUnix: range.start, endUnix: range.end }),
                        ),
                        getPnL({ startUnix: previousRange.start, endUnix: previousRange.end }),
                    ]);

                    if (!isActive) return;

                    setDashboardSummary(currentSummary);
                    setPreviousSummary(previousPeriodSummary);
                    setFinanceSummary(currentPnL ?? { income: 0, expenses: 0, net: 0 });
                    setPreviousFinanceSummary(previousPnL ?? { income: 0, expenses: 0, net: 0 });
                } finally {
                    if (isActive) setLoading(false);
                }
            };

            void loadDashboard();
            return () => { isActive = false; };
        }, [bucket, getDashboardSummary, getPnL, hydrateAccounts, hydrateInventory, hydrateSales, previousRange.end, previousRange.start, range.end, range.start])
    );

    return (
        <View style={[styles.screen, { backgroundColor: palette.background }]}>
            {/* Dismiss overlay behind dropdown */}
            {dropdownOpen && (
                <Pressable style={[StyleSheet.absoluteFillObject, { zIndex: 10 }]} onPress={() => setDropdownOpen(false)} />
            )}

            {/* Header */}
            <View style={[styles.header, { backgroundColor: palette.background, borderBottomColor: palette.border, zIndex: 20 }]}>
                <View>
                    <ThemedText type="title">{t('dashboard.title')}</ThemedText>
                    <Text style={{ color: palette.mutedText, fontSize: 13 }}>{t('dashboard.subtitle')}</Text>
                </View>
                <View style={styles.headerActions}>
                    {/* Range dropdown */}
                    <View style={{ zIndex: 30, position: 'relative' }}>
                        <Pressable
                            style={[styles.dropdownBtn, { backgroundColor: palette.card, borderColor: palette.border }]}
                            onPress={() => setDropdownOpen((v) => !v)}>
                            <Text style={{ color: palette.tint, fontSize: 13, fontWeight: '600' }}>
                                {'📅 '}{RANGE_LABELS[rangeKey]}
                            </Text>
                            <Text style={{ color: palette.mutedText, fontSize: 11, marginLeft: 6 }}>
                                {dropdownOpen ? '▲' : '▼'}
                            </Text>
                        </Pressable>
                        {dropdownOpen && (
                            <View style={[styles.dropdownMenu, { backgroundColor: palette.card, borderColor: palette.border }]}>
                                {(Object.keys(RANGE_LABELS) as DashboardRangeKey[]).map((key) => (
                                    <Pressable
                                        key={key}
                                        style={({ pressed }) => [
                                            styles.dropdownItem,
                                            (pressed || rangeKey === key) && { backgroundColor: palette.background },
                                        ]}
                                        onPress={() => { setRangeKey(key); setDropdownOpen(false); }}>
                                        <Text style={{ color: rangeKey === key ? palette.tint : palette.mutedText, fontSize: 14 }}>
                                            {RANGE_LABELS[key]}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>
                    <ThemedButton
                        variant="secondary"
                        label={t('dashboard.cashManagement')}
                        onPress={() => router.push({ pathname: '/operations', params: { section: 'cash-register' } })}
                    />
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                onScrollBeginDrag={() => setDropdownOpen(false)}>

                {/* KPI Row */}
                <View style={styles.kpiRow}>
                    <KpiCard label="Ingresos Totales" value={formatCurrency(financeSummary.income)} change={revenueChange} palette={palette} />
                    <KpiCard label="Ganancia Neta" value={formatCurrency(financeSummary.net)} change={netChange} palette={palette} />
                    <KpiCard label={t('dashboard.kpi.orders')} value={`${dashboardSummary?.salesCount ?? 0} tickets`} change={ordersChange} palette={palette} />
                    <KpiCard label={t('dashboard.kpi.avgOrderValue')} value={formatCurrency(dashboardSummary?.averageOrderValue ?? 0)} change={aovChange} palette={palette} />
                </View>

                {/* Main area: trend chart + sidebar */}
                <View style={[styles.mainArea, isWide ? styles.mainAreaRow : styles.mainAreaCol]}>

                    {/* Left content: trend chart + product rankings */}
                    <View style={[styles.leftColumn, isWide && { flex: 3 }]}>
                        <ThemedCard style={styles.chartCard}>
                            <ThemedText type="subtitle">{t('dashboard.salesTrend')}</ThemedText>
                            <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                                {t('dashboard.salesTrendSubtitle', { range: RANGE_LABELS[rangeKey] })}
                            </Text>
                            <LineChart
                                data={trendChart.data}
                                isAnimated
                                noOfSections={4}
                                maxValue={trendChart.maxValue}
                                stepValue={trendChart.stepValue}
                                roundToDigits={trendChart.roundToDigits}
                                showFractionalValues={trendChart.showFractionalValues}
                                thickness={2.5}
                                yAxisThickness={0}
                                xAxisThickness={1}
                                xAxisColor={palette.border}
                                yAxisTextStyle={{ color: palette.mutedText, fontSize: 10 }}
                                xAxisLabelTextStyle={{ color: palette.mutedText, fontSize: trendChart.xAxisLabelFontSize }}
                                color={palette.tint}
                                dataPointsColor={palette.tint}
                                startFillColor={palette.tint}
                                endFillColor={palette.card}
                                startOpacity={0.22}
                                endOpacity={0.02}
                                areaChart
                                height={240}
                                spacing={trendChart.spacing}
                            />
                        </ThemedCard>
                        <View style={[styles.analyticsGrid, isWide ? styles.analyticsGridRow : styles.analyticsGridCol]}>
                            <ProductRankingCard
                                title={t('dashboard.topProducts')}
                                emptyLabel={t('dashboard.topProductsEmpty')}
                                products={topProducts}
                                loading={loading}
                                palette={palette}
                            />
                            <ProductRankingCard
                                title="Productos menos vendidos"
                                emptyLabel={t('dashboard.topProductsEmpty')}
                                products={leastProducts}
                                loading={loading}
                                palette={palette}
                            />
                        </View>
                    </View>

                    {/* Right sidebar */}
                    <View style={[styles.sideCol, isWide && { flex: 2 }]}>

                        {/* Inventory health */}
                        <ThemedCard style={styles.sideCard}>
                            <View style={styles.rowBetween}>
                                <ThemedText type="subtitle">Estado de Inventario</ThemedText>
                                <View style={[styles.healthBadge, { backgroundColor: lowStock === 0 ? palette.success : palette.warning }]}>
                                    <Text style={styles.healthBadgeText}>{lowStock === 0 ? '✓' : lowStock}</Text>
                                </View>
                            </View>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: lowStock === 0 ? palette.success : palette.warning }}>
                                {lowStock === 0 ? 'Inventario Saludable' : `${lowStock} items bajos`}
                            </Text>
                            <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                                {lowStock === 0 ? '0 items bajo umbral' : `${lowStock} items bajo el umbral mínimo`}
                            </Text>
                            {lowStockItems.length === 0 ? (
                                <View style={[styles.alertOk, { backgroundColor: palette.success + '22' }]}>
                                    <Text style={{ color: palette.success, fontSize: 13 }}>
                                        {'✓  Todo el inventario está por encima del umbral'}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.alertList}>
                                    {lowStockItems.map((item) => (
                                        <View key={item.id} style={[styles.alertRow, { borderLeftColor: palette.warning }]}>
                                            <ThemedText style={{ fontSize: 13, flex: 1 }}>{item.name}</ThemedText>
                                            <Text style={{ color: palette.warning, fontSize: 12 }}>
                                                {Number(item.quantity).toFixed(1)} / {Number(item.low_stock_threshold).toFixed(1)} {item.unit}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ThemedCard>

                        {/* Payment methods donut */}
                        <ThemedCard style={styles.sideCard}>
                            <ThemedText type="subtitle">{t('dashboard.paymentMix')}</ThemedText>
                            {pieData.length > 0 ? (
                                <View style={styles.donutRow}>
                                    <PieChart
                                        data={pieData}
                                        donut
                                        radius={55}
                                        innerRadius={38}
                                        centerLabelComponent={() => (
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: palette.tint }}>
                                                {formatCurrency(pieTotal)}
                                            </Text>
                                        )}
                                    />
                                    <View style={styles.pieLegend}>
                                        {pieData.map((item, i) => (
                                            <View key={i} style={styles.pieLegendRow}>
                                                <View style={[styles.pieDot, { backgroundColor: item.color }]} />
                                                <PaymentMethodDisplay
                                                    methodId={item._method}
                                                    size="small"
                                                    containerStyle={{ flex: 1, gap: 4 }}
                                                />
                                                <Text style={{ fontSize: 11, color: palette.mutedText }}>
                                                    {Math.round((item.value / pieTotal) * 100)}%
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ) : (
                                <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                                    {loading ? t('dashboard.loading') : t('dashboard.paymentMixEmpty')}
                                </Text>
                            )}
                        </ThemedCard>

                        <ThemedCard style={styles.sideCard}>
                            <ThemedText type="subtitle">Ventas por día de la semana</ThemedText>
                            {weekdaySalesChart.hasSales ? (
                                <BarChart
                                    data={weekdaySalesChart.data}
                                    isAnimated
                                    noOfSections={4}
                                    height={190}
                                    barWidth={isWide ? 24 : 18}
                                    spacing={isWide ? 20 : 12}
                                    disableScroll
                                    initialSpacing={8}
                                    endSpacing={8}
                                    maxValue={weekdaySalesChart.maxValue}
                                    stepValue={weekdaySalesChart.stepValue}
                                    roundToDigits={weekdaySalesChart.roundToDigits}
                                    showFractionalValues={weekdaySalesChart.showFractionalValues}
                                    yAxisThickness={0}
                                    xAxisThickness={1}
                                    xAxisColor={palette.border}
                                    rulesColor={palette.border + '66'}
                                    yAxisTextStyle={{ color: palette.mutedText, fontSize: 10 }}
                                    xAxisLabelTextStyle={{ color: palette.mutedText, fontSize: 11 }}
                                    showValuesAsTopLabel
                                    topLabelTextStyle={{ color: palette.mutedText, fontSize: 10 }}
                                />
                            ) : (
                                <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                                    {loading ? t('dashboard.loading') : 'Sin ventas en el periodo seleccionado'}
                                </Text>
                            )}
                        </ThemedCard>

                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        flexWrap: 'wrap',
        gap: 12,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
    },
    dropdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    dropdownMenu: {
        position: 'absolute',
        top: 44,
        right: 0,
        minWidth: 170,
        borderRadius: 10,
        borderWidth: 1,
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        zIndex: 999,
    },
    dropdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 8,
    },
    scrollContent: {
        padding: 16,
        gap: 14,
    },
    kpiRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    kpiCard: {
        flex: 1,
        minWidth: 150,
        gap: 4,
        borderWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 2,
    },
    kpiLabel: {
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    kpiValue: {
        fontSize: 22,
    },
    kpiChange: {
        fontSize: 12,
        fontWeight: '600',
    },
    mainArea: {
        gap: 14,
    },
    mainAreaRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    mainAreaCol: {
        flexDirection: 'column',
    },
    leftColumn: {
        gap: 14,
    },
    chartCard: {
        gap: 8,
        borderWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 2,
    },
    sideCol: {
        gap: 12,
    },
    sideCard: {
        gap: 8,
        borderWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 2,
    },
    analyticsGrid: {
        gap: 12,
    },
    analyticsGridRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    analyticsGridCol: {
        flexDirection: 'column',
    },
    analyticsCard: {
        flex: 1,
        minWidth: 280,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    healthBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    healthBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    donutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
    },
    pieLegend: {
        flex: 1,
        gap: 8,
        minWidth: 120,
    },
    pieLegendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pieDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    alertOk: {
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    alertList: {
        gap: 6,
    },
    alertRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 10,
        borderLeftWidth: 3,
        paddingVertical: 4,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingBottom: 6,
        borderBottomWidth: 1,
        marginBottom: 2,
    },
    colHead: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
});
