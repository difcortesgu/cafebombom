import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { useAuthStore } from '@/stores/auth';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';

type Section = 'products' | 'ingredients' | 'recipes' | 'compositions';

export default function ProductsScreen() {
  const palette = useAppColors();
  const currentUser = useAuthStore((state) => state.currentUser);
  const {
    categories,
    products,
    productIngredients,
    compositions,
    hydrate,
    createProduct,
    updateProduct,
    setProductIngredient,
    removeProductIngredient,
    setComposition,
    removeComposition,
  } = useProductsStore();
  const {
    ingredients,
    hydrate: hydrateInventory,
    addIngredient,
    updateIngredient,
  } = useInventoryStore();

  const [section, setSection] = useState<Section>('products');
  const [message, setMessage] = useState<string>('');
  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    unit: 'pcs',
    quantity: '0',
    lowStockThreshold: '5',
  });
  const [productForm, setProductForm] = useState({
    id: null as string | null,
    name: '',
    categoryId: null as string | null,
    price: '',
    recipeIngredientId: '',
    recipeQuantity: '1',
  });
  const [recipeForm, setRecipeForm] = useState({
    productId: '',
    ingredientId: '',
    quantityUsed: '1',
  });
  const [compositionForm, setCompositionForm] = useState({
    parentIngredientId: '',
    childIngredientId: '',
    quantityNeeded: '1',
  });

  useFocusEffect(
    useCallback(() => {
      void Promise.all([hydrate(), hydrateInventory()]);
    }, [hydrate, hydrateInventory]),
  );

  const activeProducts = useMemo(() => products.filter((product) => product.isActive), [products]);

  useEffect(() => {
    if (!recipeForm.productId && activeProducts.length > 0) {
      setRecipeForm((current) => ({ ...current, productId: String(activeProducts[0].id) }));
    }
  }, [activeProducts, recipeForm.productId]);

  useEffect(() => {
    if (!compositionForm.parentIngredientId && ingredients.length > 0) {
      setCompositionForm((current) => ({ ...current, parentIngredientId: String(ingredients[0].id) }));
    }
  }, [compositionForm.parentIngredientId, ingredients]);

  useEffect(() => {
    if (!compositionForm.childIngredientId && ingredients.length > 1) {
      setCompositionForm((current) => ({ ...current, childIngredientId: String(ingredients[1].id) }));
    }
  }, [compositionForm.childIngredientId, ingredients]);

  useEffect(() => {
    if (!productForm.recipeIngredientId && ingredients.length > 0) {
      setProductForm((current) => ({ ...current, recipeIngredientId: String(ingredients[0].id) }));
    }
  }, [ingredients, productForm.recipeIngredientId]);

  const lowStock = useMemo(
    () => ingredients.filter((item) => Number(item.quantity) <= Number(item.low_stock_threshold)),
    [ingredients],
  );

  if (currentUser?.role !== 'owner') {
    return (
      <ThemedView style={styles.lockedContainer}>
        <ThemedText type="title">Products</ThemedText>
        <ThemedText>Owner access is required to manage recipes and product composition.</ThemedText>
      </ThemedView>
    );
  }

  const selectedProductId = recipeForm.productId;
  const selectedProductRecipes = productIngredients.filter((link) => link.productId === selectedProductId);
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;

  const submitProduct = async () => {
    const trimmedName = productForm.name.trim();
    const price = Number(productForm.price || '0');
    const recipeQuantity = Number(productForm.recipeQuantity || '0');

    if (!trimmedName) {
      setMessage('Product name is required.');
      return;
    }

    if (price <= 0) {
      setMessage('Product price must be greater than 0.');
      return;
    }

    if (!productForm.id && (!productForm.recipeIngredientId || recipeQuantity <= 0)) {
      setMessage('New products must include at least one recipe ingredient with quantity greater than 0.');
      return;
    }

    if (productForm.id) {
      await updateProduct({
        id: productForm.id,
        name: trimmedName,
        categoryId: productForm.categoryId,
        price,
      });
      setMessage('Product updated.');
    } else {
      await createProduct({
        name: trimmedName,
        categoryId: productForm.categoryId ?? undefined,
        price,
        recipe: [{ ingredientId: productForm.recipeIngredientId, quantityUsed: recipeQuantity }],
      });
      setMessage('Product created.');
    }

    setProductForm({
      id: null,
      name: '',
      categoryId: null,
      price: '',
      recipeIngredientId: ingredients[0]?.id ?? '',
      recipeQuantity: '1',
    });
  };

  const submitRecipe = async () => {
    const productId = recipeForm.productId;
    const ingredientId = recipeForm.ingredientId;
    const quantityUsed = Number(recipeForm.quantityUsed || '0');

    if (!productId || !ingredientId) {
      setMessage('Select a product and ingredient for the recipe link.');
      return;
    }

    if (quantityUsed <= 0) {
      setMessage('Recipe quantity must be greater than 0.');
      return;
    }

    await setProductIngredient({ productId, ingredientId, quantityUsed });
    setRecipeForm((current) => ({ ...current, ingredientId: '', quantityUsed: '1' }));
    setMessage('Recipe link saved.');
  };

  const submitComposition = async () => {
    const parentIngredientId = compositionForm.parentIngredientId;
    const childIngredientId = compositionForm.childIngredientId;
    const quantityNeeded = Number(compositionForm.quantityNeeded || '0');

    if (!parentIngredientId || !childIngredientId) {
      setMessage('Select both parent and child ingredients.');
      return;
    }

    if (parentIngredientId === childIngredientId) {
      setMessage('Processed ingredient links cannot point to themselves.');
      return;
    }

    if (quantityNeeded <= 0) {
      setMessage('Composition quantity must be greater than 0.');
      return;
    }

    await setComposition({ parentIngredientId, childIngredientId, quantityNeeded });
    setCompositionForm((current) => ({ ...current, quantityNeeded: '1' }));
    setMessage('Composition link saved.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Products</ThemedText>
      <ThemedText>Maintain products, ingredients, direct recipe links, and processed ingredient trees.</ThemedText>

      {message ? (
        <ThemedCard style={styles.messageCard}>
          <ThemedText>{message}</ThemedText>
        </ThemedCard>
      ) : null}

      <View style={styles.tabRow}>
        {(['products', 'ingredients', 'recipes', 'compositions'] as Section[]).map((item) => (
          <ThemedChip
            key={item}
            style={styles.sectionButton}
            label={item}
            active={section === item}
            onPress={() => setSection(item)}
          />
        ))}
      </View>

      {section === 'products' ? (
        <>
          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">{productForm.id ? 'Edit product' : 'Create product'}</ThemedText>
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
              {productForm.id ? (
                <ThemedButton
                  variant="secondary"
                  style={styles.secondaryButton}
                  label="Cancel"
                  onPress={() =>
                    setProductForm({
                      id: null,
                      name: '',
                      categoryId: null,
                      price: '',
                      recipeIngredientId: ingredients[0]?.id ?? '',
                      recipeQuantity: '1',
                    })
                  }
                />
              ) : null}
            </View>

            {!productForm.id ? (
              <>
                <ThemedText style={styles.label}>Required recipe ingredient</ThemedText>
                <View style={styles.chipRow}>
                  {ingredients.map((ingredient) => (
                    <ThemedChip
                      key={`product-recipe-${ingredient.id}`}
                      style={styles.chip}
                      label={ingredient.name}
                      tone="accent"
                      active={productForm.recipeIngredientId === ingredient.id}
                      onPress={() => setProductForm((current) => ({ ...current, recipeIngredientId: ingredient.id }))}
                    />
                  ))}
                </View>
                <ThemedInput
                  placeholder="Recipe quantity used per product"
                  keyboardType="decimal-pad"
                  value={productForm.recipeQuantity}
                  onChangeText={(value) => setProductForm((current) => ({ ...current, recipeQuantity: value }))}
                  style={styles.input}
                />
              </>
            ) : null}
          </ThemedCard>

          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Product list</ThemedText>
            {products.map((product) => (
              <View key={product.id} style={[styles.listItemColumn, { borderColor: palette.border }]}>
                <View style={styles.listHeader}>
                  <View style={styles.listTextWrap}>
                    <ThemedText type="defaultSemiBold">{product.name}</ThemedText>
                    <ThemedText style={styles.smallText}>
                      ${Number(product.price).toFixed(2)} · {product.category || 'Uncategorized'} · {product.isActive ? 'Active' : 'Archived'}
                    </ThemedText>
                  </View>
                  <View style={styles.inlineActions}>
                    <ThemedButton
                      variant="secondary"
                      style={styles.secondaryButton}
                      label="Edit"
                      onPress={() =>
                        setProductForm({
                          id: product.id,
                          name: product.name,
                          categoryId: product.categoryId,
                          price: String(product.price),
                          recipeIngredientId: ingredients[0]?.id ?? '',
                          recipeQuantity: '1',
                        })
                      }
                    />
                    <ThemedButton
                      variant="secondary"
                      style={styles.secondaryButton}
                      label={product.isActive ? 'Archive' : 'Restore'}
                      onPress={async () => {
                        await updateProduct({ id: product.id, isActive: !product.isActive });
                        setMessage(product.isActive ? 'Product archived.' : 'Product restored.');
                      }}
                    />
                  </View>
                </View>
              </View>
            ))}
          </ThemedCard>
        </>
      ) : null}

      {section === 'ingredients' ? (
        <>
          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Add ingredient</ThemedText>
            <ThemedInput
              placeholder="Name"
              value={ingredientForm.name}
              onChangeText={(value) => setIngredientForm((current) => ({ ...current, name: value }))}
              style={styles.input}
            />
            <View style={styles.actionsRow}>
              <ThemedInput
                placeholder="Unit"
                value={ingredientForm.unit}
                onChangeText={(value) => setIngredientForm((current) => ({ ...current, unit: value }))}
                style={[styles.input, styles.halfWidth]}
              />
              <ThemedInput
                placeholder="Qty"
                keyboardType="decimal-pad"
                value={ingredientForm.quantity}
                onChangeText={(value) => setIngredientForm((current) => ({ ...current, quantity: value }))}
                style={[styles.input, styles.halfWidth]}
              />
            </View>
            <ThemedInput
              placeholder="Low stock threshold"
              keyboardType="decimal-pad"
              value={ingredientForm.lowStockThreshold}
              onChangeText={(value) => setIngredientForm((current) => ({ ...current, lowStockThreshold: value }))}
              style={styles.input}
            />
            <ThemedButton
              style={styles.primaryButton}
              label="Save ingredient"
              onPress={async () => {
                if (!ingredientForm.name.trim()) {
                  setMessage('Ingredient name is required.');
                  return;
                }

                await addIngredient({
                  name: ingredientForm.name.trim(),
                  unit: ingredientForm.unit.trim() || 'pcs',
                  quantity: Number(ingredientForm.quantity || '0'),
                  lowStockThreshold: Number(ingredientForm.lowStockThreshold || '0'),
                });

                setIngredientForm({ name: '', unit: 'pcs', quantity: '0', lowStockThreshold: '5' });
                setMessage('Ingredient saved.');
              }}
            />
          </ThemedCard>

          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Ingredient list</ThemedText>
            {ingredients.map((item) => {
              const isLow = Number(item.quantity) <= Number(item.low_stock_threshold);
              return (
                <View key={item.id} style={[styles.listItem, { borderColor: palette.border }]}>
                  <View style={styles.listTextWrap}>
                    <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                    <ThemedText style={styles.smallText}>
                      {Number(item.quantity).toFixed(2)} {item.unit} · threshold {item.low_stock_threshold}
                    </ThemedText>
                    {isLow ? <ThemedText style={[styles.lowText, { color: palette.warning }]}>Low stock</ThemedText> : null}
                  </View>
                  <ThemedButton
                    variant="secondary"
                    style={styles.secondaryButton}
                    label="+1"
                    onPress={async () => {
                      await updateIngredient({ id: item.id, quantity: Number(item.quantity) + 1 });
                      setMessage('Ingredient quantity updated.');
                    }}
                  />
                </View>
              );
            })}
          </ThemedCard>

          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Low-stock alert</ThemedText>
            <ThemedText>{lowStock.length} ingredient(s) below threshold.</ThemedText>
          </ThemedCard>
        </>
      ) : null}

      {section === 'recipes' ? (
        <>
          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Recipe editor</ThemedText>
            <ThemedText style={styles.smallText}>Select a product, then assign direct ingredient quantities.</ThemedText>
            <ThemedText style={styles.label}>Product</ThemedText>
            <View style={styles.chipRow}>
              {activeProducts.map((product) => (
                <ThemedChip
                  key={product.id}
                  style={styles.chip}
                  label={product.name}
                  tone="accent"
                  active={recipeForm.productId === product.id}
                  onPress={() => setRecipeForm((current) => ({ ...current, productId: product.id }))}
                />
              ))}
            </View>
            <ThemedText style={styles.label}>Ingredient</ThemedText>
            <View style={styles.chipRow}>
              {ingredients.map((ingredient) => (
                <ThemedChip
                  key={ingredient.id}
                  style={styles.chip}
                  label={ingredient.name}
                  tone="accent"
                  active={recipeForm.ingredientId === ingredient.id}
                  onPress={() => setRecipeForm((current) => ({ ...current, ingredientId: ingredient.id }))}
                />
              ))}
            </View>
            <ThemedInput
              placeholder="Quantity used per product"
              keyboardType="decimal-pad"
              value={recipeForm.quantityUsed}
              onChangeText={(value) => setRecipeForm((current) => ({ ...current, quantityUsed: value }))}
              style={styles.input}
            />
            <ThemedButton style={styles.primaryButton} label="Save recipe link" onPress={submitRecipe} />
          </ThemedCard>

          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">{selectedProduct?.name ?? 'Selected product'} recipe</ThemedText>
            {selectedProductRecipes.length === 0 ? (
              <ThemedText style={styles.smallText}>No direct ingredients assigned yet.</ThemedText>
            ) : (
              selectedProductRecipes.map((link) => (
                <View key={link.id} style={[styles.listItem, { borderColor: palette.border }]}>
                  <View style={styles.listTextWrap}>
                    <ThemedText type="defaultSemiBold">{link.ingredientName}</ThemedText>
                    <ThemedText style={styles.smallText}>{link.quantityUsed} per unit</ThemedText>
                  </View>
                  <ThemedButton
                    variant="secondary"
                    style={styles.secondaryButton}
                    label="Remove"
                    onPress={async () => {
                      if (selectedProductRecipes.length <= 1) {
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
          </ThemedCard>
        </>
      ) : null}

      {section === 'compositions' ? (
        <>
          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Processed ingredient composition</ThemedText>
            <ThemedText style={styles.smallText}>Map a parent ingredient to the child ingredients it consumes.</ThemedText>
            <ThemedText style={styles.label}>Parent ingredient</ThemedText>
            <View style={styles.chipRow}>
              {ingredients.map((ingredient) => (
                <ThemedChip
                  key={`parent-${ingredient.id}`}
                  style={styles.chip}
                  label={ingredient.name}
                  tone="accent"
                  active={compositionForm.parentIngredientId === ingredient.id}
                  onPress={() => setCompositionForm((current) => ({ ...current, parentIngredientId: ingredient.id }))}
                />
              ))}
            </View>
            <ThemedText style={styles.label}>Child ingredient</ThemedText>
            <View style={styles.chipRow}>
              {ingredients.map((ingredient) => (
                <ThemedChip
                  key={`child-${ingredient.id}`}
                  style={styles.chip}
                  label={ingredient.name}
                  tone="accent"
                  active={compositionForm.childIngredientId === ingredient.id}
                  onPress={() => setCompositionForm((current) => ({ ...current, childIngredientId: ingredient.id }))}
                />
              ))}
            </View>
            <ThemedInput
              placeholder="Quantity needed"
              keyboardType="decimal-pad"
              value={compositionForm.quantityNeeded}
              onChangeText={(value) => setCompositionForm((current) => ({ ...current, quantityNeeded: value }))}
              style={styles.input}
            />
            <ThemedButton style={styles.primaryButton} label="Save composition link" onPress={submitComposition} />
          </ThemedCard>

          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Composition list</ThemedText>
            {compositions.length === 0 ? (
              <ThemedText style={styles.smallText}>No processed ingredient links yet.</ThemedText>
            ) : (
              compositions.map((composition) => (
                <View key={composition.id} style={[styles.listItem, { borderColor: palette.border }]}>
                  <View style={styles.listTextWrap}>
                    <ThemedText type="defaultSemiBold">{composition.parentIngredientName}</ThemedText>
                    <ThemedText style={styles.smallText}>
                      consumes {composition.quantityNeeded} of {composition.childIngredientName}
                    </ThemedText>
                  </View>
                  <ThemedButton
                    variant="secondary"
                    style={styles.secondaryButton}
                    label="Remove"
                    onPress={async () => {
                      await removeComposition({
                        parentIngredientId: composition.parentIngredientId,
                        childIngredientId: composition.childIngredientId,
                      });
                      setMessage('Composition link removed.');
                    }}
                  />
                </View>
              ))
            )}
          </ThemedCard>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  messageCard: {
    padding: 12,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionButton: {
    borderRadius: 999,
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
  halfWidth: {
    flex: 1,
  },
  inlineActions: {
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
  listItemColumn: {
    borderWidth: 1,
    borderColor: '#C5AA90',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
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
  lowText: {
    fontWeight: '600',
  },
});