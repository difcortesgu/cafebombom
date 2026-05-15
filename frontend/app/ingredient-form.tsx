import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
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
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const ingredientId = normalizeParam(params.id);

  const { ingredients, units, hydrate: hydrateInventory, addIngredient, addUnit, deleteUnit, updateIngredient } = useInventoryStore();

  const [message, setMessage] = useState<string>('');
  const initializedCreateFormRef = useRef(false);
  const [ingredientForm, setIngredientForm] = useState({
    id: null as string | null,
    name: '',
    unit: '',
    lowStockThreshold: '5',
  });

  const unitOptions = useMemo(
    () => units.map((unit) => ({ value: unit.name, label: unit.name })),
    [units],
  );

  useFocusEffect(
    useCallback(() => {
      void hydrateInventory();
    }, [hydrateInventory]),
  );

  useEffect(() => {
    if (!ingredientId) {
      if (!initializedCreateFormRef.current) {
        setIngredientForm({ id: null, name: '', unit: units[0]?.name ?? '', lowStockThreshold: '5' });
        initializedCreateFormRef.current = true;
        return;
      }

      setIngredientForm((current) => {
        if (current.unit || !units[0]?.name) {
          return current;
        }

        return { ...current, unit: units[0].name };
      });
      return;
    }

    initializedCreateFormRef.current = false;

    const ingredient = ingredients.find((item) => item.id === ingredientId);
    if (!ingredient) {
      return;
    }

    setIngredientForm({
      id: ingredient.id,
      name: ingredient.name,
      unit: ingredient.unit,
      lowStockThreshold: String(ingredient.low_stock_threshold),
    });
  }, [ingredientId, ingredients, units]);

  const submitIngredient = async () => {
    if (!ingredientForm.name.trim()) {
      setMessage(t('ingredientForm.error.nameRequired'));
      return;
    }

    if (!ingredientForm.unit.trim()) {
      setMessage(t('ingredientForm.error.unitRequired'));
      return;
    }

    const payload = {
      name: ingredientForm.name.trim(),
      unit: ingredientForm.unit,
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
    <FormScreen>
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
        <View style={isWide ? styles.twoColumnRow : styles.stackRow}>
          <View style={styles.flexItem}>
            <ThemedSelect
              value={ingredientForm.unit}
              onValueChange={(value) => setIngredientForm((current) => ({ ...current, unit: value }))}
              items={unitOptions}
              placeholder={t('ingredientForm.unit')}
              modalTitle={t('ingredientForm.unit')}
              canItemAction={() => true}
              onItemAction={async (item) => {
                const target = units.find((unit) => unit.name === item.value);
                if (!target) {
                  return;
                }

                const error = await deleteUnit({ id: target.id });
                if (error) {
                  setMessage(error);
                  return;
                }

                if (ingredientForm.unit === item.value) {
                  const fallback = units.find((unit) => unit.id !== target.id)?.name ?? '';
                  setIngredientForm((current) => ({ ...current, unit: fallback }));
                }
                setMessage('');
              }}
              onAddNew={async (name) => {
                const normalizedName = name.trim().toLowerCase();
                if (!normalizedName) {
                  setMessage(t('ingredientForm.error.newUnitRequired'));
                  return;
                }

                const createdUnit = await addUnit({ name: normalizedName });
                if (!createdUnit) {
                  setMessage(t('ingredientForm.error.unitAlreadyExists'));
                  return;
                }

                setIngredientForm((current) => ({ ...current, unit: createdUnit.name }));
                setMessage('');
              }}
              addNewPlaceholder={t('ingredientForm.newUnitPlaceholder')}
            />
          </View>
          <View style={styles.flexItem}>
            <ThemedInput
              placeholder={t('ingredientForm.lowStockThreshold')}
              keyboardType="decimal-pad"
              value={ingredientForm.lowStockThreshold}
              onChangeText={(value) => setIngredientForm((current) => ({ ...current, lowStockThreshold: value }))}
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.actionsRow}>
          <ThemedButton style={styles.primaryButton} label={t('ingredientForm.save')} onPress={submitIngredient} />
          <ThemedButton variant="secondary" style={styles.secondaryButton} label={t('common.back')} onPress={() => router.back()} />
        </View>
      </ThemedCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  messageCard: {
    padding: 12,
  },
  card: {
    gap: 10,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stackRow: {
    gap: 8,
  },
  flexItem: {
    flex: 1,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
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
});

