import { StyleSheet, View } from 'react-native';
import { useMemo, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { EntityCard } from '@/components/ui/entity-card';
import { ListToolbar } from '@/components/ui/list-toolbar';
import { useMeasuredGrid } from '@/hooks/use-measured-grid';
import { useListControls } from '@/hooks/use-list-controls';
import { t } from '@/i18n';
import type { Employee } from '@/types/types';
import { money } from '@/utils/money';

type EmployeesTabProps = {
    employees: Employee[];
    gap: number;
    palette: {
        card: string;
        border: string;
        mutedText: string;
        text: string;
        inputBackground: string;
        danger: string;
        success: string;
    };
    onEdit: (employee: Employee) => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string, isActive: boolean) => void;
};

type EmployeeSortKey = 'name' | 'rate';
type SalaryFilter = 'all' | 'hourly' | 'monthly';

const SORT_OPTIONS = [
    { key: 'name' as EmployeeSortKey, labelAsc: t('common.sort.nameAZ'), labelDesc: t('common.sort.nameZA') },
    { key: 'rate' as EmployeeSortKey, labelAsc: t('common.sort.rateAsc'), labelDesc: t('common.sort.rateDesc') },
];

const FILTER_OPTIONS = [
    { key: 'all', label: t('common.filter.all') },
    { key: 'hourly', label: t('common.filter.hourly') },
    { key: 'monthly', label: t('common.filter.monthly') },
];

export function EmployeesTab({ employees, gap, palette, onEdit, onDelete, onToggleActive }: EmployeesTabProps) {
    const { onLayout, cardWidth } = useMeasuredGrid(gap);
    const { searchQuery, setSearchQuery, sortKey, sortDirection, setSortKey } = useListControls<EmployeeSortKey>('name');
    const [selectedFilters, setSelectedFilters] = useState<Set<SalaryFilter>>(new Set());

    function toggleFilter(key: string) {
        if (key === 'all') { setSelectedFilters(new Set()); return; }
        setSelectedFilters((prev) => {
            const next = new Set(prev);
            if (next.has(key as SalaryFilter)) { next.delete(key as SalaryFilter); } else { next.add(key as SalaryFilter); }
            return next;
        });
    }

    const activeFilterKey = selectedFilters.size === 0 ? 'all' : selectedFilters;

    const processed = useMemo(() => {
        const q = searchQuery.toLowerCase();
        let list = employees.filter((e) => {
            if (q && !e.name.toLowerCase().includes(q)) return false;
            if (selectedFilters.size > 0 && !selectedFilters.has(e.salary_type as SalaryFilter)) return false;
            return true;
        });
        list = [...list].sort((a, b) => {
            let cmp = 0;
            if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
            else if (sortKey === 'rate') cmp = a.rate - b.rate;
            return sortDirection === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [employees, searchQuery, selectedFilters, sortKey, sortDirection]);

    return (
        <View style={{ gap }}>
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
                <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                    <ThemedText style={{ color: palette.mutedText }}>
                        {employees.length === 0 ? t('accounts.employees.roster') : t('common.filter.noResults')}
                    </ThemedText>
                </View>
            ) : (
                <View style={[styles.grid, { gap }]} onLayout={onLayout}>
                    {processed.map((emp) => (
                        <EntityCard
                            key={emp.id}
                            width={cardWidth}
                            title={emp.name}
                            style={{ backgroundColor: palette.card, borderColor: palette.border, opacity: emp.is_active ? 1 : 0.6 }}
                            info={(
                                <>
                                    <ThemedText style={[styles.rate, { color: palette.text }]}>
                                        {money(emp.rate)}
                                    </ThemedText>
                                    <ThemedText style={[styles.muted, { color: palette.mutedText }]}>
                                        {emp.salary_type === 'hourly' ? t('accounts.employees.hourly') : t('accounts.employees.monthly')}
                                    </ThemedText>
                                </>
                            )}
                            actions={[
                                {
                                    icon: 'create-outline',
                                    label: t('setup.account.edit'),
                                    onPress: () => onEdit(emp),
                                },
                                {
                                    icon: emp.is_active ? 'pause-circle-outline' : 'checkmark-circle-outline',
                                    label: emp.is_active ? t('common.disable') : t('common.enable'),
                                    tone: emp.is_active ? 'warning' : 'success',
                                    onPress: () => onToggleActive(emp.id, emp.is_active),
                                },
                                {
                                    icon: 'trash-outline',
                                    label: t('common.delete'),
                                    tone: 'danger',
                                    collapseOnNarrow: true,
                                    onPress: () => onDelete(emp.id),
                                },
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    muted: {
        fontSize: 13,
        textAlign: 'right',
    },
    rate: {
        fontSize: 15,
        fontWeight: '600',
    },
    emptyCard: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
    },
});
