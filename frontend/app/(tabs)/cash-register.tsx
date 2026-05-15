import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { PaymentMethodDisplay } from '@/components/payment-method-display';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

export default function CashRegisterScreen() {
    const palette = useAppColors();
    const { width } = useWindowDimensions();
    const isWide = width >= 600;

    const {
        hydrate,
        cashRegisterToday,
        cashRegisterSummaryToday,
        cashRegisterAdjustments,
        loadCashRegisterAdjustments,
        openCashRegister,
        closeCashRegister,
    } = useAccountsStore();

    const { hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

    const [cajaForm, setCajaForm] = useState({ amount: '0', notes: '' });
    const [message, setMessage] = useState('');

    const incomeByMethod = useMemo(
        () => [...cashRegisterSummaryToday.incomeByMethod].sort((a, b) => b.total - a.total),
        [cashRegisterSummaryToday.incomeByMethod],
    );

    const expensesByMethod = useMemo(
        () => [...cashRegisterSummaryToday.expensesByMethod].sort((a, b) => b.total - a.total),
        [cashRegisterSummaryToday.expensesByMethod],
    );

    useFocusEffect(
        useCallback(() => {
            const load = async () => {
                await Promise.all([hydrate(), hydratePaymentMethods()]);
                const { cashRegisterToday: session } = useAccountsStore.getState();
                if (session) {
                    await loadCashRegisterAdjustments(session.id);
                }
            };
            void load();
        }, [hydrate, hydratePaymentMethods, loadCashRegisterAdjustments]),
    );

    const net = cashRegisterSummaryToday.net;
    const netColor = net >= 0 ? palette.success : palette.danger;
    const expectedCash = (cashRegisterToday?.opening_amount ?? 0) + net;
    const expectedColor = expectedCash >= 0 ? palette.tint : palette.danger;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <ThemedText type="title">{t('cashRegister.title')}</ThemedText>
            <ThemedText>{t('cashRegister.subtitle')}</ThemedText>

            {message ? (
                <ThemedCard style={styles.card}>
                    <ThemedText>{message}</ThemedText>
                </ThemedCard>
            ) : null}

            {/* === RESUMEN DIARIO — tarjetas KPI en grid === */}
            <ThemedCard style={styles.card}>
                <ThemedText type="subtitle">{t('accountsForm.caja.dailySummaryTitle')}</ThemedText>
                <View style={styles.kpiGrid}>
                    <View style={[styles.kpiCell, { backgroundColor: palette.success + '18', borderColor: palette.success + '55' }]}>
                        <ThemedText style={[styles.kpiLabel, { color: palette.success }]}>{t('accountsForm.caja.dailyIncomeLabel')}</ThemedText>
                        <ThemedText style={[styles.kpiAmount, { color: palette.success }]}>${cashRegisterSummaryToday.incomeTotal.toFixed(2)}</ThemedText>
                    </View>
                    <View style={[styles.kpiCell, { backgroundColor: palette.danger + '18', borderColor: palette.danger + '55' }]}>
                        <ThemedText style={[styles.kpiLabel, { color: palette.danger }]}>{t('accountsForm.caja.dailyExpensesLabel')}</ThemedText>
                        <ThemedText style={[styles.kpiAmount, { color: palette.danger }]}>-${cashRegisterSummaryToday.expensesTotal.toFixed(2)}</ThemedText>
                    </View>
                    <View style={[
                        styles.kpiCellFull,
                        isWide && styles.kpiCellWideAuto,
                        { backgroundColor: netColor + '18', borderColor: netColor + '55' },
                    ]}>
                        <ThemedText style={[styles.kpiLabel, { color: netColor }]}>{t('accountsForm.caja.dailyNetLabel')}</ThemedText>
                        <ThemedText style={[styles.kpiAmountLarge, { color: netColor }]}>${net.toFixed(2)}</ThemedText>
                    </View>
                    {cashRegisterToday ? (
                        <View style={[styles.kpiCellFull, { backgroundColor: expectedColor + '18', borderColor: expectedColor + '55' }]}>
                            <ThemedText style={[styles.kpiLabel, { color: expectedColor }]}>{t('accountsForm.caja.expectedCashLabel')}</ThemedText>
                            <ThemedText style={[styles.kpiAmountLarge, { color: expectedColor }]}>${expectedCash.toFixed(2)}</ThemedText>
                            <ThemedText style={[styles.smallText, { color: palette.mutedText }]}>
                                ${cashRegisterToday.opening_amount.toFixed(2)} apertura + ${net >= 0 ? '' : '-'}${Math.abs(net).toFixed(2)} balance
                            </ThemedText>
                        </View>
                    ) : null}
                </View>
            </ThemedCard>

            {/* === AJUSTES === */}
            {cashRegisterAdjustments.length > 0 ? (
                <ThemedCard style={styles.card}>
                    <ThemedText type="subtitle">{t('cashRegister.adjustments')}</ThemedText>
                    {cashRegisterAdjustments.map((adj) => (
                        <View key={adj.id} style={[styles.listItem, { borderColor: palette.border }]}>
                            <View style={styles.rowBetween}>
                                <ThemedText type="defaultSemiBold" style={{ color: adj.amount >= 0 ? palette.success : palette.danger }}>
                                    {adj.amount >= 0 ? '+' : ''}${Number(adj.amount).toFixed(2)}
                                </ThemedText>
                                <ThemedText style={styles.smallText}>{new Date(adj.created_at * 1000).toLocaleTimeString()}</ThemedText>
                            </View>
                            <ThemedText style={styles.smallText}>{adj.reason}</ThemedText>
                        </View>
                    ))}
                </ThemedCard>
            ) : cashRegisterToday ? (
                <ThemedCard style={styles.card}>
                    <ThemedText style={styles.smallText}>{t('cashRegister.noAdjustments')}</ThemedText>
                </ThemedCard>
            ) : null}

            {/* === APERTURA / CIERRE === */}
            <ThemedCard style={styles.card}>
                <ThemedText type="subtitle">{t('accountsForm.caja.subtitle')}</ThemedText>

                {!cashRegisterToday ? (
                    <>
                        <ThemedText style={styles.smallText}>{t('accountsForm.caja.noSession')}</ThemedText>
                        <ThemedText style={styles.smallText}>{t('accountsForm.caja.openTitle')}</ThemedText>
                        <ThemedInput
                            value={cajaForm.amount}
                            onChangeText={(value) => setCajaForm((f) => ({ ...f, amount: value }))}
                            keyboardType="decimal-pad"
                            placeholder={t('accountsForm.caja.openingAmount')}
                        />
                        <ThemedInput
                            value={cajaForm.notes}
                            onChangeText={(value) => setCajaForm((f) => ({ ...f, notes: value }))}
                            placeholder={t('accountsForm.caja.notes')}
                        />
                        <ThemedButton
                            label={t('accountsForm.caja.open')}
                            onPress={async () => {
                                const amount = Number(cajaForm.amount || '0');
                                if (amount < 0) {
                                    setMessage(t('accountsForm.caja.openAmountRequired'));
                                    return;
                                }
                                try {
                                    await openCashRegister({ openingAmount: amount, notes: cajaForm.notes || undefined });
                                    setCajaForm({ amount: '0', notes: '' });
                                    setMessage('');
                                } catch (error) {
                                    setMessage(error instanceof Error ? error.message : t('common.error'));
                                }
                            }}
                        />
                    </>
                ) : cashRegisterToday.closed_at ? (
                    /* Sesión cerrada — apertura y cierre en dos columnas paralelas */
                    <>
                        <View style={styles.sessionRow}>
                            <View style={[styles.sessionCol, { backgroundColor: palette.success + '12', borderColor: palette.success + '44' }]}>
                                <ThemedText style={[styles.sessionColLabel, { color: palette.mutedText }]}>{t('accountsForm.caja.openingAmountLabel')}</ThemedText>
                                <ThemedText style={[styles.sessionColAmount, { color: palette.success }]}>${cashRegisterToday.opening_amount.toFixed(2)}</ThemedText>
                                <ThemedText style={[styles.smallText, { color: palette.mutedText }]}>{new Date(cashRegisterToday.opened_at * 1000).toLocaleTimeString()}</ThemedText>
                            </View>
                            <View style={[styles.sessionCol, { backgroundColor: palette.danger + '12', borderColor: palette.danger + '44' }]}>
                                <ThemedText style={[styles.sessionColLabel, { color: palette.mutedText }]}>{t('accountsForm.caja.closingAmountLabel')}</ThemedText>
                                <ThemedText style={[styles.sessionColAmount, { color: palette.danger }]}>${cashRegisterToday.closing_amount?.toFixed(2) ?? '—'}</ThemedText>
                                <ThemedText style={[styles.smallText, { color: palette.mutedText }]}>{new Date((cashRegisterToday.closed_at) * 1000).toLocaleTimeString()}</ThemedText>
                            </View>
                        </View>
                        <ThemedText style={styles.smallText}>{t('accountsForm.caja.alreadyClosed')}</ThemedText>
                    </>
                ) : (
                    /* Sesión abierta — apertura a la izquierda, cierre pendiente a la derecha + formulario */
                    <>
                        <View style={styles.sessionRow}>
                            <View style={[styles.sessionCol, { backgroundColor: palette.success + '12', borderColor: palette.success + '44' }]}>
                                <ThemedText style={[styles.sessionColLabel, { color: palette.mutedText }]}>{t('accountsForm.caja.openingAmountLabel')}</ThemedText>
                                <ThemedText style={[styles.sessionColAmount, { color: palette.success }]}>${cashRegisterToday.opening_amount.toFixed(2)}</ThemedText>
                                <ThemedText style={[styles.smallText, { color: palette.mutedText }]}>{new Date(cashRegisterToday.opened_at * 1000).toLocaleTimeString()}</ThemedText>
                            </View>
                            <View style={[styles.sessionCol, { borderColor: palette.border }]}>
                                <ThemedText style={[styles.sessionColLabel, { color: palette.mutedText }]}>{t('accountsForm.caja.closingAmountLabel')}</ThemedText>
                                <ThemedText style={[styles.sessionColAmount, { color: palette.mutedText }]}>—</ThemedText>
                                <ThemedText style={[styles.smallText, { color: palette.mutedText }]}>{t('accountsForm.caja.closeTitle')}</ThemedText>
                            </View>
                        </View>
                        <ThemedInput
                            value={cajaForm.amount}
                            onChangeText={(value) => setCajaForm((f) => ({ ...f, amount: value }))}
                            keyboardType="decimal-pad"
                            placeholder={t('accountsForm.caja.closingAmount')}
                        />
                        <ThemedInput
                            value={cajaForm.notes}
                            onChangeText={(value) => setCajaForm((f) => ({ ...f, notes: value }))}
                            placeholder={t('accountsForm.caja.notes')}
                        />
                        <ThemedButton
                            label={t('accountsForm.caja.close')}
                            onPress={async () => {
                                const amount = Number(cajaForm.amount || '0');
                                if (amount < 0) {
                                    setMessage(t('accountsForm.caja.closeAmountRequired'));
                                    return;
                                }
                                try {
                                    await closeCashRegister({ sessionId: cashRegisterToday.id, closingAmount: amount, notes: cajaForm.notes || undefined });
                                    setCajaForm({ amount: '0', notes: '' });
                                    setMessage('');
                                } catch (error) {
                                    setMessage(error instanceof Error ? error.message : t('common.error'));
                                }
                            }}
                        />
                    </>
                )}
            </ThemedCard>

            {/* === GANANCIAS y GASTOS POR MÉTODO — dos columnas paralelas === */}
            <ThemedCard style={styles.card}>
                <View style={styles.methodColumnsRow}>
                    {/* Columna izquierda: Ganancias */}
                    <View style={styles.methodColumn}>
                        <View style={styles.methodColHeader}>
                            <Ionicons name="trending-up" size={16} color={palette.success} />
                            <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>{t('accountsForm.caja.incomeByMethodTitle')}</ThemedText>
                        </View>
                        {incomeByMethod.length === 0 ? (
                            <ThemedText style={styles.smallText}>{t('accountsForm.caja.noIncomeToday')}</ThemedText>
                        ) : (
                            incomeByMethod.map((row) => (
                                <View key={`income-${row.payment_method_id}`} style={[styles.methodCell, { borderColor: palette.success + '66', backgroundColor: palette.success + '14' }]}>
                                    <PaymentMethodDisplay
                                        methodId={row.payment_method_id}
                                        size="medium"
                                        containerStyle={{ gap: 6 }}
                                    />
                                    <View style={styles.methodAmountRow}>
                                        <ThemedText style={[styles.methodAmount, { color: palette.success }]}>${row.total.toFixed(2)}</ThemedText>
                                        <View style={styles.methodCountBadge}>
                                            <Ionicons name="swap-horizontal" size={11} color={palette.mutedText} />
                                            <ThemedText style={[styles.methodCount, { color: palette.mutedText }]}>{row.count} movimientos</ThemedText>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Columna derecha: Gastos */}
                    <View style={styles.methodColumn}>
                        <View style={styles.methodColHeader}>
                            <Ionicons name="trending-down" size={16} color={palette.danger} />
                            <ThemedText type="defaultSemiBold" style={{ color: palette.danger }}>{t('accountsForm.caja.expensesByMethodTitle')}</ThemedText>
                        </View>
                        {expensesByMethod.length === 0 ? (
                            <ThemedText style={styles.smallText}>{t('accountsForm.caja.noExpensesToday')}</ThemedText>
                        ) : (
                            expensesByMethod.map((row) => (
                                <View key={`expense-${row.payment_method_id}`} style={[styles.methodCell, { borderColor: palette.danger + '66', backgroundColor: palette.danger + '14' }]}>
                                    <PaymentMethodDisplay
                                        methodId={row.payment_method_id}
                                        size="medium"
                                        containerStyle={{ gap: 6 }}
                                    />
                                    <View style={styles.methodAmountRow}>
                                        <ThemedText style={[styles.methodAmount, { color: palette.danger }]}>${row.total.toFixed(2)}</ThemedText>
                                        <View style={styles.methodCountBadge}>
                                            <Ionicons name="swap-horizontal" size={11} color={palette.mutedText} />
                                            <ThemedText style={[styles.methodCount, { color: palette.mutedText }]}>{row.count} movimientos</ThemedText>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </View>
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
    smallText: {
        fontSize: 13,
        opacity: 0.9,
    },
    // KPI grid
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    kpiCell: {
        flex: 1,
        minWidth: '45%',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        gap: 4,
    },
    kpiCellFull: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        gap: 4,
    },
    kpiCellWideAuto: {
        flex: 1,
        width: undefined,
    },
    kpiLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    kpiAmount: {
        fontSize: 20,
        fontWeight: '700',
    },
    kpiAmountLarge: {
        fontSize: 26,
        fontWeight: '800',
    },
    // Payment method columns
    methodColumnsRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-start',
    },
    methodColumn: {
        flex: 1,
        gap: 6,
    },
    // Payment method grid
    methodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    methodColHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    methodCell: {
        flex: 1,
        minWidth: '45%',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        gap: 8,
    },
    methodAmount: {
        fontSize: 18,
        fontWeight: '700',
    },
    methodAmountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 4,
    },
    methodCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    methodCount: {
        fontSize: 11,
        fontWeight: '500',
    },
    // Session open/close columns
    sessionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    sessionCol: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        gap: 4,
    },
    sessionColLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    sessionColAmount: {
        fontSize: 20,
        fontWeight: '700',
    },
    // Adjustments
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
});
