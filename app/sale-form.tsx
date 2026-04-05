import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { useAuthStore } from '@/stores/auth';
import { useSalesStore } from '@/stores/sales';
import { useSettingsStore } from '@/stores/settings';
import type { TableType } from '@/types/types';
import { calculateSaleDiscountBreakdown } from '@/utils/discounts';

type CartItem = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};
function getTableSurcharge(tableType: TableType, toGoSurcharge: number, deliverySurcharge: number) {
  const safeToGo = Math.max(0, toGoSurcharge);
  const safeDelivery = Math.max(0, deliverySurcharge);
  const delivery = tableType === 'delivery' ? safeDelivery : 0;
  const toGo = (tableType === 'to-go' || tableType === 'delivery') ? safeToGo : 0;
  return {
    toGo,
    delivery,
    total: toGo + delivery,
  };
}

export default function SaleFormScreen() {
  const palette = useAppColors();
  const router = useRouter();
  const user = useAuthStore((state) => state.currentUser);
  const { hydrate, products, tables, discounts, createSale } = useSalesStore();
  const { deliverySurcharge, toGoSurcharge, hydrateFromDb } = useSettingsStore();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedGlobalDiscountId, setSelectedGlobalDiscountId] = useState('');

  useFocusEffect(
    useCallback(() => {
      void hydrate();
      void hydrateFromDb();
    }, [hydrate, hydrateFromDb]),
  );

  const nowUnix = Math.floor(Date.now() / 1000);

  const globalDiscountOptions = useMemo(
    () => discounts
      .filter((discount) =>
        discount.scope === 'global'
        && discount.isActive,
      )
      .map((discount) => ({
        label: `${discount.name} (${discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value.toFixed(2)}`})`,
        value: discount.id,
      })),
    [discounts],
  );

  const pricing = useMemo(
    () => calculateSaleDiscountBreakdown(
      cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      discounts,
      nowUnix,
      selectedGlobalDiscountId || null,
    ),
    [cart, discounts, nowUnix, selectedGlobalDiscountId],
  );

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [selectedTableId, tables],
  );

  const surchargeBreakdown = useMemo(() => {
    if (!selectedTable) {
      return { toGo: 0, delivery: 0, total: 0 };
    }

    return getTableSurcharge(selectedTable.table_type, toGoSurcharge, deliverySurcharge);
  }, [deliverySurcharge, selectedTable, toGoSurcharge]);

  const finalTotal = pricing.total + surchargeBreakdown.total;

  const addToCart = (productId: string, name: string, unitPrice: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) => (item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { productId, name, unitPrice, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.productId === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const submitSale = async () => {
    if (!user || cart.length === 0 || !selectedTableId) {
      return;
    }

    await createSale({
      staffId: user.id,
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      tableId: selectedTableId,
      globalDiscountId: selectedGlobalDiscountId || null,
      orderTypeSurcharge: surchargeBreakdown.total,
    });

    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">New Sale</ThemedText>
      <ThemedText>Tap products to build a sale.</ThemedText>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Product catalog</ThemedText>
        <View style={styles.grid}>
          {products.map((product) => (
            <Pressable key={product.id} style={[styles.productTile, { borderColor: palette.border }]} onPress={() => addToCart(product.id, product.name, Number(product.price))}>
              <ThemedText style={styles.productName}>{product.name}</ThemedText>
              <ThemedText>${Number(product.price).toFixed(2)}</ThemedText>
              <ThemedText style={styles.smallText}>{product.category || 'Uncategorized'}</ThemedText>
            </Pressable>
          ))}
        </View>
      </ThemedCard>

      <ThemedCard style={styles.card}>
        <ThemedText type="subtitle">Cart</ThemedText>
        <ThemedText style={styles.smallText}>Table assignment (required)</ThemedText>
        {tables.length === 0 ? <ThemedText style={styles.smallText}>No tables available. Create one in the Tables tab.</ThemedText> : null}
        <View style={styles.tableRow}>
          {tables.map((table) => {
            const tableSurcharge = getTableSurcharge(table.table_type, toGoSurcharge, deliverySurcharge);
            return (
              <Pressable
                key={table.id}
                style={[
                  styles.tableChip,
                  { borderColor: selectedTableId === table.id ? palette.tint : palette.border },
                  selectedTableId === table.id && { backgroundColor: palette.tint },
                ]}
                onPress={() => setSelectedTableId(table.id)}>
                <ThemedText style={selectedTableId === table.id ? styles.selectedTableText : undefined}>
                  {table.name}{tableSurcharge.total > 0 ? ` (+$${tableSurcharge.total.toFixed(2)})` : ''}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        {selectedTableId && surchargeBreakdown.total > 0 ? (
          <ThemedText style={styles.smallText}>
            Selected table surcharge: +${surchargeBreakdown.total.toFixed(2)}
          </ThemedText>
        ) : null}

        {cart.length === 0 ? (
          <ThemedText style={styles.smallText}>No items selected.</ThemedText>
        ) : (
          cart.map((item) => (
            <View key={item.productId} style={styles.cartRow}>
              <View style={styles.cartDetails}>
                <ThemedText style={styles.productName}>{item.name}</ThemedText>
                <ThemedText style={styles.smallText}>${item.unitPrice.toFixed(2)} each</ThemedText>
              </View>
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

        <ThemedSelect
          label="Global discount (optional)"
          value={selectedGlobalDiscountId}
          onValueChange={setSelectedGlobalDiscountId}
          items={globalDiscountOptions}
          placeholder="Select global discount"
        />

        <View style={styles.summaryBlock}>
          <ThemedText style={styles.smallText}>Subtotal: ${pricing.subtotal.toFixed(2)}</ThemedText>
          <ThemedText style={styles.smallText}>Item discounts: -${pricing.itemDiscountTotal.toFixed(2)}</ThemedText>
          <ThemedText style={styles.smallText}>
            Global discount: -${pricing.globalDiscountAmount.toFixed(2)}{pricing.globalDiscountSnapshot.discountName ? ` (${pricing.globalDiscountSnapshot.discountName})` : ''}
          </ThemedText>
          {surchargeBreakdown.toGo > 0 ? <ThemedText style={styles.smallText}>To-Go surcharge: +${surchargeBreakdown.toGo.toFixed(2)}</ThemedText> : null}
          {surchargeBreakdown.delivery > 0 ? <ThemedText style={styles.smallText}>Delivery surcharge: +${surchargeBreakdown.delivery.toFixed(2)}</ThemedText> : null}
          <ThemedText type="defaultSemiBold">Total: ${finalTotal.toFixed(2)}</ThemedText>
        </View>
        {!selectedTableId ? <ThemedText style={styles.smallText}>Select a table to confirm sale.</ThemedText> : null}
        <View style={styles.actionsRow}>
          <ThemedButton style={styles.primaryButton} label="Confirm sale" onPress={submitSale} disabled={!selectedTableId || cart.length === 0} />
          <ThemedButton variant="secondary" style={styles.secondaryButton} label="Discard" onPress={() => setCart([])} />
          <ThemedButton variant="secondary" style={styles.secondaryButton} label="Back" onPress={() => router.back()} />
        </View>
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
    alignItems: 'flex-start',
    gap: 10,
  },
  cartDetails: {
    flex: 1,
    gap: 6,
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
    flexWrap: 'wrap',
  },
  tableRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tableChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  selectedTableText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryBlock: {
    gap: 4,
    paddingTop: 4,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 10,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});
