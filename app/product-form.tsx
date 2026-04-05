import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DateInput } from '@/components/ui/date-input';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';
import { useSalesStore } from '@/stores/sales';
import type { ProductRecipeInput } from '@/types/products';
import type { Discount } from '@/types/types';

const formatDateInput = (unix: number | null): string => {
  if (!unix) return '';
  const date = new Date(unix * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function normalizeParam(value?: string | string[]) {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default function ProductFormScreen() {
  const palette = useAppColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const productId = normalizeParam(params.id);

  const {
    categories,
    products,
    productIngredients,
    hydrate,
    createProduct,
    updateProduct,
    setProductIngredient,
    removeProductIngredient,
  } = useProductsStore();
  const { discounts, hydrateDiscounts, createDiscount, updateDiscount, deleteDiscount } = useSalesStore();
  const { ingredients, hydrate: hydrateInventory } = useInventoryStore();

  const [message, setMessage] = useState<string>('');
  const [discountName, setDiscountName] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('0');
  const [startsAt, setStartsAt] = useState<number | null>(() => Math.floor(Date.now() / 1000));
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [productForm, setProductForm] = useState({
    id: null as string | null,
    name: '',
    categoryId: null as string | null,
    price: '',
  });
  const [productRecipeItems, setProductRecipeItems] = useState<{ ingredientId: string; quantityUsed: string }[]>([]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([hydrate(), hydrateInventory(), hydrateDiscounts()]);
    }, [hydrate, hydrateInventory, hydrateDiscounts]),
  );

  useEffect(() => {
    if (!productId) {
      setProductForm({ id: null, name: '', categoryId: null, price: '' });
      setProductRecipeItems([]);
      return;
    }

    const product = products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    setProductForm({
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      price: String(product.price),
    });
    setProductRecipeItems([]);
  }, [productId, products]);

  const editingProductRecipes = useMemo(
    () => (productForm.id ? productIngredients.filter((link) => link.productId === productForm.id) : []),
    [productForm.id, productIngredients],
  );

  const productDiscounts = useMemo(
    () => (productForm.id ? discounts.filter((discount) => discount.scope === 'product' && discount.productId === productForm.id) : []),
    [discounts, productForm.id],
  );

  const addProductRecipeItem = (ingredientId: string = '', quantityUsed: string = '') => {
    setProductRecipeItems((items) => [...items, { ingredientId, quantityUsed }]);
  };

  const removeProductRecipeItem = (index: number) => {
    setProductRecipeItems((items) => items.filter((_, i) => i !== index));
  };

  const updateProductRecipeItem = (index: number, ingredientId?: string, quantityUsed?: string) => {
    setProductRecipeItems((items) =>
      items.map((item, i) =>
        i === index
          ? {
              ingredientId: ingredientId ?? item.ingredientId,
              quantityUsed: quantityUsed ?? item.quantityUsed,
            }
          : item,
      ),
    );
  };

  const submitProduct = async () => {
    const trimmedName = productForm.name.trim();
    const price = Number(productForm.price || '0');

    if (!trimmedName) {
      setMessage(t('productForm.error.nameRequired'));
      return;
    }

    if (price <= 0) {
      setMessage(t('productForm.error.pricePositive'));
      return;
    }

    if (!productForm.id && productRecipeItems.length === 0) {
      setMessage(t('productForm.error.recipeRequired'));
      return;
    }

    const invalidItems = productRecipeItems.filter((item) => !item.ingredientId || Number(item.quantityUsed || '0') <= 0);
    if (!productForm.id && invalidItems.length > 0) {
      setMessage(t('productForm.error.recipeItemInvalid'));
      return;
    }

    if (productForm.id) {
      await updateProduct({
        id: productForm.id,
        name: trimmedName,
        categoryId: productForm.categoryId,
        price,
      });
    } else {
      const recipe = productRecipeItems.map((item) => ({
        ingredientId: item.ingredientId,
        quantityUsed: Number(item.quantityUsed),
      })) as [ProductRecipeInput, ...ProductRecipeInput[]];

      await createProduct({
        name: trimmedName,
        categoryId: productForm.categoryId ?? undefined,
        price,
        recipe,
      });
    }

    router.back();
  };

  const saveProductRecipe = async () => {
    const currentProductId = productForm.id;

    if (!currentProductId) {
      setMessage(t('productForm.error.saveFirst'));
      return;
    }

    for (const item of productRecipeItems) {
      if (!item.ingredientId || Number(item.quantityUsed || '0') <= 0) {
        setMessage(t('productForm.error.recipeItemInvalid'));
        return;
      }

      await setProductIngredient({
        productId: currentProductId,
        ingredientId: item.ingredientId,
        quantityUsed: Number(item.quantityUsed),
      });
    }

    setProductRecipeItems([]);
    setMessage(t('productForm.recipeAdded', { count: productRecipeItems.length }));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{productForm.id ? t('productForm.title.edit') : t('productForm.title.create')}</ThemedText>

      {message ? (
        <ThemedCard style={styles.messageCard}>
          <ThemedText>{message}</ThemedText>
        </ThemedCard>
      ) : null}

      <ThemedCard style={styles.card}>
        <ThemedInput
          placeholder={t('productForm.name')}
          value={productForm.name}
          onChangeText={(value) => setProductForm((current) => ({ ...current, name: value }))}
          style={styles.input}
        />
        <ThemedInput
          placeholder={t('productForm.price')}
          keyboardType="decimal-pad"
          value={productForm.price}
          onChangeText={(value) => setProductForm((current) => ({ ...current, price: value }))}
          style={styles.input}
        />
        <ThemedText style={styles.smallText}>{t('productForm.category')}</ThemedText>
        <View style={styles.chipRow}>
          <ThemedChip
            style={styles.chip}
            label={t('productForm.none')}
            tone="accent"
            active={productForm.categoryId === null}
            onPress={() => setProductForm((current) => ({ ...current, categoryId: null }))}
          />
          {categories.map((category) => (
            <ThemedChip
              key={category.id}
              style={styles.chip}
              label={category.name}
              tone="accent"
              active={productForm.categoryId === category.id}
              onPress={() => setProductForm((current) => ({ ...current, categoryId: category.id }))}
            />
          ))}
        </View>

        <View style={styles.actionsRow}>
          <ThemedButton style={styles.primaryButton} label={productForm.id ? t('common.saveChanges') : t('productForm.title.create')} onPress={submitProduct} />
          <ThemedButton variant="secondary" style={styles.secondaryButton} label={t('common.back')} onPress={() => router.back()} />
        </View>
      </ThemedCard>

      {!productForm.id ? (
        <ThemedCard style={styles.card}>
          <ThemedText style={styles.label}>{t('productForm.recipeRequiredTitle')}</ThemedText>
          <ThemedText style={styles.smallText}>{t('productForm.recipeRequiredHelp')}</ThemedText>
          {productRecipeItems.map((item, index) => {
            const addedIngredientIds = productRecipeItems.map((i) => i.ingredientId).filter((id) => id);
            const availableIngredients = ingredients.filter((ing) => !addedIngredientIds.includes(ing.id) || ing.id === item.ingredientId);
            return (
              <View key={index} style={styles.recipeControlsRow}>
                <View style={styles.recipeSelectWrapper}>
                  <ThemedSelect
                    placeholder={t('productForm.selectIngredient')}
                    value={item.ingredientId}
                    items={availableIngredients.map((ing) => ({ label: ing.name, value: ing.id }))}
                    onValueChange={(value) => updateProductRecipeItem(index, value, undefined)}
                  />
                </View>
                <View style={styles.recipeInputWrapper}>
                  <ThemedInput
                    placeholder={t('common.qtyShort')}
                    keyboardType="decimal-pad"
                    value={item.quantityUsed}
                    onChangeText={(value) => updateProductRecipeItem(index, undefined, value)}
                    style={styles.compactInput}
                  />
                </View>
                <ThemedButton variant="secondary" style={styles.secondaryButton} icon="trash.fill" onPress={() => removeProductRecipeItem(index)} />
              </View>
            );
          })}
          <ThemedButton variant="secondary" style={styles.primaryButton} label={t('productForm.addIngredient')} onPress={() => addProductRecipeItem('', '')} />
        </ThemedCard>
      ) : (
        <ThemedCard style={styles.card}>
          <ThemedText style={styles.label}>{t('productForm.recipeTitle')}</ThemedText>
          {editingProductRecipes.length === 0 ? (
            <ThemedText style={styles.smallText}>{t('productForm.noDirectIngredients')}</ThemedText>
          ) : (
            editingProductRecipes.map((link) => (
              <View key={link.id} style={[styles.listItem, { borderColor: palette.border }]}>
                <View style={styles.listTextWrap}>
                  <ThemedText type="defaultSemiBold">{link.ingredientName}</ThemedText>
                  <ThemedText style={styles.smallText}>{link.quantityUsed} {t('productForm.perUnit')}</ThemedText>
                </View>
                <ThemedButton
                  variant="secondary"
                  style={styles.secondaryButton}
                  icon="trash.fill"
                  onPress={async () => {
                    if (editingProductRecipes.length <= 1) {
                      setMessage(t('productForm.error.keepOneIngredient'));
                      return;
                    }
                    await removeProductIngredient({ productId: link.productId, ingredientId: link.ingredientId });
                    setMessage(t('productForm.recipeLinkRemoved'));
                  }}
                />
              </View>
            ))
          )}

          <ThemedText style={styles.label}>{t('productForm.addRecipeIngredients')}</ThemedText>
          {productRecipeItems.length === 0 ? (
            <ThemedText style={styles.smallText}>{t('productForm.addRecipeHelp')}</ThemedText>
          ) : (
            productRecipeItems.map((item, index) => {
              const addedIngredientIds = productRecipeItems.map((i) => i.ingredientId).filter((id) => id);
              const availableIngredients = ingredients.filter((ing) => !addedIngredientIds.includes(ing.id) || ing.id === item.ingredientId);
              return (
                <View key={index} style={styles.recipeControlsRow}>
                  <View style={styles.recipeSelectWrapper}>
                    <ThemedSelect
                      placeholder={t('productForm.selectIngredient')}
                      value={item.ingredientId}
                      items={availableIngredients.map((ing) => ({ label: ing.name, value: ing.id }))}
                      onValueChange={(value) => updateProductRecipeItem(index, value, undefined)}
                    />
                  </View>
                  <View style={styles.recipeInputWrapper}>
                    <ThemedInput
                      placeholder={t('common.qtyShort')}
                      keyboardType="decimal-pad"
                      value={item.quantityUsed}
                      onChangeText={(value) => updateProductRecipeItem(index, undefined, value)}
                      style={styles.compactInput}
                    />
                  </View>
                  <ThemedButton variant="secondary" style={styles.secondaryButton} icon="trash.fill" onPress={() => removeProductRecipeItem(index)} />
                </View>
              );
            })
          )}

          <ThemedButton variant="secondary" style={styles.primaryButton} label={t('productForm.addIngredient')} onPress={() => addProductRecipeItem('', '')} />
          <ThemedButton style={styles.primaryButton} label={t('productForm.saveRecipeItems')} onPress={saveProductRecipe} />
        </ThemedCard>
      )}

      {productForm.id ? (
        <ThemedCard style={styles.card}>
          <ThemedText style={styles.label}>{t('productForm.discounts.title')}</ThemedText>
          <ThemedText style={styles.smallText}>{t('productForm.discounts.subtitle')}</ThemedText>
          <ThemedInput placeholder={t('productForm.discounts.name')} value={discountName} onChangeText={setDiscountName} />
          <ThemedSelect
            value={discountType}
            onValueChange={(value) => setDiscountType(value as 'percentage' | 'fixed')}
            items={[{ label: t('productForm.discounts.percentage'), value: 'percentage' }, { label: t('productForm.discounts.fixed'), value: 'fixed' }]}
          />
          <View style={styles.recipeControlsRow}>
            <View style={styles.recipeInputWrapper}>
              <ThemedInput placeholder={t('productForm.discounts.value')} keyboardType="decimal-pad" value={discountValue} onChangeText={setDiscountValue} />
            </View>
            <View style={styles.recipeSelectWrapper}>
              <DateInput value={startsAt} onChangeValue={setStartsAt} placeholder={t('productForm.discounts.startDate')} />
            </View>
            <View style={styles.recipeSelectWrapper}>
              <DateInput value={endsAt} onChangeValue={setEndsAt} endOfDay placeholder={t('productForm.discounts.endDate')} />
            </View>
          </View>
          <ThemedButton
            style={styles.primaryButton}
            label={t('productForm.discounts.add')}
            onPress={async () => {
              if (!productForm.id) return;
              const value = Number(discountValue);
              if (!discountName.trim() || !startsAt || !Number.isFinite(value) || value <= 0) {
                setMessage(t('productForm.discounts.invalid'));
                return;
              }
              await createDiscount({
                name: discountName.trim(),
                scope: 'product',
                productId: productForm.id,
                type: discountType,
                value,
                startsAt,
                endsAt,
                isActive: true,
              });
              setDiscountName('');
              setDiscountType('percentage');
              setDiscountValue('0');
              setStartsAt(Math.floor(Date.now() / 1000));
              setEndsAt(null);
              setMessage(t('productForm.discounts.created'));
            }}
          />

          {productDiscounts.map((discount: Discount) => (
            <View key={discount.id} style={[styles.listItem, { borderColor: palette.border }]}>
              <View style={styles.listTextWrap}>
                <ThemedText type="defaultSemiBold">{discount.name}</ThemedText>
                <ThemedText style={styles.smallText}>
                  {discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value.toFixed(2)}`} · {formatDateInput(discount.startsAt)} {t('productForm.discounts.to')} {discount.endsAt ? formatDateInput(discount.endsAt) : t('productForm.discounts.open')} · {discount.isActive ? t('productForm.discounts.active') : t('productForm.discounts.inactive')}
                </ThemedText>
              </View>
              <View style={styles.actionsRow}>
                <ThemedButton
                  variant="secondary"
                  style={styles.secondaryButton}
                  label={discount.isActive ? t('productForm.discounts.deactivate') : t('productForm.discounts.activate')}
                  onPress={() => {
                    void updateDiscount({
                      id: discount.id,
                      name: discount.name,
                      scope: 'product',
                      productId: discount.productId,
                      type: discount.type,
                      value: discount.value,
                      startsAt: discount.startsAt,
                      endsAt: discount.endsAt,
                      isActive: !discount.isActive,
                    });
                  }}
                />
                <ThemedButton variant="secondary" style={styles.secondaryButton} label={t('productForm.discounts.delete')} onPress={() => void deleteDiscount(discount.id)} />
              </View>
            </View>
          ))}
        </ThemedCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  messageCard: {
    padding: 12,
  },
  card: {
    gap: 10,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#C5AA90',
    borderRadius: 10,
    padding: 10,
  },
  listTextWrap: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontWeight: '700',
  },
  smallText: {
    opacity: 0.9,
    fontSize: 13,
    lineHeight: 18,
  },
  recipeControlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  recipeSelectWrapper: {
    flex: 1.2,
  },
  recipeInputWrapper: {
    flex: 0.8,
  },
  compactInput: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
