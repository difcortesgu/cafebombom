import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormFeedback } from '@/components/ui/form-feedback';
import { SlidePanel } from '@/components/ui/slide-panel';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { usePanelLifecycle } from '@/hooks/use-panel-lifecycle';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import type { CashRegisterHistoryDay } from '@/types/accounts';

const parseAmount = (raw: string) => {
    const amount = Number.parseFloat(raw);
    return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
};

const formatTimeLabel = (unix: number) => new Date(unix * 1000).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

type DayAdjustmentTarget = 'opening' | 'closing';

function HistoryCard({
    day,
    onAdjust,
}: {
    day: CashRegisterHistoryDay;
    onAdjust: (day: CashRegisterHistoryDay) => void;
}) {
    const palette = useAppColors();
    const adjustmentSign = day.adjustment_total >= 0 ? '+' : '';
    const netCash = (day.closing_amount ?? day.opening_amount) + day.adjustment_total;
    const firstAdjustments = day.adjustments.slice(0, 3);

    return (
        <View style={[styles.historyCard, { borderColor: palette.border }]}>
            <View style={styles.historyCardHeader}>
                <View style={styles.historyCardTitleRow}>
                    <Ionicons name="calendar-outline" size={18} color={palette.tint} />
                    <ThemedText type="defaultSemiBold">{day.day_label}</ThemedText>
                </View>
                <ThemedText style={styles.muted}>{day.adjustments.length} {t('cashRegister.adjustments')}</ThemedText>
            </View>

            <View style={styles.compactRow}>
                <ThemedText style={styles.compactLabel}>{t('accountsForm.caja.openingAmountLabel')}</ThemedText>
                <ThemedText type="defaultSemiBold">${day.opening_amount.toFixed(2)}</ThemedText>
                <ThemedText style={styles.compactLabel}>{t('accountsForm.caja.closingAmountLabel')}</ThemedText>
                <ThemedText type="defaultSemiBold">{day.closing_amount == null ? '—' : `$${day.closing_amount.toFixed(2)}`}</ThemedText>
                <ThemedText style={styles.compactLabel}>{t('cashRegister.adjustmentTotal')}</ThemedText>
                <ThemedText type="defaultSemiBold">{adjustmentSign}${day.adjustment_total.toFixed(2)}</ThemedText>
            </View>

            <View style={styles.adjustmentsBlock}>
                {firstAdjustments.length === 0 ? (
                    <ThemedText style={styles.muted}>{t('cashRegister.noAdjustments')}</ThemedText>
                ) : (
                    <ThemedText style={styles.adjustmentText}>
                        {firstAdjustments.map((adjustment) => `${formatTimeLabel(adjustment.created_at)} ${adjustment.amount >= 0 ? '+' : ''}$${Number(adjustment.amount).toFixed(2)} ${adjustment.reason}`).join(' · ')}
                        {day.adjustments.length > firstAdjustments.length ? ` · +${day.adjustments.length - firstAdjustments.length}` : ''}
                    </ThemedText>
                )}
                <ThemedText style={styles.muted}>{t('cashRegister.adjustedCash')}: ${netCash.toFixed(2)}</ThemedText>
            </View>

            <View style={styles.cardActions}>
                <ThemedButton
                    variant="secondary"
                    icon="create-outline"
                    label={t('cashRegister.adjustDay')}
                    onPress={() => onAdjust(day)}
                />
            </View>
        </View>
    );
}

