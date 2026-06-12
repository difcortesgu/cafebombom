import { StyleSheet, View } from 'react-native';
import { useMemo, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { EntityCard } from '@/components/ui/entity-card';
import { ListToolbar } from '@/components/ui/list-toolbar';
import { useMeasuredGrid } from '@/hooks/use-measured-grid';
import { useListControls } from '@/hooks/use-list-controls';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import type { RestaurantTable, TableType } from '@/types/types';

type TablesSectionProps = {
    tables: RestaurantTable[];
    message: string | null;
    gap: number;
    onAdd: () => void;
    onEdit: (tableId: string) => void;
    onDelete: (tableId: string) => void;
    onToggleActive: (tableId: string, isActive: boolean) => void;
};

type TableSortKey = 'name';
type TableTypeFilter = 'all' | TableType;

const SORT_OPTIONS = [
    { key: 'name' as TableSortKey, labelAsc: t('common.sort.nameAZ'), labelDesc: t('common.sort.nameZA') },
];

const FILTER_OPTIONS = [
    { key: 'all', label: t('common.filter.all') },
    { key: 'dine-in', label: t('common.filter.dineIn') },
    { key: 'to-go', label: t('common.filter.toGo') },
    { key: 'delivery', label: t('common.filter.delivery') },
];

export function TablesSection({ tables, message, gap, onAdd, onEdit, onDelete, onToggleActive }: TablesSectionProps) {
    const palette = useAppColors();
    const { onLayout, cardWidth } = useMeasuredGrid(gap);
    const { searchQuery, setSearchQuery, sortKey, sortDirection, setSortKey } = useListControls<TableSortKey>('name');
    const [selectedFilters, setSelectedFilters] = useState<Set<TableTypeFilter>>(new Set());

    function toggleFilter(key: string) {
        if (key === 'all') { setSelectedFilters(new Set()); return; }
        setSelectedFilters((prev) => {
            const next = new Set(prev);
            if (next.has(key as TableTypeFilter)) { next.delete(key as TableTypeFilter); } else { next.add(key as TableTypeFilter); }
            return next;
        });
    }

    const activeFilterKey = selectedFilters.size === 0 ? 'all' : selectedFilters;

    const processed = useMemo(() => {
        const q = searchQuery.toLowerCase();
        let list = tables.filter((tbl) => {
            if (q && !tbl.name.toLowerCase().includes(q)) return false;
            if (selectedFilters.size > 0 && !selectedFilters.has(tbl.table_type as TableTypeFilter)) return false;
            return true;
        });
        list = [...list].sort((a, b) => {
            const cmp = a.name.localeCompare(b.name);
            return sortDirection === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [tables, searchQuery, selectedFilters, sortKey, sortDirection]);

    return (
        <ThemedCard style={styles.card}>
            <View style={styles.headerRow}>
                <ThemedText type="subtitle" style={styles.headerTitle}>{t('tables.list')}</ThemedText>
                <ThemedButton icon="add-circle-outline" size="sm" label={t('tables.add')} onPress={onAdd} />
            </View>
            {message ? <ThemedText style={styles.muted}>{message}</ThemedText> : null}

            <ListToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortOptions={SORT_OPTIONS}
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSortChange={setSortKey}
                filterOptions={FILTER_OPTIONS}
                activeFilterKey={activeFilterKey}
                onFilterChange={toggleFilter}
            />

            {processed.length === 0 ? (
                <ThemedText style={styles.muted}>
                    {tables.length === 0 ? t('tables.empty') : t('common.filter.noResults')}
                </ThemedText>
            ) : (
                <View style={[styles.grid, { gap }]} onLayout={onLayout}>
                    {processed.map((table) => (
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
