import type { SalePaymentBoardItem } from '@/types/sales';

export type SelectedPaymentItem = {
    boardItem: SalePaymentBoardItem;
    qty: number;
};

export function getAvailableQty(item: SalePaymentBoardItem, selectedLines: Record<string, number>) {
    return Math.max(0, item.quantity_pending - (selectedLines[item.sale_item_id] ?? 0));
}

export function buildSelectedItems(selectedLines: Record<string, number>, pendingItems: SalePaymentBoardItem[]): SelectedPaymentItem[] {
    return Object.entries(selectedLines)
        .filter(([, qty]) => qty > 0)
        .map(([saleItemId, qty]) => {
            const boardItem = pendingItems.find((i) => i.sale_item_id === saleItemId);
            return boardItem ? { boardItem, qty } : null;
        })
        .filter((item): item is SelectedPaymentItem => item !== null);
}

export function computeSelectedTotal(selectedItems: SelectedPaymentItem[]) {
    return selectedItems.reduce((sum, { boardItem, qty }) => {
        const unit = boardItem.quantity_total > 0 ? boardItem.line_total_total / boardItem.quantity_total : 0;
        return sum + unit * qty;
    }, 0);
}

export function addSelectedLine(
    prev: Record<string, number>,
    item: SalePaymentBoardItem,
    quantity = 1,
): Record<string, number> {
    const available = getAvailableQty(item, prev);
    const toAdd = Math.min(quantity, available);
    if (toAdd <= 0) return prev;
    return { ...prev, [item.sale_item_id]: (prev[item.sale_item_id] ?? 0) + toAdd };
}

export function removeSelectedLine(prev: Record<string, number>, saleItemId: string): Record<string, number> {
    const next = { ...prev };
    delete next[saleItemId];
    return next;
}

export function adjustSelectedLine(
    prev: Record<string, number>,
    pendingItems: SalePaymentBoardItem[],
    saleItemId: string,
    delta: number,
): Record<string, number> {
    const boardItem = pendingItems.find((i) => i.sale_item_id === saleItemId);
    if (!boardItem) return prev;
    const next = Math.min(Math.max(1, (prev[saleItemId] ?? 1) + delta), boardItem.quantity_pending);
    return { ...prev, [saleItemId]: next };
}
