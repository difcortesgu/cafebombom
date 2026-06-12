import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedText } from '@/components/themed-text';
import { t } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';
import { formatCurrencyDisplay, sanitizeNumeric } from '@/utils/format/number';
import { money } from '@/utils/money';

type TipOption = 'none' | '2' | '5' | '7' | '10' | '15' | 'custom';

const PRESET_PERCENTAGES: { key: TipOption; pct: number }[] = [
    { key: '2', pct: 0.02 },
    { key: '5', pct: 0.05 },
    { key: '7', pct: 0.07 },
    { key: '10', pct: 0.10 },
    { key: '15', pct: 0.15 },
];

type TipSelectorModalProps = {
    visible: boolean;
    baseAmount: number;
    initialAmount?: number;
    /** `tipPercent` is the exact selected percentage for presets, or null for a custom amount. */
    onConfirm: (tipAmount: number, tipPercent: number | null) => void;
    onCancel: () => void;
    palette: {
        card: string;
        border: string;
        mutedText: string;
        tint: string;
        accent: string;
        text: string;
        inputBackground: string;
        background: string;
    };
};

export function TipSelectorModal({ visible, baseAmount, initialAmount, onConfirm, onCancel, palette }: TipSelectorModalProps) {
    const currency = useSettingsStore((s) => s.currency);
    const [selected, setSelected] = useState<TipOption>('none');
    const [customValue, setCustomValue] = useState('');

    useEffect(() => {
        if (!visible) return;
        if (!initialAmount || initialAmount <= 0) {
            setSelected('none');
            setCustomValue('');
            return;
        }
        const match = PRESET_PERCENTAGES.find((o) => Math.round(baseAmount * o.pct) === initialAmount);
        if (match) {
            setSelected(match.key);
            setCustomValue('');
        } else {
            setSelected('custom');
            setCustomValue(String(initialAmount));
        }
    }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

    function resolvedTip(): number {
        if (selected === 'none') return 0;
        if (selected === 'custom') {
            const parsed = parseFloat(customValue);
            return isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed);
        }
        const pct = PRESET_PERCENTAGES.find((o) => o.key === selected)?.pct ?? 0;
        return Math.round(baseAmount * pct);
    }

    const tip = resolvedTip();
    const tipPct = baseAmount > 0 ? Math.round((tip / baseAmount) * 100) : 0;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
            <Pressable style={styles.backdrop} onPress={onCancel} />

            <View style={[styles.sheet, { backgroundColor: palette.card }]}>
                <View style={styles.sheetInner}>
                    <View style={[styles.handle, { backgroundColor: palette.border }]} />

                    <ThemedText type="defaultSemiBold" style={styles.title}>
                        {t('sales.tip.modalTitle')}
                    </ThemedText>

                    <View style={styles.optionsBox}>
                        {/* All options in one horizontal wrapping row */}
                        <View style={styles.optionsRow}>
                            <Pressable
                                style={[
                                    styles.chip,
                                    { borderColor: palette.border },
                                    selected === 'none' && { backgroundColor: palette.tint, borderColor: palette.tint },
                                ]}
                                onPress={() => onConfirm(0, 0)}
                            >
                                <ThemedText
                                    numberOfLines={2}
                                    adjustsFontSizeToFit
                                    style={[styles.chipLabel, { color: selected === 'none' ? palette.card : palette.mutedText }]}
                                >
                                    {t('sales.tip.noTip')}
                                </ThemedText>
                            </Pressable>

                            {PRESET_PERCENTAGES.map((opt) => {
                                const isSelected = selected === opt.key;
                                return (
                                    <Pressable
                                        key={opt.key}
                                        style={[
                                            styles.chip,
                                            { borderColor: palette.border },
                                            isSelected && { backgroundColor: palette.tint, borderColor: palette.tint },
                                        ]}
                                        onPress={() => onConfirm(Math.round(baseAmount * opt.pct), Math.round(opt.pct * 100))}
                                    >
                                        <ThemedText
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            style={[styles.chipPct, { color: isSelected ? palette.card : palette.text }]}
                                        >
                                            {Math.round(opt.pct * 100)}%
                                        </ThemedText>
                                        {baseAmount > 0 && (
                                            <ThemedText
                                                numberOfLines={1}
                                                adjustsFontSizeToFit
                                                style={[styles.chipAmount, { color: isSelected ? palette.card : palette.mutedText }]}
                                            >
                                                {money(Math.round(baseAmount * opt.pct))}
                                            </ThemedText>
                                        )}
                                    </Pressable>
                                );
                            })}

                            <Pressable
                                style={[
                                    styles.chip,
                                    { borderColor: palette.border },
                                    selected === 'custom' && { backgroundColor: palette.tint, borderColor: palette.tint },
                                ]}
                                onPress={() => setSelected('custom')}
                            >
                                <ThemedText
                                    numberOfLines={2}
                                    adjustsFontSizeToFit
                                    style={[styles.chipLabel, { color: selected === 'custom' ? palette.card : palette.mutedText }]}
                                >
                                    {t('sales.tip.custom')}
                                </ThemedText>
                            </Pressable>
                        </View>

                        {/* Custom — numeric input, currency-formatted */}
                        {selected === 'custom' && (
                            <View style={[styles.customBox, { borderColor: palette.tint, backgroundColor: palette.inputBackground }]}>
                                <TextInput
                                    style={[styles.customInput, { color: palette.text }]}
                                    keyboardType="number-pad"
                                    placeholder={money(0)}
                                    placeholderTextColor={palette.mutedText}
                                    value={formatCurrencyDisplay(customValue, currency)}
                                    onChangeText={(text) => setCustomValue(sanitizeNumeric(text, 'currency', currency))}
                                    autoFocus
                                    textAlign="center"
                                />
                            </View>
                        )}
                    </View>

                    <ThemedText style={[styles.voluntary, { color: palette.mutedText }]}>
                        {t('sales.tip.voluntary')}
                    </ThemedText>

                    {/* Presets confirm on tap; only the custom amount needs an explicit accept. */}
                    {selected === 'custom' && (
                        <View style={styles.actions}>
                            <ThemedButton
                                label={tip > 0
                                    ? `${tipPct > 0 ? `${tipPct}% · ` : ''}${money(tip)}`
                                    : t('sales.tip.noTip')}
                                style={styles.actionButton}
                                onPress={() => onConfirm(tip, null)}
                            />
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 8,
        paddingBottom: 32,
    },
    sheetInner: {
        width: '100%',
        maxWidth: 660,
        alignSelf: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: 16,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        marginBottom: 4,
    },
    title: {
        fontSize: 18,
        textAlign: 'center',
    },
    optionsBox: {
        width: '100%',
        gap: 10,
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    chip: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 14,
        minHeight: 64,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    chipLabel: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    chipPct: {
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
    },
    chipAmount: {
        fontSize: 11,
        textAlign: 'center',
    },
    customBox: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        alignItems: 'center',
    },
    customInput: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        minWidth: 140,
        padding: 0,
    },
    voluntary: {
        fontSize: 12,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    actionButton: {
        flex: 1,
    },
});
