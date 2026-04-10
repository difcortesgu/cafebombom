import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { useAppColors } from '@/hooks/use-theme-color';

export type CanvasCardAction = {
  label: string;
  variant?: 'primary' | 'secondary';
  onPress: () => void;
  disabled?: boolean;
};

type SaleCanvasCardProps = {
  orderId: string;
  tableName: string;
  productSummary: string;
  total: number;
  paymentLabel: string;
  staffName: string;
  statusLabel: string;
  statusTone: { backgroundColor: string; color: string; borderColor: string };
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
  productSummary,
  total,
  paymentLabel,
  staffName,
  statusLabel,
  statusTone,
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

  return (
    <Pressable
      ref={cardRef}
      style={[styles.card, { borderColor: palette.border, backgroundColor: palette.card }, isDragging && styles.dragging]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ThemedText style={styles.orderId}>#{orderId.slice(0, 6)}</ThemedText>
          <ThemedText style={styles.dot}>·</ThemedText>
          <ThemedText style={styles.tableName}>{tableName}</ThemedText>
        </View>
        <View style={[styles.badge, statusTone]}>
          <ThemedText style={[styles.badgeText, { color: statusTone.color }]}>
            {statusLabel}
          </ThemedText>
        </View>
      </View>

      <ThemedText type="defaultSemiBold" numberOfLines={2}>
        {productSummary}
      </ThemedText>

      <View style={styles.meta}>
        <ThemedText style={styles.total}>${total.toFixed(2)}</ThemedText>
        <ThemedText style={styles.metaSep}>·</ThemedText>
        <ThemedText style={styles.metaText}>{paymentLabel}</ThemedText>
        <ThemedText style={styles.metaSep}>·</ThemedText>
        <ThemedText style={styles.metaText}>{staffName}</ThemedText>
      </View>

      {actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action) => (
            <ThemedButton
              key={action.label}
              label={action.label}
              variant={action.variant ?? 'primary'}
              style={styles.actionBtn}
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  orderId: {
    fontSize: 13,
    opacity: 0.7,
  },
  dot: {
    fontSize: 13,
    opacity: 0.5,
  },
  tableName: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  total: {
    fontSize: 13,
    fontWeight: '600',
  },
  metaSep: {
    fontSize: 12,
    opacity: 0.4,
  },
  metaText: {
    fontSize: 12,
    opacity: 0.7,
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
  },
  dragging: {
    opacity: 0.4,
  },
});
