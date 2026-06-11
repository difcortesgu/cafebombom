import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useIsWide } from '@/components/ui/centered-page';
import { FormFeedback } from '@/components/ui/form-feedback';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAccountsStore } from '@/stores/accounts';
import type { CashRegisterHistoryDay } from '@/types/accounts';
import { money } from '@/utils/money';

const parseAmount = (raw: string) => {
    const amount = Number.parseFloat(raw);
    return Number.isFinite(amount) ? Number(Math.abs(amount).toFixed(2)) : 0;
};

const formatTimeLabel = (unix: number) => new Date(unix * 1000).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

/** Render a signed money value with an explicit + / − prefix. */
const signedMoney = (amount: number) => `${amount >= 0 ? '+' : '−'}${money(Math.abs(amount))}`;

type DayAdjustmentTarget = 'opening' | 'closing';
type AdjustmentDirection = 'add' | 'subtract';
type AdjustmentForm = { amount: string; reason: string; direction: AdjustmentDirection };

const emptyForm: AdjustmentForm = { amount: '', reason: '', direction: 'add' };

function DirectionToggle({
    value,
    onChange,
}: {
    value: AdjustmentDirection;
    onChange: (next: AdjustmentDirection) => void;
}) {
    const palette = useAppColors();
    const options: { key: AdjustmentDirection; label: string; icon: 'arrow-up-circle-outline' | 'arrow-down-circle-outline'; color: string }[] = [
        { key: 'add', label: t('cashRegister.directionAdd'), icon: 'arrow-up-circle-outline', color: palette.success },
        { key: 'subtract', label: t('cashRegister.directionSubtract'), icon: 'arrow-down-circle-outline', color: palette.danger },
    ];

    return (
        <View style={styles.directionRow}>
            {options.map((option) => {
                const active = value === option.key;
                return (
                    <Pressable
                        key={option.key}
                        style={[
                            styles.directionChip,
                            {
                                backgroundColor: active ? `${option.color}1F` : palette.inputBackground,
                                borderColor: active ? option.color : palette.border,
                            },
                        ]}
                        onPress={() => onChange(option.key)}>
                        <Ionicons name={option.icon} size={16} color={active ? option.color : palette.mutedText} />
                        <ThemedText style={[styles.directionChipText, { color: active ? option.color : palette.text, fontWeight: active ? '700' : '500' }]}>
                            {option.label}
                        </ThemedText>
                    </Pressable>
                );
            })}
        </View>
    );
}

function AdjustmentFormCard({
    title,
    icon,
    totalLabel,
    total,
    form,
    onChange,
    saving,
    onSave,
    saveLabel,
}: {
    title: string;
    icon: 'enter-outline' | 'exit-outline';
    totalLabel: string;
    total: number;
    form: AdjustmentForm;
    onChange: (next: AdjustmentForm) => void;
    saving: boolean;
    onSave: () => void;
    saveLabel: string;
}) {
    const palette = useAppColors();
    const totalColor = total > 0 ? palette.success : total < 0 ? palette.danger : palette.text;

    return (
        <ThemedCard style={[styles.panelSummary, { borderColor: palette.border }]}>
            <View style={styles.cardHeadingRow}>
                <Ionicons name={icon} size={18} color={palette.tint} />
                <ThemedText type="defaultSemiBold">{title}</ThemedText>
            </View>
            <View style={styles.totalRow}>
                <ThemedText style={styles.muted}>{totalLabel}</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: totalColor }}>{signedMoney(total)}</ThemedText>
            </View>

            <DirectionToggle value={form.direction} onChange={(direction) => onChange({ ...form, direction })} />

            <ThemedInput
                label={t('cashRegister.amount')}
                value={form.amount}
                onChangeText={(amount) => onChange({ ...form, amount })}
                numeric="currency"
                placeholder={t('cashRegister.adjustmentAmount')}
            />
            <ThemedInput
                label={t('cashRegister.reason')}
                value={form.reason}
                onChangeText={(reason) => onChange({ ...form, reason })}
                placeholder={t('cashRegister.adjustmentReason')}
            />
            <ThemedButton
                variant="secondary"
                icon="checkmark-circle-outline"
                label={saving ? t('cashRegister.saving') : saveLabel}
                disabled={saving}
                onPress={onSave}
            />
        </ThemedCard>
    );
}

