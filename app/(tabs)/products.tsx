import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { useAppColors } from '@/hooks/use-theme-color';
import { useAuthStore } from '@/stores/auth';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';

type Section = 'products' | 'ingredients';

export default function ProductsScreen() {
  const palette = useAppColors();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { products, categories, hydrate, updateProduct } = useProductsStore();
  const { ingredients, hydrate: hydrateInventory, updateIngredient } = useInventoryStore();

  const [section, setSection] = useState<Section>('products');
  const [message, setMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      void Promise.all([hydrate(), hydrateInventory()]);
    }, [hydrate, hydrateInventory]),
  );

  const lowStock = useMemo(
    () => ingredients.filter((item) => Number(item.quantity) <= Number(item.low_stock_threshold)),
    [ingredients],
  );

  if (currentUser?.role !== 'owner') {
    return (
      <ThemedView style={styles.lockedContainer}>
        <ThemedText type="title">Products</ThemedText>
        <ThemedText>Owner access is required to manage products and ingredients.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Products</ThemedText>
      <ThemedText>List view with quick actions. Use Add/Edit to open full forms in a separate page.</ThemedText>

      {message ? (
        <ThemedCard style={styles.messageCard}>
          <ThemedText>{message}</ThemedText>
        </ThemedCard>
      ) : null}

      <View style={styles.tabRow}>
        {(['products', 'ingredients'] as Section[]).map((item) => (
          <ThemedChip
            key={item}
            style={styles.sectionButton}
            label={item}
            active={section === item}
            onPress={() => setSection(item)}
          />
        ))}
      </View>

      {section === 'products' ? (
        <>
          <ThemedCard style={styles.card}>
            <View style={styles.headerRow}>
              <ThemedText type="subtitle">Product list</ThemedText>
              <ThemedButton label="Add product" onPress={() => router.push('/product-form')} />
            </View>

            {products.map((product) => (
              <View key={product.id} style={[styles.listItemColumn, { borderColor: palette.border }]}>
                <View style={styles.listHeader}>
                  <View style={styles.listTextWrap}>
                    <ThemedText type="defaultSemiBold">{product.name}</ThemedText>
                    <ThemedText style={styles.smallText}>
                      ${Number(product.price).toFixed(2)} · {categories.find((c) => c.id === product.categoryId)?.name || 'Uncategorized'} · {product.isActive ? 'Active' : 'Archived'}
                    </ThemedText>
                  </View>
                  <View style={styles.inlineActions}>
                    <ThemedButton
                      variant="secondary"
                      style={styles.secondaryButton}
                      label="Edit"
                      onPress={() => router.push({ pathname: '/product-form', params: { id: product.id } })}
                    />
                    <ThemedButton
                      variant="secondary"
                      style={styles.secondaryButton}
                      label={product.isActive ? 'Remove' : 'Restore'}
                      onPress={async () => {
                        await updateProduct({ id: product.id, isActive: !product.isActive });
                        setMessage(product.isActive ? 'Product removed from active list.' : 'Product restored.');
                      }}
                    />
                  </View>
                </View>
              </View>
            ))}
          </ThemedCard>
        </>
      ) : null}

      {section === 'ingredients' ? (
        <>
          <ThemedCard style={styles.card}>
            <View style={styles.headerRow}>
              <ThemedText type="subtitle">Ingredient list</ThemedText>
              <ThemedButton label="Add ingredient" onPress={() => router.push('/ingredient-form')} />
            </View>

            {ingredients.map((item) => {
              const isLow = Number(item.quantity) <= Number(item.low_stock_threshold);
              return (
                <View key={item.id} style={[styles.listItem, { borderColor: palette.border }]}>
                  <View style={styles.listTextWrap}>
                    <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                    <ThemedText style={styles.smallText}>
                      {Number(item.quantity).toFixed(2)} {item.unit} · threshold {item.low_stock_threshold}
                    </ThemedText>
                    {isLow ? <ThemedText style={[styles.lowText, { color: palette.warning }]}>Low stock</ThemedText> : null}
                  </View>
                  <View style={styles.inlineActions}>
                    <ThemedButton
                      variant="secondary"
                      style={styles.secondaryButton}
                      label="Edit"
                      onPress={() => router.push({ pathname: '/ingredient-form', params: { id: item.id } })}
                    />
                    <ThemedButton
                      variant="secondary"
                      style={styles.secondaryButton}
                      label="+1"
                      onPress={async () => {
                        await updateIngredient({ id: item.id, quantity: Number(item.quantity) + 1 });
                        setMessage('Ingredient quantity updated.');
                      }}
                    />
                  </View>
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
    padding: 20,
    gap: 12,
  },
  messageCard: {
    padding: 12,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionButton: {
    borderRadius: 999,
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
  inlineActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
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
    gap: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  listTextWrap: {
    flex: 1,
    gap: 4,
  },
  smallText: {
    opacity: 0.9,
    fontSize: 13,
    lineHeight: 18,
  },
  lowText: {
    fontWeight: '600',
  },
});
