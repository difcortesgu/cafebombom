import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';
import type { SortDirection, SortOption } from '@/hooks/use-list-controls';
import { t } from '@/i18n';

type FilterOption = {
    key: string;
    label: string;
};

type ListToolbarProps<K extends string = string> = {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    sortOptions?: SortOption<K>[];
    activeSortKey?: K;
    sortDirection?: SortDirection;
    onSortChange?: (key: K, direction?: SortDirection) => void;
    filterOptions?: FilterOption[];
    /** Single-select: pass a string. Multi-select: pass a Set<string>. */
    activeFilterKey?: string | Set<string>;
    onFilterChange?: (key: string) => void;
};

export function ListToolbar<K extends string = string>({
    searchQuery,
    onSearchChange,
    sortOptions,
    activeSortKey,
    sortDirection,
    onSortChange,
    filterOptions,
    activeFilterKey,
    onFilterChange,
}: ListToolbarProps<K>) {
    const palette = useAppColors();
    const [sortOpen, setSortOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);

    function isFilterActive(key: string): boolean {
        if (activeFilterKey instanceof Set) return activeFilterKey.has(key);
        return activeFilterKey === key;
    }

    const activeSort = sortOptions?.find((o) => o.key === activeSortKey);
    const sortLabel = activeSort
        ? (sortDirection === 'asc' ? activeSort.labelAsc : activeSort.labelDesc)
        : t('common.sort.label');

    // Derive active chip list (non-all selected filters)
    const activeChips: { key: string; label: string }[] = [];
    if (filterOptions && activeFilterKey instanceof Set) {
        for (const key of activeFilterKey) {
            const opt = filterOptions.find((o) => o.key === key);
            if (opt) activeChips.push({ key, label: opt.label });
        }
    }

    const activeFilterCount = activeFilterKey instanceof Set ? activeFilterKey.size : 0;
    const isAllKey = (key: string) => key === 'all' || key === '__all__';

    return (
        <View style={styles.wrapper}>
            {/* Row 1: Search + Sort button */}
            <View style={styles.topRow}>
                <View style={[styles.searchBox, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                    <Ionicons name="search-outline" size={16} color={palette.mutedText} />
                    <TextInput
                        style={[styles.searchInput, { color: palette.text }]}
                        placeholder={t('common.search.placeholder')}
                        placeholderTextColor={palette.mutedText}
                        value={searchQuery}
                        onChangeText={onSearchChange}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                    {searchQuery.length > 0 ? (
                        <Pressable onPress={() => onSearchChange('')} hitSlop={8}>
                            <Ionicons name="close-circle" size={16} color={palette.mutedText} />
                        </Pressable>
                    ) : null}
                </View>

                {sortOptions ? (
                    <Pressable
                        style={[styles.sortButton, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}
                        onPress={() => setSortOpen(true)}
                    >
                        <ThemedText style={[styles.sortButtonText, { color: palette.tint }]} numberOfLines={1}>
                            {sortLabel}
                        </ThemedText>
                        <Ionicons name="chevron-down" size={13} color={palette.tint} />
                    </Pressable>
                ) : null}
            </View>

            {/* Row 2: Filter button + active chips */}
            {filterOptions ? (
                <View style={styles.filterRow}>
                    <Pressable
                        style={[
                            styles.filterButton,
                            {
                                backgroundColor: activeFilterCount > 0 ? `${palette.tint}20` : palette.inputBackground,
                                borderColor: activeFilterCount > 0 ? palette.tint : palette.border,
                            },
                        ]}
                        onPress={() => setFilterOpen(true)}
                    >
                        <Ionicons
                            name="funnel-outline"
                            size={14}
                            color={activeFilterCount > 0 ? palette.tint : palette.mutedText}
                        />
                        <ThemedText
                            style={[
                                styles.filterButtonText,
                                { color: activeFilterCount > 0 ? palette.tint : palette.mutedText },
                            ]}
                        >
                            {t('common.filter.label')}
                            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                        </ThemedText>
                    </Pressable>

                    {activeChips.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.activeChipsScroll}
                            style={styles.activeChipsContainer}
                        >
                            {activeChips.map((chip) => (
                                <Pressable
                                    key={chip.key}
                                    style={[styles.activeChip, { backgroundColor: `${palette.tint}18`, borderColor: `${palette.tint}55` }]}
                                    onPress={() => onFilterChange?.(chip.key)}
                                >
                                    <ThemedText style={[styles.activeChipText, { color: palette.tint }]}>
                                        {chip.label}
                                    </ThemedText>
                                    <Ionicons name="close" size={12} color={palette.tint} />
                                </Pressable>
                            ))}
                        </ScrollView>
                    ) : null}
                </View>
            ) : null}

            {/* Sort modal */}
            <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
                <TouchableWithoutFeedback onPress={() => setSortOpen(false)}>
                    <View style={styles.modalBackdrop}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                                <ThemedText style={styles.modalTitle}>{t('common.sort.label')}</ThemedText>
                                {sortOptions?.map((opt) => (
                                    <View key={opt.key}>
                                        {(['asc', 'desc'] as SortDirection[]).map((dir) => {
                                            const label = dir === 'asc' ? opt.labelAsc : opt.labelDesc;
                                            const isActive = activeSortKey === opt.key && sortDirection === dir;
                                            return (
                                                <Pressable
                                                    key={`${opt.key}-${dir}`}
                                                    style={[
                                                        styles.modalOption,
                                                        isActive && { backgroundColor: `${palette.tint}15` },
                                                    ]}
                                                    onPress={() => { onSortChange?.(opt.key, dir); setSortOpen(false); }}
                                                >
                                                    <Ionicons
                                                        name={isActive ? 'radio-button-on' : 'radio-button-off'}
                                                        size={18}
                                                        color={isActive ? palette.tint : palette.mutedText}
                                                    />
                                                    <ThemedText
                                                        style={[
                                                            styles.modalOptionText,
                                                            { color: isActive ? palette.tint : palette.text },
                                                        ]}
                                                    >
                                                        {label}
                                                    </ThemedText>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Filter modal */}
            <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
                <TouchableWithoutFeedback onPress={() => setFilterOpen(false)}>
                    <View style={styles.modalBackdrop}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                                <ThemedText style={styles.modalTitle}>{t('common.filter.label')}</ThemedText>
                                {filterOptions?.map((opt) => {
                                    const checked = isAllKey(opt.key)
                                        ? activeFilterCount === 0
                                        : isFilterActive(opt.key);
                                    return (
                                        <Pressable
                                            key={opt.key}
                                            style={[
                                                styles.modalOption,
                                                checked && { backgroundColor: `${palette.tint}15` },
                                            ]}
                                            onPress={() => onFilterChange?.(opt.key)}
                                        >
                                            <Ionicons
                                                name={checked ? 'checkbox' : 'square-outline'}
                                                size={18}
                                                color={checked ? palette.tint : palette.mutedText}
                                            />
                                            <ThemedText
                                                style={[
                                                    styles.modalOptionText,
                                                    { color: checked ? palette.tint : palette.text },
                                                ]}
                                            >
                                                {opt.label}
                                            </ThemedText>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        gap: 8,
    },
    topRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        padding: 0,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        flexShrink: 0,
        maxWidth: 160,
    },
    sortButtonText: {
        fontSize: 13,
        fontWeight: '600',
        flexShrink: 1,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
        flexShrink: 0,
    },
    filterButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    activeChipsContainer: {
        flex: 1,
    },
    activeChipsScroll: {
        flexDirection: 'row',
        gap: 6,
        paddingVertical: 1,
    },
    activeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    activeChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 8,
        overflow: 'hidden',
    },
    modalTitle: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        opacity: 0.5,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 10,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    modalOptionText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
