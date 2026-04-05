import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useInventoryStore } from '@/stores/inventory';

type Section = 'suppliers' | 'restock';

export default function InventoryScreen() {
  const palette = useAppColors();
  const router = useRouter();
  const [section, setSection] = useState<Section>('suppliers');

  const { suppliers, restocks, hydrate } = useInventoryStore();

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate]),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{t('inventory.title')}</ThemedText>
      <ThemedText>{t('inventory.subtitle')}</ThemedText>

      <View style={styles.tabRow}>
        {(['suppliers', 'restock'] as Section[]).map((item) => (
          <ThemedChip
            key={item}
            style={styles.sectionButton}
            label={item === 'suppliers' ? t('inventory.tab.suppliers') : t('inventory.tab.restock')}
            active={section === item}
            onPress={() => setSection(item)}
          />
        ))}
      </View>

      {section === 'suppliers' ? (
        <ThemedCard style={styles.card}>
          <View style={styles.headerRow}>
            <ThemedText type="subtitle">{t('inventory.suppliers.list')}</ThemedText>
            <ThemedButton label={t('inventory.suppliers.add')} onPress={() => router.push({ pathname: '/inventory-form', params: { section: 'suppliers' } })} />
          </View>
          {suppliers.map((item) => (
            <View key={item.id} style={[styles.listItemColumn, { borderColor: palette.border }]}>
              <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
              <ThemedText style={styles.smallText}>{item.phone || t('inventory.suppliers.noPhone')}</ThemedText>
              <ThemedText style={styles.smallText}>{item.notes || t('inventory.suppliers.noNotes')}</ThemedText>
            </View>
          ))}
        </ThemedCard>
      ) : null}

      {section === 'restock' ? (
        <ThemedCard style={styles.card}>
          <View style={styles.headerRow}>
            <ThemedText type="subtitle">{t('inventory.restock.recent')}</ThemedText>
            <ThemedButton label={t('inventory.restock.add')} onPress={() => router.push({ pathname: '/inventory-form', params: { section: 'restock' } })} />
          </View>

          {restocks.map((log) => (
            <View key={log.id} style={[styles.listItemColumn, { borderColor: palette.border }]}>
              <ThemedText type="defaultSemiBold">{log.ingredient_name}</ThemedText>
              <ThemedText style={styles.smallText}>+{Number(log.quantity_added).toFixed(2)} · ${Number(log.cost).toFixed(2)} · {new Date(Number(log.date) * 1000).toLocaleString()}</ThemedText>
            </View>
          ))}
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
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionButton: {
    borderRadius: 10,
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
  listItemColumn: {
    borderWidth: 1,
    borderColor: '#C5AA90',
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  smallText: {
    opacity: 0.9,
    fontSize: 13,
  },
});
