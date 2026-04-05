import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { useSalesStore } from '@/stores/sales';
import type { TableType } from '@/types/types';

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
  const [tableType, setTableType] = useState<TableType>('dine-in');
  const [message, setMessage] = useState('');

  const tableTypeOptions: { label: string; value: TableType }[] = [
    { label: 'Dine-in', value: 'dine-in' },
    { label: 'To-Go', value: 'to-go' },
    { label: 'Delivery', value: 'delivery' },
  ];

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate]),
  );

  useEffect(() => {
    if (!tableId) {
      setTableName('');
      setTableType('dine-in');
      return;
    }

    const table = tables.find((item) => item.id === tableId);
    if (table) {
      setTableName(table.name);
      setTableType(table.table_type);
    }
  }, [tableId, tables]);

  const submit = async () => {
    const normalizedName = tableName.trim();
    if (!normalizedName) {
      setMessage('Table name is required.');
      return;
    }

    if (tableId) {
      await updateTable({
        id: tableId,
        name: normalizedName,
        tableType,
      });
    } else {
      await createTable({
        name: normalizedName,
        tableType,
      });
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

        <ThemedText type="defaultSemiBold">Table type</ThemedText>
        <View style={styles.toggleGroup}>
          {tableTypeOptions.map((option) => {
            const selected = tableType === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.toggleRow, selected && styles.toggleRowActive]}
                onPress={() => setTableType(option.value)}>
                <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
              </Pressable>
            );
          })}
        </View>

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
  toggleGroup: {
    gap: 8,
  },
  toggleRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleRowActive: {
    borderColor: '#A98F79',
    backgroundColor: '#F4E6D8',
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
