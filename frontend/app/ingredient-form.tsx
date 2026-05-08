import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { t } from '@/i18n';
import { useInventoryStore } from '@/stores/inventory';

function normalizeParam(value?: string | string[]) {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default function IngredientFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const ingredientId = normalizeParam(params.id);

  const { ingredients, hydrate: hydrateInventory, addIngredient, updateIngredient } = useInventoryStore();

  const [message, setMessage] = useState<string>('');
  const [ingredientForm, setIngredientForm] = useState({
    id: null as string | null,
    name: '',
    unit: 'pcs',
    quantity: '0',
    lowStockThreshold: '5',
  });

  useFocusEffect(
    useCallback(() => {
      void hydrateInventory();
    }, [hydrateInventory]),
  );

  useEffect(() => {
    if (!ingredientId) {
      setIngredientForm({ id: null, name: '', unit: 'pcs', quantity: '0', lowStockThreshold: '5' });
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
  }, [ingredientId, ingredients]);

  const submitIngredient = async () => {
    if (!ingredientForm.name.trim()) {
      setMessage(t('ingredientForm.error.nameRequired'));
      return;
    }

    const payload = {
      name: ingredientForm.name.trim(),
      unit: ingredientForm.unit.trim() || 'pcs',
      quantity: Number(ingredientForm.quantity || '0'),
      lowStockThreshold: Number(ingredientForm.lowStockThreshold || '0'),
    };

    if (ingredientForm.id) {
      await updateIngredient({ id: ingredientForm.id, ...payload });
    } else {
      await addIngredient(payload);
    }

    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{ingredientForm.id ? t('ingredientForm.title.edit') : t('ingredientForm.title.add')}</ThemedText>

      {message ? (
        <ThemedCard style={styles.messageCard}>
          <ThemedText>{message}</ThemedText>
        </ThemedCard>
      ) : null}

      <ThemedCard style={styles.card}>
        <ThemedInput
          placeholder={t('ingredientForm.name')}
          value={ingredientForm.name}
          onChangeText={(value) => setIngredientForm((current) => ({ ...current, name: value }))}
          style={styles.input}
        />
        <View style={styles.actionsRow}>
          <ThemedInput
            placeholder={t('ingredientForm.unit')}
            value={ingredientForm.unit}
            onChangeText={(value) => setIngredientForm((current) => ({ ...current, unit: value }))}
            style={[styles.input, styles.halfWidth]}
          />
          <ThemedInput
            placeholder={t('common.qtyShort')}
            keyboardType="decimal-pad"
            value={ingredientForm.quantity}
            onChangeText={(value) => setIngredientForm((current) => ({ ...current, quantity: value }))}
            style={[styles.input, styles.halfWidth]}
          />
        </View>
        <ThemedInput
          placeholder={t('ingredientForm.lowStockThreshold')}
          keyboardType="decimal-pad"
          value={ingredientForm.lowStockThreshold}
          onChangeText={(value) => setIngredientForm((current) => ({ ...current, lowStockThreshold: value }))}
          style={styles.input}
        />
        <View style={styles.actionsRow}>
          <ThemedButton style={styles.primaryButton} label={t('ingredientForm.save')} onPress={submitIngredient} />
          <ThemedButton variant="secondary" style={styles.secondaryButton} label={t('common.back')} onPress={() => router.back()} />
        </View>
      </ThemedCard>
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
});
