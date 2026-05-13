import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { t } from '@/i18n';
import { useInventoryStore } from '@/stores/inventory';

type Section = 'suppliers' | 'restock';

function normalizeSection(value?: string | string[]): Section {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'restock' ? 'restock' : 'suppliers';
}

function normalizeParam(value?: string | string[]): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? '';
}

export default function InventoryFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    section?: string | string[];
    returnSection?: string | string[];
    ingredientId?: string | string[];
    quantityAdded?: string | string[];
    cost?: string | string[];
    supplierId?: string | string[];
  }>();
  const initialSection = normalizeSection(params.section);
  const returnSection = normalizeSection(params.returnSection);
  const initialIngredientId = normalizeParam(params.ingredientId);
  const isRestockSection = initialSection === 'restock';
  const returnToRestock = returnSection === 'restock';

  const { suppliers, hydrate, addSupplier, addRestock, ingredients } = useInventoryStore();

  const [message, setMessage] = useState('');
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', notes: '' });
  const [restockForm, setRestockForm] = useState({
    ingredientId: initialIngredientId,
    quantityAdded: normalizeParam(params.quantityAdded) || '1',
    cost: normalizeParam(params.cost) || '0',
    supplierId: normalizeParam(params.supplierId),
  });

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate]),
  );

  useEffect(() => {
    setRestockForm((current) => {
      const ingredientIdFromParams = normalizeParam(params.ingredientId);
      const quantityAddedFromParams = normalizeParam(params.quantityAdded);
      const costFromParams = normalizeParam(params.cost);
      const supplierIdFromParams = normalizeParam(params.supplierId);

      const next = {
        ...current,
        ingredientId: ingredientIdFromParams || current.ingredientId,
        quantityAdded: quantityAddedFromParams || current.quantityAdded,
        cost: costFromParams || current.cost,
        supplierId: supplierIdFromParams,
      };

      if (
        next.ingredientId === current.ingredientId
        && next.quantityAdded === current.quantityAdded
        && next.cost === current.cost
        && next.supplierId === current.supplierId
      ) {
        return current;
      }

      return next;
    });
  }, [params.cost, params.ingredientId, params.quantityAdded, params.supplierId]);

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

      {!isRestockSection ? (
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

                const supplierId = await addSupplier({ name: supplierForm.name.trim(), phone: supplierForm.phone, notes: supplierForm.notes });
                if (!supplierId) {
                  setMessage(t('inventoryForm.suppliers.duplicate'));
                  return;
                }

                if (returnToRestock) {
                  router.replace({
                    pathname: '/inventory-form',
                    params: {
                      section: 'restock',
                      ingredientId: normalizeParam(params.ingredientId),
                      quantityAdded: normalizeParam(params.quantityAdded),
                      cost: normalizeParam(params.cost),
                      supplierId,
                    },
                  });
                  return;
                }

                router.back();
              }}
            />
            <ThemedButton
              variant="secondary"
              style={styles.secondaryButton}
              label={t('common.back')}
              onPress={() => {
                if (returnToRestock) {
                  router.replace({
                    pathname: '/inventory-form',
                    params: {
                      section: 'restock',
                      ingredientId: normalizeParam(params.ingredientId),
                      quantityAdded: normalizeParam(params.quantityAdded),
                      cost: normalizeParam(params.cost),
                      supplierId: normalizeParam(params.supplierId),
                    },
                  });
                  return;
                }

                router.back();
              }}
            />
          </View>
        </ThemedCard>
      ) : null}

      {isRestockSection ? (
        <ThemedCard style={styles.card}>
          <ThemedText type="subtitle">{t('inventoryForm.restock.title')}</ThemedText>
          <ThemedText style={styles.smallText}>{t('inventoryForm.restock.ingredient')}</ThemedText>
          <View style={styles.tabRow}>
            {ingredients.map((ingredient) => (
              <ThemedButton
                key={ingredient.id}
                variant={restockForm.ingredientId === ingredient.id ? 'primary' : 'secondary'}
                style={styles.secondaryButton}
                label={ingredient.name}
                onPress={() => setRestockForm((f) => ({ ...f, ingredientId: ingredient.id }))}
              />
            ))}
          </View>
          {selectedIngredient ? <ThemedText style={styles.smallText}>{t('inventoryForm.restock.selected')}: {selectedIngredient.name}</ThemedText> : <ThemedText style={styles.smallText}>{t('inventoryForm.restock.selectPrompt')}</ThemedText>}

          <ThemedInput placeholder={t('inventoryForm.restock.quantity')} keyboardType="decimal-pad" value={restockForm.quantityAdded} onChangeText={(value) => setRestockForm((f) => ({ ...f, quantityAdded: value }))} style={styles.input} />
          <ThemedInput placeholder={t('inventoryForm.restock.cost')} keyboardType="decimal-pad" value={restockForm.cost} onChangeText={(value) => setRestockForm((f) => ({ ...f, cost: value }))} style={styles.input} />

          <ThemedText style={styles.smallText}>{t('inventoryForm.restock.supplierOptional')}</ThemedText>
          <View style={styles.tabRow}>
            <ThemedButton
              variant={!restockForm.supplierId ? 'primary' : 'secondary'}
              style={styles.secondaryButton}
              label={t('inventoryForm.restock.noSupplier')}
              onPress={() => setRestockForm((f) => ({ ...f, supplierId: '' }))}
            />
            <ThemedButton
              variant="secondary"
              style={styles.secondaryButton}
              label={t('inventory.suppliers.add')}
              onPress={() => {
                router.replace({
                  pathname: '/inventory-form',
                  params: {
                    section: 'suppliers',
                    returnSection: 'restock',
                    ingredientId: restockForm.ingredientId,
                    quantityAdded: restockForm.quantityAdded,
                    cost: restockForm.cost,
                    supplierId: restockForm.supplierId,
                  },
                });
              }}
            />
            {suppliers.map((supplier) => (
              <ThemedButton
                key={supplier.id}
                variant={restockForm.supplierId === supplier.id ? 'primary' : 'secondary'}
                style={styles.secondaryButton}
                label={supplier.name}
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
