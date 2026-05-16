import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';

type SaleStatusLaneProps = {
  title: string;
  count: number;
  toneColor: string;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  emptyMessage?: string;
  onCardDrop?: (saleId: string) => void;
  isValidDropTarget?: boolean;
  style?: StyleProp<ViewStyle>;
  bodyScrollable?: boolean;
  children: React.ReactNode;
};

export function SaleStatusLane({
  title,
  count,
  toneColor,
  defaultExpanded = true,
  collapsible = true,
  emptyMessage,
  onCardDrop,
  isValidDropTarget = false,
  style,
  bodyScrollable = false,
  children,
}: SaleStatusLaneProps) {
  const palette = useAppColors();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [dragOver, setDragOver] = useState(false);
  const laneRef = useRef<View>(null);

  const showBody = !collapsible || expanded;

  useEffect(() => {
    if (Platform.OS !== 'web' || !onCardDrop) return;
    const el = laneRef.current as unknown as HTMLElement | null;
    if (!el) return;

    const handleDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('application/x-sale-id')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = isValidDropTarget ? 'move' : 'none';
      if (isValidDropTarget) setDragOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      if (el.contains(e.relatedTarget as Node)) return;
      setDragOver(false);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (!isValidDropTarget) return;
      const saleId = e.dataTransfer?.getData('application/x-sale-id');
      if (saleId) onCardDrop(saleId);
    };

    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('dragleave', handleDragLeave);
    el.addEventListener('drop', handleDrop);

    return () => {
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('dragleave', handleDragLeave);
      el.removeEventListener('drop', handleDrop);
    };
  }, [onCardDrop, isValidDropTarget]);

  useEffect(() => {
    if (!isValidDropTarget) setDragOver(false);
  }, [isValidDropTarget]);

  const content = count === 0 && emptyMessage ? (
    <View style={styles.emptyState}>
      <Ionicons name="tray-outline" size={28} color={palette.mutedText} style={styles.emptyIcon} />
      <ThemedText style={[styles.emptyText, { color: palette.mutedText }]}>{emptyMessage}</ThemedText>
    </View>
  ) : (
    children
  );

  return (
    <View
      ref={laneRef}
      style={[
        styles.lane,
        { backgroundColor: `${palette.border}28`, borderRadius: 12 },
        isValidDropTarget && { borderColor: toneColor, borderWidth: 1.5 },
        dragOver && isValidDropTarget && { backgroundColor: `${toneColor}18` },
        style,
      ]}
    >
      {collapsible ? (
        <Pressable style={styles.header} onPress={() => setExpanded((prev) => !prev)}>
          <View style={styles.headerLeft}>
            <View style={[styles.indicator, { backgroundColor: toneColor }]} />
            <ThemedText type="defaultSemiBold" style={styles.title}>{title}</ThemedText>
            <View style={[styles.countBadge, { backgroundColor: toneColor }]}>
              <ThemedText style={styles.countText}>{count}</ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.chevron, { color: palette.mutedText }]}>
            {expanded ? '▾' : '▸'}
          </ThemedText>
        </Pressable>
      ) : (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.indicator, { backgroundColor: toneColor }]} />
            <ThemedText type="defaultSemiBold" style={styles.title}>{title}</ThemedText>
            <View style={[styles.countBadge, { backgroundColor: toneColor }]}>
              <ThemedText style={styles.countText}>{count}</ThemedText>
            </View>
          </View>
        </View>
      )}
      {showBody && (
        bodyScrollable ? (
          <ScrollView style={styles.bodyScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <View style={styles.body}>{content}</View>
          </ScrollView>
        ) : (
          <View style={styles.body}>{content}</View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lane: {
    gap: 6,
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyIcon: {
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    fontSize: 15,
  },
  countBadge: {
    borderRadius: 999,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chevron: {
    fontSize: 16,
  },
  body: {
    gap: 8,
  },
  bodyScroll: {
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
