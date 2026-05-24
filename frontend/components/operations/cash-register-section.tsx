import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';

const parseAmount = (raw: string) => {
    const amount = Number.parseFloat(raw);
    return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
};

export function CashRegisterSection() {
    const palette = useAppColors();
    const {
        hydrate,
        cashRegisterToday,
        cashRegisterSummaryToday,
        cashRegisterAdjustments,
        loadCashRegisterAdjustments,
        openCashRegister,
        closeCashRegister,
        addCashRegisterAdjustment,
    } = useAccountsStore();

    const [sessionForm, setSessionForm] = useState({ amount: '0', notes: '' });
    const [adjustmentForm, setAdjustmentForm] = useState({ amount: '0', reason: '' });
    const [sessionMessage, setSessionMessage] = useState<string | null>(null);
    const [adjustmentMessage, setAdjustmentMessage] = useState<string | null>(null);

    useEffect(() => {
        void hydrate();
    }, [hydrate]);

    useEffect(() => {
        if (!cashRegisterToday?.id) return;
        void loadCashRegisterAdjustments(cashRegisterToday.id);
    }, [cashRegisterToday?.id, loadCashRegisterAdjustments]);

    useEffect(() => {
        if (!cashRegisterToday || cashRegisterToday.closed_at) {
            setAdjustmentMessage(null);
        }
    }, [cashRegisterToday]);

    const net = cashRegisterSummaryToday.net;
    const expectedCash = (cashRegisterToday?.opening_amount ?? 0) + net;
    const expectedColor = expectedCash >= 0 ? palette.tint : palette.danger;

    const handleOpenCashRegister = async () => {
        const amount = parseAmount(sessionForm.amount);
        if (amount < 0) {
            setSessionMessage(t('accountsForm.caja.openAmountRequired'));
            return;
        }

        try {
            await openCashRegister({ openingAmount: amount, notes: sessionForm.notes.trim() || undefined });
            setSessionForm({ amount: '0', notes: '' });
            setSessionMessage(t('cashRegister.opened'));
        } catch (error) {
            setSessionMessage(error instanceof Error ? error.message : t('common.error'));
        }
    };

    const handleCloseCashRegister = async () => {
        if (!cashRegisterToday) return;

        const amount = parseAmount(sessionForm.amount);
        if (amount < 0) {
            setSessionMessage(t('accountsForm.caja.closeAmountRequired'));
            return;
        }

        try {
            await closeCashRegister({
                sessionId: cashRegisterToday.id,
                closingAmount: amount,
                notes: sessionForm.notes.trim() || undefined,
            });
            setSessionForm({ amount: '0', notes: '' });
            setSessionMessage(t('cashRegister.closed'));
        } catch (error) {
            setSessionMessage(error instanceof Error ? error.message : t('common.error'));
        }
    };

    const handleRegisterAdjustment = async () => {
        if (!cashRegisterToday || cashRegisterToday.closed_at) {
            setAdjustmentMessage(t('cashRegister.adjustmentDisabled'));
            return;
        }

        const amount = parseAmount(adjustmentForm.amount);
        const reason = adjustmentForm.reason.trim();
        if (!amount || !reason) {
            setAdjustmentMessage(t('cashRegister.adjustmentRequired'));
            return;
        }

        try {
            await addCashRegisterAdjustment({
                sessionId: cashRegisterToday.id,
                amount,
                reason,
            });
            setAdjustmentForm({ amount: '0', reason: '' });
            setAdjustmentMessage(t('cashRegister.adjustmentSaved'));
        } catch (error) {
            setAdjustmentMessage(error instanceof Error ? error.message : t('common.error'));
        }
    };

    return (
        <View style={styles.root}>
            <ThemedCard style={styles.card}>
                <View style={styles.headerRow}>
                    <View style={styles.headerTitleRow}>
                        <Ionicons name="cash-outline" size={18} color={palette.tint} />
                        <ThemedText type="subtitle">{t('cashRegister.title')}</ThemedText>
                    </View>
                    <ThemedText style={styles.muted}>{t('accountsForm.caja.subtitle')}</ThemedText>
                </View>

                <View style={styles.summaryGrid}>
                    <View style={[styles.summaryCard, { borderColor: `${palette.success}44`, backgroundColor: `${palette.success}14` }]}>
                        <ThemedText style={[styles.summaryLabel, { color: palette.success }]}>{t('accountsForm.caja.dailyIncomeLabel')}</ThemedText>
                        <ThemedText style={[styles.summaryValue, { color: palette.success }]}>${cashRegisterSummaryToday.incomeTotal.toFixed(2)}</ThemedText>
                    </View>
                    <View style={[styles.summaryCard, { borderColor: `${palette.danger}44`, backgroundColor: `${palette.danger}14` }]}>
                        <ThemedText style={[styles.summaryLabel, { color: palette.danger }]}>{t('accountsForm.caja.dailyExpensesLabel')}</ThemedText>
                        <ThemedText style={[styles.summaryValue, { color: palette.danger }]}>-${cashRegisterSummaryToday.expensesTotal.toFixed(2)}</ThemedText>
                    </View>
                    <View style={[styles.summaryCard, { borderColor: `${palette.tint}44`, backgroundColor: `${palette.tint}14` }]}>
                        <ThemedText style={[styles.summaryLabel, { color: palette.tint }]}>{t('accountsForm.caja.dailyNetLabel')}</ThemedText>
                        <ThemedText style={[styles.summaryValue, { color: palette.tint }]}>${net.toFixed(2)}</ThemedText>
                    </View>
                    {cashRegisterToday ? (
                        <View style={[styles.summaryCard, { borderColor: `${expectedColor}44`, backgroundColor: `${expectedColor}14` }]}>
                            <ThemedText style={[styles.summaryLabel, { color: expectedColor }]}>{t('accountsForm.caja.expectedCashLabel')}</ThemedText>
                            <ThemedText style={[styles.summaryValue, { color: expectedColor }]}>${expectedCash.toFixed(2)}</ThemedText>
                        </View>
                    ) : null}
                </View>
            </ThemedCard>

            {sessionMessage ? (
                <ThemedCard style={styles.card}>
                    <ThemedText>{sessionMessage}</ThemedText>
                </ThemedCard>
            ) : null}

            <ThemedCard style={styles.card}>
                <View style={styles.headerRow}>
                    <ThemedText type="subtitle">{cashRegisterToday ? t('accountsForm.caja.closeTitle') : t('accountsForm.caja.openTitle')}</ThemedText>
                    <ThemedText style={styles.muted}>
                        {cashRegisterToday
                            ? cashRegisterToday.closed_at
                                ? t('accountsForm.caja.alreadyClosed')
                                : t('accountsForm.caja.openingAmountLabel')
                            : t('accountsForm.caja.noSession')}
                    </ThemedText>
                </View>

                {!cashRegisterToday ? (
                    <>
                        <ThemedInput
                            value={sessionForm.amount}
                            onChangeText={(value) => setSessionForm((form) => ({ ...form, amount: value }))}
                            keyboardType="decimal-pad"
                            placeholder={t('accountsForm.caja.openingAmount')}
                        />
                        <ThemedInput
                            value={sessionForm.notes}
                            onChangeText={(value) => setSessionForm((form) => ({ ...form, notes: value }))}
                            placeholder={t('accountsForm.caja.notes')}
                        />
                        <ThemedButton icon="lock-open-outline" label={t('accountsForm.caja.open')} onPress={() => void handleOpenCashRegister()} />
                    </>
                ) : cashRegisterToday.closed_at ? (
                    <View style={styles.sessionGrid}>
                        <View style={[styles.sessionCard, { borderColor: `${palette.success}44`, backgroundColor: `${palette.success}12` }]}>
                            <ThemedText style={[styles.sessionLabel, { color: palette.mutedText }]}>{t('accountsForm.caja.openingAmountLabel')}</ThemedText>
                            <ThemedText style={[styles.sessionValue, { color: palette.success }]}>${cashRegisterToday.opening_amount.toFixed(2)}</ThemedText>
                            <ThemedText style={[styles.muted, { color: palette.mutedText }]}>{new Date(cashRegisterToday.opened_at * 1000).toLocaleTimeString()}</ThemedText>
                        </View>
                        <View style={[styles.sessionCard, { borderColor: `${palette.danger}44`, backgroundColor: `${palette.danger}12` }]}>
                            <ThemedText style={[styles.sessionLabel, { color: palette.mutedText }]}>{t('accountsForm.caja.closingAmountLabel')}</ThemedText>
                            <ThemedText style={[styles.sessionValue, { color: palette.danger }]}>${cashRegisterToday.closing_amount?.toFixed(2) ?? '—'}</ThemedText>
                            <ThemedText style={[styles.muted, { color: palette.mutedText }]}>{cashRegisterToday.closed_at ? new Date(cashRegisterToday.closed_at * 1000).toLocaleTimeString() : ''}</ThemedText>
                        </View>
                    </View>
                ) : (
                    <>
                        <View style={styles.sessionGrid}>
                            <View style={[styles.sessionCard, { borderColor: `${palette.success}44`, backgroundColor: `${palette.success}12` }]}>
                                <ThemedText style={[styles.sessionLabel, { color: palette.mutedText }]}>{t('accountsForm.caja.openingAmountLabel')}</ThemedText>
                                <ThemedText style={[styles.sessionValue, { color: palette.success }]}>${cashRegisterToday.opening_amount.toFixed(2)}</ThemedText>
                                <ThemedText style={[styles.muted, { color: palette.mutedText }]}>{new Date(cashRegisterToday.opened_at * 1000).toLocaleTimeString()}</ThemedText>
                            </View>
                            <View style={[styles.sessionCard, { borderColor: palette.border }]}>
                                <ThemedText style={[styles.sessionLabel, { color: palette.mutedText }]}>{t('accountsForm.caja.closingAmountLabel')}</ThemedText>
                                <ThemedText style={[styles.sessionValue, { color: palette.mutedText }]}>—</ThemedText>
                                <ThemedText style={[styles.muted, { color: palette.mutedText }]}>{t('accountsForm.caja.closeTitle')}</ThemedText>
                            </View>
                        </View>
                        <ThemedInput
                            value={sessionForm.amount}
                            onChangeText={(value) => setSessionForm((form) => ({ ...form, amount: value }))}
                            keyboardType="decimal-pad"
                            placeholder={t('accountsForm.caja.closingAmount')}
                        />
                        <ThemedInput
                            value={sessionForm.notes}
                            onChangeText={(value) => setSessionForm((form) => ({ ...form, notes: value }))}
                            placeholder={t('accountsForm.caja.notes')}
                        />
                        <ThemedButton icon="lock-closed-outline" tone="danger" label={t('accountsForm.caja.close')} onPress={() => void handleCloseCashRegister()} />
                    </>
                )}
            </ThemedCard>

            <ThemedCard style={styles.card}>
                <View style={styles.headerRow}>
                    <ThemedText type="subtitle">{t('cashRegister.adjustments')}</ThemedText>
                    <ThemedText style={styles.muted}>{t('cashRegister.adjustmentHint')}</ThemedText>
                </View>

                {!cashRegisterToday || cashRegisterToday.closed_at ? (
                    <ThemedText style={styles.muted}>{t('cashRegister.adjustmentDisabled')}</ThemedText>
                ) : (
                    <View style={styles.adjustmentForm}>
                        <ThemedInput
                            value={adjustmentForm.amount}
                            onChangeText={(value) => setAdjustmentForm((form) => ({ ...form, amount: value }))}
                            keyboardType="decimal-pad"
                            placeholder={t('cashRegister.adjustmentAmount')}
                        />
                        <ThemedInput
                            value={adjustmentForm.reason}
                            onChangeText={(value) => setAdjustmentForm((form) => ({ ...form, reason: value }))}
                            placeholder={t('cashRegister.adjustmentReason')}
                        />
                        <ThemedButton icon="swap-vertical-outline" label={t('cashRegister.adjustmentSave')} onPress={() => void handleRegisterAdjustment()} />
                    </View>
                )}

                {adjustmentMessage ? <ThemedText style={styles.muted}>{adjustmentMessage}</ThemedText> : null}

                {cashRegisterAdjustments.length === 0 ? (
                    <ThemedText style={styles.muted}>{t('cashRegister.noAdjustments')}</ThemedText>
                ) : (
                    <View style={styles.adjustmentList}>
                        {cashRegisterAdjustments.map((adjustment) => (
                            <View key={adjustment.id} style={[styles.adjustmentItem, { borderColor: palette.border }]}>
                                <View style={styles.adjustmentItemTop}>
                                    <ThemedText type="defaultSemiBold" style={{ color: adjustment.amount >= 0 ? palette.success : palette.danger }}>
                                        {adjustment.amount >= 0 ? '+' : ''}${Number(adjustment.amount).toFixed(2)}
                                    </ThemedText>
                                    <ThemedText style={styles.muted}>{new Date(adjustment.created_at * 1000).toLocaleTimeString()}</ThemedText>
                                </View>
                                <ThemedText style={styles.muted}>{adjustment.reason}</ThemedText>
                            </View>
                        ))}
                    </View>
                )}
            </ThemedCard>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        gap: 12,
    },
    card: {
        gap: 10,
    },
    headerRow: {
        gap: 4,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    summaryCard: {
        flex: 1,
        minWidth: '45%',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        gap: 4,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    sessionGrid: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    sessionCard: {
        flex: 1,
        minWidth: '45%',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        gap: 4,
    },
    sessionLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    sessionValue: {
        fontSize: 18,
        fontWeight: '800',
    },
    adjustmentForm: {
        gap: 8,
    },
    adjustmentList: {
        gap: 8,
    },
    adjustmentItem: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        gap: 4,
    },
    adjustmentItemTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
});