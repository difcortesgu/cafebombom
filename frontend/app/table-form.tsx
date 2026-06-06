import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { TableForm } from '@/components/operations/table-form';
import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { t } from '@/i18n';
import { useSalesStore } from '@/stores/sales';

function normalizeParam(value?: string | string[]) {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default function TableFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const tableId = normalizeParam(params.id);

  const { hydrate } = useSalesStore();

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate]),
  );

  return (
    <FormScreen>
      <ThemedText type="title">{tableId ? t('tableForm.editTitle') : t('tableForm.createTitle')}</ThemedText>
      <TableForm mode={tableId ? { tableId } : 'create'} onClose={() => router.back()} />
    </FormScreen>
  );
}
