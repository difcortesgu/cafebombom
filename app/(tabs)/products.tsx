import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/stores/auth';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';

type Section = 'products' | 'recipes' | 'compositions';

export default function ProductsScreen() {
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
  const { ingredients, hydrate: hydrateInventory } = useInventoryStore();

  const [section, setSection] = useState<Section>('products');
  const [message, setMessage] = useState<string>('');
  const [productForm, setProductForm] = useState({
    id: null as number | null,
    name: '',
    categoryId: null as number | null,
    price: '',
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

  if (currentUser?.role !== 'owner') {
    return (
      <ThemedView style={styles.lockedContainer}>
        <ThemedText type="title">Products</ThemedText>
        <ThemedText>Owner access is required to manage recipes and product composition.</ThemedText>
      </ThemedView>
    );
  }

  const selectedProductId = Number(recipeForm.productId || '0');
  const selectedProductRecipes = productIngredients.filter((link) => link.productId === selectedProductId);
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;

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
      });
      setMessage('Product created.');
    }

    setProductForm({ id: null, name: '', categoryId: null, price: '' });
  };

  const submitRecipe = async () => {
    const productId = Number(recipeForm.productId || '0');
    const ingredientId = Number(recipeForm.ingredientId || '0');
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
    const parentIngredientId = Number(compositionForm.parentIngredientId || '0');
    const childIngredientId = Number(compositionForm.childIngredientId || '0');
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
      <ThemedText>Maintain sellable products, direct recipe links, and processed ingredient trees.</ThemedText>

      {message ? (
        <ThemedView style={styles.messageCard}>
          <ThemedText>{message}</ThemedText>
        </ThemedView>
      ) : null}

      <View style={styles.tabRow}>
        {(['products', 'recipes', 'compositions'] as Section[]).map((item) => (
          <Pressable
            key={item}
            style={[styles.sectionButton, section === item && styles.sectionButtonActive]}
            onPress={() => setSection(item)}>
            <ThemedText style={section === item ? styles.sectionTextActive : undefined}>{item}</ThemedText>
          </Pressable>
        ))}
      </View>

      {section === 'products' ? (
        <>
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">{productForm.id ? 'Edit product' : 'Create product'}</ThemedText>
            <TextInput
              placeholder="Product name"
              value={productForm.name}
              onChangeText={(value) => setProductForm((current) => ({ ...current, name: value }))}
              style={styles.input}
            />
            <TextInput
              placeholder="Price"
              keyboardType="decimal-pad"
              value={productForm.price}
              onChangeText={(value) => setProductForm((current) => ({ ...current, price: value }))}
              style={styles.input}
            />
            <ThemedText style={styles.smallText}>Category</ThemedText>
            <View style={styles.chipRow}>
              <Pressable
                style={[styles.chip, productForm.categoryId === null && styles.chipActive]}
                onPress={() => setProductForm((current) => ({ ...current, categoryId: null }))}>
                <ThemedText style={productForm.categoryId === null ? styles.chipTextActive : undefined}>None</ThemedText>
              </Pressable>
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  style={[styles.chip, productForm.categoryId === category.id && styles.chipActive]}
                  onPress={() => setProductForm((current) => ({ ...current, categoryId: category.id }))}>
                  <ThemedText style={productForm.categoryId === category.id ? styles.chipTextActive : undefined}>
                    {category.name}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <View style={styles.actionsRow}>
              <Pressable style={styles.primaryButton} onPress={submitProduct}>
                <ThemedText style={styles.primaryText}>{productForm.id ? 'Save changes' : 'Create product'}</ThemedText>
              </Pressable>
              {productForm.id ? (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => setProductForm({ id: null, name: '', categoryId: null, price: '' })}>
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
              ) : null}
            </View>
          </ThemedView>

          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Product list</ThemedText>
            {products.map((product) => (
              <View key={product.id} style={styles.listItemColumn}>
                <View style={styles.listHeader}>
                  <View style={styles.listTextWrap}>
                    <ThemedText type="defaultSemiBold">{product.name}</ThemedText>
                    <ThemedText style={styles.smallText}>
                      ${Number(product.price).toFixed(2)} · {product.category || 'Uncategorized'} · {product.isActive ? 'Active' : 'Archived'}
                    </ThemedText>
                  </View>
                  <View style={styles.inlineActions}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() =>
                        setProductForm({
                          id: product.id,
                          name: product.name,
                          categoryId: product.categoryId,
                          price: String(product.price),
                        })
                      }>
                      <ThemedText>Edit</ThemedText>
                    </Pressable>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={async () => {
                        await updateProduct({ id: product.id, isActive: !product.isActive });
                        setMessage(product.isActive ? 'Product archived.' : 'Product restored.');
                      }}>
                      <ThemedText>{product.isActive ? 'Archive' : 'Restore'}</ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </ThemedView>
        </>
      ) : null}

      {section === 'recipes' ? (
        <>
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Recipe editor</ThemedText>
            <ThemedText style={styles.smallText}>Select a product, then assign direct ingredient quantities.</ThemedText>
            <ThemedText style={styles.label}>Product</ThemedText>
            <View style={styles.chipRow}>
              {activeProducts.map((product) => (
                <Pressable
                  key={product.id}
                  style={[styles.chip, Number(recipeForm.productId) === product.id && styles.chipActive]}
                  onPress={() => setRecipeForm((current) => ({ ...current, productId: String(product.id) }))}>
                  <ThemedText style={Number(recipeForm.productId) === product.id ? styles.chipTextActive : undefined}>
                    {product.name}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <ThemedText style={styles.label}>Ingredient</ThemedText>
            <View style={styles.chipRow}>
              {ingredients.map((ingredient) => (
                <Pressable
                  key={ingredient.id}
                  style={[styles.chip, Number(recipeForm.ingredientId) === ingredient.id && styles.chipActive]}
                  onPress={() => setRecipeForm((current) => ({ ...current, ingredientId: String(ingredient.id) }))}>
                  <ThemedText style={Number(recipeForm.ingredientId) === ingredient.id ? styles.chipTextActive : undefined}>
                    {ingredient.name}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <TextInput
              placeholder="Quantity used per product"
              keyboardType="decimal-pad"
              value={recipeForm.quantityUsed}
              onChangeText={(value) => setRecipeForm((current) => ({ ...current, quantityUsed: value }))}
              style={styles.input}
            />
            <Pressable style={styles.primaryButton} onPress={submitRecipe}>
              <ThemedText style={styles.primaryText}>Save recipe link</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">{selectedProduct?.name ?? 'Selected product'} recipe</ThemedText>
            {selectedProductRecipes.length === 0 ? (
              <ThemedText style={styles.smallText}>No direct ingredients assigned yet.</ThemedText>
            ) : (
              selectedProductRecipes.map((link) => (
                <View key={link.id} style={styles.listItem}>
                  <View style={styles.listTextWrap}>
                    <ThemedText type="defaultSemiBold">{link.ingredientName}</ThemedText>
                    <ThemedText style={styles.smallText}>{link.quantityUsed} per unit</ThemedText>
                  </View>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={async () => {
                      await removeProductIngredient({ productId: link.productId, ingredientId: link.ingredientId });
                      setMessage('Recipe link removed.');
                    }}>
                    <ThemedText>Remove</ThemedText>
                  </Pressable>
                </View>
              ))
            )}
          </ThemedView>
        </>
      ) : null}

      {section === 'compositions' ? (
        <>
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Processed ingredient composition</ThemedText>
            <ThemedText style={styles.smallText}>Map a parent ingredient to the child ingredients it consumes.</ThemedText>
            <ThemedText style={styles.label}>Parent ingredient</ThemedText>
            <View style={styles.chipRow}>
              {ingredients.map((ingredient) => (
                <Pressable
                  key={`parent-${ingredient.id}`}
                  style={[styles.chip, Number(compositionForm.parentIngredientId) === ingredient.id && styles.chipActive]}
                  onPress={() => setCompositionForm((current) => ({ ...current, parentIngredientId: String(ingredient.id) }))}>
                  <ThemedText
                    style={Number(compositionForm.parentIngredientId) === ingredient.id ? styles.chipTextActive : undefined}>
                    {ingredient.name}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <ThemedText style={styles.label}>Child ingredient</ThemedText>
            <View style={styles.chipRow}>
              {ingredients.map((ingredient) => (
                <Pressable
                  key={`child-${ingredient.id}`}
                  style={[styles.chip, Number(compositionForm.childIngredientId) === ingredient.id && styles.chipActive]}
                  onPress={() => setCompositionForm((current) => ({ ...current, childIngredientId: String(ingredient.id) }))}>
                  <ThemedText
                    style={Number(compositionForm.childIngredientId) === ingredient.id ? styles.chipTextActive : undefined}>
                    {ingredient.name}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <TextInput
              placeholder="Quantity needed"
              keyboardType="decimal-pad"
              value={compositionForm.quantityNeeded}
              onChangeText={(value) => setCompositionForm((current) => ({ ...current, quantityNeeded: value }))}
              style={styles.input}
            />
            <Pressable style={styles.primaryButton} onPress={submitComposition}>
              <ThemedText style={styles.primaryText}>Save composition link</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Composition list</ThemedText>
            {compositions.length === 0 ? (
              <ThemedText style={styles.smallText}>No processed ingredient links yet.</ThemedText>
            ) : (
              compositions.map((composition) => (
                <View key={composition.id} style={styles.listItem}>
                  <View style={styles.listTextWrap}>
                    <ThemedText type="defaultSemiBold">{composition.parentIngredientName}</ThemedText>
                    <ThemedText style={styles.smallText}>
                      consumes {composition.quantityNeeded} of {composition.childIngredientName}
                    </ThemedText>
                  </View>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={async () => {
                      await removeComposition({
                        parentIngredientId: composition.parentIngredientId,
                        childIngredientId: composition.childIngredientId,
                      });
                      setMessage('Composition link removed.');
                    }}>
                    <ThemedText>Remove</ThemedText>
                  </Pressable>
                </View>
              ))
            )}
          </ThemedView>
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C5AA90',
    padding: 12,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFA792',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionButtonActive: {
    backgroundColor: '#B64D1A',
    borderColor: '#B64D1A',
  },
  sectionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C5AA90',
    padding: 12,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#BFA792',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#1D130D',
    backgroundColor: '#FFFFFF',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#BFA792',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: '#F4D9C8',
    borderColor: '#B64D1A',
  },
  chipTextActive: {
    color: '#7D310B',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#B64D1A',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A98F79',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
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
});