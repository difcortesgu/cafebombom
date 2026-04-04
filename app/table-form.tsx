import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
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

  const { hydrate, tables, createTable, updateTable } = useSalesStore();

  const [tableName, setTableName] = useState('');
  const [message, setMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate]),
  );

  useEffect(() => {
    if (!tableId) {
      setTableName('');
      return;
    }

    const table = tables.find((item) => item.id === tableId);
    if (table) {
      setTableName(table.name);
    }
  }, [tableId, tables]);

  const submit = async () => {
    const normalizedName = tableName.trim();
    if (!normalizedName) {
      setMessage('Table name is required.');
      return;
    }

    if (tableId) {
      await updateTable(tableId, normalizedName);
    } else {
      await createTable(normalizedName);
    }

    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{tableId ? 'Edit table' : 'Create table'}</ThemedText>

      {message ? (
        <ThemedCard style={styles.card}>
          <ThemedText>{message}</ThemedText>
        </ThemedCard>
      ) : null}

      <ThemedCard style={styles.card}>
        <ThemedInput value={tableName} placeholder="Example: Patio 2" onChangeText={setTableName} style={styles.input} />
        <View style={styles.actionsRow}>
          <ThemedButton style={styles.primaryButton} label={tableId ? 'Save changes' : 'Create table'} onPress={submit} />
          <ThemedButton variant="secondary" style={styles.secondaryButton} label="Back" onPress={() => router.back()} />
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
  card: {
    gap: 10,
  },
  input: {
    paddingVertical: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 10,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});
