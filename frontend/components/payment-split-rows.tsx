import { useEffect, useRef } from 'react';
import { Pressable, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import type { SalePaymentBoardItem } from '@/types/sales';

type PaymentSplitRowStyles = {
    itemRow: StyleProp<ViewStyle>;
    itemInfo: StyleProp<ViewStyle>;
    itemName: StyleProp<TextStyle>;
    itemMeta: StyleProp<TextStyle>;
    itemActions: StyleProp<ViewStyle>;
    smallBtn: StyleProp<ViewStyle>;
    qtyLabel: StyleProp<TextStyle>;
};

type PendingPaymentItemRowProps = {
    item: SalePaymentBoardItem;
    availableQty: number;
    rowStyles: PaymentSplitRowStyles;
    onAdd: () => void;
    onAddAll: () => void;
    isWeb?: boolean;
    onDragStart?: (itemId: string) => void;
    onDragEnd?: () => void;
    showButtonsOnWeb?: boolean;
};

export function PendingPaymentItemRow({
    item,
    availableQty,
    rowStyles,
    onAdd,
    onAddAll,
    isWeb = false,
    onDragStart,
    onDragEnd,
    showButtonsOnWeb = true,
}: PendingPaymentItemRowProps) {
    const palette = useAppColors();
    const ref = useRef<View>(null);

    useEffect(() => {
        if (!isWeb) return;
        const el = ref.current as unknown as HTMLElement | null;
        if (!el) return;

        el.draggable = availableQty > 0;
        el.style.cursor = availableQty > 0 ? 'grab' : 'default';

        const handleDragStart = (e: DragEvent) => {
            e.dataTransfer?.setData('application/x-payment-item-id', item.sale_item_id);
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
            onDragStart?.(item.sale_item_id);
        };
        const handleDragEnd = () => onDragEnd?.();

        el.addEventListener('dragstart', handleDragStart);
        el.addEventListener('dragend', handleDragEnd);
        return () => {
            el.removeEventListener('dragstart', handleDragStart);
            el.removeEventListener('dragend', handleDragEnd);
        };
    }, [availableQty, isWeb, item.sale_item_id, onDragEnd, onDragStart]);

    const unitTotal = item.quantity_total > 0 ? item.line_total_total / item.quantity_total : 0;
    const dimmed = availableQty <= 0;
    const showButtons = availableQty > 0 && (!isWeb || showButtonsOnWeb);

    return (
        <Pressable
            ref={ref}
            onPress={availableQty > 0 ? onAdd : undefined}
            style={[rowStyles.itemRow, { borderColor: palette.border, opacity: dimmed ? 0.4 : 1 }]}
        >
            <View style={rowStyles.itemInfo}>
                <ThemedText style={rowStyles.itemName}>{item.product_name}</ThemedText>
                <ThemedText style={rowStyles.itemMeta}>
                    x{availableQty} · ${unitTotal.toFixed(2)} c/u
                </ThemedText>
            </View>
            {showButtons && (
                <View style={rowStyles.itemActions}>
                    <ThemedButton label="+" style={rowStyles.smallBtn} onPress={onAdd} />
                    {availableQty > 1 && (
                        <ThemedButton
                            label={t('sales.splitPayment.addAll')}
                            variant="secondary"
                            style={rowStyles.smallBtn}
                            onPress={onAddAll}
                        />
                    )}
                </View>
            )}
        </Pressable>
    );
}

type SelectedPaymentItemRowProps = {
    item: SalePaymentBoardItem;
    qty: number;
    rowStyles: PaymentSplitRowStyles;
    onRemove: () => void;
    onAdjust: (delta: number) => void;
};

export function SelectedPaymentItemRow({ item, qty, rowStyles, onRemove, onAdjust }: SelectedPaymentItemRowProps) {
    const palette = useAppColors();
    const unitTotal = item.quantity_total > 0 ? item.line_total_total / item.quantity_total : 0;

    return (
        <View style={[rowStyles.itemRow, { borderColor: palette.border }]}>
            <View style={rowStyles.itemInfo}>
                <ThemedText style={rowStyles.itemName}>{item.product_name}</ThemedText>
                <ThemedText style={rowStyles.itemMeta}>${(unitTotal * qty).toFixed(2)}</ThemedText>
            </View>
            <View style={rowStyles.itemActions}>
                <ThemedButton label="-" style={rowStyles.smallBtn} onPress={() => onAdjust(-1)} disabled={qty <= 1} />
                <ThemedText style={rowStyles.qtyLabel}>{qty}</ThemedText>
                <ThemedButton label="+" style={rowStyles.smallBtn} onPress={() => onAdjust(1)} disabled={qty >= item.quantity_pending} />
                <ThemedButton label="✕" variant="secondary" style={rowStyles.smallBtn} onPress={onRemove} />
            </View>
        </View>
    );
}
