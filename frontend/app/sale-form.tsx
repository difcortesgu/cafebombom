import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { salesService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useProductsStore } from '@/stores/products';
import { useSalesStore } from '@/stores/sales';
import { useSettingsStore } from '@/stores/settings';
import type { SaleItemAdditionalIngredientInput, TableType } from '@/types/types';
import { calculateSaleDiscountBreakdown } from '@/utils/discounts';

type CartItem = {
  id: string;
  productId: string;
  name: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  observation: string | null;
  removedIngredientIds: string[];
  additionalIngredients: SaleItemAdditionalIngredientInput[];
};

function createCartItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeIngredientIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((value) => value.trim()).filter((value) => value.length > 0))).sort();
}

function normalizeAdditionalIngredients(entries: SaleItemAdditionalIngredientInput[]): SaleItemAdditionalIngredientInput[] {
  const deduped = new Map<string, number>();
  for (const entry of entries) {
    const ingredientId = String(entry.ingredientId ?? '').trim();
    const quantity = Math.max(0, Math.floor(Number(entry.quantity ?? 0)));
    if (!ingredientId || quantity <= 0) {
      continue;
    }
    deduped.set(ingredientId, quantity);
  }
  return Array.from(deduped.entries())
    .map(([ingredientId, quantity]) => ({ ingredientId, quantity }))
    .sort((left, right) => left.ingredientId.localeCompare(right.ingredientId));
}

function buildCustomizationKey(
  productId: string,
  observation: string | null,
  removedIngredientIds: string[],
  additionalIngredients: SaleItemAdditionalIngredientInput[],
): string {
  const normalizedAdditional = normalizeAdditionalIngredients(additionalIngredients)
    .map((entry) => `${entry.ingredientId}:${entry.quantity}`)
    .join(',');
  const normalizedObservation = typeof observation === 'string' ? observation.trim() : '';
  return `${productId}::${normalizedObservation}::${normalizeIngredientIds(removedIngredientIds).join(',')}::${normalizedAdditional}`;
}

function mergeCartLines(items: CartItem[]): CartItem[] {
  const grouped = new Map<string, CartItem>();
  for (const item of items) {
    const removedIngredientIds = normalizeIngredientIds(item.removedIngredientIds);
    const additionalIngredients = normalizeAdditionalIngredients(item.additionalIngredients);
    const observation = typeof item.observation === 'string' ? item.observation.trim() : '';
    const key = buildCustomizationKey(item.productId, observation, removedIngredientIds, additionalIngredients);
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      continue;
    }
    grouped.set(key, {
      ...item,
      observation: observation.length > 0 ? observation : null,
      removedIngredientIds,
      additionalIngredients,
    });
  }
  return [...grouped.values()];
}

function getTableSurcharge(tableType: TableType, toGoSurcharge: number, deliverySurcharge: number) {
  const safeToGo = Math.max(0, toGoSurcharge);
  const safeDelivery = Math.max(0, deliverySurcharge);
  const delivery = tableType === 'delivery' ? safeDelivery : 0;
  const toGo = (tableType === 'to-go' || tableType === 'delivery') ? safeToGo : 0;
  return {
    toGo,
    delivery,
    total: toGo + delivery,
  };
}

function formatStatusLabel(status: string) {
  if (status === 'draft') return t('sales.status.draft');
  if (status === 'in-progress') return t('sales.status.inProgress');
  if (status === 'ready') return t('sales.status.ready');
  if (status === 'completed') return t('sales.status.completed');
  if (status === 'cancelled') return t('sales.status.cancelled');
  return status;
}

