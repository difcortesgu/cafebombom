import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { useAppColors } from '@/hooks/use-theme-color';
import { useAuthStore } from '@/stores/auth';
import { useSalesStore } from '@/stores/sales';

export default function TablesScreen() {
  const palette = useAppColors();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { hydrate, tables, deleteTable } = useSalesStore();

  const [message, setMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate]),
  );

  if (currentUser?.role !== 'owner') {
    return (
      <ThemedView style={styles.lockedContainer}>
        <ThemedText type="title">Tables</ThemedText>
        <ThemedText>Owner access is required to manage restaurant tables.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Tables</ThemedText>
      <ThemedText>List view with quick actions.</ThemedText>

      {message ? (
        <ThemedCard style={styles.card}>
          <ThemedText>{message}</ThemedText>
        </ThemedCard>
      ) : null}

      <ThemedCard style={styles.card}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">Table list</ThemedText>
          <ThemedButton label="Add table" onPress={() => router.push('/table-form')} />
        </View>

        {tables.length === 0 ? (
          <ThemedText style={styles.smallText}>No tables yet.</ThemedText>
        ) : (
          tables.map((table) => (
            <View key={table.id} style={[styles.listItem, { borderColor: palette.border }]}>
              <View style={styles.listTextWrap}>
                <ThemedText type="defaultSemiBold">{table.name}</ThemedText>
                <ThemedText style={styles.smallText}>Added {new Date(Number(table.created_at) * 1000).toLocaleDateString()}</ThemedText>
              </View>
              <View style={styles.inlineActions}>
                <ThemedButton
                  variant="secondary"
                  style={styles.secondaryButton}
                  label="Edit"
                  onPress={() => router.push({ pathname: '/table-form', params: { id: table.id } })}
                />
                <ThemedButton
                  variant="secondary"
                  style={styles.secondaryButton}
                  icon="trash.fill"
                  onPress={async () => {
                    try {
                      await deleteTable(table.id);
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
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
