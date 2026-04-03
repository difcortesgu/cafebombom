import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { salesService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useSalesStore } from '@/stores/sales';

type CartItem = {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
};

export default function SalesScreen() {
  const user = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const { hydrate, products, sales, createSale } = useSalesStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
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

  const addToCart = (productId: number, name: string, unitPrice: number) => {
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

  const updateQty = (productId: number, delta: number) => {
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

  const showSaleDetail = async (saleId: number) => {
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

      <Pressable style={styles.logoutButton} onPress={logout}>
        <ThemedText style={styles.logoutText}>Logout</ThemedText>
      </Pressable>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Product catalog</ThemedText>
        <View style={styles.grid}>
          {products.map((product) => (
            <Pressable
              key={product.id}
              style={styles.productTile}
              onPress={() => addToCart(product.id, product.name, Number(product.price))}>
              <ThemedText style={styles.productName}>{product.name}</ThemedText>
              <ThemedText>${Number(product.price).toFixed(2)}</ThemedText>
              <ThemedText style={styles.smallText}>{product.category || 'Uncategorized'}</ThemedText>
            </Pressable>
          ))}
        </View>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Cart</ThemedText>
        {cart.length === 0 ? (
          <ThemedText style={styles.smallText}>No items selected.</ThemedText>
        ) : (
          cart.map((item) => (
            <View key={item.productId} style={styles.cartRow}>
              <ThemedText style={styles.productName}>{item.name}</ThemedText>
              <View style={styles.qtyControl}>
                <Pressable style={styles.qtyButton} onPress={() => updateQty(item.productId, -1)}>
                  <ThemedText>-</ThemedText>
                </Pressable>
                <ThemedText>{item.quantity}</ThemedText>
                <Pressable style={styles.qtyButton} onPress={() => updateQty(item.productId, 1)}>
                  <ThemedText>+</ThemedText>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <ThemedText type="defaultSemiBold">Total: ${total.toFixed(2)}</ThemedText>
        <View style={styles.actionsRow}>
          <Pressable style={styles.primaryButton} onPress={submitSale}>
            <ThemedText style={styles.primaryButtonText}>Confirm sale</ThemedText>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => setCart([])}>
            <ThemedText>Discard</ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Daily sales history</ThemedText>
        {sales.length === 0 ? (
          <ThemedText style={styles.smallText}>No sales yet.</ThemedText>
        ) : (
          sales.map((sale) => (
            <Pressable key={sale.id} style={styles.historyItem} onPress={() => showSaleDetail(sale.id)}>
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
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C5AA90',
    padding: 12,
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
    borderRadius: 10,
    backgroundColor: '#B64D1A',
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A98F79',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
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
    borderWidth: 1,
    borderColor: '#A98F79',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  logoutText: {
    fontWeight: '600',
  },
});
