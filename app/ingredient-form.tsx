import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';

function normalizeParam(value?: string | string[]) {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default function IngredientFormScreen() {
  const palette = useAppColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const ingredientId = normalizeParam(params.id);

  const { ingredients, hydrate: hydrateInventory, addIngredient, updateIngredient } = useInventoryStore();
  const { compositions, hydrate, setComposition, removeComposition } = useProductsStore();

  const [message, setMessage] = useState<string>('');
  const [ingredientForm, setIngredientForm] = useState({
    id: null as string | null,
    name: '',
    unit: 'pcs',
    quantity: '0',
    lowStockThreshold: '5',
  });
  const [ingredientRecipeItems, setIngredientRecipeItems] = useState<{ childIngredientId: string; quantityNeeded: string }[]>([]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([hydrate(), hydrateInventory()]);
    }, [hydrate, hydrateInventory]),
  );

  useEffect(() => {
    if (!ingredientId) {
      setIngredientForm({ id: null, name: '', unit: 'pcs', quantity: '0', lowStockThreshold: '5' });
      setIngredientRecipeItems([]);
      return;
    }

    const ingredient = ingredients.find((item) => item.id === ingredientId);
    if (!ingredient) {
      return;
    }

    setIngredientForm({
      id: ingredient.id,
      name: ingredient.name,
      unit: ingredient.unit,
      quantity: String(ingredient.quantity),
      lowStockThreshold: String(ingredient.low_stock_threshold),
    });
    setIngredientRecipeItems([]);
  }, [ingredientId, ingredients]);

  const editingIngredientRecipes = useMemo(
    () => (ingredientForm.id ? compositions.filter((link) => link.parentIngredientId === ingredientForm.id) : []),
    [ingredientForm.id, compositions],
  );

  const addIngredientRecipeItem = (childIngredientId: string = '', quantityNeeded: string = '') => {
    setIngredientRecipeItems((items) => [...items, { childIngredientId, quantityNeeded }]);
  };

  const removeIngredientRecipeItem = (index: number) => {
    setIngredientRecipeItems((items) => items.filter((_, i) => i !== index));
  };

  const updateIngredientRecipeItem = (index: number, childIngredientId?: string, quantityNeeded?: string) => {
    setIngredientRecipeItems((items) =>
      items.map((item, i) =>
        i === index
          ? {
              childIngredientId: childIngredientId ?? item.childIngredientId,
              quantityNeeded: quantityNeeded ?? item.quantityNeeded,
            }
          : item,
      ),
    );
  };

  const submitIngredient = async () => {
    if (!ingredientForm.name.trim()) {
      setMessage('Ingredient name is required.');
      return;
    }

    for (const item of ingredientRecipeItems) {
      const childIngredientId = item.childIngredientId;
      const quantityNeeded = Number(item.quantityNeeded || '0');

      if (!childIngredientId) {
        setMessage('Select a child ingredient for this recipe link.');
        return;
      }

      if (quantityNeeded <= 0) {
        setMessage('Composition quantity must be greater than 0.');
        return;
      }
    }

    const payload = {
      name: ingredientForm.name.trim(),
      unit: ingredientForm.unit.trim() || 'pcs',
      quantity: Number(ingredientForm.quantity || '0'),
      lowStockThreshold: Number(ingredientForm.lowStockThreshold || '0'),
    };

    let parentIngredientId = ingredientForm.id;

    if (ingredientForm.id) {
      await updateIngredient({ id: ingredientForm.id, ...payload });
    } else {
      parentIngredientId = await addIngredient(payload);
    }

    if (!parentIngredientId) {
      setMessage('Unable to save ingredient recipe right now.');
      return;
    }

    for (const item of ingredientRecipeItems) {
      if (parentIngredientId === item.childIngredientId) {
        setMessage('Ingredient recipes cannot point to themselves.');
        return;
      }

      await setComposition({
        parentIngredientId,
        childIngredientId: item.childIngredientId,
        quantityNeeded: Number(item.quantityNeeded),
      });
    }

    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{ingredientForm.id ? 'Edit ingredient' : 'Add ingredient'}</ThemedText>

      {message ? (
        <ThemedCard style={styles.messageCard}>
          <ThemedText>{message}</ThemedText>
        </ThemedCard>
      ) : null}

      <ThemedCard style={styles.card}>
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
        <View style={styles.actionsRow}>
          <ThemedButton style={styles.primaryButton} label="Save ingredient + recipe" onPress={submitIngredient} />
          <ThemedButton variant="secondary" style={styles.secondaryButton} label="Back" onPress={() => router.back()} />
        </View>
      </ThemedCard>

      {ingredientForm.id ? (
        <ThemedCard style={styles.card}>
          {editingIngredientRecipes.map((link) => (
            <View key={link.id} style={[styles.listItem, { borderColor: palette.border }]}>
              <View style={styles.listTextWrap}>
                <ThemedText type="defaultSemiBold">{link.childIngredientName}</ThemedText>
                <ThemedText style={styles.smallText}>{link.quantityNeeded} needed</ThemedText>
              </View>
              <ThemedButton
                variant="secondary"
                style={styles.secondaryButton}
                icon="trash.fill"
                onPress={async () => {
                  await removeComposition({
                    parentIngredientId: link.parentIngredientId,
                    childIngredientId: link.childIngredientId,
                  });
                  setMessage('Ingredient recipe link removed.');
                }}
              />
            </View>
          ))}

          <ThemedText style={styles.label}>Recipe</ThemedText>
          {ingredientRecipeItems.length === 0 ? (
            <ThemedText style={styles.smallText}>Click &quot;Add ingredient&quot; to add a new recipe item.</ThemedText>
          ) : (
            ingredientRecipeItems.map((item, index) => {
              const addedIngredientIds = ingredientRecipeItems.map((i) => i.childIngredientId).filter((id) => id);
              const availableIngredients = ingredients.filter(
                (ing) => (ing.id !== ingredientForm.id && !addedIngredientIds.includes(ing.id)) || ing.id === item.childIngredientId,
              );
              return (
                <View key={index} style={styles.recipeControlsRow}>
                  <View style={styles.recipeSelectWrapper}>
                    <ThemedSelect
                      placeholder="Select ingredient"
                      value={item.childIngredientId}
                      items={availableIngredients.map((ing) => ({ label: ing.name, value: ing.id }))}
                      onValueChange={(value) => updateIngredientRecipeItem(index, value, undefined)}
                    />
                  </View>
                  <View style={styles.recipeInputWrapper}>
                    <ThemedInput
                      placeholder="Qty"
                      keyboardType="decimal-pad"
                      value={item.quantityNeeded}
                      onChangeText={(value) => updateIngredientRecipeItem(index, undefined, value)}
                      style={styles.compactInput}
                    />
                  </View>
                  <ThemedButton variant="secondary" style={styles.secondaryButton} icon="trash.fill" onPress={() => removeIngredientRecipeItem(index)} />
                </View>
              );
            })
          )}
          <ThemedButton variant="secondary" style={styles.primaryButton} label="+ Add ingredient" onPress={() => addIngredientRecipeItem('', '')} />
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
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  halfWidth: {
    flex: 1,
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