export function CashRegisterHistorySection() {
    const palette = useAppColors();
    const { width: screenWidth } = useWindowDimensions();
    const panel = usePanelLifecycle();
    const { cashRegisterHistory, loadCashRegisterHistory, addCashRegisterAdjustment } = useAccountsStore();
    const [selectedDay, setSelectedDay] = useState<CashRegisterHistoryDay | null>(null);
    const [openingForm, setOpeningForm] = useState({ amount: '0', reason: '' });
    const [closingForm, setClosingForm] = useState({ amount: '0', reason: '' });
    const [message, setMessage] = useState<string | null>(null);
    const [savingTarget, setSavingTarget] = useState<DayAdjustmentTarget | null>(null);

    useEffect(() => {
        void loadCashRegisterHistory();
    }, [loadCashRegisterHistory]);

    useEffect(() => {
        if (!selectedDay) return;
        setOpeningForm({ amount: '0', reason: '' });
        setClosingForm({ amount: '0', reason: '' });
        setMessage(null);
    }, [selectedDay?.id]);

    const selectedDayData = useMemo(() => {
        if (!selectedDay) return null;
        return cashRegisterHistory.find((day) => day.id === selectedDay.id) ?? selectedDay;
    }, [cashRegisterHistory, selectedDay]);

    const openAdjustPanel = (day: CashRegisterHistoryDay) => {
        setSelectedDay(day);
        panel.open();
    };

    const closeAdjustPanel = () => {
        panel.close();
    };

    const handlePanelExited = () => {
        setSelectedDay(null);
        panel.onExited();
    };

    const openingAdjustmentsTotal = useMemo(() => {
        if (!selectedDayData) return 0;
        return selectedDayData.adjustments
            .filter((adjustment) => adjustment.reason.toUpperCase().startsWith('[APERTURA]'))
            .reduce((sum, adjustment) => sum + Number(adjustment.amount), 0);
    }, [selectedDayData]);

    const closingAdjustmentsTotal = useMemo(() => {
        if (!selectedDayData) return 0;
        return selectedDayData.adjustments
            .filter((adjustment) => adjustment.reason.toUpperCase().startsWith('[CIERRE]'))
            .reduce((sum, adjustment) => sum + Number(adjustment.amount), 0);
    }, [selectedDayData]);

    const handleSave = async (target: DayAdjustmentTarget) => {
        if (!selectedDayData) return;

        const form = target === 'opening' ? openingForm : closingForm;
        const amount = parseAmount(form.amount);
        const reason = form.reason.trim();
        if (!amount || !reason) {
            setMessage(t('cashRegister.adjustmentRequired'));
            return;
        }

        const taggedReason = `${target === 'opening' ? '[APERTURA]' : '[CIERRE]'} ${reason}`;

        try {
            setSavingTarget(target);
            await addCashRegisterAdjustment({
                sessionId: selectedDayData.id,
                amount,
                reason: taggedReason,
            });
            await loadCashRegisterHistory();
            if (target === 'opening') {
                setOpeningForm({ amount: '0', reason: '' });
            } else {
                setClosingForm({ amount: '0', reason: '' });
            }
            setMessage(null);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : t('common.error'));
        } finally {
            setSavingTarget(null);
        }
    };

    return (
        <>
            <ThemedCard style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                    <View>
                        <ThemedText type="subtitle">{t('cashRegister.historyTitle')}</ThemedText>
                        <ThemedText style={styles.muted}>{t('cashRegister.historySubtitle')}</ThemedText>
                    </View>
                    <ThemedText style={styles.muted}>{cashRegisterHistory.length}</ThemedText>
                </View>

                {cashRegisterHistory.length === 0 ? (
                    <ThemedText style={styles.muted}>{t('cashRegister.historyEmpty')}</ThemedText>
                ) : (
                    <View style={styles.historyList}>
                        {cashRegisterHistory.map((day) => (
                            <HistoryCard key={day.day_key} day={day} onAdjust={openAdjustPanel} />
                        ))}
                    </View>
                )}
            </ThemedCard>

            {panel.mounted && selectedDayData ? (
                <SlidePanel
                    visible={panel.visible}
                    title={t('cashRegister.adjustDayPanelTitle')}
                    icon="cash-outline"
                    onClose={closeAdjustPanel}
                    onExited={handlePanelExited}
                    width={Math.min(Math.floor(screenWidth * 0.4), 520)}
                    contentContainerStyle={styles.panelContent}
                >
                    <ThemedCard style={[styles.panelSummary, { borderColor: palette.border }]}>
                        <ThemedText type="defaultSemiBold">{selectedDayData.day_label}</ThemedText>
                        <ThemedText style={styles.muted}>
                            {selectedDayData.closed_at
                                ? t('accountsForm.caja.alreadyClosed')
                                : t('accountsForm.caja.openTitle')}
                        </ThemedText>
                        <ThemedText style={styles.muted}>
                            {t('accountsForm.caja.openingAmountLabel')}: ${selectedDayData.opening_amount.toFixed(2)}
                        </ThemedText>
                        <ThemedText style={styles.muted}>
                            {t('accountsForm.caja.closingAmountLabel')}: {selectedDayData.closing_amount == null ? '—' : `$${selectedDayData.closing_amount.toFixed(2)}`}
                        </ThemedText>
                        <ThemedText style={styles.muted}>
                            {t('cashRegister.adjustmentTotal')}: {selectedDayData.adjustment_total >= 0 ? '+' : ''}${selectedDayData.adjustment_total.toFixed(2)}
                        </ThemedText>
                    </ThemedCard>

                    <ThemedCard style={[styles.panelSummary, { borderColor: palette.border }]}>
                        <ThemedText type="defaultSemiBold">Ajustar apertura</ThemedText>
                        <ThemedText style={styles.muted}>Total ajustes apertura: {openingAdjustmentsTotal >= 0 ? '+' : ''}${openingAdjustmentsTotal.toFixed(2)}</ThemedText>
                        <ThemedInput
                            label="Monto"
                            value={openingForm.amount}
                            onChangeText={(value) => setOpeningForm((current) => ({ ...current, amount: value }))}
                            keyboardType="decimal-pad"
                            placeholder={t('cashRegister.adjustmentAmount')}
                        />
                        <ThemedInput
                            label="Motivo"
                            value={openingForm.reason}
                            onChangeText={(value) => setOpeningForm((current) => ({ ...current, reason: value }))}
                            placeholder={t('cashRegister.adjustmentReason')}
                        />
                        <View style={styles.inlineActions}>
                            <ThemedButton
                                variant="secondary"
                                icon="checkmark-circle-outline"
                                label={savingTarget === 'opening' ? 'Guardando...' : 'Guardar ajuste apertura'}
                                disabled={savingTarget !== null}
                                onPress={() => void handleSave('opening')}
                            />
                        </View>
                    </ThemedCard>

                    <ThemedCard style={[styles.panelSummary, { borderColor: palette.border }]}>
                        <ThemedText type="defaultSemiBold">Ajustar cierre</ThemedText>
                        <ThemedText style={styles.muted}>Total ajustes cierre: {closingAdjustmentsTotal >= 0 ? '+' : ''}${closingAdjustmentsTotal.toFixed(2)}</ThemedText>
                        <ThemedInput
                            label="Monto"
                            value={closingForm.amount}
                            onChangeText={(value) => setClosingForm((current) => ({ ...current, amount: value }))}
                            keyboardType="decimal-pad"
                            placeholder={t('cashRegister.adjustmentAmount')}
                        />
                        <ThemedInput
                            label="Motivo"
                            value={closingForm.reason}
                            onChangeText={(value) => setClosingForm((current) => ({ ...current, reason: value }))}
                            placeholder={t('cashRegister.adjustmentReason')}
                        />
                        <View style={styles.inlineActions}>
                            <ThemedButton
                                variant="secondary"
                                icon="checkmark-circle-outline"
                                label={savingTarget === 'closing' ? 'Guardando...' : 'Guardar ajuste cierre'}
                                disabled={savingTarget !== null}
                                onPress={() => void handleSave('closing')}
                            />
                        </View>
                    </ThemedCard>

                    <FormFeedback message={message} />

                    <ThemedCard style={[styles.panelSummary, { borderColor: palette.border }]}>
                        <ThemedText type="defaultSemiBold">Historial completo de ajustes</ThemedText>
                        {selectedDayData.adjustments.length === 0 ? (
                            <ThemedText style={styles.muted}>{t('cashRegister.noAdjustments')}</ThemedText>
                        ) : (
                            <View style={styles.adjustmentList}>
                                {selectedDayData.adjustments.map((adjustment) => (
                                    <View key={adjustment.id} style={[styles.adjustmentItem, { borderColor: palette.border }]}>
                                        <View style={styles.adjustmentItemTop}>
                                            <ThemedText type="defaultSemiBold">
                                                {adjustment.amount >= 0 ? '+' : ''}${Number(adjustment.amount).toFixed(2)}
                                            </ThemedText>
                                            <ThemedText style={styles.muted}>{formatTimeLabel(adjustment.created_at)}</ThemedText>
                                        </View>
                                        <ThemedText style={styles.muted}>{adjustment.reason}</ThemedText>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ThemedCard>
                </SlidePanel>
            ) : null}
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 10,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    historyList: {
        gap: 8,
    },
    historyCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        gap: 8,
    },
    historyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    historyCardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    historyGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    metricCard: {
        flex: 1,
        minWidth: '45%',
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        gap: 4,
    },
    metricLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    adjustmentsBlock: {
        gap: 6,
    },
    adjustmentList: {
        gap: 6,
    },
    adjustmentItem: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 8,
        gap: 3,
    },
    adjustmentItemTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    compactRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
    },
    compactLabel: {
        fontSize: 12,
        opacity: 0.75,
    },
    adjustmentText: {
        fontSize: 13,
        lineHeight: 18,
        opacity: 0.95,
    },
    panelSummary: {
        borderWidth: 1,
        gap: 5,
        padding: 10,
    },
    panelContent: {
        gap: 10,
    },
    inlineActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '100%',
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '100%',
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
});