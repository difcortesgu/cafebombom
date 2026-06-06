import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormFeedback } from '@/components/ui/form-feedback';
import { PanelActionRow } from '@/components/ui/panel-action-row';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useInventoryStore } from '@/stores/inventory';
import { validateForm } from '@/utils/validation';
import { ingredientFormSchema } from '@/utils/validation/schemas';

export type IngredientFormProps = {
    mode: 'create' | { ingredientId: string };
    onClose: () => void;
};

export function IngredientForm({ mode, onClose }: IngredientFormProps) {
    const palette = useAppColors();
    const { ingredients, units, addIngredient, updateIngredient, addUnit, deleteUnit } = useInventoryStore();

    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [lowStockThreshold, setLowStockThreshold] = useState('5');
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

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
        const result = validateForm(ingredientFormSchema, { name, unit, lowStockThreshold });
        if (!result.ok) {
            setErrors(result.errors);
            if (result.errors.unit) setMessage(t('ingredientForm.error.unitRequired'));
            return;
        }
        setErrors({});
        setMessage('');
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
            <FormFeedback message={message} />

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="text-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallLabel}>{t('ingredientForm.name')}</ThemedText>
                </View>
                <ThemedInput value={name} onChangeText={setName} error={errors.name} />
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
                        error={errors.lowStockThreshold}
                    />
                </View>
            </View>

            <View style={styles.actionsRow}>
                <PanelActionRow
                    primaryLabel={isEdit ? t('common.saveChanges') : t('ingredientForm.title.add')}
                    secondaryLabel={t('common.back')}
                    onPrimaryPress={() => void submit()}
                    onSecondaryPress={onClose}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
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
    twoColRow: {
        flexDirection: 'row',
        gap: 10,
    },
    flex1: {
        flex: 1,
        gap: 6,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
});
