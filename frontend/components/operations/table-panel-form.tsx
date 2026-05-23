import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useSalesStore } from '@/stores/sales';
import type { TableType } from '@/types/types';

export type TablePanelFormProps = {
    mode: 'create' | { tableId: string };
    onClose: () => void;
};

export function TablePanelForm({ mode, onClose }: TablePanelFormProps) {
    const palette = useAppColors();
    const { tables, createTable, updateTable } = useSalesStore();

    const [name, setName] = useState('');
    const [tableType, setTableType] = useState<TableType>('dine-in');
    const [message, setMessage] = useState('');

    const isEdit = mode !== 'create';

    const typeOptions: { label: string; value: TableType }[] = [
        { label: t('tables.type.dineIn'), value: 'dine-in' },
        { label: t('tables.type.toGo'), value: 'to-go' },
        { label: t('tables.type.delivery'), value: 'delivery' },
    ];

    useEffect(() => {
        setMessage('');
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
        const normalized = name.trim();
        if (!normalized) { setMessage(t('tableForm.nameRequired')); return; }
        if (mode !== 'create') {
            await updateTable({ id: mode.tableId, name: normalized, tableType });
        } else {
            await createTable({ name: normalized, tableType });
        }
        onClose();
    }

    return (
        <>
            <View style={[styles.panelHeader, { borderBottomColor: palette.border }]}>
                <View style={styles.panelHeaderTitle}>
                    <Ionicons name="grid-outline" size={20} color={palette.tint} />
                    <ThemedText type="subtitle">
                        {isEdit ? t('tableForm.editTitle') : t('tableForm.createTitle')}
                    </ThemedText>
                </View>
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color={palette.text} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
                {message ? (
                    <View style={[styles.messageBanner, { backgroundColor: `${palette.danger}22`, borderColor: `${palette.danger}44` }]}>
                        <ThemedText style={{ color: palette.danger, fontSize: 13 }}>{message}</ThemedText>
                    </View>
                ) : null}

                <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                        <Ionicons name="text-outline" size={14} color={palette.mutedText} />
                        <ThemedText style={styles.smallLabel}>{t('tableForm.example')}</ThemedText>
                    </View>
                    <ThemedInput
                        value={name}
                        onChangeText={setName}
                        placeholder={t('tableForm.example')}
                        style={styles.input}
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
            </ScrollView>

            <View style={[styles.panelFooter, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
                <ThemedButton
                    style={styles.saveButton}
                    label={isEdit ? t('common.saveChanges') : t('tableForm.createTitle')}
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
