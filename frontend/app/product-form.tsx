import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

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
import type { ProductAdditionalIngredientInput, ProductRecipeInput } from '@/types/products';
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

type PendingIngredientSelection = {
  scope: 'recipe' | 'additional';
  index: number;
  knownIngredientIds: string[];
};

type PendingCategorySelection = {
  knownCategoryIds: string[];
};

export default function ProductFormScreen() {
  const palette = useAppColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const productId = normalizeParam(params.id);

  const {
    categories,
    products,
    productIngredients,
    productAdditionalIngredients,
    hydrate,
    createProduct,
    updateProduct,
    setProductIngredient,
    removeProductIngredient,
    setProductAdditionalIngredient,
    removeProductAdditionalIngredient,
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
    imageUri: null as string | null,
  });
  const [productRecipeItems, setProductRecipeItems] = useState<{ ingredientId: string; quantityUsed: string }[]>([]);
  const [productAdditionalItems, setProductAdditionalItems] = useState<{ ingredientId: string; quantityUsed: string; additionalPrice: string }[]>([]);
  const [pendingIngredientSelection, setPendingIngredientSelection] = useState<PendingIngredientSelection | null>(null);
  const [pendingCategorySelection, setPendingCategorySelection] = useState<PendingCategorySelection | null>(null);
  const [initializedProductId, setInitializedProductId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([hydrate(), hydrateInventory(), hydrateDiscounts()]);
    }, [hydrate, hydrateInventory, hydrateDiscounts]),
  );

  useEffect(() => {
    if (!productId) {
      if (initializedProductId !== null) {
        setProductForm({ id: null, name: '', categoryId: null, price: '', imageUri: null });
        setProductRecipeItems([]);
        setProductAdditionalItems([]);
        setInitializedProductId(null);
      }
      return;
    }

    if (initializedProductId === productId) {
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
      imageUri: product.imageUri ?? null,
    });
    setProductRecipeItems([]);
    setProductAdditionalItems([]);
    setInitializedProductId(productId);
  }, [initializedProductId, productId, products]);

  const editingProductRecipes = useMemo(
    () => (productForm.id ? productIngredients.filter((link) => link.productId === productForm.id) : []),
    [productForm.id, productIngredients],
  );

  const productDiscounts = useMemo(
    () => (productForm.id ? discounts.filter((discount) => discount.scope === 'product' && discount.productId === productForm.id) : []),
    [discounts, productForm.id],
  );

  const editingProductAdditionalIngredients = useMemo(
    () => (productForm.id ? productAdditionalIngredients.filter((link) => link.productId === productForm.id) : []),
    [productAdditionalIngredients, productForm.id],
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

  const addProductAdditionalItem = (ingredientId: string = '', quantityUsed: string = '', additionalPrice: string = '') => {
    setProductAdditionalItems((items) => [...items, { ingredientId, quantityUsed, additionalPrice }]);
  };

  const startCreateIngredientForItem = (scope: 'recipe' | 'additional', index: number) => {
    setPendingIngredientSelection({
      scope,
      index,
      knownIngredientIds: ingredients.map((ingredient) => ingredient.id),
    });
    router.push('/ingredient-form');
  };

  const startCreateCategory = () => {
    setPendingCategorySelection({ knownCategoryIds: categories.map((category) => category.id) });
    router.push('/category-form');
  };

  const removeProductAdditionalItem = (index: number) => {
    setProductAdditionalItems((items) => items.filter((_, i) => i !== index));
  };

  const updateProductAdditionalItem = (index: number, ingredientId?: string, quantityUsed?: string, additionalPrice?: string) => {
    setProductAdditionalItems((items) =>
      items.map((item, i) =>
        i === index
          ? {
            ingredientId: ingredientId ?? item.ingredientId,
            quantityUsed: quantityUsed ?? item.quantityUsed,
            additionalPrice: additionalPrice ?? item.additionalPrice,
          }
          : item,
      ),
    );
  };

  const pickProductImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProductForm((current) => ({ ...current, imageUri: result.assets[0].uri }));
    }
  };

  const removeProductImage = () => {
    setProductForm((current) => ({ ...current, imageUri: null }));
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

    const invalidAdditionalItems = productAdditionalItems.filter(
      (item) => !item.ingredientId || Number(item.quantityUsed || '0') <= 0 || Number(item.additionalPrice || '0') < 0,
    );
    if (invalidAdditionalItems.length > 0) {
      setMessage(t('productForm.error.additionalItemInvalid'));
      return;
    }

    if (productForm.id) {
      await updateProduct({
        id: productForm.id,
        name: trimmedName,
        categoryId: productForm.categoryId,
        price,
        imageUri: productForm.imageUri,
      });
    } else {
      const recipe = productRecipeItems.map((item) => ({
        ingredientId: item.ingredientId,
        quantityUsed: Number(item.quantityUsed),
      })) as [ProductRecipeInput, ...ProductRecipeInput[]];
      const additionalIngredients = productAdditionalItems
        .map((item) => ({
          ingredientId: item.ingredientId,
          quantityUsed: Number(item.quantityUsed),
          additionalPrice: Number(item.additionalPrice || '0'),
        }))
        .filter((item) => item.ingredientId && item.quantityUsed > 0 && item.additionalPrice >= 0) as ProductAdditionalIngredientInput[];

      await createProduct({
        name: trimmedName,
        categoryId: productForm.categoryId ?? undefined,
        price,
        imageUri: productForm.imageUri ?? undefined,
        recipe,
        additionalIngredients,
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

  const saveProductAdditionalIngredients = async () => {
    const currentProductId = productForm.id;

    if (!currentProductId) {
      setMessage(t('productForm.error.saveFirst'));
      return;
    }

    for (const item of productAdditionalItems) {
      if (!item.ingredientId || Number(item.quantityUsed || '0') <= 0 || Number(item.additionalPrice || '0') < 0) {
        setMessage(t('productForm.error.additionalItemInvalid'));
        return;
      }

      await setProductAdditionalIngredient({
        productId: currentProductId,
        ingredientId: item.ingredientId,
        quantityUsed: Number(item.quantityUsed),
        additionalPrice: Number(item.additionalPrice),
      });
    }

    setProductAdditionalItems([]);
    setMessage(t('productForm.additionalAdded', { count: productAdditionalItems.length }));
  };

  useEffect(() => {
    if (!pendingIngredientSelection) {
      return;
    }

    const createdIngredient = ingredients.find((ingredient) => !pendingIngredientSelection.knownIngredientIds.includes(ingredient.id));
    if (!createdIngredient) {
      return;
    }

    if (pendingIngredientSelection.scope === 'recipe') {
      updateProductRecipeItem(pendingIngredientSelection.index, createdIngredient.id, undefined);
    } else {
      updateProductAdditionalItem(pendingIngredientSelection.index, createdIngredient.id, undefined, undefined);
    }

    setPendingIngredientSelection(null);
  }, [ingredients, pendingIngredientSelection]);

  useEffect(() => {
    if (!pendingCategorySelection) {
      return;
    }

    const createdCategory = categories.find((category) => !pendingCategorySelection.knownCategoryIds.includes(category.id));
    if (!createdCategory) {
      return;
    }

    setProductForm((current) => ({ ...current, categoryId: createdCategory.id }));
    setPendingCategorySelection(null);
  }, [categories, pendingCategorySelection]);

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

        {/* Product Image Section */}
        <ThemedText style={styles.label}>{t('productForm.image')}</ThemedText>
        {productForm.imageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: productForm.imageUri }}
              style={styles.imagePreview}
            />
            <ThemedButton
              variant="secondary"
              style={styles.removeImageButton}
              label={t('productForm.removeImage')}
              onPress={removeProductImage}
            />
          </View>
        ) : (
          <ThemedButton
            style={styles.pickImageButton}
            label={t('productForm.pickImage')}
            onPress={pickProductImage}
          />
        )}

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
          <ThemedButton
            variant="secondary"
            style={styles.secondaryButton}
            label={t('productForm.addCategory')}
            onPress={startCreateCategory}
          />
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
                    onAddNewPress={() => startCreateIngredientForItem('recipe', index)}
                    addNewLabel={t('products.ingredients.add')}
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

          <ThemedText style={styles.label}>{t('productForm.additionalTitle')}</ThemedText>
          <ThemedText style={styles.smallText}>{t('productForm.additionalHelp')}</ThemedText>
          {productAdditionalItems.map((item, index) => {
            const addedIngredientIds = productAdditionalItems.map((i) => i.ingredientId).filter((id) => id);
            const availableIngredients = ingredients.filter((ing) => !addedIngredientIds.includes(ing.id) || ing.id === item.ingredientId);
            return (
              <View key={`new-additional-${index}`} style={styles.recipeControlsRow}>
                <View style={styles.recipeSelectWrapper}>
                  <ThemedSelect
                    placeholder={t('productForm.selectIngredient')}
                    value={item.ingredientId}
                    items={availableIngredients.map((ing) => ({ label: ing.name, value: ing.id }))}
                    onValueChange={(value) => updateProductAdditionalItem(index, value, undefined, undefined)}
                    onAddNewPress={() => startCreateIngredientForItem('additional', index)}
                    addNewLabel={t('products.ingredients.add')}
                  />
                </View>
                <View style={styles.recipeInputWrapper}>
                  <ThemedInput
                    placeholder={t('common.qtyShort')}
                    keyboardType="decimal-pad"
                    value={item.quantityUsed}
                    onChangeText={(value) => updateProductAdditionalItem(index, undefined, value, undefined)}
                    style={styles.compactInput}
                  />
                </View>
                <View style={styles.recipeInputWrapper}>
                  <ThemedInput
                    placeholder={t('productForm.additionalPrice')}
                    keyboardType="decimal-pad"
                    value={item.additionalPrice}
                    onChangeText={(value) => updateProductAdditionalItem(index, undefined, undefined, value)}
                    style={styles.compactInput}
                  />
                </View>
                <ThemedButton variant="secondary" style={styles.secondaryButton} icon="trash.fill" onPress={() => removeProductAdditionalItem(index)} />
              </View>
            );
          })}
          <ThemedButton variant="secondary" style={styles.primaryButton} label={t('productForm.addAdditionalIngredient')} onPress={() => addProductAdditionalItem('', '', '')} />
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
                      onAddNewPress={() => startCreateIngredientForItem('recipe', index)}
                      addNewLabel={t('products.ingredients.add')}
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

          <ThemedText style={styles.label}>{t('productForm.additionalTitle')}</ThemedText>
          {editingProductAdditionalIngredients.length === 0 ? (
            <ThemedText style={styles.smallText}>{t('productForm.noAdditionalIngredients')}</ThemedText>
          ) : (
            editingProductAdditionalIngredients.map((link) => (
              <View key={link.id} style={[styles.listItem, { borderColor: palette.border }]}>
                <View style={styles.listTextWrap}>
                  <ThemedText type="defaultSemiBold">{link.ingredientName}</ThemedText>
                  <ThemedText style={styles.smallText}>
                    {link.quantityUsed} {t('productForm.perUnit')} · +${link.additionalPrice.toFixed(2)}
                  </ThemedText>
                </View>
                <ThemedButton
                  variant="secondary"
                  style={styles.secondaryButton}
                  icon="trash.fill"
                  onPress={async () => {
                    await removeProductAdditionalIngredient({ productId: link.productId, ingredientId: link.ingredientId });
                    setMessage(t('productForm.additionalLinkRemoved'));
                  }}
                />
              </View>
            ))
          )}

          <ThemedText style={styles.label}>{t('productForm.addAdditionalIngredients')}</ThemedText>
          {productAdditionalItems.length === 0 ? (
            <ThemedText style={styles.smallText}>{t('productForm.addAdditionalHelp')}</ThemedText>
          ) : (
            productAdditionalItems.map((item, index) => {
              const addedIngredientIds = productAdditionalItems.map((i) => i.ingredientId).filter((id) => id);
              const availableIngredients = ingredients.filter((ing) => !addedIngredientIds.includes(ing.id) || ing.id === item.ingredientId);
              return (
                <View key={`edit-additional-${index}`} style={styles.recipeControlsRow}>
                  <View style={styles.recipeSelectWrapper}>
                    <ThemedSelect
                      placeholder={t('productForm.selectIngredient')}
                      value={item.ingredientId}
                      items={availableIngredients.map((ing) => ({ label: ing.name, value: ing.id }))}
                      onValueChange={(value) => updateProductAdditionalItem(index, value, undefined, undefined)}
                      onAddNewPress={() => startCreateIngredientForItem('additional', index)}
                      addNewLabel={t('products.ingredients.add')}
                    />
                  </View>
                  <View style={styles.recipeInputWrapper}>
                    <ThemedInput
                      placeholder={t('common.qtyShort')}
                      keyboardType="decimal-pad"
                      value={item.quantityUsed}
                      onChangeText={(value) => updateProductAdditionalItem(index, undefined, value, undefined)}
                      style={styles.compactInput}
                    />
                  </View>
                  <View style={styles.recipeInputWrapper}>
                    <ThemedInput
                      placeholder={t('productForm.additionalPrice')}
                      keyboardType="decimal-pad"
                      value={item.additionalPrice}
                      onChangeText={(value) => updateProductAdditionalItem(index, undefined, undefined, value)}
                      style={styles.compactInput}
                    />
                  </View>
                  <ThemedButton variant="secondary" style={styles.secondaryButton} icon="trash.fill" onPress={() => removeProductAdditionalItem(index)} />
                </View>
              );
            })
          )}

          <ThemedButton variant="secondary" style={styles.primaryButton} label={t('productForm.addAdditionalIngredient')} onPress={() => addProductAdditionalItem('', '', '')} />
          <ThemedButton style={styles.primaryButton} label={t('productForm.saveAdditionalItems')} onPress={saveProductAdditionalIngredients} />
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
    fontWeight: '600',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 4,
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
  imagePreviewContainer: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 10,
  },
  pickImageButton: {
    paddingVertical: 12,
    marginVertical: 8,
  },
  removeImageButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
