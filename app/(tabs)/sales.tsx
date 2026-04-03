import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { useAppColors } from '@/hooks/use-theme-color';
import { salesService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useSalesStore } from '@/stores/sales';

type CartItem = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

export default function SalesScreen() {
  const palette = useAppColors();
  const user = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const { hydrate, products, sales, createSale } = useSalesStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [expandedSaleItems, setExpandedSaleItems] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate])
  );

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart]
  );

  const addToCart = (productId: string, name: string, unitPrice: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId, name, unitPrice, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const submitSale = async () => {
    if (!user || cart.length === 0) {
      return;
    }

    await createSale({
      staffId: user.id,
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });

    setCart([]);
  };

  const showSaleDetail = async (saleId: string) => {
    if (expandedSaleId === saleId) {
      setExpandedSaleId(null);
      setExpandedSaleItems('');
      return;
    }

    const items = await salesService.getSaleItems(saleId);
    setExpandedSaleId(saleId);
    setExpandedSaleItems(
      items.map((item) => `${item.product_name} x${item.quantity} @ $${Number(item.unit_price).toFixed(2)}`).join('\n')
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Sales</ThemedText>
      <ThemedText>Tap products to build a sale.</ThemedText>

      <ThemedButton variant="secondary" style={styles.logoutButton} label="Logout" onPress={logout} />

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Product catalog</ThemedText>
        <View style={styles.grid}>
          {products.map((product) => (
            <Pressable
              key={product.id}
              style={[styles.productTile, { borderColor: palette.border }]}
              onPress={() => addToCart(product.id, product.name, Number(product.price))}>
              <ThemedText style={styles.productName}>{product.name}</ThemedText>
              <ThemedText>${Number(product.price).toFixed(2)}</ThemedText>
              <ThemedText style={styles.smallText}>{product.category || 'Uncategorized'}</ThemedText>
            </Pressable>
          ))}
        </View>
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Cart</ThemedText>
        {cart.length === 0 ? (
          <ThemedText style={styles.smallText}>No items selected.</ThemedText>
        ) : (
          cart.map((item) => (
            <View key={item.productId} style={styles.cartRow}>
              <ThemedText style={styles.productName}>{item.name}</ThemedText>
              <View style={styles.qtyControl}>
                <Pressable style={[styles.qtyButton, { borderColor: palette.border }]} onPress={() => updateQty(item.productId, -1)}>
                  <ThemedText>-</ThemedText>
                </Pressable>
                <ThemedText>{item.quantity}</ThemedText>
                <Pressable style={[styles.qtyButton, { borderColor: palette.border }]} onPress={() => updateQty(item.productId, 1)}>
                  <ThemedText>+</ThemedText>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <ThemedText type="defaultSemiBold">Total: ${total.toFixed(2)}</ThemedText>
        <View style={styles.actionsRow}>
          <ThemedButton style={styles.primaryButton} label="Confirm sale" onPress={submitSale} />
          <ThemedButton variant="secondary" style={styles.secondaryButton} label="Discard" onPress={() => setCart([])} />
        </View>
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Daily sales history</ThemedText>
        {sales.length === 0 ? (
          <ThemedText style={styles.smallText}>No sales yet.</ThemedText>
        ) : (
          sales.map((sale) => (
            <Pressable key={sale.id} style={[styles.historyItem, { borderColor: palette.border }]} onPress={() => showSaleDetail(sale.id)}>
              <ThemedText type="defaultSemiBold">#{sale.id} - ${Number(sale.total).toFixed(2)}</ThemedText>
              <ThemedText style={styles.smallText}>
                {new Date(Number(sale.created_at) * 1000).toLocaleString()} by {sale.staff_name}
              </ThemedText>
              {expandedSaleId === sale.id && expandedSaleItems.length > 0 ? (
                <ThemedText style={styles.detailText}>{expandedSaleItems}</ThemedText>
              ) : null}
            </Pressable>
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
  card: {
    gap: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  productTile: {
    borderWidth: 1,
    borderColor: '#BFA792',
    borderRadius: 10,
    padding: 10,
    minWidth: '47%',
    gap: 4,
  },
  productName: {
    fontWeight: '700',
  },
  smallText: {
    opacity: 0.9,
    fontSize: 13,
  },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyButton: {
    borderWidth: 1,
    borderColor: '#A98F79',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 10,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  historyItem: {
    borderWidth: 1,
    borderColor: '#C5AA90',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  detailText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  logoutButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
