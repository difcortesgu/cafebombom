import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { EntityCard } from '@/components/ui/entity-card';
import { ListToolbar } from '@/components/ui/list-toolbar';
import { useMeasuredGrid } from '@/hooks/use-measured-grid';
import { useListControls } from '@/hooks/use-list-controls';
import { t } from '@/i18n';
import type { CategoryOption, ProductDetail } from '@/types/products';
import { money } from '@/utils/money';

type ProductsTabProps = {
    products: ProductDetail[];
    categories: CategoryOption[];
    gap: number;
    palette: {
        card: string;
        inputBackground: string;
        border: string;
        mutedText: string;
        tint: string;
        accent: string;
        success: string;
        warning: string;
        danger: string;
    };
    onEditProduct: (productId: string) => void;
    onDeleteProduct: (productId: string) => void;
    onToggleProductActive: (productId: string, isActive: boolean) => void;
};

type ProductSortKey = 'name' | 'price';

const SORT_OPTIONS = [
    { key: 'name' as ProductSortKey, labelAsc: t('common.sort.nameAZ'), labelDesc: t('common.sort.nameZA') },
    { key: 'price' as ProductSortKey, labelAsc: t('common.sort.priceAsc'), labelDesc: t('common.sort.priceDesc') },
];

export function ProductsTab({
    products,
    categories,
    gap,
    palette,
    onEditProduct,
    onDeleteProduct,
    onToggleProductActive,
}: ProductsTabProps) {
    const { onLayout, cardWidth } = useMeasuredGrid(gap);
    const { searchQuery, setSearchQuery, sortKey, sortDirection, setSortKey } = useListControls<ProductSortKey>('name');
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());

    function toggleCategory(id: string) {
        if (id === '__all__') {
            setSelectedCategoryIds(new Set());
            return;
        }
        setSelectedCategoryIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); }
            return next;
        });
    }

    const filterOptions = useMemo(() => [
        { key: '__all__', label: t('common.filter.all') },
        ...categories.map((c) => ({ key: c.id, label: c.name })),
    ], [categories]);

    // When nothing is selected show "All" as active; otherwise pass the set of selected ids.
    const activeFilterKey = selectedCategoryIds.size === 0
        ? '__all__'
        : selectedCategoryIds;

    const processed = useMemo(() => {
        const q = searchQuery.toLowerCase();
        let list = products.filter((p) => {
            if (q && !p.name.toLowerCase().includes(q)) return false;
            if (selectedCategoryIds.size > 0 && !selectedCategoryIds.has(p.categoryId ?? '__none__')) return false;
            return true;
        });
        list = [...list].sort((a, b) => {
            let cmp = 0;
            if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
            else if (sortKey === 'price') cmp = a.price - b.price;
            return sortDirection === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [products, searchQuery, selectedCategoryIds, sortKey, sortDirection]);

    const grouped = useMemo(() => {
        const map = new Map<string, { label: string; items: ProductDetail[] }>();
        for (const p of processed) {
            const catId = p.categoryId ?? '__none__';
            const catName = categories.find((c) => c.id === p.categoryId)?.name ?? t('common.filter.all');
            if (!map.has(catId)) map.set(catId, { label: catName, items: [] });
            map.get(catId)!.items.push(p);
        }
        return [...map.values()];
    }, [processed, categories]);

    function renderCard(product: ProductDetail) {
        const categoryName = categories.find((c) => c.id === product.categoryId)?.name;
        return (
            <EntityCard
                key={product.id}
                width={cardWidth}
                title={product.name}
                style={{
                    backgroundColor: product.isActive ? palette.card : palette.inputBackground,
                    borderColor: product.isCombo ? palette.accent : palette.border,
                    opacity: product.isActive ? 1 : 0.7,
                }}
                media={product.imageUri ? (
                    <Image source={{ uri: product.imageUri }} style={styles.productImage} resizeMode="cover" />
                ) : undefined}
                titleTrailing={product.isCombo ? (
                    <Ionicons name="layers-outline" size={14} color={palette.accent} />
                ) : undefined}
                info={(
                    <>
                        <ThemedText style={[styles.productPrice, { color: palette.tint }]}>{money(product.price)}</ThemedText>
                        <View style={styles.tagRow}>
                            {categoryName ? (
                                <View style={[styles.tag, { backgroundColor: `${palette.tint}22`, borderColor: `${palette.tint}44` }]}>
                                    <ThemedText style={[styles.tagText, { color: palette.tint }]}>{categoryName}</ThemedText>
                                </View>
                            ) : null}
                            <View
                                style={[
                                    styles.tag,
                                    {
                                        backgroundColor: product.isActive ? `${palette.success}22` : `${palette.mutedText}22`,
                                        borderColor: product.isActive ? `${palette.success}44` : `${palette.mutedText}44`,
                                    },
                                ]}
                            >
                                <ThemedText style={[styles.tagText, { color: product.isActive ? palette.success : palette.mutedText }]}>
                                    {product.isActive ? t('products.list.active') : t('products.list.archived')}
                                </ThemedText>
                            </View>
                        </View>
                    </>
                )}
                actions={[
                    {
                        icon: 'create-outline',
                        label: t('products.list.edit'),
                        onPress: () => onEditProduct(product.id),
                    },
                    {
                        icon: product.isActive ? 'pause-circle-outline' : 'checkmark-circle-outline',
                        label: product.isActive ? t('common.disable') : t('common.enable'),
                        tone: product.isActive ? 'warning' : 'success',
                        onPress: () => onToggleProductActive(product.id, product.isActive),
                    },
                    {
                        icon: 'trash-outline',
                        label: t('common.delete'),
                        tone: 'danger',
                        collapseOnNarrow: true,
                        onPress: () => onDeleteProduct(product.id),
                    },
                ]}
            />
        );
    }

    return (
        <View style={{ gap }}>
            <ListToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortOptions={SORT_OPTIONS}
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSortChange={setSortKey}
                filterOptions={filterOptions}
                activeFilterKey={activeFilterKey}
                onFilterChange={toggleCategory}
            />

            {processed.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                    <ThemedText style={{ color: palette.mutedText }}>{t('common.filter.noResults')}</ThemedText>
                </View>
            ) : (
                grouped.map((group) => (
                    <View key={group.label} style={{ gap: gap / 2 }}>
                        <ThemedText style={[styles.groupHeader, { color: palette.mutedText }]}>{group.label}</ThemedText>
                        <View style={[styles.grid, { gap }]} onLayout={onLayout}>
                            {group.items.map(renderCard)}
                        </View>
                    </View>
                ))
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    emptyCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    groupHeader: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    productImage: {
        width: '100%',
        height: 90,
        borderRadius: 10,
        marginBottom: 2,
    },
    productPrice: {
        fontSize: 20,
        fontWeight: '700',
        lineHeight: 26,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 4,
    },
    tag: {
        borderRadius: 6,
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '500',
    },
});
