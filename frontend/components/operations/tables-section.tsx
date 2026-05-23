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
};

export function TablesSection({ tables, message, cardWidth, gap, onAdd, onEdit, onDelete }: TablesSectionProps) {
    const palette = useAppColors();

    return (
        <ThemedCard style={styles.card}>
            <View style={styles.headerRow}>
                <ThemedText type="subtitle">{t('tables.list')}</ThemedText>
                <ThemedButton label={t('tables.add')} onPress={onAdd} />
            </View>
            {message ? <ThemedText style={styles.muted}>{message}</ThemedText> : null}
            {tables.length === 0 ? (
                <ThemedText style={styles.muted}>{t('tables.empty')}</ThemedText>
            ) : (
                <View style={[styles.grid, { gap }]}>
                    {tables.map((table) => (
                        <View key={table.id} style={[styles.tableCard, { width: cardWidth, borderColor: palette.border }]}>
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
                                    style={styles.actionButton}
                                    icon="pencil"
                                    onPress={() => onEdit(table.id)}
                                />
                                <ThemedButton
                                    variant="secondary"
                                    style={styles.actionButton}
                                    icon="trash.fill"
                                    accessibilityLabel={t('tables.deleted')}
                                    onPress={() => onDelete(table.id)}
                                />
                            </View>
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
    },
    actionButton: {
        width: 34,
        height: 34,
        minHeight: 0,
        borderRadius: 10,
        paddingHorizontal: 0,
        paddingVertical: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
});
