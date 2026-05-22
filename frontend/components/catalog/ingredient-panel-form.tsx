import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useInventoryStore } from '@/stores/inventory';

export type IngredientPanelFormProps = {
    mode: 'create' | { ingredientId: string };
    onClose: () => void;
};

export function IngredientPanelForm({ mode, onClose }: IngredientPanelFormProps) {
    const palette = useAppColors();
    const { ingredients, units, addIngredient, updateIngredient, addUnit, deleteUnit } = useInventoryStore();

    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [lowStockThreshold, setLowStockThreshold] = useState('5');
    const [message, setMessage] = useState('');

    const isEdit = mode !== 'create';

    const unitOptions = useMemo(
        () => units.map((u) => ({ value: u.name, label: u.name })),
        [units],
    );

    useEffect(() => {
        setMessage('');
        if (mode === 'create') {
            setName('');
            setUnit(units[0]?.name ?? '');
            setLowStockThreshold('5');
        } else {
            const item = ingredients.find((i) => i.id === mode.ingredientId);
            if (item) {
                setName(item.name);
                setUnit(item.unit);
                setLowStockThreshold(String(item.low_stock_threshold));
            }
        }
    }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

    async function submit() {
        if (!name.trim()) { setMessage(t('ingredientForm.error.nameRequired')); return; }
        if (!unit.trim()) { setMessage(t('ingredientForm.error.unitRequired')); return; }
        const payload = { name: name.trim(), unit: unit as any, lowStockThreshold: Number(lowStockThreshold || '0') };
        if (mode === 'create') {
            await addIngredient(payload);
        } else {
            await updateIngredient({ id: mode.ingredientId, ...payload });
        }
        onClose();
    }

    return (
        <>
            <View style={[styles.panelHeader, { borderBottomColor: palette.border }]}>
                <View style={styles.panelHeaderTitle}>
                    <Ionicons name="leaf-outline" size={20} color={palette.tint} />
                    <ThemedText type="subtitle">
                        {isEdit ? t('ingredientForm.title.edit') : t('ingredientForm.title.add')}
                    </ThemedText>
                </View>
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={palette.text} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
                {message ? (
                    <View style={[styles.messageBanner, { backgroundColor: palette.danger + '22', borderColor: palette.danger + '44' }]}>
                        <ThemedText style={{ color: palette.danger, fontSize: 13 }}>{message}</ThemedText>
                    </View>
                ) : null}

                <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                        <Ionicons name="text-outline" size={14} color={palette.mutedText} />
                        <ThemedText style={styles.smallLabel}>{t('ingredientForm.name')}</ThemedText>
                    </View>
                    <ThemedInput value={name} onChangeText={setName} style={styles.input} />
                </View>

                <View style={styles.twoColRow}>
                    <View style={styles.flex1}>
                        <View style={styles.labelRow}>
                            <Ionicons name="scale-outline" size={14} color={palette.mutedText} />
                            <ThemedText style={styles.smallLabel}>{t('ingredientForm.unit')}</ThemedText>
                        </View>
                        <ThemedSelect
                            value={unit}
                            onValueChange={setUnit}
                            items={unitOptions}
                            placeholder={t('ingredientForm.unit')}
                            modalTitle={t('ingredientForm.unit')}
                            canItemAction={() => true}
                            onItemAction={async (item) => {
                                const target = units.find((u) => u.name === item.value);
                                if (!target) return;
                                const error = await deleteUnit({ id: target.id });
                                if (error) { setMessage(error); return; }
                                if (unit === item.value) {
                                    setUnit(units.find((u) => u.id !== target.id)?.name ?? '');
                                }
                                setMessage('');
                            }}
                            onAddNew={async (newName) => {
                                const normalized = newName.trim().toLowerCase();
                                if (!normalized) { setMessage(t('ingredientForm.error.newUnitRequired')); return; }
                                const created = await addUnit({ name: normalized });
                                if (!created) { setMessage(t('ingredientForm.error.unitAlreadyExists')); return; }
                                setUnit(created.name);
                                setMessage('');
                            }}
                            addNewPlaceholder={t('ingredientForm.newUnitPlaceholder')}
                        />
                    </View>
                    <View style={styles.flex1}>
                        <View style={styles.labelRow}>
                            <Ionicons name="alert-circle-outline" size={14} color={palette.mutedText} />
                            <ThemedText style={styles.smallLabel}>{t('ingredientForm.lowStockThreshold')}</ThemedText>
                        </View>
                        <ThemedInput
                            keyboardType="decimal-pad"
                            value={lowStockThreshold}
                            onChangeText={setLowStockThreshold}
                            style={styles.input}
                        />
                    </View>
                </View>
            </ScrollView>

            <View style={[styles.panelFooter, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
                <ThemedButton
                    style={styles.saveButton}
                    label={isEdit ? t('common.saveChanges') : t('ingredientForm.title.add')}
                    icon="checkmark-circle"
                    onPress={() => void submit()}
                />
                <ThemedButton
                    variant="secondary"
                    label={t('common.back')}
                    onPress={onClose}
                    style={styles.backButton}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
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
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
    panelContent: {
        padding: 16,
        gap: 14,
    },
    messageBanner: {
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    fieldGroup: {
        gap: 6,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    smallLabel: {
        fontSize: 12,
        opacity: 0.7,
    },
    input: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    twoColRow: {
        flexDirection: 'row',
        gap: 10,
    },
    flex1: {
        flex: 1,
        gap: 6,
    },
    panelFooter: {
        padding: 14,
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: 10,
    },
    saveButton: {
        flex: 1,
        paddingVertical: 12,
    },
    backButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
});
