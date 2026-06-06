import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { IngredientForm } from '@/components/catalog/ingredient-form';
import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
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

  const { hydrate: hydrateInventory } = useInventoryStore();

  useFocusEffect(
    useCallback(() => {
      void hydrateInventory();
    }, [hydrateInventory]),
  );

  return (
    <FormScreen>
      <ThemedText type="title">
        {ingredientId ? t('ingredientForm.title.edit') : t('ingredientForm.title.add')}
      </ThemedText>
      <IngredientForm mode={ingredientId ? { ingredientId } : 'create'} onClose={() => router.back()} />
    </FormScreen>
  );
}
