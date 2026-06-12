import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

import { ThemedText } from '@/components/themed-text';
import { PanelActionRow } from '@/components/ui/panel-action-row';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useSalesStore } from '@/stores/sales';
import type { TableType } from '@/types/types';
import { validateForm } from '@/utils/validation';
import { tableFormSchema } from '@/utils/validation/schemas';

export type TableFormProps = {
    mode: 'create' | { tableId: string };
    onClose: () => void;
};

export function TableForm({ mode, onClose }: TableFormProps) {
    const palette = useAppColors();
    const { tables, createTable, updateTable } = useSalesStore();

    const [name, setName] = useState('');
    const [tableType, setTableType] = useState<TableType>('dine-in');
    const [nameError, setNameError] = useState('');

    const isEdit = mode !== 'create';

    const typeOptions: { label: string; value: TableType }[] = [
        { label: t('tables.type.dineIn'), value: 'dine-in' },
        { label: t('tables.type.toGo'), value: 'to-go' },
        { label: t('tables.type.delivery'), value: 'delivery' },
    ];

    useEffect(() => {
        if (mode === 'create') {
            setName('');
            setTableType('dine-in');
        } else {
            const table = tables.find((item) => item.id === mode.tableId);
            if (table) {
                setName(table.name);
                setTableType(table.table_type);
            }
        }
    }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

    async function submit() {
        const result = validateForm(tableFormSchema, { name, tableType });
        if (!result.ok) {
            setNameError(result.errors.name ?? '');
            return;
        }
        setNameError('');
        const { name: normalized } = result.data;
        try {
            if (mode !== 'create') {
                await updateTable({ id: mode.tableId, name: normalized, tableType });
                toast.success(`Mesa "${normalized}" actualizada.`);
            } else {
                await createTable({ name: normalized, tableType });
                toast.success(`Mesa "${normalized}" creada.`);
            }
            onClose();
        } catch {
            toast.error('Ocurrió un error. Intenta de nuevo.');
        }
    }

    return (
        <>
            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="text-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallLabel}>{t('tableForm.example')}</ThemedText>
                </View>
                <ThemedInput
                    value={name}
                    onChangeText={setName}
                    placeholder={t('tableForm.example')}
                    error={nameError}
                />
            </View>

            <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="options-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={styles.smallLabel}>{t('tableForm.type')}</ThemedText>
                </View>
                <View style={styles.typeGroup}>
                    {typeOptions.map((option) => {
                        const selected = tableType === option.value;
                        return (
                            <Pressable
                                key={option.value}
                                style={[
                                    styles.typeOption,
                                    { borderColor: selected ? palette.tint : palette.border },
                                    selected && { backgroundColor: `${palette.tint}22` },
                                ]}
                                onPress={() => setTableType(option.value)}
                            >
                                <ThemedText style={[styles.typeLabel, selected && { color: palette.tint }]}>
                                    {option.label}
                                </ThemedText>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <View style={styles.actionsRow}>
                <PanelActionRow
                    primaryLabel={isEdit ? t('common.saveChanges') : t('tableForm.createTitle')}
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
    typeGroup: {
        gap: 8,
    },
    typeOption: {
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
    },
    typeLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
});
