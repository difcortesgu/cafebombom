import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useInventoryStore } from '@/stores/inventory';

type Section = 'ingredients' | 'suppliers' | 'restock';

export default function InventoryScreen() {
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Inventory</ThemedText>
      <ThemedText>Manage ingredients, suppliers, and stock-ins.</ThemedText>

      <View style={styles.tabRow}>
        {(['ingredients', 'suppliers', 'restock'] as Section[]).map((item) => (
          <Pressable
            key={item}
            style={[styles.sectionButton, section === item && styles.sectionButtonActive]}
            onPress={() => setSection(item)}>
            <ThemedText style={section === item ? styles.sectionTextActive : undefined}>{item}</ThemedText>
          </Pressable>
        ))}
      </View>

      {section === 'ingredients' ? (
        <>
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Add ingredient</ThemedText>
            <TextInput
              placeholder="Name"
              value={ingredientForm.name}
              onChangeText={(value) => setIngredientForm((f) => ({ ...f, name: value }))}
              style={styles.input}
            />
            <View style={styles.row}>
              <TextInput
                placeholder="Unit"
                value={ingredientForm.unit}
                onChangeText={(value) => setIngredientForm((f) => ({ ...f, unit: value }))}
                style={[styles.input, styles.half]}
              />
              <TextInput
                placeholder="Qty"
                keyboardType="decimal-pad"
                value={ingredientForm.quantity}
                onChangeText={(value) => setIngredientForm((f) => ({ ...f, quantity: value }))}
                style={[styles.input, styles.half]}
              />
            </View>
            <TextInput
              placeholder="Low stock threshold"
              keyboardType="decimal-pad"
              value={ingredientForm.lowStockThreshold}
              onChangeText={(value) => setIngredientForm((f) => ({ ...f, lowStockThreshold: value }))}
              style={styles.input}
            />
            <Pressable
              style={styles.primaryButton}
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
              <ThemedText style={styles.primaryText}>Save ingredient</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Ingredient list</ThemedText>
            {ingredients.map((item) => {
              const isLow = Number(item.quantity) <= Number(item.low_stock_threshold);
              return (
                <View key={item.id} style={styles.listItem}>
                  <View>
                    <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                    <ThemedText style={styles.smallText}>
                      {Number(item.quantity).toFixed(2)} {item.unit} · threshold {item.low_stock_threshold}
                    </ThemedText>
                    {isLow ? <ThemedText style={styles.lowText}>Low stock</ThemedText> : null}
                  </View>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() =>
                      updateIngredient({
                        id: item.id,
                        quantity: Number(item.quantity) + 1,
                      })
                    }>
                    <ThemedText>+1</ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </ThemedView>

          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Low-stock alert</ThemedText>
            <ThemedText>{lowStock.length} ingredient(s) below threshold.</ThemedText>
          </ThemedView>
        </>
      ) : null}

      {section === 'suppliers' ? (
        <>
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Add supplier</ThemedText>
            <TextInput
              placeholder="Supplier name"
              value={supplierForm.name}
              onChangeText={(value) => setSupplierForm((f) => ({ ...f, name: value }))}
              style={styles.input}
            />
            <TextInput
              placeholder="Phone"
              value={supplierForm.phone}
              onChangeText={(value) => setSupplierForm((f) => ({ ...f, phone: value }))}
              style={styles.input}
            />
            <TextInput
              placeholder="Notes"
              value={supplierForm.notes}
              onChangeText={(value) => setSupplierForm((f) => ({ ...f, notes: value }))}
              style={styles.input}
            />
            <Pressable
              style={styles.primaryButton}
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
              <ThemedText style={styles.primaryText}>Save supplier</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Supplier list</ThemedText>
            {suppliers.map((item) => (
              <View key={item.id} style={styles.listItemColumn}>
                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                <ThemedText style={styles.smallText}>{item.phone || 'No phone'}</ThemedText>
                <ThemedText style={styles.smallText}>{item.notes || 'No notes'}</ThemedText>
              </View>
            ))}
          </ThemedView>
        </>
      ) : null}

      {section === 'restock' ? (
        <>
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Record stock-in</ThemedText>
            <TextInput
              placeholder="Ingredient ID"
              keyboardType="number-pad"
              value={restockForm.ingredientId}
              onChangeText={(value) => setRestockForm((f) => ({ ...f, ingredientId: value }))}
              style={styles.input}
            />
            <TextInput
              placeholder="Quantity added"
              keyboardType="decimal-pad"
              value={restockForm.quantityAdded}
              onChangeText={(value) => setRestockForm((f) => ({ ...f, quantityAdded: value }))}
              style={styles.input}
            />
            <TextInput
              placeholder="Cost"
              keyboardType="decimal-pad"
              value={restockForm.cost}
              onChangeText={(value) => setRestockForm((f) => ({ ...f, cost: value }))}
              style={styles.input}
            />
            <TextInput
              placeholder="Supplier ID (optional)"
              keyboardType="number-pad"
              value={restockForm.supplierId}
              onChangeText={(value) => setRestockForm((f) => ({ ...f, supplierId: value }))}
              style={styles.input}
            />
            <Pressable
              style={styles.primaryButton}
              onPress={async () => {
                if (!restockForm.ingredientId) {
                  return;
                }

                await addRestock({
                  ingredientId: Number(restockForm.ingredientId),
                  quantityAdded: Number(restockForm.quantityAdded || '0'),
                  cost: Number(restockForm.cost || '0'),
                  supplierId: restockForm.supplierId ? Number(restockForm.supplierId) : undefined,
                });

                setRestockForm({ ingredientId: '', quantityAdded: '1', cost: '0', supplierId: '' });
              }}>
              <ThemedText style={styles.primaryText}>Save restock</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Recent stock-in logs</ThemedText>
            {restocks.map((log) => (
              <View key={log.id} style={styles.listItemColumn}>
                <ThemedText type="defaultSemiBold">{log.ingredient_name}</ThemedText>
                <ThemedText style={styles.smallText}>
                  +{Number(log.quantity_added).toFixed(2)} · ${Number(log.cost).toFixed(2)} ·{' '}
                  {new Date(Number(log.date) * 1000).toLocaleString()}
                </ThemedText>
              </View>
            ))}
          </ThemedView>
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
    borderWidth: 1,
    borderColor: '#BFA792',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sectionButtonActive: {
    backgroundColor: '#B64D1A',
    borderColor: '#B64D1A',
  },
  sectionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C5AA90',
    padding: 12,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#BFA792',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#1D130D',
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  half: {
    flex: 1,
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#B64D1A',
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#A98F79',
    borderRadius: 8,
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
