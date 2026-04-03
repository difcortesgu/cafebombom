import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { useAuthStore } from '@/stores/auth';
import { useSalesStore } from '@/stores/sales';

export default function TablesScreen() {
  const palette = useAppColors();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { hydrate, tables, createTable, updateTable, deleteTable } = useSalesStore();

  const [tableName, setTableName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate])
  );

  if (currentUser?.role !== 'owner') {
    return (
      <ThemedView style={styles.lockedContainer}>
        <ThemedText type="title">Tables</ThemedText>
        <ThemedText>Owner access is required to manage restaurant tables.</ThemedText>
      </ThemedView>
    );
  }

  const submitTable = async () => {
    const normalizedName = tableName.trim();
    if (!normalizedName) {
      setMessage('Table name is required.');
      return;
    }

    if (editingId) {
      await updateTable(editingId, normalizedName);
      setMessage('Table updated.');
    } else {
      await createTable(normalizedName);
      setMessage('Table created.');
    }

    setTableName('');
    setEditingId(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Tables</ThemedText>
      <ThemedText>Manage table names for dine-in order assignment.</ThemedText>

      {message ? (
        <ThemedCard style={styles.card}>
          <ThemedText>{message}</ThemedText>
        </ThemedCard>
      ) : null}

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">{editingId ? 'Edit table' : 'Create table'}</ThemedText>
        <ThemedInput
          value={tableName}
          placeholder="Example: Patio 2"
          onChangeText={setTableName}
          style={styles.input}
        />
        <View style={styles.actionsRow}>
          <ThemedButton
            style={styles.primaryButton}
            label={editingId ? 'Save changes' : 'Create table'}
            onPress={submitTable}
          />
          {editingId ? (
            <ThemedButton
              variant="secondary"
              style={styles.secondaryButton}
              label="Cancel"
              onPress={() => {
                setEditingId(null);
                setTableName('');
              }}
            />
          ) : null}
        </View>
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Table list</ThemedText>
        {tables.length === 0 ? (
          <ThemedText style={styles.smallText}>No tables yet.</ThemedText>
        ) : (
          tables.map((table) => (
            <View key={table.id} style={[styles.listItem, { borderColor: palette.border }]}>
              <View style={styles.listTextWrap}>
                <ThemedText type="defaultSemiBold">{table.name}</ThemedText>
                <ThemedText style={styles.smallText}>
                  Added {new Date(Number(table.created_at) * 1000).toLocaleDateString()}
                </ThemedText>
              </View>
              <View style={styles.inlineActions}>
                <ThemedButton
                  variant="secondary"
                  style={styles.secondaryButton}
                  label="Edit"
                  onPress={() => {
                    setEditingId(table.id);
                    setTableName(table.name);
                  }}
                />
                <ThemedButton
                  variant="secondary"
                  style={styles.secondaryButton}
                  label="Delete"
                  onPress={async () => {
                    try {
                      await deleteTable(table.id);
                      if (editingId === table.id) {
                        setEditingId(null);
                        setTableName('');
                      }
                      setMessage('Table deleted.');
                    } catch {
                      setMessage('Cannot delete a table that has linked sales.');
                    }
                  }}
                />
              </View>
            </View>
          ))
        )}
      </ThemedCard>
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
    paddingHorizontal: 20,
    gap: 10,
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
  listItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listTextWrap: {
    flex: 1,
    gap: 4,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallText: {
    opacity: 0.9,
    fontSize: 13,
  },
});
