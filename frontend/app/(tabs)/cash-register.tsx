import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

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

    const {
        hydrate,
        cashRegisterToday,
        cashRegisterSummaryToday,
        cashRegisterAdjustments,
        loadCashRegisterAdjustments,
        openCashRegister,
        closeCashRegister,
    } = useAccountsStore();

    const { methods, hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

    const [cajaForm, setCajaForm] = useState({ amount: '0', notes: '' });
    const [message, setMessage] = useState('');

    const paymentMethodNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const method of methods) {
            map.set(method.id, method.name);
        }
        map.set('cash', t('sales.payment.cash'));
        map.set('card', t('sales.payment.card'));
        map.set('transfer', t('sales.payment.transfer'));
        return map;
    }, [methods]);

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

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <ThemedText type="title">{t('cashRegister.title')}</ThemedText>
            <ThemedText>{t('cashRegister.subtitle')}</ThemedText>

            {message ? (
                <ThemedCard style={styles.card}>
                    <ThemedText>{message}</ThemedText>
                </ThemedCard>
            ) : null}

            <ThemedCard style={styles.card}>
                <ThemedText type="subtitle">{t('accountsForm.caja.dailySummaryTitle')}</ThemedText>
                <ThemedText style={styles.smallText}>{t('accountsForm.caja.dailyIncomeLabel')}: ${cashRegisterSummaryToday.incomeTotal.toFixed(2)}</ThemedText>
                <ThemedText style={styles.smallText}>{t('accountsForm.caja.dailyExpensesLabel')}: ${cashRegisterSummaryToday.expensesTotal.toFixed(2)}</ThemedText>
                <ThemedText style={styles.smallText}>{t('accountsForm.caja.dailyNetLabel')}: ${cashRegisterSummaryToday.net.toFixed(2)}</ThemedText>

                <ThemedText type="defaultSemiBold">{t('accountsForm.caja.incomeByMethodTitle')}</ThemedText>
                {incomeByMethod.length === 0 ? (
                    <ThemedText style={styles.smallText}>{t('accountsForm.caja.noIncomeToday')}</ThemedText>
                ) : (
                    incomeByMethod.map((row) => (
                        <View key={`income-${row.payment_method_id}`} style={[styles.listItem, { borderColor: palette.border }]}>
                            <ThemedText type="defaultSemiBold">{paymentMethodNameById.get(row.payment_method_id) ?? row.payment_method_id}</ThemedText>
                            <ThemedText>${row.total.toFixed(2)}</ThemedText>
                        </View>
                    ))
                )}

                <ThemedText type="defaultSemiBold">{t('accountsForm.caja.expensesByMethodTitle')}</ThemedText>
                {expensesByMethod.length === 0 ? (
                    <ThemedText style={styles.smallText}>{t('accountsForm.caja.noExpensesToday')}</ThemedText>
                ) : (
                    expensesByMethod.map((row) => (
                        <View key={`expense-${row.payment_method_id}`} style={[styles.listItem, { borderColor: palette.border }]}>
                            <ThemedText type="defaultSemiBold">{paymentMethodNameById.get(row.payment_method_id) ?? row.payment_method_id}</ThemedText>
                            <ThemedText>${row.total.toFixed(2)}</ThemedText>
                        </View>
                    ))
                )}
            </ThemedCard>

            {cashRegisterAdjustments.length > 0 ? (
                <ThemedCard style={styles.card}>
                    <ThemedText type="subtitle">{t('cashRegister.adjustments')}</ThemedText>
                    {cashRegisterAdjustments.map((adj) => (
                        <View key={adj.id} style={[styles.listItem, { borderColor: palette.border }]}>
                            <View style={styles.rowBetween}>
                                <ThemedText type="defaultSemiBold" style={{ color: adj.amount >= 0 ? palette.tint : palette.danger }}>
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
                    <>
                        <ThemedText style={styles.smallText}>{t('accountsForm.caja.openingAmountLabel')}: {cashRegisterToday.opening_amount.toFixed(2)}</ThemedText>
                        <ThemedText style={styles.smallText}>{t('accountsForm.caja.openedAt')}: {new Date(cashRegisterToday.opened_at * 1000).toLocaleTimeString()}</ThemedText>
                        <ThemedText style={styles.smallText}>{t('accountsForm.caja.closingAmountLabel')}: {cashRegisterToday.closing_amount?.toFixed(2)}</ThemedText>
                        <ThemedText style={styles.smallText}>{t('accountsForm.caja.closedAt')}: {new Date((cashRegisterToday.closed_at) * 1000).toLocaleTimeString()}</ThemedText>
                        <ThemedText style={styles.smallText}>{t('accountsForm.caja.alreadyClosed')}</ThemedText>
                    </>
                ) : (
                    <>
                        <ThemedText style={styles.smallText}>{t('accountsForm.caja.openingAmountLabel')}: {cashRegisterToday.opening_amount.toFixed(2)}</ThemedText>
                        <ThemedText style={styles.smallText}>{t('accountsForm.caja.openedAt')}: {new Date(cashRegisterToday.opened_at * 1000).toLocaleTimeString()}</ThemedText>
                        <ThemedText style={styles.smallText}>{t('accountsForm.caja.closeTitle')}</ThemedText>
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
