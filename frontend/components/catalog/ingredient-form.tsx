import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

import { ThemedText } from '@/components/themed-text';
import { PanelActionRow } from '@/components/ui/panel-action-row';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useFieldErrors } from '@/hooks/use-field-errors';
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
    const { errors, setErrors, validate } = useFieldErrors(ingredientFormSchema);

    const isEdit = mode !== 'create';
    const formValues = { name, unit, lowStockThreshold };

    const unitOptions = useMemo(
        () => units.map((u) => ({ value: u.name, label: u.name })),
        [units],
    );

    useEffect(() => {
        setErrors({});
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
            return;
        }
        setErrors({});
        const trimmedName = name.trim();
        const threshold = Number(lowStockThreshold || '0');
        try {
            if (mode === 'create') {
                await addIngredient({ name: trimmedName, unit: unit as any, lowStockThreshold: threshold });
                toast.success(t('toast.created'));
            } else {
                await updateIngredient({ id: mode.ingredientId, name: trimmedName, unit: unit as any, low_stock_threshold: threshold });
                toast.success(t('toast.updated'));
            }
            onClose();
        } catch {
            toast.error(t('toast.error'));
        }
    }

    return (
        <>
            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="text-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallLabel}>{t('ingredientForm.name')}</ThemedText>
                </View>
                <ThemedInput value={name} onChangeText={setName} onBlur={() => validate('name', formValues)} error={errors.name} />
            </View>

            <View style={styles.twoColRow}>
                <View style={styles.flex1}>
                    <View style={styles.labelRow}>
                        <Ionicons name="scale-outline" size={14} color={palette.mutedText} />
                        <ThemedText style={styles.smallLabel}>{t('ingredientForm.unit')}</ThemedText>
                    </View>
                    <ThemedSelect
                        value={unit}
                        onValueChange={(v) => { setUnit(v); setErrors((e) => ({ ...e, unit: '' })); }}
                        items={unitOptions}
                        placeholder={t('ingredientForm.unit')}
                        modalTitle={t('ingredientForm.unit')}
                        error={errors.unit}
                        canItemAction={() => true}
                        onItemAction={async (item) => {
                            const target = units.find((u) => u.name === item.value);
                            if (!target) return;
                            try {
                                await deleteUnit({ id: target.id });
                                if (unit === item.value) {
                                    setUnit(units.find((u) => u.id !== target.id)?.name ?? '');
                                }
                                toast.success(t('toast.deleted'));
                            } catch (err) {
                                toast.error(err instanceof Error ? err.message : t('toast.error'));
                            }
                        }}
                        onAddNew={async (newName) => {
                            const normalized = newName.trim().toLowerCase();
                            if (!normalized) return;
                            try {
                                const created = await addUnit({ name: normalized });
                                setUnit(created.name);
                            } catch {
                                toast.error(t('ingredientForm.error.unitAlreadyExists'));
                            }
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
                        numeric="decimal"
                        value={lowStockThreshold}
                        onChangeText={setLowStockThreshold}
                        onBlur={() => validate('lowStockThreshold', formValues)}
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
