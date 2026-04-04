import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';
import type { ProductRecipeInput } from '@/types/products';

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
  const { ingredients, hydrate: hydrateInventory } = useInventoryStore();

  const [message, setMessage] = useState<string>('');
  const [productForm, setProductForm] = useState({
    id: null as string | null,
    name: '',
    categoryId: null as string | null,
    price: '',
  });
  const [productRecipeItems, setProductRecipeItems] = useState<Array<{ ingredientId: string; quantityUsed: string }>>([]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([hydrate(), hydrateInventory()]);
    }, [hydrate, hydrateInventory]),
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
      setMessage('Product name is required.');
      return;
    }

    if (price <= 0) {
      setMessage('Product price must be greater than 0.');
      return;
    }

    if (!productForm.id && productRecipeItems.length === 0) {
      setMessage('New products must include at least one recipe ingredient.');
      return;
    }

    const invalidItems = productRecipeItems.filter((item) => !item.ingredientId || Number(item.quantityUsed || '0') <= 0);
    if (!productForm.id && invalidItems.length > 0) {
      setMessage('All recipe items must have an ingredient and quantity greater than 0.');
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
      setMessage('Save the product first, then add recipes.');
      return;
    }

    for (const item of productRecipeItems) {
      if (!item.ingredientId || Number(item.quantityUsed || '0') <= 0) {
        setMessage('All recipe items must have an ingredient and quantity greater than 0.');
        return;
      }

      await setProductIngredient({
        productId: currentProductId,
        ingredientId: item.ingredientId,
        quantityUsed: Number(item.quantityUsed),
      });
    }

    setProductRecipeItems([]);
    setMessage(`Added ${productRecipeItems.length} recipe link(s).`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{productForm.id ? 'Edit product' : 'Create product'}</ThemedText>

      {message ? (
        <ThemedCard style={styles.messageCard}>
          <ThemedText>{message}</ThemedText>
        </ThemedCard>
      ) : null}

      <ThemedCard style={styles.card}>
        <ThemedInput
          placeholder="Product name"
          value={productForm.name}
          onChangeText={(value) => setProductForm((current) => ({ ...current, name: value }))}
          style={styles.input}
        />
        <ThemedInput
          placeholder="Price"
          keyboardType="decimal-pad"
          value={productForm.price}
          onChangeText={(value) => setProductForm((current) => ({ ...current, price: value }))}
          style={styles.input}
        />
        <ThemedText style={styles.smallText}>Category</ThemedText>
        <View style={styles.chipRow}>
          <ThemedChip
            style={styles.chip}
            label="None"
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
          <ThemedButton style={styles.primaryButton} label={productForm.id ? 'Save changes' : 'Create product'} onPress={submitProduct} />
          <ThemedButton variant="secondary" style={styles.secondaryButton} label="Back" onPress={() => router.back()} />
        </View>
      </ThemedCard>

      {!productForm.id ? (
        <ThemedCard style={styles.card}>
          <ThemedText style={styles.label}>Recipe ingredients (required)</ThemedText>
          <ThemedText style={styles.smallText}>Add at least one ingredient before creating the product.</ThemedText>
          {productRecipeItems.map((item, index) => {
            const addedIngredientIds = productRecipeItems.map((i) => i.ingredientId).filter((id) => id);
            const availableIngredients = ingredients.filter((ing) => !addedIngredientIds.includes(ing.id) || ing.id === item.ingredientId);
            return (
              <View key={index} style={styles.recipeControlsRow}>
                <View style={styles.recipeSelectWrapper}>
                  <ThemedSelect
                    placeholder="Select ingredient"
                    value={item.ingredientId}
                    items={availableIngredients.map((ing) => ({ label: ing.name, value: ing.id }))}
                    onValueChange={(value) => updateProductRecipeItem(index, value, undefined)}
                  />
                </View>
                <View style={styles.recipeInputWrapper}>
                  <ThemedInput
                    placeholder="Qty"
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
          <ThemedButton variant="secondary" style={styles.primaryButton} label="+ Add ingredient" onPress={() => addProductRecipeItem('', '')} />
        </ThemedCard>
      ) : (
        <ThemedCard style={styles.card}>
          <ThemedText style={styles.label}>Recipe for this product</ThemedText>
          {editingProductRecipes.length === 0 ? (
            <ThemedText style={styles.smallText}>No direct ingredients assigned yet.</ThemedText>
          ) : (
            editingProductRecipes.map((link) => (
              <View key={link.id} style={[styles.listItem, { borderColor: palette.border }]}>
                <View style={styles.listTextWrap}>
                  <ThemedText type="defaultSemiBold">{link.ingredientName}</ThemedText>
                  <ThemedText style={styles.smallText}>{link.quantityUsed} per unit</ThemedText>
                </View>
                <ThemedButton
                  variant="secondary"
                  style={styles.secondaryButton}
                  icon="trash.fill"
                  onPress={async () => {
                    if (editingProductRecipes.length <= 1) {
                      setMessage('Each product must keep at least one recipe ingredient.');
                      return;
                    }
                    await removeProductIngredient({ productId: link.productId, ingredientId: link.ingredientId });
                    setMessage('Recipe link removed.');
                  }}
                />
              </View>
            ))
          )}

          <ThemedText style={styles.label}>Add recipe ingredients</ThemedText>
          {productRecipeItems.length === 0 ? (
            <ThemedText style={styles.smallText}>Click "Add ingredient" to add a new recipe item.</ThemedText>
          ) : (
            productRecipeItems.map((item, index) => {
              const addedIngredientIds = productRecipeItems.map((i) => i.ingredientId).filter((id) => id);
              const availableIngredients = ingredients.filter((ing) => !addedIngredientIds.includes(ing.id) || ing.id === item.ingredientId);
              return (
                <View key={index} style={styles.recipeControlsRow}>
                  <View style={styles.recipeSelectWrapper}>
                    <ThemedSelect
                      placeholder="Select ingredient"
                      value={item.ingredientId}
                      items={availableIngredients.map((ing) => ({ label: ing.name, value: ing.id }))}
                      onValueChange={(value) => updateProductRecipeItem(index, value, undefined)}
                    />
                  </View>
                  <View style={styles.recipeInputWrapper}>
                    <ThemedInput
                      placeholder="Qty"
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

          <ThemedButton variant="secondary" style={styles.primaryButton} label="+ Add ingredient" onPress={() => addProductRecipeItem('', '')} />
          <ThemedButton style={styles.primaryButton} label="Save recipe items" onPress={saveProductRecipe} />
        </ThemedCard>
      )}
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
