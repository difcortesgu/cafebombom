import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { useAppColors } from '@/hooks/use-theme-color';

export type CanvasCardAction = {
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary';
  onPress: () => void;
  disabled?: boolean;
};

export type ProductItem = { name: string; qty: number };

type SaleCanvasCardProps = {
  orderId: string;
  tableName: string;
  productItems: ProductItem[] | undefined;
  total: number;
  isPaid: boolean;
  staffName: string;
  actions: CanvasCardAction[];
  onPress: () => void;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onLongPress?: () => void;
};

export function SaleCanvasCard({
  orderId,
  tableName,
  productItems,
  total,
  isPaid,
  staffName,
  actions,
  onPress,
  draggable = false,
  isDragging = false,
  onDragStart: onDragStartProp,
  onDragEnd: onDragEndProp,
  onLongPress,
}: SaleCanvasCardProps) {
  const palette = useAppColors();
  const cardRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !draggable) return;
    const el = cardRef.current as unknown as HTMLElement | null;
    if (!el) return;

    el.draggable = true;
    el.style.cursor = 'grab';

    const handleDragStart = (e: DragEvent) => {
      e.dataTransfer?.setData('application/x-sale-id', orderId);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      onDragStartProp?.();
    };

    const handleDragEnd = () => {
      onDragEndProp?.();
    };

    el.addEventListener('dragstart', handleDragStart);
    el.addEventListener('dragend', handleDragEnd);

    return () => {
      el.removeEventListener('dragstart', handleDragStart);
      el.removeEventListener('dragend', handleDragEnd);
    };
  }, [orderId, draggable, onDragStartProp, onDragEndProp]);

  const visibleItems = productItems?.slice(0, 3) ?? [];
  const hiddenCount = (productItems?.length ?? 0) - visibleItems.length;

  return (
    <Pressable
      ref={cardRef}
      style={[styles.card, { borderColor: palette.border, backgroundColor: palette.card }, isDragging && styles.dragging]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {/* Header: order id · table */}
      <View style={styles.header}>
        <ThemedText style={[styles.orderId, { color: palette.mutedText }]}>#{orderId.slice(0, 6)}</ThemedText>
        <ThemedText style={styles.dot}>·</ThemedText>
        <ThemedText style={styles.tableName} numberOfLines={1}>{tableName}</ThemedText>
      </View>

      {/* Product list */}
      {productItems === undefined ? (
        <ThemedText style={[styles.productMuted, { color: palette.mutedText }]}>Cargando...</ThemedText>
      ) : productItems.length === 0 ? (
        <ThemedText style={[styles.productMuted, { color: palette.mutedText }]}>Sin productos</ThemedText>
      ) : (
        <View style={styles.productList}>
          {visibleItems.map((item, i) => (
            <View key={i} style={styles.productRow}>
              <ThemedText style={[styles.productQty, { color: palette.tint }]}>{item.qty}x</ThemedText>
              <ThemedText style={styles.productName} numberOfLines={1}>{item.name}</ThemedText>
            </View>
          ))}
          {hiddenCount > 0 && (
            <ThemedText style={[styles.productMuted, { color: palette.mutedText }]}>+{hiddenCount} más</ThemedText>
          )}
        </View>
      )}

      {/* Meta: price (left) · staff name (right) */}
      <View style={styles.meta}>
        <View style={styles.metaLeft}>
          <ThemedText style={styles.total}>${total.toFixed(2)}</ThemedText>
          {isPaid && (
            <View style={[styles.paidBadge, { backgroundColor: '#16a34a' }]}>
              <ThemedText style={styles.paidBadgeText}>Pagado</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={[styles.staffName, { color: palette.mutedText }]} numberOfLines={1}>
          {staffName}
        </ThemedText>
      </View>

      {/* Actions */}
      {actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action) => (
            <ThemedButton
              key={action.label}
              label={action.label}
              icon={action.icon}
              variant={action.variant ?? 'primary'}
              style={[styles.actionBtn, actions.length === 2 && styles.actionBtnHalf]}
              onPress={action.onPress}
              disabled={action.disabled}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderId: {
    fontSize: 12,
  },
  dot: {
    fontSize: 12,
    opacity: 0.4,
  },
  tableName: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  productList: {
    gap: 2,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  productQty: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 24,
  },
  productName: {
    fontSize: 13,
    flexShrink: 1,
  },
  productMuted: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  total: {
    fontSize: 14,
    fontWeight: '700',
  },
  paidBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  staffName: {
    fontSize: 12,
    flexShrink: 1,
    maxWidth: '50%',
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexShrink: 1,
  },
  actionBtnHalf: {
    flexBasis: '48%',
    maxWidth: '48%',
  },
  dragging: {
    opacity: 0.4,
  },
});
