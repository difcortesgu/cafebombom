import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useInventoryStore } from '@/stores/inventory';
import { usePaymentMethodsStore } from '@/stores/payment-methods';

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
  const palette = useAppColors();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
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
  const { methods, hydrate: hydratePaymentMethods } = usePaymentMethodsStore();

  const [message, setMessage] = useState('');
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', notes: '' });
  const [restockForm, setRestockForm] = useState({
    ingredientId: initialIngredientId,
    quantityAdded: normalizeParam(params.quantityAdded) || '1',
    cost: normalizeParam(params.cost) || '0',
    supplierId: normalizeParam(params.supplierId),
    paymentMethodId: '',
  });
  const initialSupplierDefaultAppliedRef = useRef(false);
  const paymentMethodInitializedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      void hydrate();
      void hydratePaymentMethods();
    }, [hydrate, hydratePaymentMethods]),
  );

  useEffect(() => {
    if (paymentMethodInitializedRef.current) {
      return;
    }

    if (methods.length === 0) {
      return;
    }

    paymentMethodInitializedRef.current = true;
    setRestockForm((current) => {
      if (current.paymentMethodId) {
        return current;
      }

      return {
        ...current,
        paymentMethodId: methods[0]?.id ?? '',
      };
    });
  }, [methods]);

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

  useEffect(() => {
    if (initialSupplierDefaultAppliedRef.current) {
      return;
    }

    if (!restockForm.ingredientId || restockForm.supplierId) {
      return;
    }

    const ingredient = ingredients.find((item) => item.id === restockForm.ingredientId);
    if (!ingredient) {
      return;
    }

    initialSupplierDefaultAppliedRef.current = true;
    if (!ingredient.supplier_id) {
      return;
    }

    setRestockForm((current) => {
      if (current.supplierId) {
        return current;
      }

      return {
        ...current,
        supplierId: ingredient.supplier_id ?? '',
      };
    });
  }, [ingredients, restockForm.ingredientId, restockForm.supplierId]);

  const selectedIngredient = useMemo(
    () => ingredients.find((ingredient) => ingredient.id === restockForm.ingredientId) ?? null,
    [ingredients, restockForm.ingredientId],
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === restockForm.supplierId) ?? null,
    [restockForm.supplierId, suppliers],
  );

  return (
    <FormScreen>
      <ThemedText type="title">{t('inventoryForm.title')}</ThemedText>
      {message ? (
        <ThemedCard style={styles.card}>
          <ThemedText>{message}</ThemedText>
        </ThemedCard>
      ) : null}

      {!isRestockSection ? (
        <ThemedCard style={styles.card}>
          <View style={styles.labelWithIcon}>
            <Ionicons name="business-outline" size={18} color={palette.tint} />
            <ThemedText type="subtitle">{t('inventoryForm.suppliers.title')}</ThemedText>
          </View>
          <View style={isWide ? styles.twoColumnRow : styles.stackRow}>
            <View style={styles.flexItem}>
              <View style={styles.labelWithIcon}>
                <Ionicons name="document-outline" size={14} color={palette.mutedText} />
                <ThemedText style={styles.smallText}>{t('inventoryForm.suppliers.name')}</ThemedText>
              </View>
              <ThemedInput value={supplierForm.name} onChangeText={(value) => setSupplierForm((f) => ({ ...f, name: value }))} style={styles.input} />
            </View>
            <View style={styles.flexItem}>
              <View style={styles.labelWithIcon}>
                <Ionicons name="call-outline" size={14} color={palette.mutedText} />
                <ThemedText style={styles.smallText}>{t('inventoryForm.suppliers.phone')}</ThemedText>
              </View>
              <ThemedInput value={supplierForm.phone} onChangeText={(value) => setSupplierForm((f) => ({ ...f, phone: value }))} style={styles.input} />
            </View>
          </View>
          <View style={styles.labelWithIcon}>
            <Ionicons name="document-text-outline" size={14} color={palette.mutedText} />
            <ThemedText style={styles.smallText}>{t('inventoryForm.suppliers.notes')}</ThemedText>
          </View>
          <ThemedInput value={supplierForm.notes} onChangeText={(value) => setSupplierForm((f) => ({ ...f, notes: value }))} style={styles.input} />
          <View style={styles.actionsRow}>
            <ThemedButton
              style={styles.primaryButton}
              icon="checkmark-circle"
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
              icon="arrow-back"
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
          <View style={styles.labelWithIcon}>
            <Ionicons name="git-branch-outline" size={18} color={palette.tint} />
            <ThemedText type="subtitle">{t('inventoryForm.restock.title')}</ThemedText>
          </View>
          <View style={styles.labelWithIcon}>
            <Ionicons name="leaf-outline" size={14} color={palette.mutedText} />
            <ThemedText style={styles.smallText}>{t('inventoryForm.restock.ingredient')}</ThemedText>
          </View>
          <View style={styles.tabRow}>
            {ingredients.map((ingredient) => (
              <ThemedButton
                key={ingredient.id}
                variant={restockForm.ingredientId === ingredient.id ? 'primary' : 'secondary'}
                style={styles.secondaryButton}
                label={ingredient.name}
                onPress={() => setRestockForm((f) => ({
                  ...f,
                  ingredientId: ingredient.id,
                  supplierId: ingredient.supplier_id ?? '',
                }))}
              />
            ))}
          </View>
          {selectedIngredient ? <ThemedText style={styles.smallText}>{t('inventoryForm.restock.selected')}: {selectedIngredient.name}</ThemedText> : <ThemedText style={styles.smallText}>{t('inventoryForm.restock.selectPrompt')}</ThemedText>}

          <View style={isWide ? styles.twoColumnRow : styles.stackRow}>
            <View style={styles.flexItem}>
              <View style={styles.labelWithIcon}>
                <Ionicons name="layers-outline" size={14} color={palette.mutedText} />
                <ThemedText style={styles.smallText}>{t('inventoryForm.restock.quantity')}</ThemedText>
              </View>
              <ThemedInput keyboardType="decimal-pad" value={restockForm.quantityAdded} onChangeText={(value) => setRestockForm((f) => ({ ...f, quantityAdded: value }))} style={styles.input} />
            </View>
            <View style={styles.flexItem}>
              <View style={styles.labelWithIcon}>
                <Ionicons name="pricetag-outline" size={14} color={palette.mutedText} />
                <ThemedText style={styles.smallText}>{t('inventoryForm.restock.cost')}</ThemedText>
              </View>
              <ThemedInput keyboardType="decimal-pad" value={restockForm.cost} onChangeText={(value) => setRestockForm((f) => ({ ...f, cost: value }))} style={styles.input} />
            </View>
          </View>

          <View style={styles.labelWithIcon}>
            <Ionicons name="card-outline" size={14} color={palette.mutedText} />
            <ThemedText style={styles.smallText}>{t('inventoryForm.restock.paymentMethod')}</ThemedText>
          </View>
          <View style={styles.tabRow}>
            {methods.map((method) => (
              <Pressable
                key={method.id}
                style={[
                  styles.paymentChip,
                  { borderColor: palette.border },
                  restockForm.paymentMethodId === method.id && { backgroundColor: palette.accent, borderColor: palette.accent },
                ]}
                onPress={() => setRestockForm((f) => ({ ...f, paymentMethodId: method.id }))}
              >
                <Ionicons
                  name={method.icon as any}
                  size={18}
                  color={restockForm.paymentMethodId === method.id ? palette.text : palette.mutedText}
                />
                <ThemedText style={[styles.paymentChipLabel, restockForm.paymentMethodId === method.id && { color: palette.text }]}>
                  {method.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.labelWithIcon}>
            <Ionicons name="storefront-outline" size={14} color={palette.mutedText} />
            <ThemedText style={styles.smallText}>{t('inventoryForm.restock.supplierOptional')}</ThemedText>
          </View>
          <View style={styles.tabRow}>
            {suppliers.map((supplier) => (
              <Pressable
                key={supplier.id}
                style={[
                  styles.supplierChip,
                  { borderColor: palette.border },
                  restockForm.supplierId === supplier.id && { backgroundColor: palette.accent, borderColor: palette.accent },
                ]}
                onPress={() => setRestockForm((f) => ({ ...f, supplierId: f.supplierId === supplier.id ? '' : supplier.id }))}
              >
                <ThemedText style={[styles.supplierChipLabel, restockForm.supplierId === supplier.id && { color: palette.text }]}>
                  {supplier.name}
                </ThemedText>
              </Pressable>
            ))}
            <Pressable
              style={[
                styles.supplierChip,
                { borderColor: palette.border },
              ]}
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
            >
              <Ionicons
                name="add-outline"
                size={18}
                color={palette.mutedText}
              />
              <ThemedText style={styles.supplierChipLabel}>
                {t('inventory.suppliers.add')}
              </ThemedText>
            </Pressable>
          </View>
          {selectedSupplier ? <ThemedText style={styles.smallText}>{t('inventoryForm.restock.supplier')}: {selectedSupplier.name}</ThemedText> : null}

          <View style={styles.actionsRow}>
            <ThemedButton
              style={styles.primaryButton}
              icon="checkmark-circle"
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
                  paymentMethodId: restockForm.paymentMethodId,
                });

                router.back();
              }}
            />
            <ThemedButton variant="secondary" style={styles.secondaryButton} icon="arrow-back" label={t('common.back')} onPress={() => router.back()} />
          </View>
        </ThemedCard>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stackRow: {
    gap: 8,
  },
  flexItem: {
    flex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
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
  paymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  paymentChipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  supplierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  supplierChipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
