import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ComboConfigModal, type ComboItemCustomization, type CustomizationsByOptionId } from '@/components/combo-config-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useResponsiveOpen } from '@/hooks/use-responsive-open';
import { useSaleCart } from '@/hooks/use-sale-cart';
import { useSaleDraftPreload } from '@/hooks/use-sale-draft-preload';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import { useProductsStore } from '@/stores/products';
import { useSalesStore } from '@/stores/sales';
import { useSettingsStore } from '@/stores/settings';
import {
    createCartItemId,
    type SaleFormCartItem,
} from '@/utils/cart-normalization';
import { calculateSaleDiscountBreakdown, isDiscountScheduledActive } from '@/utils/discounts';
import { money } from '@/utils/money';
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
    const [comboModalVisible, setComboModalVisible] = useState(false);
    const [selectedComboProduct, setSelectedComboProduct] = useState<typeof products[0] | null>(null);
    const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
    const [comboInitialSelections, setComboInitialSelections] = useState<Map<string, any> | undefined>(undefined);
    const [comboInitialCustomizations, setComboInitialCustomizations] = useState<CustomizationsByOptionId | undefined>(undefined);

    const { isWide: isWideLayout } = useResponsiveOpen();

    const selectedDraftSale = useMemo(
        () => (editingOrderId ? sales.find((sale) => sale.id === editingOrderId) ?? null : null),
        [editingOrderId, sales],
    );
    // Editable until paid: draft, in-progress and ready orders can still be modified.
    const canEdit = !!selectedDraftSale
        && !selectedDraftSale.paid_at
        && selectedDraftSale.status !== 'completed'
        && selectedDraftSale.status !== 'cancelled';

    useEffect(() => {
        void hydrate();
        void hydrateProducts();
        void hydrateFromDb();
    }, [hydrate, hydrateProducts, hydrateFromDb]);

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
                .filter((d) => d.scope === 'global' && isDiscountScheduledActive(d, nowUnix))
                .map((d) => ({
                    label: `${d.name} (${d.type === 'percentage' ? `${d.value}%` : money(d.value)})`,
                    value: d.id,
                })),
        ],
        [discounts, nowUnix],
    );

    // Drop a previously-selected global discount once it falls outside its schedule.
    useEffect(() => {
        if (selectedGlobalDiscountId && !globalDiscountOptions.some((o) => o.value === selectedGlobalDiscountId)) {
            setSelectedGlobalDiscountId('');
        }
    }, [globalDiscountOptions, selectedGlobalDiscountId]);

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
                comboItems: item.comboItems?.map((sub) => ({
                    productId: sub.productId,
                    quantity: sub.quantity,
                    unitPrice: sub.unitPrice,
                    observation: sub.observation,
                    removedIngredientIds: sub.removedIngredientIds,
                    additionalIngredients: sub.additionalIngredients,
                })),
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
                                        {
                                          borderColor: product.isCombo ? palette.accent : (isSelected ? palette.tint : palette.border),
                                          backgroundColor: palette.card,
                                        },
                                        editingOrderId && !canEdit ? styles.disabledTile : null,
                                    ]}
                                    onPress={() => {
                                      if (editingOrderId && !canEdit) return;
                                      if (product.isCombo) {
                                        setSelectedComboProduct(product);
                                        setComboModalVisible(true);
                                      } else {
                                        addToCart(product.id, product.name, Number(product.price));
                                      }
                                    }}
                                    disabled={Boolean(editingOrderId && !canEdit)}>
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
                                        <View style={styles.productNameRow}>
                                            <ThemedText style={styles.productName} numberOfLines={2}>{product.name}</ThemedText>
                                            {product.isCombo && (
                                                <Ionicons name="layers-outline" size={12} color={palette.accent} />
                                            )}
                                        </View>
                                        <ThemedText style={[styles.productPrice, { color: palette.mutedText }]}>
                                            {money(product.price)}
                                        </ThemedText>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            ))}
            {editingOrderId && !canEdit && (
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
                                    disabled={Boolean(editingOrderId && !canEdit)}>
                                    <ThemedText style={[styles.tableButtonText, isActive && styles.tableButtonTextActive]}>
                                        {table.name}{tableSurcharge.total > 0 ? ` (+${money(tableSurcharge.total)})` : ''}
                                    </ThemedText>
                                </Pressable>
                            );
                        })}
                    </View>
                    {selectedTableId && surchargeBreakdown.total > 0 && (
                        <ThemedText style={[styles.smallText, { color: palette.mutedText }]}>
                            {t('saleForm.selectedTableSurcharge')}: +{money(surchargeBreakdown.total)}
                        </ThemedText>
                    )}
                </>
            )}
        </View>
    );

    const renderCartItem = (item: CartItem) => {
        const isExpanded = openItemIds.has(item.id);
        const isComboItem = Boolean(item.comboItems?.length);
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
        const hasIngredients = !isComboItem && (recipeByProductId.get(item.productId)?.length ?? 0) > 0;
        const hasAdditionals = !isComboItem && (products.find((p) => p.id === item.productId)?.additionalIngredients.length ?? 0) > 0;
        const isDisabled = Boolean(editingOrderId && !canEdit);

        // Group combo sub-items by their group for display
        const comboProduct = isComboItem ? products.find((p) => p.id === item.productId) : null;

        return (
            <View key={item.id} style={[styles.cartItem, { borderBottomColor: palette.border }]}>
                {/* Line 1: chevron + name + unit price | total */}
                <Pressable style={styles.cartItemRow1} onPress={() => toggleItemExpanded(item.id)}>
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={isComboItem ? palette.accent : palette.tint}
                        style={styles.itemChevron}
                    />
                    <View style={styles.cartItemNameUnit}>
                        <View style={styles.cartItemNameRow}>
                            {isComboItem && (
                                <Ionicons name="layers-outline" size={13} color={palette.accent} style={{ marginRight: 4 }} />
                            )}
                            <ThemedText style={styles.cartItemName} numberOfLines={1}>{item.name}</ThemedText>
                        </View>
                        <ThemedText style={[styles.cartItemUnitPrice, { color: palette.mutedText }]}>
                            {money(item.unitPrice)} {t('saleForm.each')}
                        </ThemedText>
                    </View>
                    <ThemedText style={styles.cartItemTotal}>{money(itemTotal)}</ThemedText>
                </Pressable>

                {/* Combo sub-items summary (collapsed) */}
                {isComboItem && !isExpanded && (
                    <View style={[styles.comboSubSummary, { borderLeftColor: palette.accent + '60' }]}>
                        {item.comboItems!.map((sub, idx) => {
                            const subName = productsMap.get(sub.productId)?.name ?? sub.name;
                            const removedCount = sub.removedIngredientIds.length;
                            const addedCount = sub.additionalIngredients.length;
                            const obs = sub.observation;
                            const tags = [
                                removedCount > 0 ? `−${removedCount}` : '',
                                addedCount > 0 ? `+${addedCount}` : '',
                                obs ? '📝' : '',
                            ].filter(Boolean).join(' ');
                            return (
                                <ThemedText key={idx} style={[styles.comboSubSummaryText, { color: palette.mutedText }]} numberOfLines={1}>
                                    · {subName}{tags ? ` (${tags})` : ''}
                                </ThemedText>
                            );
                        })}
                        {!isDisabled && (
                            <Pressable onPress={() => handleEditComboCartItem(item)} style={styles.editComboBtn}>
                                <Ionicons name="create-outline" size={12} color={palette.accent} />
                                <ThemedText style={[styles.comboSubSummaryText, { color: palette.accent }]}>Editar combo</ThemedText>
                            </Pressable>
                        )}
                    </View>
                )}

                {/* Line 2: modifier summary | qty buttons */}
                <View style={styles.cartItemRow2}>
                    {!isExpanded && !isComboItem && (modifierSummary.length > 0 || item.observation) ? (
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

                        {/* Combo groups breakdown */}
                        {isComboItem && comboProduct?.comboGroups && comboProduct.comboGroups.length > 0 && (
                            <View style={styles.expandedSection}>
                                {comboProduct.comboGroups.map((group) => {
                                    const groupOptions = item.comboItems!.filter((sub) =>
                                        group.options.some((opt) => opt.productId === sub.productId),
                                    );
                                    if (groupOptions.length === 0) return null;
                                    return (
                                        <View key={group.id} style={[styles.comboGroupBlock, { borderColor: palette.border }]}>
                                            <View style={styles.expandedSectionHeader}>
                                                <Ionicons name="layers-outline" size={13} color={palette.accent} />
                                                <ThemedText style={[styles.expandedSectionLabel, { color: palette.accent }]}>
                                                    {group.name}
                                                </ThemedText>
                                            </View>
                                            {groupOptions.map((sub, idx) => {
                                                const subName = productsMap.get(sub.productId)?.name ?? sub.name;
                                                const groupOption = group.options.find((o) => o.productId === sub.productId);
                                                const removedNames = (recipeByProductId.get(sub.productId) ?? [])
                                                    .filter((ing) => sub.removedIngredientIds.includes(ing.ingredientId))
                                                    .map((ing) => ing.ingredientName);
                                                const addedItems = sub.additionalIngredients.map((entry) => {
                                                    const opt = additionalOptionsByProductId.get(sub.productId)?.get(entry.ingredientId);
                                                    return opt ? `+${opt.ingredientName} x${entry.quantity}` : null;
                                                }).filter(Boolean) as string[];
                                                return (
                                                    <View key={idx} style={styles.comboSubItem}>
                                                        <View style={{ flex: 1 }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                                <Ionicons name="checkmark" size={13} color={palette.tint} />
                                                                <ThemedText style={[styles.comboSubItemName, { color: palette.text }]}>
                                                                    {subName}
                                                                </ThemedText>
                                                                {groupOption && groupOption.additionalPrice > 0 && (
                                                                    <ThemedText style={[styles.comboSubItemPrice, { color: palette.mutedText }]}>
                                                                        +{money(groupOption.additionalPrice)}
                                                                    </ThemedText>
                                                                )}
                                                            </View>
                                                            {removedNames.length > 0 && (
                                                                <ThemedText style={[styles.comboSubItemPrice, { color: palette.danger ?? '#C62828', paddingLeft: 19 }]}>
                                                                    Sin: {removedNames.join(', ')}
                                                                </ThemedText>
                                                            )}
                                                            {addedItems.length > 0 && (
                                                                <ThemedText style={[styles.comboSubItemPrice, { color: palette.tint, paddingLeft: 19 }]}>
                                                                    {addedItems.join(' · ')}
                                                                </ThemedText>
                                                            )}
                                                            {sub.observation ? (
                                                                <ThemedText style={[styles.comboSubItemPrice, { color: palette.mutedText, paddingLeft: 19, fontStyle: 'italic' }]}>
                                                                    📝 {sub.observation}
                                                                </ThemedText>
                                                            ) : null}
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* Fallback: flat combo list when no group info available */}
                        {isComboItem && (!comboProduct?.comboGroups || comboProduct.comboGroups.length === 0) && (
                            <View style={styles.expandedSection}>
                                <View style={styles.expandedSectionHeader}>
                                    <Ionicons name="layers-outline" size={13} color={palette.accent} />
                                    <ThemedText style={[styles.expandedSectionLabel, { color: palette.accent }]}>
                                        Opciones seleccionadas
                                    </ThemedText>
                                </View>
                                {item.comboItems!.map((sub, idx) => {
                                    const subName = productsMap.get(sub.productId)?.name ?? sub.name;
                                    return (
                                        <View key={idx} style={styles.comboSubItem}>
                                            <Ionicons name="checkmark" size={13} color={palette.tint} />
                                            <ThemedText style={[styles.comboSubItemName, { color: palette.text }]}>{subName}</ThemedText>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* Edit combo button (expanded) */}
                        {isComboItem && !isDisabled && (
                            <Pressable onPress={() => handleEditComboCartItem(item)} style={[styles.editComboBtnExpanded, { borderColor: palette.accent + '60', backgroundColor: palette.accent + '10' }]}>
                                <Ionicons name="create-outline" size={14} color={palette.accent} />
                                <ThemedText style={[styles.comboSubItemName, { color: palette.accent }]}>Editar combo</ThemedText>
                            </Pressable>
                        )}

                        {/* Remove ingredients (regular products only) */}
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

                        {/* Additional ingredients (regular products only) */}
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
                                                    +{money(additionalOption.additionalPrice)}
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
                        if (!editingOrderId || canEdit) setSelectedGlobalDiscountId(v);
                    }}
                    items={globalDiscountOptions}
                    placeholder={t('saleForm.selectDiscount')}
                />
            )}
            <View style={styles.pricingBlock}>
                <View style={styles.pricingRow}>
                    <ThemedText style={[styles.pricingLabel, { color: palette.mutedText }]}>{t('sales.pricing.subtotal')}</ThemedText>
                    <ThemedText style={[styles.pricingValue, { color: palette.mutedText }]}>{money(pricing.subtotal)}</ThemedText>
                </View>
                {pricing.itemDiscountTotal > 0 && (
                    <View style={styles.pricingRow}>
                        <ThemedText style={[styles.pricingLabel, { color: palette.mutedText }]}>{t('sales.pricing.itemDiscounts')}</ThemedText>
                        <ThemedText style={[styles.pricingValue, { color: palette.mutedText }]}>-{money(pricing.itemDiscountTotal)}</ThemedText>
                    </View>
                )}
                {pricing.globalDiscountAmount > 0 && (
                    <View style={styles.pricingRow}>
                        <ThemedText style={[styles.pricingLabel, { color: palette.mutedText }]}>{t('sales.pricing.globalDiscount')}</ThemedText>
                        <ThemedText style={[styles.pricingValue, { color: palette.mutedText }]}>-{money(pricing.globalDiscountAmount)}</ThemedText>
                    </View>
                )}
                {surchargeBreakdown.toGo > 0 && (
                    <View style={styles.pricingRow}>
                        <ThemedText style={[styles.pricingLabel, { color: palette.mutedText }]}>{t('sales.surcharge.toGo')}</ThemedText>
                        <ThemedText style={[styles.pricingValue, { color: palette.mutedText }]}>+{money(surchargeBreakdown.toGo)}</ThemedText>
                    </View>
                )}
                {surchargeBreakdown.delivery > 0 && (
                    <View style={styles.pricingRow}>
                        <ThemedText style={[styles.pricingLabel, { color: palette.mutedText }]}>{t('sales.surcharge.delivery')}</ThemedText>
                        <ThemedText style={[styles.pricingValue, { color: palette.mutedText }]}>+{money(surchargeBreakdown.delivery)}</ThemedText>
                    </View>
                )}
                <View style={[styles.pricingRow, styles.totalRow, { borderTopColor: palette.border }]}>
                    <View style={styles.totalLabelRow}>
                        <Ionicons name="wallet-outline" size={16} color={palette.text} />
                        <ThemedText style={styles.totalLabel}>{t('sales.total')}</ThemedText>
                    </View>
                    <ThemedText style={styles.totalValue}>{money(finalTotal)}</ThemedText>
                </View>
            </View>
            {!selectedTableId && (
                <ThemedText style={[styles.smallText, { color: palette.warning }]}>{t('saleForm.selectTablePrompt')}</ThemedText>
            )}
            {editingOrderId && !canEdit && (
                <ThemedText style={styles.smallText}>{t('saleForm.orderNotEditable')}</ThemedText>
            )}
            <View style={styles.actionRow}>
                <ThemedButton
                    variant="secondary"
                    style={styles.discardButton}
                    label={t('saleForm.discard')}
                    icon="trash-outline"
                    onPress={() => setCart([])}
                    disabled={Boolean(editingOrderId && !canEdit)}
                />
                <ThemedButton
                    style={styles.saveButton}
                    label={editingOrderId ? t('common.saveChanges') : t('saleForm.openDraft')}
                    icon="checkmark-circle-outline"
                    onPress={submitSale}
                    disabled={!selectedTableId || cart.length === 0 || Boolean(editingOrderId && !canEdit)}
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

    const productsMap = useMemo(() => {
        const map = new Map<string, { name: string; price: number }>();
        for (const product of products) {
            map.set(product.id, { name: product.name, price: product.price });
        }
        return map;
    }, [products]);

    const handleComboConfirm = (selectedOptions: Map<string, any[]>, customizations: CustomizationsByOptionId) => {
        if (!selectedComboProduct) return;

        const comboItems: SaleFormCartItem[] = [];

        selectedComboProduct.comboGroups?.forEach((group) => {
            const groupOptions = selectedOptions.get(group.id) ?? [];
            groupOptions.forEach((option: any) => {
                const childProduct = products.find((p) => p.id === option.productId);
                const childName = childProduct?.name ?? productsMap.get(option.productId)?.name ?? option.productId;
                const basePrice = Number(childProduct?.price ?? 0);
                const groupOptionPrice = Number(option.additionalPrice ?? 0);
                const customization: ComboItemCustomization = customizations.get(option.id) ?? { removedIngredientIds: [], additionalIngredients: [], observation: '' };

                // Only the extras on top of the combo base price (group option surcharge + additional ingredients)
                const additionalIngredientPrice = customization.additionalIngredients.reduce((sum, entry) => {
                    const opt = additionalOptionsByProductId.get(option.productId)?.get(entry.ingredientId);
                    return sum + (opt?.additionalPrice ?? 0) * entry.quantity;
                }, 0);
                const extraPrice = groupOptionPrice + additionalIngredientPrice;

                comboItems.push({
                    id: createCartItemId(),
                    productId: option.productId,
                    name: childName,
                    basePrice,
                    unitPrice: extraPrice,
                    quantity: 1,
                    observation: customization.observation.trim() || null,
                    removedIngredientIds: customization.removedIngredientIds,
                    additionalIngredients: customization.additionalIngredients,
                });
            });
        });

        // Backend adds all child unitPrices on top of the combo base price — mirror that here
        const comboExtraPrice = comboItems.reduce((sum, sub) => sum + sub.unitPrice * sub.quantity, 0);
        const comboTotalPrice = Number(selectedComboProduct.price) + comboExtraPrice;

        if (editingCartItemId) {
            setCart((prev) => prev.map((item) =>
                item.id === editingCartItemId
                    ? { ...item, comboItems, unitPrice: comboTotalPrice }
                    : item,
            ));
            setEditingCartItemId(null);
        } else {
            addToCart(selectedComboProduct.id, selectedComboProduct.name, comboTotalPrice, { comboItems });
        }

        setComboModalVisible(false);
        setSelectedComboProduct(null);
        setComboInitialSelections(undefined);
        setComboInitialCustomizations(undefined);
        if (!isWideLayout && !editingCartItemId) {
            setMobileStep('cart');
        }
    };

    const handleEditComboCartItem = (item: CartItem) => {
        const comboProduct = products.find((p) => p.id === item.productId);
        if (!comboProduct || !item.comboItems) return;

        // Reconstruct selections from comboItems
        const initialSelections = new Map<string, any[]>();
        for (const group of comboProduct.comboGroups ?? []) {
            const selectedOpts = item.comboItems
                .map((sub) => group.options.find((o) => o.productId === sub.productId))
                .filter(Boolean) as any[];
            if (selectedOpts.length > 0) initialSelections.set(group.id, selectedOpts);
        }

        // Reconstruct customizations from comboItems, keyed by option.id
        const initialCustomizations = new Map<string, ComboItemCustomization>();
        for (const group of comboProduct.comboGroups ?? []) {
            for (const sub of item.comboItems) {
                const opt = group.options.find((o) => o.productId === sub.productId);
                if (opt) {
                    initialCustomizations.set(opt.id, {
                        removedIngredientIds: sub.removedIngredientIds,
                        additionalIngredients: sub.additionalIngredients,
                        observation: sub.observation ?? '',
                    });
                }
            }
        }

        setSelectedComboProduct(comboProduct);
        setEditingCartItemId(item.id);
        setComboInitialSelections(initialSelections);
        setComboInitialCustomizations(initialCustomizations);
        setComboModalVisible(true);
    };

    const layoutContent = (() => {
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
                            {money(finalTotal)}
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
    })();

    return (
        <View style={{ flex: 1 }}>
            {layoutContent}
            <ComboConfigModal
                visible={comboModalVisible}
                productName={selectedComboProduct?.name ?? ''}
                productPrice={selectedComboProduct ? Number(selectedComboProduct.price) : 0}
                comboGroups={selectedComboProduct?.comboGroups ?? []}
                palette={palette}
                productsMap={productsMap}
                recipeByProductId={recipeByProductId}
                additionalOptionsByProductId={additionalOptionsByProductId}
                initialSelections={comboInitialSelections}
                initialCustomizations={comboInitialCustomizations}
                onConfirm={handleComboConfirm}
                onCancel={() => {
                    setComboModalVisible(false);
                    setSelectedComboProduct(null);
                    setEditingCartItemId(null);
                    setComboInitialSelections(undefined);
                    setComboInitialCustomizations(undefined);
                }}
            />
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
    productNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    productName: {
        fontWeight: '500',
        fontSize: 13,
        lineHeight: 17,
        flex: 1,
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
    cartItemNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
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

    /* ── Combo sub-items ── */
    comboSubSummary: {
        paddingLeft: 26,
        paddingBottom: 2,
        borderLeftWidth: 2,
        marginLeft: 8,
        marginTop: 2,
        gap: 1,
    },
    comboSubSummaryText: {
        fontSize: 11,
    },
    editComboBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    editComboBtnExpanded: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignSelf: 'flex-start',
    },
    comboGroupBlock: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        gap: 6,
    },
    comboSubItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 4,
    },
    comboSubItemName: {
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
    },
    comboSubItemPrice: {
        fontSize: 11,
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
