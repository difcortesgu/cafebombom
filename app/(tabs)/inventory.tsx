import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { useInventoryStore } from '@/stores/inventory';

type Section = 'suppliers' | 'restock';

export default function InventoryScreen() {
  const palette = useAppColors();
  const [section, setSection] = useState<Section>('suppliers');

  const {
    suppliers,
    restocks,
    hydrate,
    addSupplier,
    addRestock,
    ingredients,
  } = useInventoryStore();

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    phone: '',
    notes: '',
  });

  const [restockForm, setRestockForm] = useState({
    ingredientId: '',
    quantityAdded: '1',
    cost: '0',
    supplierId: '',
  });

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate])
  );

  const selectedIngredient = useMemo(
    () => ingredients.find((ingredient) => ingredient.id === restockForm.ingredientId) ?? null,
    [ingredients, restockForm.ingredientId]
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === restockForm.supplierId) ?? null,
    [restockForm.supplierId, suppliers]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Inventory</ThemedText>
      <ThemedText>Manage suppliers and stock-ins.</ThemedText>

      <View style={styles.tabRow}>
        {(['suppliers', 'restock'] as Section[]).map((item) => (
          <ThemedChip
            key={item}
            style={styles.sectionButton}
            label={item}
            active={section === item}
            onPress={() => setSection(item)}
          />
        ))}
      </View>

      {section === 'suppliers' ? (
        <>
          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Add supplier</ThemedText>
            <ThemedInput
              placeholder="Supplier name"
              value={supplierForm.name}
              onChangeText={(value) => setSupplierForm((f) => ({ ...f, name: value }))}
              style={styles.input}
            />
            <ThemedInput
              placeholder="Phone"
              value={supplierForm.phone}
              onChangeText={(value) => setSupplierForm((f) => ({ ...f, phone: value }))}
              style={styles.input}
            />
            <ThemedInput
              placeholder="Notes"
              value={supplierForm.notes}
              onChangeText={(value) => setSupplierForm((f) => ({ ...f, notes: value }))}
              style={styles.input}
            />
            <ThemedButton
              style={styles.primaryButton}
              label="Save supplier"
              onPress={async () => {
                if (!supplierForm.name.trim()) {
                  return;
                }
                await addSupplier({
                  name: supplierForm.name.trim(),
                  phone: supplierForm.phone,
                  notes: supplierForm.notes,
                });
                setSupplierForm({ name: '', phone: '', notes: '' });
              }}>
            </ThemedButton>
          </ThemedCard>

          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Supplier list</ThemedText>
            {suppliers.map((item) => (
              <View key={item.id} style={[styles.listItemColumn, { borderColor: palette.border }]}>
                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                <ThemedText style={styles.smallText}>{item.phone || 'No phone'}</ThemedText>
                <ThemedText style={styles.smallText}>{item.notes || 'No notes'}</ThemedText>
              </View>
            ))}
          </ThemedCard>
        </>
      ) : null}

      {section === 'restock' ? (
        <>
          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Record stock-in</ThemedText>
            <ThemedText style={styles.smallText}>Ingredient</ThemedText>
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
            {selectedIngredient ? (
              <ThemedText style={styles.smallText}>
                Selected: {selectedIngredient.name}
              </ThemedText>
            ) : (
              <ThemedText style={styles.smallText}>Select an ingredient to continue.</ThemedText>
            )}
            <ThemedInput
              placeholder="Quantity added"
              keyboardType="decimal-pad"
              value={restockForm.quantityAdded}
              onChangeText={(value) => setRestockForm((f) => ({ ...f, quantityAdded: value }))}
              style={styles.input}
            />
            <ThemedInput
              placeholder="Cost"
              keyboardType="decimal-pad"
              value={restockForm.cost}
              onChangeText={(value) => setRestockForm((f) => ({ ...f, cost: value }))}
              style={styles.input}
            />
            <ThemedText style={styles.smallText}>Supplier (optional)</ThemedText>
            <View style={styles.tabRow}>
              <ThemedChip
                style={styles.sectionButton}
                label="No supplier"
                active={!restockForm.supplierId}
                onPress={() => setRestockForm((f) => ({ ...f, supplierId: '' }))}
              />
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
            {selectedSupplier ? <ThemedText style={styles.smallText}>Supplier: {selectedSupplier.name}</ThemedText> : null}
            <ThemedButton
              style={styles.primaryButton}
              label="Save restock"
              onPress={async () => {
                if (!restockForm.ingredientId) {
                  return;
                }

                await addRestock({
                  ingredientId: restockForm.ingredientId,
                  quantityAdded: Number(restockForm.quantityAdded || '0'),
                  cost: Number(restockForm.cost || '0'),
                  supplierId: restockForm.supplierId || undefined,
                });

                setRestockForm({ ingredientId: '', quantityAdded: '1', cost: '0', supplierId: '' });
              }}>
            </ThemedButton>
          </ThemedCard>

          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Recent stock-in logs</ThemedText>
            {restocks.map((log) => (
              <View key={log.id} style={[styles.listItemColumn, { borderColor: palette.border }]}>
                <ThemedText type="defaultSemiBold">{log.ingredient_name}</ThemedText>
                <ThemedText style={styles.smallText}>
                  +{Number(log.quantity_added).toFixed(2)} · ${Number(log.cost).toFixed(2)} ·{' '}
                  {new Date(Number(log.date) * 1000).toLocaleString()}
                </ThemedText>
              </View>
            ))}
          </ThemedCard>
        </>
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
  input: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    paddingVertical: 10,
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
