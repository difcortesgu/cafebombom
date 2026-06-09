import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { EntityCard } from '@/components/ui/entity-card';
import { useMeasuredGrid } from '@/hooks/use-measured-grid';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import type { RestaurantTable } from '@/types/types';

type TablesSectionProps = {
    tables: RestaurantTable[];
    message: string | null;
    gap: number;
    onAdd: () => void;
    onEdit: (tableId: string) => void;
    onDelete: (tableId: string) => void;
    onToggleActive: (tableId: string, isActive: boolean) => void;
};

export function TablesSection({ tables, message, gap, onAdd, onEdit, onDelete, onToggleActive }: TablesSectionProps) {
    const palette = useAppColors();
    const { onLayout, cardWidth } = useMeasuredGrid(gap);

    return (
        <ThemedCard style={styles.card}>
            <View style={styles.headerRow}>
                <ThemedText type="subtitle" style={styles.headerTitle}>{t('tables.list')}</ThemedText>
                <ThemedButton icon="add-circle-outline" size="sm" label={t('tables.add')} onPress={onAdd} />
            </View>
            {message ? <ThemedText style={styles.muted}>{message}</ThemedText> : null}
            {tables.length === 0 ? (
                <ThemedText style={styles.muted}>{t('tables.empty')}</ThemedText>
            ) : (
                <View style={[styles.grid, { gap }]} onLayout={onLayout}>
                    {tables.map((table) => (
                        <EntityCard
                            key={table.id}
                            width={cardWidth}
                            title={table.name}
                            style={{ borderColor: palette.border, opacity: table.is_active ? 1 : 0.6 }}
                            info={(
                                <View style={[styles.typeBadge, { backgroundColor: `${palette.tint}22`, borderColor: `${palette.tint}44` }]}>
                                    <ThemedText style={[styles.typeBadgeText, { color: palette.tint }]} numberOfLines={1}>
                                        {table.table_type === 'to-go'
                                            ? t('tables.type.toGo')
                                            : table.table_type === 'delivery'
                                                ? t('tables.type.delivery')
                                                : t('tables.type.dineIn')}
                                    </ThemedText>
                                </View>
                            )}
                            actions={[
                                {
                                    icon: 'create-outline',
                                    label: t('tables.edit'),
                                    onPress: () => onEdit(table.id),
                                },
                                {
                                    icon: table.is_active ? 'pause-circle-outline' : 'checkmark-circle-outline',
                                    label: table.is_active ? t('common.disable') : t('common.enable'),
                                    tone: table.is_active ? 'warning' : 'success',
                                    onPress: () => onToggleActive(table.id, table.is_active),
                                },
                                {
                                    icon: 'trash-outline',
                                    label: t('common.delete'),
                                    tone: 'danger',
                                    collapseOnNarrow: true,
                                    onPress: () => onDelete(table.id),
                                },
                            ]}
                        />
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
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        flex: 1,
        minWidth: 120,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    typeBadge: {
        borderRadius: 6,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    typeBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
});