export default function SaleFormScreen() {
  const palette = useAppColors();
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const user = useAuthStore((state) => state.currentUser);
  const { hydrate, products, tables, discounts, sales, createSale, updateDraftOrder } = useSalesStore();
  const { productIngredients, hydrate: hydrateProducts } = useProductsStore();
  const { deliverySurcharge, toGoSurcharge, hydrateFromDb } = useSettingsStore();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedGlobalDiscountId, setSelectedGlobalDiscountId] = useState('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [isDraftInitialized, setIsDraftInitialized] = useState(false);
  const [mobileStep, setMobileStep] = useState<'products' | 'cart'>('products');

  const editingOrderId = typeof orderId === 'string' && orderId.length > 0 ? orderId : null;
  const selectedDraftSale = useMemo(
    () => (editingOrderId ? sales.find((sale) => sale.id === editingOrderId) ?? null : null),
    [editingOrderId, sales],
  );
  const canEditDraft = selectedDraftSale?.status === 'draft';

  useFocusEffect(
    useCallback(() => {
      void hydrate();
      void hydrateProducts();
      void hydrateFromDb();
    }, [hydrate, hydrateFromDb, hydrateProducts]),
  );

  useEffect(() => {
    setIsDraftInitialized(false);
    if (!editingOrderId) {
      setCart([]);
      setSelectedTableId(tables.length > 0 ? tables[0].id : null);
      setSelectedGlobalDiscountId('');
    }
  }, [editingOrderId, tables]);

  useEffect(() => {
    if (!editingOrderId || isDraftInitialized || !selectedDraftSale) {
      return;
    }

    let isMounted = true;

    const preloadDraft = async () => {
      setLoadingDraft(true);
      try {
        const [items, pricingSummary] = await Promise.all([
          salesService.getSaleItems(editingOrderId),
          salesService.getSalePricingSummary(editingOrderId),
        ]);

        if (!isMounted) {
          return;
        }

        const itemMap = new Map<string, CartItem>();
        for (const item of items) {
          const removedIngredientIds = normalizeIngredientIds(item.removed_ingredient_ids ?? []);
          const additionalIngredients = normalizeAdditionalIngredients(item.selected_additional_ingredients ?? []);
          const observation = typeof item.observation === 'string' ? item.observation.trim() : '';
          const key = buildCustomizationKey(item.product_id, observation, removedIngredientIds, additionalIngredients);
          const currentProduct = products.find((product) => product.id === item.product_id);
          const existing = itemMap.get(key);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            itemMap.set(key, {
              id: createCartItemId(),
              productId: item.product_id,
              name: item.product_name,
              basePrice: Number(currentProduct?.price ?? item.unit_price),
              unitPrice: Number(item.unit_price),
              quantity: item.quantity,
              observation: observation.length > 0 ? observation : null,
              removedIngredientIds,
              additionalIngredients,
            });
          }
        }

        setCart([...itemMap.values()]);

        const matchedTable = tables.find((table) => table.name === selectedDraftSale.table_name) ?? null;
        setSelectedTableId(matchedTable?.id ?? null);

        const discountName = pricingSummary?.global_discount_name ?? null;
        const matchedGlobalDiscount = discountName
          ? discounts.find((discount) => discount.scope === 'global' && discount.name === discountName)
          : null;
        setSelectedGlobalDiscountId(matchedGlobalDiscount?.id ?? '');
        setIsDraftInitialized(true);
      } finally {
        if (isMounted) {
          setLoadingDraft(false);
        }
      }
    };

    void preloadDraft();

    return () => {
      isMounted = false;
    };
  }, [editingOrderId, isDraftInitialized, selectedDraftSale, tables, discounts, products]);

  const nowUnix = Math.floor(Date.now() / 1000);

  const globalDiscountOptions = useMemo(
    () => [
      { label: t('saleForm.noDiscount'), value: '' },
      ...discounts
        .filter((discount) =>
          discount.scope === 'global'
          && discount.isActive,
        )
        .map((discount) => ({
          label: `${discount.name} (${discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value.toFixed(2)}`})`,
          value: discount.id,
        })),
    ],
    [discounts],
  );

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

  const recipeByProductId = useMemo(() => {
    const map = new Map<string, typeof productIngredients>();
    for (const link of productIngredients) {
      if (!map.has(link.productId)) {
        map.set(link.productId, []);
      }
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

  const getCartItemUnitPrice = useCallback((productId: string, basePrice: number, additionalIngredients: SaleItemAdditionalIngredientInput[]) => {
    const options = additionalOptionsByProductId.get(productId) ?? new Map<string, { ingredientName: string; additionalPrice: number }>();
    const additionalPrice = normalizeAdditionalIngredients(additionalIngredients)
      .reduce((sum, entry) => sum + (options.get(entry.ingredientId)?.additionalPrice ?? 0) * entry.quantity, 0);
    return Number((basePrice + additionalPrice).toFixed(2));
  }, [additionalOptionsByProductId]);

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [selectedTableId, tables],
  );

  const surchargeBreakdown = useMemo(() => {
    if (!selectedTable) {
      return { toGo: 0, delivery: 0, total: 0 };
    }

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
        if (!grouped.has(category)) {
          grouped.set(category, []);
        }
        grouped.get(category)!.push(product);
      }
    }

    const result: { category: string | null; products: typeof products }[] = [];

    // Sort categories alphabetically
    const sortedCategories = Array.from(grouped.keys()).sort();
    sortedCategories.forEach((category) => {
      result.push({ category, products: grouped.get(category)! });
    });

    // Add uncategorized at the end
    if (uncategorized.length > 0) {
      result.push({ category: null, products: uncategorized });
    }

    return result;
  }, [products]);

  const addToCart = (productId: string, name: string, basePrice: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId
        && !item.observation
        && item.removedIngredientIds.length === 0
        && item.additionalIngredients.length === 0);
      if (existing) {
        return prev.map((item) => (item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, {
        id: createCartItemId(),
        productId,
        name,
        basePrice,
        unitPrice: Number(basePrice.toFixed(2)),
        quantity: 1,
        observation: null,
        removedIngredientIds: [],
        additionalIngredients: [],
      }];
    });
  };

  const decrementProductInCatalog = (productId: string) => {
    setCart((prev) => {
      const preferred = prev.find((item) => item.productId === productId
        && !item.observation
        && item.removedIngredientIds.length === 0
        && item.additionalIngredients.length === 0)
        ?? prev.find((item) => item.productId === productId);

      if (!preferred) {
        return prev;
      }

      return prev
        .map((item) => (item.id === preferred.id ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item))
        .filter((item) => item.quantity > 0);
    });
  };

  const getProductTotalQuantity = (productId: string): number => {
    return cart
      .filter((item) => item.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const updateQty = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === cartItemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const toggleRemovedIngredient = (cartItemId: string, ingredientId: string) => {
    setCart((prev) => {
      const next = prev.map((item) => {
        if (item.id !== cartItemId) {
          return item;
        }
        const hasIngredient = item.removedIngredientIds.includes(ingredientId);
        const removedIngredientIds = hasIngredient
          ? item.removedIngredientIds.filter((id) => id !== ingredientId)
          : [...item.removedIngredientIds, ingredientId];
        return {
          ...item,
          removedIngredientIds: normalizeIngredientIds(removedIngredientIds),
        };
      });
      return mergeCartLines(next);
    });
  };

  const updateAdditionalIngredientQty = (cartItemId: string, ingredientId: string, delta: number) => {
    setCart((prev) => {
      const next = prev.map((item) => {
        if (item.id !== cartItemId) {
          return item;
        }

        const currentQty = item.additionalIngredients.find((entry) => entry.ingredientId === ingredientId)?.quantity ?? 0;
        const nextQty = Math.max(0, currentQty + delta);
        const additionalIngredients = normalizeAdditionalIngredients(
          nextQty > 0
            ? [
              ...item.additionalIngredients.filter((entry) => entry.ingredientId !== ingredientId),
              { ingredientId, quantity: nextQty },
            ]
            : item.additionalIngredients.filter((entry) => entry.ingredientId !== ingredientId),
        );

        return {
          ...item,
          additionalIngredients,
          unitPrice: getCartItemUnitPrice(item.productId, item.basePrice, additionalIngredients),
        };
      });

      return mergeCartLines(next);
    });
  };

  const updateObservation = (cartItemId: string, observation: string) => {
    setCart((prev) => {
      const next = prev.map((item) => {
        if (item.id !== cartItemId) {
          return item;
        }

        const normalizedObservation = observation.trim();
        return {
          ...item,
          observation: normalizedObservation.length > 0 ? normalizedObservation : null,
        };
      });

      return mergeCartLines(next);
    });
  };

  const submitSale = async () => {
    if (!user || cart.length === 0 || !selectedTableId) {
      return;
    }

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
      await updateDraftOrder({
        orderId: editingOrderId,
        ...payload,
      });
    } else {
      await createSale(payload);
    }

    router.back();
  };

  const isWeb = Platform.OS === 'web';

  const renderProductsByCategory = () => (
    <View style={styles.categoriesContainer}>
      {productsByCategory.map(({ category, products: categoryProducts }) => (
        <View key={category || 'uncategorized'} style={styles.categorySection}>
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
                    styles.visualProductCard,
                    { borderColor: isSelected ? palette.tint : palette.border },
                    isSelected && { backgroundColor: `${palette.tint}15` },
                    editingOrderId && !canEditDraft ? styles.disabledTile : null,
                  ]}
                  onPress={() => addToCart(product.id, product.name, Number(product.price))}
                  disabled={Boolean(editingOrderId && !canEditDraft)}>
                  {/* Product Image */}
                  {product.imageUri ? (
                    <Image
                      source={{ uri: product.imageUri }}
                      style={styles.productImage}
                    />
                  ) : (
                    <View style={[styles.productImage, styles.placeholderImage]}>
                      <ThemedText style={styles.placeholderText}>📷</ThemedText>
                    </View>
                  )}

                  {/* Quantity Badge */}
                  {isSelected && (
                    <View style={[styles.quantityBadge, { backgroundColor: palette.tint }]}>
                      <ThemedText style={styles.quantityBadgeText}>{quantity}</ThemedText>
                    </View>
                  )}

                  {/* Quantity Controls in Top Right */}
                  {isSelected && (
                    <View style={styles.quantityControls}>
                      <Pressable
                        style={[styles.qtyControlButton, { backgroundColor: palette.tint }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          decrementProductInCatalog(product.id);
                        }}
                        disabled={Boolean(editingOrderId && !canEditDraft)}>
                        <ThemedText style={styles.qtyControlButtonText}>−</ThemedText>
                      </Pressable>
                      <Pressable
                        style={[styles.qtyControlButton, { backgroundColor: palette.tint }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          addToCart(product.id, product.name, Number(product.price));
                        }}
                        disabled={Boolean(editingOrderId && !canEditDraft)}>
                        <ThemedText style={styles.qtyControlButtonText}>+</ThemedText>
                      </Pressable>
                    </View>
                  )}

                  {/* Product Info */}
                  <View style={styles.productInfo}>
                    <ThemedText style={styles.visualProductName} numberOfLines={2}>
                      {product.name}
                    </ThemedText>
                    <ThemedText style={styles.visualProductPrice}>
                      ${Number(product.price).toFixed(2)}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );

  const renderCartSection = () => (
    <View style={styles.cartSection}>
      <ThemedText type="subtitle">{t('saleForm.cart')}</ThemedText>
      {editingOrderId ? <ThemedText style={styles.smallText}>{t('saleForm.status')}: {formatStatusLabel(selectedDraftSale?.status ?? 'draft')}</ThemedText> : null}

      <ThemedText style={styles.smallText}>{t('saleForm.tableAssignment')}</ThemedText>
      {tables.length === 0 ? <ThemedText style={styles.smallText}>{t('saleForm.noTables')}</ThemedText> : null}
      <View style={styles.tableRow}>
        {tables.map((table) => {
          const tableSurcharge = getTableSurcharge(table.table_type, toGoSurcharge, deliverySurcharge);
          return (
            <Pressable
              key={table.id}
              style={[
                styles.tableChip,
                { borderColor: selectedTableId === table.id ? palette.tint : palette.border },
                selectedTableId === table.id && { backgroundColor: palette.tint },
              ]}
              onPress={() => setSelectedTableId(table.id)}
              disabled={Boolean(editingOrderId && !canEditDraft)}>
              <ThemedText style={selectedTableId === table.id ? styles.selectedTableText : undefined}>
                {table.name}{tableSurcharge.total > 0 ? ` (+$${tableSurcharge.total.toFixed(2)})` : ''}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      {selectedTableId && surchargeBreakdown.total > 0 ? (
        <ThemedText style={styles.smallText}>
          {t('saleForm.selectedTableSurcharge')}: +${surchargeBreakdown.total.toFixed(2)}
        </ThemedText>
      ) : null}

      <ScrollView style={styles.cartItemsScroll} nestedScrollEnabled={true}>
        <View style={styles.cartItemsContainer}>
          {cart.length === 0 ? (
            <ThemedText style={styles.smallText}>{t('saleForm.noItems')}</ThemedText>
          ) : (
            cart.map((item) => (
              <View key={item.id} style={styles.compactCartRow}>
                <View style={styles.compactCartDetails}>
                  <ThemedText style={styles.compactProductName}>{item.name}</ThemedText>
                  <ThemedText style={styles.tinyText}>${item.unitPrice.toFixed(2)}</ThemedText>
                  {item.additionalIngredients.length > 0 ? (
                    <ThemedText style={styles.tinyText}>
                      {t('saleForm.additionalLabel')}: {item.additionalIngredients
                        .map((entry) => {
                          const option = additionalOptionsByProductId.get(item.productId)?.get(entry.ingredientId);
                          return option ? `${option.ingredientName} x${entry.quantity}` : null;
                        })
                        .filter((value): value is string => Boolean(value))
                        .join(', ')}
                    </ThemedText>
                  ) : null}
                  {item.removedIngredientIds.length > 0 ? (
                    <ThemedText style={styles.tinyText}>
                      {t('saleForm.withoutLabel')}: {item.removedIngredientIds
                        .map((ingredientId) => recipeByProductId.get(item.productId)?.find((x) => x.ingredientId === ingredientId)?.ingredientName)
                        .filter((name): name is string => Boolean(name))
                        .join(', ')}
                    </ThemedText>
                  ) : null}
                  <TextInput
                    value={item.observation ?? ''}
                    onChangeText={(value) => updateObservation(item.id, value)}
                    placeholder={t('saleForm.observationPlaceholder')}
                    editable={!(editingOrderId && !canEditDraft)}
                    style={[styles.observationInput, { borderColor: palette.border, color: palette.text }]}
                    placeholderTextColor={`${palette.text}99`}
                  />
                  {(recipeByProductId.get(item.productId)?.length ?? 0) > 0 ? (
                    <View style={styles.removedIngredientsRow}>
                      {(recipeByProductId.get(item.productId) ?? []).map((ingredient) => {
                        const removed = item.removedIngredientIds.includes(ingredient.ingredientId);
                        return (
                          <Pressable
                            key={`${item.id}-${ingredient.ingredientId}`}
                            onPress={() => toggleRemovedIngredient(item.id, ingredient.ingredientId)}
                            style={[
                              styles.ingredientToggleChip,
                              { borderColor: removed ? palette.tint : palette.border },
                              removed ? { backgroundColor: `${palette.tint}20` } : null,
                            ]}
                            disabled={Boolean(editingOrderId && !canEditDraft)}>
                            <ThemedText style={styles.ingredientToggleText}>
                              {removed ? t('saleForm.withoutChip') : t('saleForm.removeChip')} {ingredient.ingredientName}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                  {(products.find((product) => product.id === item.productId)?.additionalIngredients.length ?? 0) > 0 ? (
                    <View style={styles.removedIngredientsRow}>
                      {(products.find((product) => product.id === item.productId)?.additionalIngredients ?? []).map((additionalOption) => {
                        const selectedQty = item.additionalIngredients.find((entry) => entry.ingredientId === additionalOption.ingredientId)?.quantity ?? 0;
                        return (
                          <View
                            key={`${item.id}-additional-${additionalOption.ingredientId}`}
                            style={[
                              styles.additionalOptionRow,
                              { borderColor: selectedQty > 0 ? palette.tint : palette.border },
                            ]}>
                            <View style={styles.additionalOptionTextWrap}>
                              <ThemedText style={styles.ingredientToggleText}>{additionalOption.ingredientName}</ThemedText>
                              <ThemedText style={styles.tinyText}>+${Number(additionalOption.additionalPrice).toFixed(2)}</ThemedText>
                            </View>
                            <View style={styles.compactQtyControl}>
                              <Pressable
                                style={[styles.compactQtyButton, { borderColor: palette.border }]}
                                onPress={() => updateAdditionalIngredientQty(item.id, additionalOption.ingredientId, -1)}
                                disabled={Boolean(editingOrderId && !canEditDraft)}>
                                <ThemedText style={styles.tinyText}>−</ThemedText>
                              </Pressable>
                              <ThemedText style={styles.tinyText}>{selectedQty}</ThemedText>
                              <Pressable
                                style={[styles.compactQtyButton, { borderColor: palette.border }]}
                                onPress={() => updateAdditionalIngredientQty(item.id, additionalOption.ingredientId, 1)}
                                disabled={Boolean(editingOrderId && !canEditDraft)}>
                                <ThemedText style={styles.tinyText}>+</ThemedText>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
                <View style={styles.compactQtyControl}>
                  <Pressable
                    style={[styles.compactQtyButton, { borderColor: palette.border }]}
                    onPress={() => updateQty(item.id, -1)}
                    disabled={Boolean(editingOrderId && !canEditDraft)}>
                    <ThemedText style={styles.tinyText}>−</ThemedText>
                  </Pressable>
                  <ThemedText style={styles.tinyText}>{item.quantity}</ThemedText>
                  <Pressable
                    style={[styles.compactQtyButton, { borderColor: palette.border }]}
                    onPress={() => updateQty(item.id, 1)}
                    disabled={Boolean(editingOrderId && !canEditDraft)}>
                    <ThemedText style={styles.tinyText}>+</ThemedText>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.selectorsRow}>
        <View style={styles.inlineSelect}>
          <ThemedText style={styles.inlineLabel}>{t('saleForm.globalDiscount')}</ThemedText>
          <ThemedSelect
            value={selectedGlobalDiscountId}
            onValueChange={(value) => {
              if (!editingOrderId || canEditDraft) {
                setSelectedGlobalDiscountId(value);
              }
            }}
            items={globalDiscountOptions}
            placeholder={t('saleForm.selectDiscount')}
          />
        </View>
      </View>

      <View style={styles.summaryBlock}>
        <View style={styles.summaryRow}>
          <ThemedText style={styles.tinyText}>{t('sales.pricing.subtotal')}:</ThemedText>
          <ThemedText style={styles.tinyText}>${pricing.subtotal.toFixed(2)}</ThemedText>
        </View>
        <View style={styles.summaryRow}>
          <ThemedText style={styles.tinyText}>{t('sales.pricing.itemDiscounts')}:</ThemedText>
          <ThemedText style={styles.tinyText}>-${pricing.itemDiscountTotal.toFixed(2)}</ThemedText>
        </View>
        <View style={styles.summaryRow}>
          <ThemedText style={styles.tinyText}>{t('sales.pricing.globalDiscount')}:</ThemedText>
          <ThemedText style={styles.tinyText}>-${pricing.globalDiscountAmount.toFixed(2)}</ThemedText>
        </View>
        {surchargeBreakdown.toGo > 0 ? (
          <View style={styles.summaryRow}>
            <ThemedText style={styles.tinyText}>{t('sales.surcharge.toGo')}:</ThemedText>
            <ThemedText style={styles.tinyText}>+${surchargeBreakdown.toGo.toFixed(2)}</ThemedText>
          </View>
        ) : null}
        {surchargeBreakdown.delivery > 0 ? (
          <View style={styles.summaryRow}>
            <ThemedText style={styles.tinyText}>{t('sales.surcharge.delivery')}:</ThemedText>
            <ThemedText style={styles.tinyText}>+${surchargeBreakdown.delivery.toFixed(2)}</ThemedText>
          </View>
        ) : null}
        <View style={[styles.summaryRow, styles.totalRow]}>
          <ThemedText type="defaultSemiBold">{t('sales.total')}:</ThemedText>
          <ThemedText type="defaultSemiBold">${finalTotal.toFixed(2)}</ThemedText>
        </View>
      </View>

      {!selectedTableId ? <ThemedText style={styles.smallText}>{t('saleForm.selectTablePrompt')}</ThemedText> : null}
      {editingOrderId && !canEditDraft ? <ThemedText style={styles.smallText}>{t('saleForm.orderNotEditable')}</ThemedText> : null}
      <View style={styles.compactActionsRow}>
        <ThemedButton
          style={styles.compactPrimaryButton}
          label={editingOrderId ? t('common.saveChanges') : t('saleForm.openDraft')}
          onPress={submitSale}
          disabled={!selectedTableId || cart.length === 0 || Boolean(editingOrderId && !canEditDraft)}
        />
        <ThemedButton variant="secondary" style={styles.compactSecondaryButton} label={t('saleForm.discard')} onPress={() => setCart([])} disabled={Boolean(editingOrderId && !canEditDraft)} />
        <ThemedButton variant="secondary" style={styles.compactSecondaryButton} label={t('common.back')} onPress={() => router.back()} />
      </View>
    </View>
  );

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Web layout: 2 columns (products 2/3, cart 1/3)
  if (isWeb) {
    return (
      <View style={styles.webRoot}>
        <View style={styles.webHeader}>
          <ThemedText type="title">{editingOrderId ? t('saleForm.title.edit') : t('saleForm.title.new')}</ThemedText>
          <ThemedText>
            {editingOrderId
              ? t('saleForm.subtitle.edit')
              : t('saleForm.subtitle.new')}
          </ThemedText>
          {editingOrderId && loadingDraft ? <ThemedText style={styles.smallText}>{t('saleForm.loadingDraft')}</ThemedText> : null}
        </View>

        <View style={styles.webContent}>
          {/* Left column: Products (2/3) */}
          <View style={styles.productsColumn}>
            <ThemedCard style={styles.productsCard}>
              <ThemedText type="subtitle">{t('saleForm.catalog')}</ThemedText>
              <ScrollView style={styles.productsScroll} showsVerticalScrollIndicator={false}>
                {renderProductsByCategory()}
              </ScrollView>
              {editingOrderId && !canEditDraft ? (
                <ThemedText style={styles.smallText}>{t('saleForm.notEditable')}</ThemedText>
              ) : null}
            </ThemedCard>
          </View>

          {/* Right column: Cart (1/3) */}
          <View style={styles.cartColumn}>
            <ThemedCard style={styles.cartCard}>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.cartScroll}>
                {renderCartSection()}
              </ScrollView>
            </ThemedCard>
          </View>
        </View>
      </View>
    );
  }

  // Mobile layout: two-step flow (products -> cart)
  if (mobileStep === 'cart') {
    return (
      <View style={styles.mobileRoot}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.mobileHeader}>
            <Pressable onPress={() => setMobileStep('products')} style={styles.backRow}>
              <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>← {t('saleForm.catalog')}</ThemedText>
            </Pressable>
            <ThemedText type="title">{editingOrderId ? t('saleForm.title.edit') : t('saleForm.cart')}</ThemedText>
          </View>
          {editingOrderId && loadingDraft ? <ThemedText style={styles.smallText}>{t('saleForm.loadingDraft')}</ThemedText> : null}

          <ThemedCard style={styles.card}>
            {renderCartSection()}
          </ThemedCard>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.mobileRoot}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title">{editingOrderId ? t('saleForm.title.edit') : t('saleForm.title.new')}</ThemedText>
        <ThemedText>
          {editingOrderId
            ? t('saleForm.subtitle.edit')
            : t('saleForm.subtitle.new')}
        </ThemedText>
        {editingOrderId && loadingDraft ? <ThemedText style={styles.smallText}>{t('saleForm.loadingDraft')}</ThemedText> : null}

        {renderProductsByCategory()}

        {editingOrderId && !canEditDraft ? (
          <ThemedText style={styles.smallText}>{t('saleForm.notEditable')}</ThemedText>
        ) : null}
      </ScrollView>

      {/* Fixed bottom cart bar */}
      <View style={[styles.fixedBottomBar, { backgroundColor: palette.card, borderTopColor: palette.border }]}>
        <View style={styles.bottomBarInfo}>
          <ThemedText type="defaultSemiBold">
            {totalCartItems} {totalCartItems === 1 ? 'item' : 'items'}
          </ThemedText>
          <ThemedText style={styles.smallText}>
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
  /* Mobile & Shared */
  mobileRoot: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  mobileHeader: {
    gap: 4,
  },
  backRow: {
    paddingVertical: 4,
  },
  card: {
    gap: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  productTile: {
    borderWidth: 1,
    borderColor: '#BFA792',
    borderRadius: 10,
    padding: 10,
    minWidth: '47%',
    gap: 4,
  },
  disabledTile: {
    opacity: 0.55,
  },
  productName: {
    fontWeight: '700',
  },
  smallText: {
    opacity: 0.9,
    fontSize: 13,
  },
  tinyText: {
    opacity: 0.85,
    fontSize: 11,
  },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  compactCartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  cartDetails: {
    flex: 1,
    gap: 6,
  },
  compactCartDetails: {
    flex: 1,
    gap: 2,
  },
  compactProductName: {
    fontWeight: '600',
    fontSize: 12,
  },
  observationInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    marginTop: 4,
  },
  removedIngredientsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  ingredientToggleChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ingredientToggleText: {
    fontSize: 10,
    fontWeight: '500',
  },
  additionalOptionRow: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minWidth: 160,
  },
  additionalOptionTextWrap: {
    flex: 1,
    gap: 2,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactQtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qtyButton: {
    borderWidth: 1,
    borderColor: '#A98F79',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  compactQtyButton: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  compactActionsRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  tableRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tableChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  selectedTableText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryBlock: {
    gap: 2,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 10,
  },
  compactPrimaryButton: {
    flex: 1,
    paddingVertical: 8,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  compactSecondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  selectorsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    ...Platform.select({
      web: {},
      default: {
        flexDirection: 'column',
        alignItems: 'stretch',
      },
    }),
  },
  inlineSelect: {
    flex: 1,
    gap: 2,
  },
  inlineLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.8,
  },

  /* Fixed bottom cart bar (mobile) */
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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

  /* Web layout */
  webRoot: {
    flex: 1,
  },
  webHeader: {
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  webContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  productsColumn: {
    flex: 2,
    minWidth: 0,
  },
  productsCard: {
    flex: 1,
    gap: 10,
  },
  productsScroll: {
    flex: 1,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    ...Platform.select({
      web: {},
      default: {
        flexDirection: 'column',
      },
    }),
  },
  categorySection: {
    gap: 8,
    flex: 0,
    flexBasis: '48%',
    ...Platform.select({
      web: {},
      default: {
        flexBasis: 'auto',
      },
    }),
  },
  categoryTitle: {
    marginBottom: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cartColumn: {
    flex: 1,
    minWidth: 0,
  },
  cartCard: {
    flex: 1,
    gap: 10,
  },
  cartScroll: {
    flex: 1,
  },
  cartSection: {
    gap: 8,
    flex: 1,
  },
  cartItemsScroll: {
    maxHeight: 280,
    marginVertical: 4,
  },
  cartItemsContainer: {
    gap: 0,
  },

  /* Visual Product Card Styles */
  visualProductCard: {
    borderWidth: 1.5,
    borderRadius: 8,
    overflow: 'hidden',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    flex: 0,
    flexBasis: '23%',
    ...Platform.select({
      web: {},
      default: {
        flexBasis: '30%',
      },
    }),
  },
  productImage: {
    width: '100%',
    height: '70%',
    backgroundColor: '#F5F5F5',
    resizeMode: 'cover',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8E8E8',
  },
  placeholderText: {
    fontSize: 14,
  },
  productInfo: {
    flex: 1,
    paddingHorizontal: 2,
    paddingVertical: 1,
    justifyContent: 'flex-end',
  },
  visualProductName: {
    fontWeight: '600',
    fontSize: 10,
    marginBottom: 0,
    lineHeight: 12,
    ...Platform.select({
      web: { lineHeight: 11 },
      default: { fontSize: 11 },
    }),
  },
  visualProductPrice: {
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 13,
    ...Platform.select({
      web: { fontSize: 11, lineHeight: 11 },
    }),
  },
  quantityBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
    ...Platform.select({
      web: {
        borderRadius: 6,
        paddingHorizontal: 3,
        paddingVertical: 1,
        minWidth: 20,
      },
    }),
  },
  quantityBadgeText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 10,
    ...Platform.select({
      web: { fontSize: 9 },
    }),
  },
  quantityControls: {
    position: 'absolute',
    top: 3,
    right: 3,
    flexDirection: 'row',
    gap: 3,
    ...Platform.select({
      web: { gap: 2 },
    }),
  },
  qtyControlButton: {
    width: 22,
    height: 22,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        width: 18,
        height: 18,
        borderRadius: 3,
      },
    }),
  },
  qtyControlButtonText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 12,
    ...Platform.select({
      web: { fontSize: 10 },
    }),
  },
});