function AdjustmentRow({ amount, reason, createdAt }: { amount: number; reason: string; createdAt: number }) {
    const palette = useAppColors();
    const positive = amount >= 0;
    const color = positive ? palette.success : palette.danger;

    return (
        <View style={[styles.adjustmentItem, { borderColor: palette.border }]}>
            <View style={[styles.adjustmentIconBadge, { backgroundColor: `${color}1A` }]}>
                <Ionicons name={positive ? 'arrow-up' : 'arrow-down'} size={16} color={color} />
            </View>
            <View style={styles.adjustmentItemBody}>
                <View style={styles.adjustmentItemTop}>
                    <ThemedText type="defaultSemiBold" style={{ color }}>{signedMoney(amount)}</ThemedText>
                    <ThemedText style={styles.muted}>{formatTimeLabel(createdAt)}</ThemedText>
                </View>
                <ThemedText style={styles.muted}>{reason}</ThemedText>
            </View>
        </View>
    );
}

function HistoryCard({
    day,
    onAdjust,
}: {
    day: CashRegisterHistoryDay;
    onAdjust: (day: CashRegisterHistoryDay) => void;
}) {
    const palette = useAppColors();
    const adjustmentColor = day.adjustment_total > 0 ? palette.success : day.adjustment_total < 0 ? palette.danger : palette.text;
    const netCash = (day.closing_amount ?? day.opening_amount) + day.adjustment_total;
    const firstAdjustments = day.adjustments.slice(0, 3);
    const remaining = day.adjustments.length - firstAdjustments.length;

    return (
        <View style={[styles.historyCard, { borderColor: palette.border }]}>
            <View style={styles.historyCardHeader}>
                <View style={styles.historyCardTitleRow}>
                    <Ionicons name="calendar-outline" size={18} color={palette.tint} />
                    <ThemedText type="defaultSemiBold">{day.day_label}</ThemedText>
                </View>
                <View style={styles.adjustmentCountBadge}>
                    <Ionicons name="swap-vertical-outline" size={13} color={palette.mutedText} />
                    <ThemedText style={styles.muted}>{day.adjustments.length} {t('cashRegister.adjustments')}</ThemedText>
                </View>
            </View>

            <View style={styles.metricsGrid}>
                <View style={[styles.metricCard, { borderColor: palette.border }]}>
                    <ThemedText style={[styles.metricLabel, { color: palette.mutedText }]}>{t('accountsForm.caja.openingAmountLabel')}</ThemedText>
                    <ThemedText style={styles.metricValue}>{money(day.opening_amount)}</ThemedText>
                </View>
                <View style={[styles.metricCard, { borderColor: palette.border }]}>
                    <ThemedText style={[styles.metricLabel, { color: palette.mutedText }]}>{t('accountsForm.caja.closingAmountLabel')}</ThemedText>
                    <ThemedText style={styles.metricValue}>{day.closing_amount == null ? '—' : money(day.closing_amount)}</ThemedText>
                </View>
                <View style={[styles.metricCard, { borderColor: `${adjustmentColor}55`, backgroundColor: `${adjustmentColor}10` }]}>
                    <ThemedText style={[styles.metricLabel, { color: palette.mutedText }]}>{t('cashRegister.adjustmentTotal')}</ThemedText>
                    <ThemedText style={[styles.metricValue, { color: adjustmentColor }]}>{signedMoney(day.adjustment_total)}</ThemedText>
                </View>
                <View style={[styles.metricCard, { borderColor: palette.tint + '55', backgroundColor: palette.tint + '10' }]}>
                    <ThemedText style={[styles.metricLabel, { color: palette.mutedText }]}>{t('cashRegister.adjustedCash')}</ThemedText>
                    <ThemedText style={[styles.metricValue, { color: palette.tint }]}>{money(netCash)}</ThemedText>
                </View>
            </View>

            {firstAdjustments.length > 0 ? (
                <View style={styles.adjustmentsPreview}>
                    {firstAdjustments.map((adjustment) => (
                        <AdjustmentRow key={adjustment.id} amount={adjustment.amount} reason={adjustment.reason} createdAt={adjustment.created_at} />
                    ))}
                    {remaining > 0 ? (
                        <ThemedText style={styles.muted}>+{remaining} {t('cashRegister.adjustments').toLowerCase()}</ThemedText>
                    ) : null}
                </View>
            ) : (
                <ThemedText style={styles.muted}>{t('cashRegister.noAdjustments')}</ThemedText>
            )}

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

export type CashRegisterAdjustPanelContentProps = {
    day: CashRegisterHistoryDay;
    onClose: () => void;
};

export function CashRegisterAdjustPanelContent({ day, onClose }: CashRegisterAdjustPanelContentProps) {
    const palette = useAppColors();
    const isWide = useIsWide();
    const { cashRegisterHistory, loadCashRegisterHistory, addCashRegisterAdjustment } = useAccountsStore();
    const [openingForm, setOpeningForm] = useState<AdjustmentForm>(emptyForm);
    const [closingForm, setClosingForm] = useState<AdjustmentForm>(emptyForm);
    const [message, setMessage] = useState<string | null>(null);
    const [savingTarget, setSavingTarget] = useState<DayAdjustmentTarget | null>(null);

    const selectedDayData = useMemo(() => {
        return cashRegisterHistory.find((d) => d.id === day.id) ?? day;
    }, [cashRegisterHistory, day]);

    useEffect(() => {
        setOpeningForm(emptyForm);
        setClosingForm(emptyForm);
        setMessage(null);
    }, [day.id]);

    const openingAdjustmentsTotal = useMemo(() => {
        return selectedDayData.adjustments
            .filter((adjustment) => adjustment.reason.toUpperCase().startsWith('[APERTURA]'))
            .reduce((sum, adjustment) => sum + Number(adjustment.amount), 0);
    }, [selectedDayData]);

    const closingAdjustmentsTotal = useMemo(() => {
        return selectedDayData.adjustments
            .filter((adjustment) => adjustment.reason.toUpperCase().startsWith('[CIERRE]'))
            .reduce((sum, adjustment) => sum + Number(adjustment.amount), 0);
    }, [selectedDayData]);

    const handleSave = async (target: DayAdjustmentTarget) => {
        const form = target === 'opening' ? openingForm : closingForm;
        const magnitude = parseAmount(form.amount);
        const reason = form.reason.trim();
        if (!magnitude || !reason) {
            setMessage(t('cashRegister.adjustmentRequired'));
            return;
        }

        const amount = form.direction === 'subtract' ? -magnitude : magnitude;
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
                setOpeningForm(emptyForm);
            } else {
                setClosingForm(emptyForm);
            }
            setMessage(null);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : t('common.error'));
        } finally {
            setSavingTarget(null);
        }
    };

    const adjustmentColor = selectedDayData.adjustment_total > 0
        ? palette.success
        : selectedDayData.adjustment_total < 0 ? palette.danger : palette.text;

    return (
        <>
            <View style={[styles.panelHeader, { borderBottomColor: palette.border }]}>
                <View style={styles.panelHeaderTitle}>
                    <Ionicons name="cash-outline" size={20} color={palette.tint} />
                    <ThemedText type="subtitle">{t('cashRegister.adjustDayPanelTitle')}</ThemedText>
                </View>
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={palette.text} />
                </Pressable>
            </View>
            <ScrollView style={styles.panelScroll} contentContainerStyle={[styles.panelContent, isWide && styles.panelContentWide]} keyboardShouldPersistTaps="handled">
                <ThemedCard style={[styles.panelSummary, { borderColor: palette.border }]}>
                    <View style={styles.cardHeadingRow}>
                        <Ionicons name="calendar-outline" size={18} color={palette.tint} />
                        <ThemedText type="defaultSemiBold">{selectedDayData.day_label}</ThemedText>
                    </View>
                    <View style={styles.statusRow}>
                        <Ionicons
                            name={selectedDayData.closed_at ? 'lock-closed-outline' : 'lock-open-outline'}
                            size={14}
                            color={palette.mutedText}
                        />
                        <ThemedText style={styles.muted}>
                            {selectedDayData.closed_at ? t('accountsForm.caja.alreadyClosed') : t('accountsForm.caja.openTitle')}
                        </ThemedText>
                    </View>
                    <View style={styles.metricsGrid}>
                        <View style={[styles.metricCard, { borderColor: palette.border }]}>
                            <ThemedText style={[styles.metricLabel, { color: palette.mutedText }]}>{t('accountsForm.caja.openingAmountLabel')}</ThemedText>
                            <ThemedText style={styles.metricValue}>{money(selectedDayData.opening_amount)}</ThemedText>
                        </View>
                        <View style={[styles.metricCard, { borderColor: palette.border }]}>
                            <ThemedText style={[styles.metricLabel, { color: palette.mutedText }]}>{t('accountsForm.caja.closingAmountLabel')}</ThemedText>
                            <ThemedText style={styles.metricValue}>{selectedDayData.closing_amount == null ? '—' : money(selectedDayData.closing_amount)}</ThemedText>
                        </View>
                        <View style={[styles.metricCard, { borderColor: `${adjustmentColor}55`, backgroundColor: `${adjustmentColor}10` }]}>
                            <ThemedText style={[styles.metricLabel, { color: palette.mutedText }]}>{t('cashRegister.adjustmentTotal')}</ThemedText>
                            <ThemedText style={[styles.metricValue, { color: adjustmentColor }]}>{signedMoney(selectedDayData.adjustment_total)}</ThemedText>
                        </View>
                    </View>
                </ThemedCard>

                <AdjustmentFormCard
                    title={t('cashRegister.adjustOpeningTitle')}
                    icon="enter-outline"
                    totalLabel={t('cashRegister.openingAdjustmentsTotal')}
                    total={openingAdjustmentsTotal}
                    form={openingForm}
                    onChange={setOpeningForm}
                    saving={savingTarget === 'opening'}
                    onSave={() => void handleSave('opening')}
                    saveLabel={t('cashRegister.saveOpeningAdjustment')}
                />
                <AdjustmentFormCard
                    title={t('cashRegister.adjustClosingTitle')}
                    icon="exit-outline"
                    totalLabel={t('cashRegister.closingAdjustmentsTotal')}
                    total={closingAdjustmentsTotal}
                    form={closingForm}
                    onChange={setClosingForm}
                    saving={savingTarget === 'closing'}
                    onSave={() => void handleSave('closing')}
                    saveLabel={t('cashRegister.saveClosingAdjustment')}
                />

                <FormFeedback message={message} />

                <ThemedCard style={[styles.panelSummary, { borderColor: palette.border }]}>
                    <View style={styles.cardHeadingRow}>
                        <Ionicons name="time-outline" size={18} color={palette.tint} />
                        <ThemedText type="defaultSemiBold">{t('cashRegister.fullHistoryTitle')}</ThemedText>
                    </View>
                    {selectedDayData.adjustments.length === 0 ? (
                        <ThemedText style={styles.muted}>{t('cashRegister.noAdjustments')}</ThemedText>
                    ) : (
                        <View style={styles.adjustmentList}>
                            {selectedDayData.adjustments.map((adjustment) => (
                                <AdjustmentRow key={adjustment.id} amount={adjustment.amount} reason={adjustment.reason} createdAt={adjustment.created_at} />
                            ))}
                        </View>
                    )}
                </ThemedCard>
            </ScrollView>
        </>
    );
}

