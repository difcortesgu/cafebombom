import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';

type Section = 'products' | 'ingredients';

export default function ProductsScreen() {
  const palette = useAppColors();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { products, categories, hydrate, updateProduct } = useProductsStore();
  const { ingredients, hydrate: hydrateInventory } = useInventoryStore();

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
        <ThemedText type="title">{t('products.title')}</ThemedText>
        <ThemedText>{t('products.restricted')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">{t('products.title')}</ThemedText>
      <ThemedText>{t('products.subtitle')}</ThemedText>

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
            label={item === 'products' ? t('products.tab.products') : t('products.tab.ingredients')}
            active={section === item}
            onPress={() => setSection(item)}
          />
        ))}
      </View>

      {section === 'products' ? (
        <>
          <ThemedCard style={styles.card}>
            <View style={styles.headerRow}>
              <ThemedText type="subtitle">{t('products.list.title')}</ThemedText>
              <ThemedButton label={t('products.list.add')} onPress={() => router.push('/product-form')} />
            </View>

            {products.map((product) => (
              <View key={product.id} style={[styles.listItemColumn, { borderColor: palette.border }]}>
                <View style={styles.listHeader}>
                  <View style={styles.listTextWrap}>
                    <ThemedText type="defaultSemiBold">{product.name}</ThemedText>
                    <ThemedText style={styles.smallText}>
                      ${Number(product.price).toFixed(2)} · {categories.find((c) => c.id === product.categoryId)?.name || t('products.list.noCategory')} · {product.isActive ? t('products.list.active') : t('products.list.archived')}
                    </ThemedText>
                  </View>
                  <View style={styles.inlineActions}>
                    <ThemedButton
                      variant="secondary"
                      style={styles.secondaryButton}
                      label={t('products.list.edit')}
                      onPress={() => router.push({ pathname: '/product-form', params: { id: product.id } })}
                    />
                    <ThemedButton
                      variant="secondary"
                      style={styles.secondaryButton}
                      label={product.isActive ? t('products.list.remove') : t('products.list.restore')}
                      onPress={async () => {
                        await updateProduct({ id: product.id, isActive: !product.isActive });
                        setMessage(product.isActive ? t('products.list.removedMessage') : t('products.list.restoredMessage'));
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
              <ThemedText type="subtitle">{t('products.ingredients.title')}</ThemedText>
              <ThemedButton label={t('products.ingredients.add')} onPress={() => router.push('/ingredient-form')} />
            </View>

            {ingredients.map((item) => {
              const isLow = Number(item.quantity) <= Number(item.low_stock_threshold);
              return (
                <View key={item.id} style={[styles.listItem, { borderColor: palette.border }]}>
                  <View style={styles.listTextWrap}>
                    <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                    <ThemedText style={styles.smallText}>
                      {Number(item.quantity).toFixed(2)} {item.unit} · {t('products.ingredients.threshold')} {item.low_stock_threshold}
                    </ThemedText>
                    {isLow ? <ThemedText style={[styles.lowText, { color: palette.warning }]}>{t('products.ingredients.lowStock')}</ThemedText> : null}
                  </View>
                  <View style={styles.inlineActions}>
                    <ThemedButton
                      variant="secondary"
                      style={styles.secondaryButton}
                      label={t('products.ingredients.edit')}
                      onPress={() => router.push({ pathname: '/ingredient-form', params: { id: item.id } })}
                    />
                    <ThemedButton
                      variant="secondary"
                      style={styles.secondaryButton}
                      label={t('inventory.restock.add')}
                      onPress={() => router.push({ pathname: '/inventory-form', params: { section: 'restock', ingredientId: item.id } })}
                    />
                  </View>
                </View>
              );
            })}
          </ThemedCard>

          <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">{t('products.ingredients.alertTitle')}</ThemedText>
            <ThemedText>{lowStock.length} {t('products.ingredients.alertCount')}</ThemedText>
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
