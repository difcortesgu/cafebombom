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

type Section = 'ingredients' | 'suppliers' | 'restock';

export default function InventoryScreen() {
  const palette = useAppColors();
  const [section, setSection] = useState<Section>('ingredients');

  const {
    ingredients,
    suppliers,
    restocks,
    hydrate,
    addIngredient,
    addSupplier,
    addRestock,
    updateIngredient,
  } = useInventoryStore();

  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    unit: 'pcs',
    quantity: '0',
    lowStockThreshold: '5',
  });

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

  const lowStock = useMemo(
    () => ingredients.filter((item) => Number(item.quantity) <= Number(item.low_stock_threshold)),
    [ingredients]
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
      <ThemedText>Manage ingredients, suppliers, and stock-ins.</ThemedText>

      <View style={styles.tabRow}>
        {(['ingredients', 'suppliers', 'restock'] as Section[]).map((item) => (
          <ThemedChip
            key={item}
            style={styles.sectionButton}
            label={item}
            active={section === item}
            onPress={() => setSection(item)}
          />
        ))}
      </View>

      {section === 'ingredients' ? (
        <>
          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Add ingredient</ThemedText>
            <ThemedInput
              placeholder="Name"
              value={ingredientForm.name}
              onChangeText={(value) => setIngredientForm((f) => ({ ...f, name: value }))}
              style={styles.input}
            />
            <View style={styles.row}>
              <ThemedInput
                placeholder="Unit"
                value={ingredientForm.unit}
                onChangeText={(value) => setIngredientForm((f) => ({ ...f, unit: value }))}
                style={[styles.input, styles.half]}
              />
              <ThemedInput
                placeholder="Qty"
                keyboardType="decimal-pad"
                value={ingredientForm.quantity}
                onChangeText={(value) => setIngredientForm((f) => ({ ...f, quantity: value }))}
                style={[styles.input, styles.half]}
              />
            </View>
            <ThemedInput
              placeholder="Low stock threshold"
              keyboardType="decimal-pad"
              value={ingredientForm.lowStockThreshold}
              onChangeText={(value) => setIngredientForm((f) => ({ ...f, lowStockThreshold: value }))}
              style={styles.input}
            />
            <ThemedButton
              style={styles.primaryButton}
              label="Save ingredient"
              onPress={async () => {
                if (!ingredientForm.name.trim()) {
                  return;
                }
                await addIngredient({
                  name: ingredientForm.name.trim(),
                  unit: ingredientForm.unit.trim() || 'pcs',
                  quantity: Number(ingredientForm.quantity || '0'),
                  lowStockThreshold: Number(ingredientForm.lowStockThreshold || '0'),
                });
                setIngredientForm({ name: '', unit: 'pcs', quantity: '0', lowStockThreshold: '5' });
              }}>
            </ThemedButton>
          </ThemedCard>

          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Ingredient list</ThemedText>
            {ingredients.map((item) => {
              const isLow = Number(item.quantity) <= Number(item.low_stock_threshold);
              return (
                <View key={item.id} style={[styles.listItem, { borderColor: palette.border }]}>
                  <View>
                    <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                    <ThemedText style={styles.smallText}>
                      {Number(item.quantity).toFixed(2)} {item.unit} · threshold {item.low_stock_threshold}
                    </ThemedText>
                    {isLow ? <ThemedText style={[styles.lowText, { color: palette.warning }]}>Low stock</ThemedText> : null}
                  </View>
                  <ThemedButton
                    variant="secondary"
                    style={styles.secondaryButton}
                    label="+1"
                    onPress={() =>
                      updateIngredient({
                        id: item.id,
                        quantity: Number(item.quantity) + 1,
                      })
                    }
                  />
                </View>
              );
            })}
          </ThemedCard>

          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">Low-stock alert</ThemedText>
            <ThemedText>{lowStock.length} ingredient(s) below threshold.</ThemedText>
          </ThemedCard>
        </>
      ) : null}

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
  half: {
    flex: 1,
  },
  primaryButton: {
    paddingVertical: 10,
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C5AA90',
    borderRadius: 10,
    padding: 10,
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
  lowText: {
    color: '#B25A12',
    fontWeight: '600',
  },
});