export type CashRegisterHistorySectionProps = {
    onAdjustDay: (day: CashRegisterHistoryDay) => void;
};

export function CashRegisterHistorySection({ onAdjustDay }: CashRegisterHistorySectionProps) {
    const palette = useAppColors();
    const { cashRegisterHistory, loadCashRegisterHistory } = useAccountsStore();

    useEffect(() => {
        void loadCashRegisterHistory();
    }, [loadCashRegisterHistory]);

    return (
        <ThemedCard style={styles.card}>
            <View style={styles.sectionHeaderRow}>
                <View style={styles.historyCardTitleRow}>
                    <Ionicons name="time-outline" size={20} color={palette.tint} />
                    <View>
                        <ThemedText type="subtitle">{t('cashRegister.historyTitle')}</ThemedText>
                        <ThemedText style={styles.muted}>{t('cashRegister.historySubtitle')}</ThemedText>
                    </View>
                </View>
                <ThemedText style={styles.muted}>{cashRegisterHistory.length}</ThemedText>
            </View>

            {cashRegisterHistory.length === 0 ? (
                <ThemedText style={styles.muted}>{t('cashRegister.historyEmpty')}</ThemedText>
            ) : (
                <View style={styles.historyList}>
                    {cashRegisterHistory.map((day) => (
                        <HistoryCard key={day.day_key} day={day} onAdjust={onAdjustDay} />
                    ))}
                </View>
            )}
        </ThemedCard>
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
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    panelHeaderTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    closeButton: {
        padding: 4,
    },
    historyList: {
        gap: 10,
    },
    historyCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        gap: 10,
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
    adjustmentCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    metricCard: {
        flexGrow: 1,
        flexBasis: '45%',
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
    adjustmentsPreview: {
        gap: 6,
    },
    adjustmentList: {
        gap: 6,
    },
    adjustmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
    },
    adjustmentIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    adjustmentItemBody: {
        flex: 1,
        gap: 3,
    },
    adjustmentItemTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    directionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    directionChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 9,
    },
    directionChipText: {
        fontSize: 13,
    },
    cardHeadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    totalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    panelSummary: {
        borderWidth: 1,
        gap: 8,
        padding: 12,
    },
    panelScroll: {
        flex: 1,
    },
    panelContent: {
        gap: 10,
        padding: 12,
    },
    panelContentWide: {
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
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
