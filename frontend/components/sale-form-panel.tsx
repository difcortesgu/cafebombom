import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useSaleCart } from '@/hooks/use-sale-cart';
import { useSaleDraftPreload } from '@/hooks/use-sale-draft-preload';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import { useProductsStore } from '@/stores/products';
import { useSalesStore } from '@/stores/sales';
import { useSettingsStore } from '@/stores/settings';
import {
    type SaleFormCartItem,
} from '@/utils/cart-normalization';
import { calculateSaleDiscountBreakdown } from '@/utils/discounts';
import { formatSaleStatusLabel, getTableSurcharge } from '@/utils/sale-view';

type CartItem = SaleFormCartItem;

export type SaleFormPanelProps = {
    orderId: string | null;
    onComplete: () => void;
};

export function SaleFormPanel({ orderId: editingOrderId, onComplete }: SaleFormPanelProps) {
    const palette = useAppColors();
    const user = useAuthStore((state) => state.currentUser);
    const { hydrate, products, tables, discounts, sales, createSale, updateDraftOrder } = useSalesStore();
    const { productIngredients, hydrate: hydrateProducts } = useProductsStore();
    const { deliverySurcharge, toGoSurcharge, hydrateFromDb } = useSettingsStore();

    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [selectedGlobalDiscountId, setSelectedGlobalDiscountId] = useState('');
    const [isDraftInitialized, setIsDraftInitialized] = useState(false);
    const [mobileStep, setMobileStep] = useState<'products' | 'cart'>('products');
    const [openItemIds, setOpenItemIds] = useState<Set<string>>(new Set());
    const [tableExpanded, setTableExpanded] = useState(true);
    const [discountExpanded, setDiscountExpanded] = useState(false);

    const { width } = useWindowDimensions();
    const isWideLayout = width >= 768;

    const selectedDraftSale = useMemo(
        () => (editingOrderId ? sales.find((sale) => sale.id === editingOrderId) ?? null : null),
        [editingOrderId, sales],
    );
    const canEditDraft = selectedDraftSale?.status === 'draft';

    useEffect(() => {
        void hydrate();
        void hydrateProducts();
        void hydrateFromDb();
    }, [hydrate, hydrateProducts, hydrateFromDb]);

    useEffect(() => {
        setIsDraftInitialized(false);
        setOpenItemIds(new Set());
        setMobileStep('products');
        if (!editingOrderId) {
            setCart([]);
            setSelectedTableId(tables.length > 0 ? tables[0].id : null);
            setSelectedGlobalDiscountId('');
        }
    }, [editingOrderId, setCart, tables]);

    const { loadingDraft } = useSaleDraftPreload({
        editingOrderId,
        isDraftInitialized,
        setIsDraftInitialized,
        selectedDraftSale,
        tables,
        discounts,
        products,
        setCart,
        setSelectedTableId,
        setSelectedGlobalDiscountId,
    });

    const nowUnix = Math.floor(Date.now() / 1000);

    const globalDiscountOptions = useMemo(
        () => [
            { label: t('saleForm.noDiscount'), value: '' },
            ...discounts
                .filter((d) => d.scope === 'global' && d.isActive)
                .map((d) => ({
                    label: `${d.name} (${d.type === 'percentage' ? `${d.value}%` : `$${d.value.toFixed(2)}`})`,
                    value: d.id,
                })),
        ],
        [discounts],
    );

    const recipeByProductId = useMemo(() => {
        const map = new Map<string, typeof productIngredients>();
        for (const link of productIngredients) {
            if (!map.has(link.productId)) map.set(link.productId, []);
            map.get(link.productId)!.push(link);
        }
        return map;
    }, [productIngredients]);

    const additionalOptionsByProductId = useMemo(() => {
        const map = new Map<string, Map<string, { ingredientName: string; additionalPrice: number }>>();
        for (const product of products) {
            const byIngredient = new Map<string, { ingredientName: string; additionalPrice: number }>();
            for (const option of product.additionalIngredients ?? []) {
                byIngredient.set(option.ingredientId, {
                    ingredientName: option.ingredientName,
                    additionalPrice: Number(option.additionalPrice),
                });
            }
            map.set(product.id, byIngredient);
        }
        return map;
    }, [products]);

    const {
        cart,
        setCart,
        addToCart,
        getProductTotalQuantity,
        updateQty,
        toggleRemovedIngredient,
        updateAdditionalIngredientQty,
        updateObservation,
    } = useSaleCart(additionalOptionsByProductId);

    const pricing = useMemo(
        () => calculateSaleDiscountBreakdown(
            cart.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                additionalIngredients: item.additionalIngredients,
            })),
            discounts,
            nowUnix,
            selectedGlobalDiscountId || null,
        ),
        [cart, discounts, nowUnix, selectedGlobalDiscountId],
    );

    const selectedTable = useMemo(
        () => tables.find((table) => table.id === selectedTableId) ?? null,
        [selectedTableId, tables],
    );

    const surchargeBreakdown = useMemo(() => {
        if (!selectedTable) return { toGo: 0, delivery: 0, total: 0 };
        return getTableSurcharge(selectedTable.table_type, toGoSurcharge, deliverySurcharge);
    }, [deliverySurcharge, selectedTable, toGoSurcharge]);

    const finalTotal = pricing.total + surchargeBreakdown.total;

    const productsByCategory = useMemo(() => {
        const grouped = new Map<string, typeof products>();
        const uncategorized: typeof products = [];
        for (const product of products) {
            const category = product.category || null;
            if (!category) {
                uncategorized.push(product);
            } else {
                if (!grouped.has(category)) grouped.set(category, []);
                grouped.get(category)!.push(product);
            }
        }
        const result: { category: string | null; products: typeof products }[] = [];
        Array.from(grouped.keys()).sort().forEach((category) => {
            result.push({ category, products: grouped.get(category)! });
        });
        if (uncategorized.length > 0) result.push({ category: null, products: uncategorized });
        return result;
    }, [products]);

    const toggleItemExpanded = (itemId: string) => {
        setOpenItemIds((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    };

    const submitSale = async () => {
        if (!user || cart.length === 0 || !selectedTableId) return;

        const payload = {
            staffId: user.id,
            items: cart.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                observation: item.observation,
                removedIngredientIds: item.removedIngredientIds,
                additionalIngredients: item.additionalIngredients,
            })),
            tableId: selectedTableId,
            globalDiscountId: selectedGlobalDiscountId || null,
            orderTypeSurcharge: surchargeBreakdown.total,
        };

        if (editingOrderId) {
            await updateDraftOrder({ orderId: editingOrderId, ...payload });
        } else {
            await createSale(payload);
        }

        onComplete();
    };

    // ─── Renders ───────────────────────────────────────────────────────────────

    const renderCatalogContent = () => (
        <View style={[styles.categoriesContainer, isWideLayout && styles.categoriesContainerWide]}>
            {productsByCategory.map(({ category, products: categoryProducts }) => (
                <View key={category || 'uncategorized'} style={[styles.categorySection, isWideLayout && styles.categorySectionWide]}>
                    <ThemedText type="subtitle" style={styles.categoryTitle}>
                        {category || t('saleForm.noCategory')}
                    </ThemedText>
                    <View style={styles.categoryGrid}>
                        {categoryProducts.map((product) => {
                            const quantity = getProductTotalQuantity(product.id);
                            const isSelected = quantity > 0;
                            return (
                                <Pressable
                                    key={product.id}
                                    style={[
                                        styles.productCard,
                                        isWideLayout ? styles.productCardWide : styles.productCardNarrow,
                                        { borderColor: isSelected ? palette.tint : palette.border, backgroundColor: palette.card },
                                        editingOrderId && !canEditDraft ? styles.disabledTile : null,
                                    ]}
                                    onPress={() => addToCart(product.id, product.name, Number(product.price))}
                                    disabled={Boolean(editingOrderId && !canEditDraft)}>
                                    {product.imageUri ? (
                                        <Image source={{ uri: product.imageUri }} style={styles.productImage} />
                                    ) : (
                                        <View style={[styles.productImage, { backgroundColor: palette.inputBackground }]}>
                                            <Ionicons name="camera-outline" size={22} color={palette.mutedText} />
                                        </View>
                                    )}
                                    {isSelected && (
                                        <View style={[styles.quantityBadge, { backgroundColor: palette.tint }]}>
                                            <ThemedText style={styles.quantityBadgeText}>{quantity}</ThemedText>
                                        </View>
                                    )}
                                    <View style={styles.productInfo}>
                                        <ThemedText style={styles.productName} numberOfLines={2}>{product.name}</ThemedText>
                                        <ThemedText style={[styles.productPrice, { color: palette.mutedText }]}>
                                            ${Number(product.price).toFixed(2)}
                                        </ThemedText>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            ))}
            {editingOrderId && !canEditDraft && (
                <ThemedText style={[styles.smallText, { marginTop: 8 }]}>{t('saleForm.notEditable')}</ThemedText>
            )}
        </View>
    );

    const renderCartHeader = () => (
        <View style={[styles.cartHeader, { borderBottomColor: palette.border }]}>
            <Ionicons name="cart-outline" size={18} color={palette.tint} />
            <View style={styles.cartHeaderLeft}>
                <ThemedText style={styles.cartHeaderTitle}>
                    {editingOrderId ? `#${editingOrderId.slice(0, 6).toUpperCase()}` : t('saleForm.title.new')}
                </ThemedText>
                <View style={[styles.statusBadge, { backgroundColor: `${palette.tint}20` }]}>
                    <ThemedText style={[styles.statusBadgeText, { color: palette.tint }]}>
                        {formatSaleStatusLabel(selectedDraftSale?.status ?? 'draft')}
                    </ThemedText>
                </View>
            </View>
            <Pressable onPress={onComplete} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={palette.mutedText} />
            </Pressable>
        </View>
    );

    const renderTableSection = () => (
        <View style={[styles.cartSection, { borderBottomColor: palette.border }]}>
            <Pressable
                style={styles.sectionHeader}
                onPress={() => setTableExpanded((v) => !v)}>
                <Ionicons name="restaurant-outline" size={14} color={palette.mutedText} />
                <ThemedText style={[styles.sectionLabel, { color: palette.mutedText, flex: 1 }]}>
                    {t('saleForm.tableAssignment')}
                </ThemedText>
                {selectedTable && !tableExpanded && (
                    <View style={[styles.statusBadge, { backgroundColor: `${palette.tint}20` }]}>
                        <ThemedText style={[styles.statusBadgeText, { color: palette.tint }]}>{selectedTable.name}</ThemedText>
                    </View>
                )}
                <Ionicons name={tableExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={palette.mutedText} />
            </Pressable>
            {tableExpanded && (
                <>
                    {tables.length === 0 && (
                        <ThemedText style={styles.smallText}>{t('saleForm.noTables')}</ThemedText>
                    )}
                    <View style={styles.tableRow}>
                        {tables.map((table) => {
                            const tableSurcharge = getTableSurcharge(table.table_type, toGoSurcharge, deliverySurcharge);
                            const isActive = selectedTableId === table.id;
                            return (
                                <Pressable
                                    key={table.id}
                                    style={[
                                        styles.tableButton,
                                        {
                                            borderColor: isActive ? palette.tint : palette.border,
                                            backgroundColor: isActive ? palette.tint : palette.card,
                                        },
                                    ]}
                                    onPress={() => setSelectedTableId(table.id)}
                                    disabled={Boolean(editingOrderId && !canEditDraft)}>
                                    <ThemedText style={[styles.tableButtonText, isActive && styles.tableButtonTextActive]}>
                                        {table.name}{tableSurcharge.total > 0 ? ` (+$${tableSurcharge.total.toFixed(2)})` : ''}
                                    </ThemedText>
                                </Pressable>
                            );
                        })}
                    </View>
                    {selectedTableId && surchargeBreakdown.total > 0 && (
                        <ThemedText style={[styles.smallText, { color: palette.mutedText }]}>
                            {t('saleForm.selectedTableSurcharge')}: +${surchargeBreakdown.total.toFixed(2)}
                        </ThemedText>
                    )}
                </>
            )}
        </View>
    );

    const renderCartItem = (item: CartItem) => {
        const isExpanded = openItemIds.has(item.id);
        const removedNames = item.removedIngredientIds
            .map((id) => recipeByProductId.get(item.productId)?.find((x) => x.ingredientId === id)?.ingredientName)
            .filter((name): name is string => Boolean(name));
        const addedNames = item.additionalIngredients
            .map((entry) => {
                const option = additionalOptionsByProductId.get(item.productId)?.get(entry.ingredientId);
                return option ? `+${option.ingredientName} x${entry.quantity}` : null;
            })
            .filter((s): s is string => Boolean(s));
        const modifierSummary = [...removedNames.map((n) => `${t('saleForm.withoutChip')} ${n}`), ...addedNames].join(' · ');
        const itemTotal = item.unitPrice * item.quantity;
        const hasIngredients = (recipeByProductId.get(item.productId)?.length ?? 0) > 0;
        const hasAdditionals = (products.find((p) => p.id === item.productId)?.additionalIngredients.length ?? 0) > 0;
        const isDisabled = Boolean(editingOrderId && !canEditDraft);

        return (
            <View key={item.id} style={[styles.cartItem, { borderBottomColor: palette.border }]}>
                {/* Line 1: chevron + name + unit price | total */}
                <Pressable style={styles.cartItemRow1} onPress={() => toggleItemExpanded(item.id)}>
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={palette.tint}
                        style={styles.itemChevron}
                    />
                    <View style={styles.cartItemNameUnit}>
                        <ThemedText style={styles.cartItemName} numberOfLines={1}>{item.name}</ThemedText>
                        <ThemedText style={[styles.cartItemUnitPrice, { color: palette.mutedText }]}>
                            ${item.unitPrice.toFixed(2)} {t('saleForm.each')}
                        </ThemedText>
                    </View>
                    <ThemedText style={styles.cartItemTotal}>${itemTotal.toFixed(2)}</ThemedText>
                </Pressable>

                {/* Line 2: modifier summary | qty buttons */}
                <View style={styles.cartItemRow2}>
                    {!isExpanded && (modifierSummary.length > 0 || item.observation) ? (
                        <ThemedText style={[styles.modifierSummary, { color: palette.mutedText, flex: 1 }]} numberOfLines={2}>
                            {[modifierSummary, item.observation ? `📝 ${item.observation}` : null].filter(Boolean).join(' · ')}
                        </ThemedText>
                    ) : (
                        <View style={{ flex: 1 }} />
                    )}
                    <View style={styles.qtyRow}>
                        <Pressable
                            style={[styles.qtyBtn, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}
                            onPress={() => updateQty(item.id, -1)}
                            disabled={isDisabled}>
                            <ThemedText style={styles.qtyBtnText}>−</ThemedText>
                        </Pressable>
                        <ThemedText style={styles.qtyCount}>{item.quantity}</ThemedText>
                        <Pressable
                            style={[styles.qtyBtn, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}
                            onPress={() => updateQty(item.id, 1)}
                            disabled={isDisabled}>
                            <ThemedText style={styles.qtyBtnText}>+</ThemedText>
                        </Pressable>
                    </View>
                </View>

                {/* Expanded content */}
                {isExpanded && (
                    <View style={[styles.expandedContent, { borderTopColor: palette.border }]}>

                        {/* Remove ingredients */}
                        {hasIngredients && (
                            <View style={styles.expandedSection}>
                                <View style={styles.expandedSectionHeader}>
                                    <Ionicons name="remove-circle-outline" size={13} color={palette.mutedText} />
                                    <ThemedText style={[styles.expandedSectionLabel, { color: palette.mutedText }]}>
                                        {t('saleForm.removeIngredients')}
                                    </ThemedText>
                                </View>
                                <View style={styles.chipsRow}>
                                    {(recipeByProductId.get(item.productId) ?? []).map((ingredient) => {
                                        const removed = item.removedIngredientIds.includes(ingredient.ingredientId);
                                        return (
                                            <Pressable
                                                key={`${item.id}-${ingredient.ingredientId}`}
                                                onPress={() => toggleRemovedIngredient(item.id, ingredient.ingredientId)}
                                                style={[
                                                    styles.ingredientChip,
                                                    {
                                                        borderColor: removed ? '#C62828' : palette.border,
                                                        backgroundColor: removed ? '#FFEBEE' : 'transparent',
                                                    },
                                                ]}
                                                disabled={isDisabled}>
                                                {removed && <Ionicons name="close-circle" size={12} color="#C62828" style={{ marginRight: 2 }} />}
                                                <ThemedText style={[styles.ingredientChipText, removed && { color: '#C62828' }]}>
                                                    {ingredient.ingredientName}
                                                </ThemedText>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Additional ingredients */}
                        {hasAdditionals && (
                            <View style={styles.expandedSection}>
                                <View style={styles.expandedSectionHeader}>
                                    <Ionicons name="add-circle-outline" size={13} color={palette.mutedText} />
                                    <ThemedText style={[styles.expandedSectionLabel, { color: palette.mutedText }]}>
                                        {t('saleForm.additionalIngredients')}
                                    </ThemedText>
                                </View>
                                {(products.find((p) => p.id === item.productId)?.additionalIngredients ?? []).map((additionalOption) => {
                                    const selectedQty = item.additionalIngredients.find((e) => e.ingredientId === additionalOption.ingredientId)?.quantity ?? 0;
                                    return (
                                        <View
                                            key={`${item.id}-add-${additionalOption.ingredientId}`}
                                            style={[
                                                styles.additionalOptionRow,
                                                { borderColor: selectedQty > 0 ? palette.tint : palette.border },
                                            ]}>
                                            <View style={styles.additionalOptionText}>
                                                <ThemedText style={styles.ingredientChipText}>{additionalOption.ingredientName}</ThemedText>
                                                <ThemedText style={[styles.cartItemMeta, { color: palette.mutedText }]}>
                                                    +${Number(additionalOption.additionalPrice).toFixed(2)}
                                                </ThemedText>
                                            </View>
                                            <View style={styles.qtyRow}>
                                                <Pressable
                                                    style={[styles.qtyBtn, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}
                                                    onPress={() => updateAdditionalIngredientQty(item.id, additionalOption.ingredientId, -1)}
                                                    disabled={isDisabled}>
                                                    <ThemedText style={styles.qtyBtnText}>−</ThemedText>
                                                </Pressable>
                                                <ThemedText style={styles.qtyCount}>{selectedQty}</ThemedText>
                                                <Pressable
                                                    style={[styles.qtyBtn, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}
                                                    onPress={() => updateAdditionalIngredientQty(item.id, additionalOption.ingredientId, 1)}
                                                    disabled={isDisabled}>
                                                    <ThemedText style={styles.qtyBtnText}>+</ThemedText>
                                                </Pressable>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* Observation */}
                        <View style={styles.expandedSection}>
                            <View style={styles.expandedSectionHeader}>
                                <Ionicons name="create-outline" size={13} color={palette.mutedText} />
                                <ThemedText style={[styles.expandedSectionLabel, { color: palette.mutedText }]}>
                                    {t('saleForm.observation')}
                                </ThemedText>
                            </View>
                            <TextInput
                                value={item.observation ?? ''}
                                onChangeText={(v) => updateObservation(item.id, v)}
                                placeholder={t('saleForm.observationPlaceholder')}
                                editable={!isDisabled}
                                style={[
                                    styles.observationInput,
                                    { borderColor: palette.border, color: palette.text, backgroundColor: palette.inputBackground },
                                ]}
                                placeholderTextColor={`${palette.text}60`}
                            />
                        </View>

                    </View>
                )}
            </View>
        );
    };

    const renderCartBody = () => (
        <View style={styles.cartBodyContent}>
            {/* Table selector */}
            {renderTableSection()}

            {/* Cart items */}
            <View style={[styles.cartSection, { borderBottomWidth: 0 }]}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="list-outline" size={14} color={palette.mutedText} />
                    <ThemedText style={[styles.sectionLabel, { color: palette.mutedText }]}>
                        {t('saleForm.cart')}
                    </ThemedText>
                </View>
                {cart.length === 0 ? (
                    <ThemedText style={[styles.smallText, { color: palette.mutedText }]}>{t('saleForm.noItems')}</ThemedText>
                ) : (
                    cart.map(renderCartItem)
                )}
            </View>

        </View>
    );

    const renderCartFooter = () => (
        <View style={[styles.cartFooter, { borderTopColor: palette.border, backgroundColor: palette.card }]}>
            {/* Collapsible discount section */}
            <Pressable
                style={[styles.discountHeader, { borderBottomColor: palette.border }]}
                onPress={() => setDiscountExpanded((v) => !v)}>
                <Ionicons name="pricetag-outline" size={14} color={selectedGlobalDiscountId ? palette.tint : palette.mutedText} />
                <ThemedText style={[styles.sectionLabel, { color: selectedGlobalDiscountId ? palette.tint : palette.mutedText, flex: 1 }]}>
                    {t('saleForm.globalDiscount')}
                </ThemedText>
                {selectedGlobalDiscountId && !discountExpanded && (
                    <View style={[styles.statusBadge, { backgroundColor: `${palette.tint}20` }]}>
                        <ThemedText style={[styles.statusBadgeText, { color: palette.tint }]}>
                            {globalDiscountOptions.find((o) => o.value === selectedGlobalDiscountId)?.label ?? ''}
                        </ThemedText>
                    </View>
                )}
                <Ionicons name={discountExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={palette.mutedText} />
            </Pressable>
            {discountExpanded && (
                <ThemedSelect
                    value={selectedGlobalDiscountId}
                    onValueChange={(v) => {
                        if (!editingOrderId || canEditDraft) setSelectedGlobalDiscountId(v);
                    }}
                    items={globalDiscountOptions}
                    placeholder={t('saleForm.selectDiscount')}
                />
            )}
            <View style={styles.pricingBlock}>
                <View style={styles.pricingRow}>
                    <ThemedText style={[styles.pricingLabel, { color: palette.mutedText }]}>{t('sales.pricing.subtotal')}</ThemedText>
                    <ThemedText style={[styles.pricingValue, { color: palette.mutedText }]}>${pricing.subtotal.toFixed(2)}</ThemedText>
                </View>
                {pricing.itemDiscountTotal > 0 && (
                    <View style={styles.pricingRow}>
                        <ThemedText style={[styles.pricingLabel, { color: palette.mutedText }]}>{t('sales.pricing.itemDiscounts')}</ThemedText>
                        <ThemedText style={[styles.pricingValue, { color: palette.mutedText }]}>-${pricing.itemDiscountTotal.toFixed(2)}</ThemedText>
                    </View>
                )}
                {pricing.globalDiscountAmount > 0 && (
                    <View style={styles.pricingRow}>
                        <ThemedText style={[styles.pricingLabel, { color: palette.mutedText }]}>{t('sales.pricing.globalDiscount')}</ThemedText>
                        <ThemedText style={[styles.pricingValue, { color: palette.mutedText }]}>-${pricing.globalDiscountAmount.toFixed(2)}</ThemedText>
                    </View>
                )}
                {surchargeBreakdown.toGo > 0 && (
                    <View style={styles.pricingRow}>
                        <ThemedText style={[styles.pricingLabel, { color: palette.mutedText }]}>{t('sales.surcharge.toGo')}</ThemedText>
                        <ThemedText style={[styles.pricingValue, { color: palette.mutedText }]}>+${surchargeBreakdown.toGo.toFixed(2)}</ThemedText>
                    </View>
                )}
                {surchargeBreakdown.delivery > 0 && (
                    <View style={styles.pricingRow}>
                        <ThemedText style={[styles.pricingLabel, { color: palette.mutedText }]}>{t('sales.surcharge.delivery')}</ThemedText>
                        <ThemedText style={[styles.pricingValue, { color: palette.mutedText }]}>+${surchargeBreakdown.delivery.toFixed(2)}</ThemedText>
                    </View>
                )}
                <View style={[styles.pricingRow, styles.totalRow, { borderTopColor: palette.border }]}>
                    <View style={styles.totalLabelRow}>
                        <Ionicons name="wallet-outline" size={16} color={palette.text} />
                        <ThemedText style={styles.totalLabel}>{t('sales.total')}</ThemedText>
                    </View>
                    <ThemedText style={styles.totalValue}>${finalTotal.toFixed(2)}</ThemedText>
                </View>
            </View>
            {!selectedTableId && (
                <ThemedText style={[styles.smallText, { color: palette.warning }]}>{t('saleForm.selectTablePrompt')}</ThemedText>
            )}
            {editingOrderId && !canEditDraft && (
                <ThemedText style={styles.smallText}>{t('saleForm.orderNotEditable')}</ThemedText>
            )}
            <View style={styles.actionRow}>
                <ThemedButton
                    variant="secondary"
                    style={styles.discardButton}
                    label={t('saleForm.discard')}
                    icon="trash-outline"
                    onPress={() => setCart([])}
                    disabled={Boolean(editingOrderId && !canEditDraft)}
                />
                <ThemedButton
                    style={styles.saveButton}
                    label={editingOrderId ? t('common.saveChanges') : t('saleForm.openDraft')}
                    icon="checkmark-circle-outline"
                    onPress={submitSale}
                    disabled={!selectedTableId || cart.length === 0 || Boolean(editingOrderId && !canEditDraft)}
                />
            </View>
        </View>
    );

    const renderNarrowHeader = () => (
        <View style={[styles.narrowHeader, { borderBottomColor: palette.border, backgroundColor: palette.card }]}>
            <Pressable onPress={onComplete} style={styles.narrowBackBtn}>
                <Ionicons name="arrow-back" size={20} color={palette.tint} />
            </Pressable>
            <ThemedText type="defaultSemiBold" style={styles.narrowHeaderTitle}>
                {editingOrderId ? `#${editingOrderId.slice(0, 6).toUpperCase()}` : t('saleForm.title.new')}
            </ThemedText>
            {editingOrderId && selectedDraftSale && (
                <View style={[styles.statusBadge, { backgroundColor: `${palette.tint}20` }]}>
                    <ThemedText style={[styles.statusBadgeText, { color: palette.tint }]}>
                        {formatSaleStatusLabel(selectedDraftSale.status)}
                    </ThemedText>
                </View>
            )}
        </View>
    );

    const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    // ─── Wide layout ───────────────────────────────────────────────────────────
    if (isWideLayout) {
        return (
            <View
                style={[
                    styles.wideRoot,
                    Platform.select({ web: { height: '100vh', overflow: 'hidden' } as object }) ?? {},
                ]}>
                {/* Left: Catalog */}
                <View style={[styles.catalogColumn, { backgroundColor: palette.inputBackground }]}>
                    <View style={[styles.catalogHeader, { borderBottomColor: palette.border }]}>
                        <ThemedText type="subtitle">{t('saleForm.catalog')}</ThemedText>
                        {editingOrderId && loadingDraft && (
                            <ThemedText style={[styles.smallText, { color: palette.mutedText }]}>{t('saleForm.loadingDraft')}</ThemedText>
                        )}
                    </View>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.catalogScrollContent} showsVerticalScrollIndicator={false}>
                        {renderCatalogContent()}
                    </ScrollView>
                </View>

                {/* Right: Cart (40%) */}
                <View
                    style={[
                        styles.cartColumn,
                        { backgroundColor: palette.card },
                        Platform.select({
                            web: { boxShadow: '-4px 0 12px rgba(0,0,0,0.08)' } as object,
                            default: { elevation: 4 },
                        }) ?? {},
                    ]}>
                    {renderCartHeader()}
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                        {renderCartBody()}
                    </ScrollView>
                    {renderCartFooter()}
                </View>
            </View>
        );
    }

    // ─── Narrow: cart step ─────────────────────────────────────────────────────
    if (mobileStep === 'cart') {
        return (
            <View style={[styles.narrowRoot, { backgroundColor: palette.background }]}>
                {renderCartHeader()}
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                    {renderCartBody()}
                </ScrollView>
                {renderCartFooter()}
            </View>
        );
    }

    // ─── Narrow: products step ─────────────────────────────────────────────────
    return (
        <View style={[styles.narrowRoot, { backgroundColor: palette.background }]}>
            {renderNarrowHeader()}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                {renderCatalogContent()}
            </ScrollView>
            <View style={[styles.bottomBar, { backgroundColor: palette.card, borderTopColor: palette.border }]}>
                <View style={styles.bottomBarInfo}>
                    <ThemedText type="defaultSemiBold">
                        {totalCartItems} {totalCartItems === 1 ? 'item' : 'items'}
                    </ThemedText>
                    <ThemedText style={[styles.smallText, { color: palette.mutedText }]}>
                        ${finalTotal.toFixed(2)}
                    </ThemedText>
                </View>
                <ThemedButton
                    label={`${t('saleForm.cart')} →`}
                    onPress={() => setMobileStep('cart')}
                    style={styles.goToCartButton}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    /* ── Wide layout ── */
    wideRoot: {
        flex: 1,
        flexDirection: 'row',
    },
    catalogColumn: {
        flex: 6,
        flexDirection: 'column',
    },
    catalogHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    catalogScrollContent: {
        padding: 16,
        paddingBottom: 24,
    },
    cartColumn: {
        flex: 4,
        flexDirection: 'column',
        minWidth: 0,
    },

    /* ── Narrow layout ── */
    narrowRoot: {
        flex: 1,
        flexDirection: 'column',
    },
    narrowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    narrowBackBtn: {
        padding: 4,
    },
    narrowHeaderTitle: {
        flex: 1,
        fontSize: 16,
    },

    /* ── Product catalog ── */
    categoriesContainer: {
        flexDirection: 'column',
        gap: 16,
    },
    categoriesContainerWide: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    categorySection: {
        gap: 8,
    },
    categorySectionWide: {
        flex: 0,
        flexBasis: '48%',
    },
    categoryTitle: {
        marginBottom: 4,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    productCard: {
        borderWidth: 1,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        position: 'relative',
    },
    productCardWide: {
        flexBasis: '22%',
    },
    productCardNarrow: {
        flexBasis: '45%',
    },
    disabledTile: {
        opacity: 0.55,
    },
    productImage: {
        width: '100%',
        height: 80,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    productInfo: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        gap: 2,
    },
    productName: {
        fontWeight: '500',
        fontSize: 13,
        lineHeight: 17,
    },
    productPrice: {
        fontSize: 12,
    },
    quantityBadge: {
        position: 'absolute',
        top: 4,
        left: 4,
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 2,
        minWidth: 22,
        alignItems: 'center',
    },
    quantityBadgeText: {
        fontWeight: '700',
        color: '#FFFFFF',
        fontSize: 10,
    },

    /* ── Cart header ── */
    cartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    cartHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    cartHeaderTitle: {
        fontWeight: '700',
        fontSize: 15,
    },
    statusBadge: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    closeButton: {
        padding: 4,
    },

    /* ── Cart body ── */
    cartBodyContent: {
        gap: 0,
    },
    cartSection: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tableButton: {
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    tableButtonText: {
        fontSize: 13,
        fontWeight: '500',
    },
    tableButtonTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },

    /* ── Cart items ── */
    cartItem: {
        paddingVertical: 10,
        gap: 3,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    cartItemRow1: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cartItemRow2: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingLeft: 22,
    },
    itemChevron: {
        width: 18,
    },
    cartItemNameUnit: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    cartItemName: {
        fontWeight: '600',
        fontSize: 13,
        flexShrink: 1,
    },
    cartItemUnitPrice: {
        fontSize: 12,
    },
    cartItemTotal: {
        fontWeight: '600',
        fontSize: 13,
    },
    cartItemMeta: {
        fontSize: 12,
    },
    modifierSummary: {
        fontSize: 11,
        fontStyle: 'italic',
        paddingLeft: 22,
    },

    /* ── Expanded accordion ── */
    expandedContent: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 10,
    },
    expandedSection: {
        gap: 6,
    },
    expandedSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    expandedSectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    ingredientChip: {
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
        flexDirection: 'row',
        alignItems: 'center',
    },
    ingredientChipText: {
        fontSize: 11,
        fontWeight: '500',
    },
    additionalOptionRow: {
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    additionalOptionText: {
        flex: 1,
        gap: 1,
    },
    observationInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
        fontSize: 12,
    },

    /* ── Qty controls ── */
    qtyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    qtyBtn: {
        borderWidth: 1,
        borderRadius: 6,
        width: 26,
        height: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyBtnText: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 16,
    },
    qtyCount: {
        minWidth: 20,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: '600',
    },

    /* ── Cart footer ── */
    cartFooter: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        gap: 8,
    },
    discountHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingBottom: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    pricingBlock: {
        gap: 4,
    },
    pricingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pricingLabel: {
        fontSize: 13,
    },
    pricingValue: {
        fontSize: 13,
    },
    totalRow: {
        marginTop: 4,
        paddingTop: 6,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    totalLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    totalLabel: {
        fontWeight: '700',
        fontSize: 16,
    },
    totalValue: {
        fontWeight: '700',
        fontSize: 16,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    discardButton: {
        flex: 1,
    },
    saveButton: {
        flex: 2,
    },

    /* ── Bottom bar (narrow products step) ── */
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        gap: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    bottomBarInfo: {
        flex: 1,
        gap: 2,
    },
    goToCartButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    smallText: {
        fontSize: 13,
        opacity: 0.9,
    },
});
