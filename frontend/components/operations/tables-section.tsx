import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import type { RestaurantTable } from '@/types/types';

type TablesSectionProps = {
    tables: RestaurantTable[];
    message: string | null;
    cardWidth: number;
    gap: number;
    onAdd: () => void;
    onEdit: (tableId: string) => void;
    onDelete: (tableId: string) => void;
    onToggleActive: (tableId: string, isActive: boolean) => void;
};

export function TablesSection({ tables, message, cardWidth, gap, onAdd, onEdit, onDelete, onToggleActive }: TablesSectionProps) {
    const palette = useAppColors();

    return (
        <ThemedCard style={styles.card}>
            <View style={styles.headerRow}>
                <ThemedText type="subtitle">{t('tables.list')}</ThemedText>
                <ThemedButton icon="add-circle-outline" label={t('tables.add')} onPress={onAdd} />
            </View>
            {message ? <ThemedText style={styles.muted}>{message}</ThemedText> : null}
            {tables.length === 0 ? (
                <ThemedText style={styles.muted}>{t('tables.empty')}</ThemedText>
            ) : (
                <View style={[styles.grid, { gap }]}>
                    {tables.map((table) => (
                        <View key={table.id} style={[styles.tableCard, { width: cardWidth, borderColor: palette.border, opacity: table.is_active ? 1 : 0.6 }]}>
                            <View style={styles.tableInfo}>
                                <ThemedText type="defaultSemiBold" numberOfLines={1}>{table.name}</ThemedText>
                                <ThemedText style={styles.muted}>
                                    {table.table_type === 'to-go'
                                        ? t('tables.type.toGo')
                                        : table.table_type === 'delivery'
                                            ? t('tables.type.delivery')
                                            : t('tables.type.dineIn')}
                                </ThemedText>
                            </View>
                            <View style={styles.rowActions}>
                                <ThemedButton
                                    variant="secondary"
                                    style={styles.editActionButton}
                                    icon="create-outline"
                                    label={t('tables.edit')}
                                    onPress={() => onEdit(table.id)}
                                />
                                <ThemedButton
                                    variant="secondary"
                                    tone="danger"
                                    style={styles.editActionButton}
                                    icon="trash-outline"
                                    label={t('common.delete')}
                                    onPress={() => onDelete(table.id)}
                                />
                            </View>
                            <ThemedButton
                                variant="secondary"
                                tone={table.is_active ? 'warning' : 'success'}
                                icon={table.is_active ? 'pause-circle-outline' : 'checkmark-circle-outline'}
                                style={styles.toggleButton}
                                label={table.is_active ? t('common.disable') : t('common.enable')}
                                onPress={() => onToggleActive(table.id, table.is_active)}
                            />
                        </View>
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
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tableCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        gap: 8,
    },
    tableInfo: {
        gap: 2,
    },
    rowActions: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    editActionButton: {
        flex: 1,
    },
    toggleButton: {
        paddingVertical: 7,
        paddingHorizontal: 10,
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
});
