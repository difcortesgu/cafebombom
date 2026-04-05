import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { ThemedInput } from '@/components/ui/themed-input';
import { t } from '@/i18n';
import { useInventoryStore } from '@/stores/inventory';

type Section = 'suppliers' | 'restock';

function normalizeSection(value?: string | string[]): Section {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'restock' ? 'restock' : 'suppliers';
}

export default function InventoryFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string | string[] }>();
  const initialSection = normalizeSection(params.section);

  const { suppliers, hydrate, addSupplier, addRestock, ingredients } = useInventoryStore();

  const [section, setSection] = useState<Section>(initialSection);
  const [message, setMessage] = useState('');
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', notes: '' });
  const [restockForm, setRestockForm] = useState({ ingredientId: '', quantityAdded: '1', cost: '0', supplierId: '' });

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate]),
  );

  const selectedIngredient = useMemo(
    () => ingredients.find((ingredient) => ingredient.id === restockForm.ingredientId) ?? null,
    [ingredients, restockForm.ingredientId],
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === restockForm.supplierId) ?? null,
    [restockForm.supplierId, suppliers],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{t('inventoryForm.title')}</ThemedText>
      {message ? (
        <ThemedCard style={styles.card}>
          <ThemedText>{message}</ThemedText>
        </ThemedCard>
      ) : null}

      <View style={styles.tabRow}>
        {(['suppliers', 'restock'] as Section[]).map((item) => (
          <ThemedChip key={item} style={styles.sectionButton} label={item === 'suppliers' ? t('inventoryForm.tab.suppliers') : t('inventoryForm.tab.restock')} active={section === item} onPress={() => setSection(item)} />
        ))}
      </View>

      {section === 'suppliers' ? (
        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">{t('inventoryForm.suppliers.title')}</ThemedText>
          <ThemedInput placeholder={t('inventoryForm.suppliers.name')} value={supplierForm.name} onChangeText={(value) => setSupplierForm((f) => ({ ...f, name: value }))} style={styles.input} />
          <ThemedInput placeholder={t('inventoryForm.suppliers.phone')} value={supplierForm.phone} onChangeText={(value) => setSupplierForm((f) => ({ ...f, phone: value }))} style={styles.input} />
          <ThemedInput placeholder={t('inventoryForm.suppliers.notes')} value={supplierForm.notes} onChangeText={(value) => setSupplierForm((f) => ({ ...f, notes: value }))} style={styles.input} />
          <View style={styles.actionsRow}>
            <ThemedButton
              style={styles.primaryButton}
              label={t('inventoryForm.suppliers.save')}
              onPress={async () => {
                if (!supplierForm.name.trim()) {
                  setMessage(t('inventoryForm.suppliers.required'));
                  return;
                }
                await addSupplier({ name: supplierForm.name.trim(), phone: supplierForm.phone, notes: supplierForm.notes });
                router.back();
              }}
            />
            <ThemedButton variant="secondary" style={styles.secondaryButton} label={t('common.back')} onPress={() => router.back()} />
          </View>
        </ThemedCard>
      ) : null}

      {section === 'restock' ? (
        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">{t('inventoryForm.restock.title')}</ThemedText>
          <ThemedText style={styles.smallText}>{t('inventoryForm.restock.ingredient')}</ThemedText>
          <View style={styles.tabRow}>
            {ingredients.map((ingredient) => (
              <ThemedChip
                key={ingredient.id}
                style={styles.sectionButton}
                label={ingredient.name}
                active={restockForm.ingredientId === ingredient.id}
                onPress={() => setRestockForm((f) => ({ ...f, ingredientId: ingredient.id }))}
              />
            ))}
          </View>
          {selectedIngredient ? <ThemedText style={styles.smallText}>{t('inventoryForm.restock.selected')}: {selectedIngredient.name}</ThemedText> : <ThemedText style={styles.smallText}>{t('inventoryForm.restock.selectPrompt')}</ThemedText>}

          <ThemedInput placeholder={t('inventoryForm.restock.quantity')} keyboardType="decimal-pad" value={restockForm.quantityAdded} onChangeText={(value) => setRestockForm((f) => ({ ...f, quantityAdded: value }))} style={styles.input} />
          <ThemedInput placeholder={t('inventoryForm.restock.cost')} keyboardType="decimal-pad" value={restockForm.cost} onChangeText={(value) => setRestockForm((f) => ({ ...f, cost: value }))} style={styles.input} />

          <ThemedText style={styles.smallText}>{t('inventoryForm.restock.supplierOptional')}</ThemedText>
          <View style={styles.tabRow}>
            <ThemedChip style={styles.sectionButton} label={t('inventoryForm.restock.noSupplier')} active={!restockForm.supplierId} onPress={() => setRestockForm((f) => ({ ...f, supplierId: '' }))} />
            {suppliers.map((supplier) => (
              <ThemedChip
                key={supplier.id}
                style={styles.sectionButton}
                label={supplier.name}
                active={restockForm.supplierId === supplier.id}
                onPress={() => setRestockForm((f) => ({ ...f, supplierId: supplier.id }))}
              />
            ))}
          </View>
          {selectedSupplier ? <ThemedText style={styles.smallText}>{t('inventoryForm.restock.supplier')}: {selectedSupplier.name}</ThemedText> : null}

          <View style={styles.actionsRow}>
            <ThemedButton
              style={styles.primaryButton}
              label={t('inventoryForm.restock.save')}
              onPress={async () => {
                if (!restockForm.ingredientId) {
                  setMessage(t('inventoryForm.restock.required'));
                  return;
                }

                await addRestock({
                  ingredientId: restockForm.ingredientId,
                  quantityAdded: Number(restockForm.quantityAdded || '0'),
                  cost: Number(restockForm.cost || '0'),
                  supplierId: restockForm.supplierId || undefined,
                });

                router.back();
              }}
            />
            <ThemedButton variant="secondary" style={styles.secondaryButton} label={t('common.back')} onPress={() => router.back()} />
          </View>
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
    flexWrap: 'wrap',
  },
  sectionButton: {
    borderRadius: 10,
  },
  card: {
    gap: 10,
  },
  input: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    paddingVertical: 10,
    flex: 1,
  },
  secondaryButton: {
    paddingVertical: 10,
  },
  smallText: {
    opacity: 0.9,
    fontSize: 13,
  },
});
