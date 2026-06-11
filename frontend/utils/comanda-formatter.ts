import { t } from '@/i18n';
import type { ReceiptData, ReceiptLineItem, ReceiptPaperWidth } from '@/types/receipt';
import {
  centerText,
  formatReceiptLine,
  getReceiptLineWidth,
  separatorLine,
} from '@/utils/receipt-formatter';

// Lazily resolve the products store to avoid a static import cycle and to read
// the freshest recipe data at print time (after stores are hydrated).
function getIngredientNameById(): Map<string, string> {
  const links = (require('@/stores/products') as typeof import('@/stores/products'))
    .useProductsStore.getState().productIngredients;
  const map = new Map<string, string>();
  for (const link of links) {
    map.set(link.ingredientId, link.ingredientName);
  }
  return map;
}

function removedLine(removedIngredientIds: string[], names: Map<string, string>, indent: string, width: number): string[] {
  if (removedIngredientIds.length === 0) {
    return [];
  }
  const resolved = removedIngredientIds.map((id) => names.get(id) ?? id);
  return [formatReceiptLine(`${indent}${t('sales.comanda.removedLabel')}: ${resolved.join(', ')}`, '', width)];
}

function formatComandaItem(item: ReceiptLineItem, names: Map<string, string>, width: number): string[] {
  const mainLine = formatReceiptLine(`${item.quantity} x ${item.name}`, '', width);

  const removedMainLines = removedLine(item.removedIngredientIds, names, '  ', width);

  const childLines = (item.children ?? []).flatMap((child) => {
    const childLabel = `  . ${child.name}${child.quantity > 1 ? ` x${child.quantity}` : ''}`;
    const lines = [formatReceiptLine(childLabel, '', width)];
    lines.push(...removedLine(child.removedIngredientIds, names, '    ', width));
    for (const add of child.additionalIngredients) {
      lines.push(formatReceiptLine(`    + ${add.name} x${add.quantity}`, '', width));
    }
    if (child.observation) {
      lines.push(formatReceiptLine(`    ${t('sales.receipt.observationLabel')}`, child.observation, width));
    }
    return lines;
  });

  const observationLine = item.observation
    ? [formatReceiptLine(t('sales.receipt.observationLabel'), item.observation, width)]
    : [];

  const additionalLines = item.additionalIngredients.map((additional) =>
    formatReceiptLine(`  + ${additional.name} x${additional.quantity}`, '', width),
  );

  return [mainLine, ...removedMainLines, ...childLines, ...observationLine, ...additionalLines];
}

export function buildPrintableComandaText(receipt: ReceiptData): string {
  const width = getReceiptLineWidth(receipt.paperWidth);
  const names = getIngredientNameById();
  const lines: string[] = [];

  lines.push(centerText(t('sales.comanda.title'), width));
  lines.push(separatorLine(width));
  lines.push(formatReceiptLine(t('sales.receipt.orderLabel'), `#${receipt.metadata.orderShortId}`, width));
  lines.push(formatReceiptLine(t('sales.comanda.timeLabel'), new Date(receipt.metadata.createdAt * 1000).toLocaleString('es-CO'), width));
  lines.push(formatReceiptLine(t('sales.receipt.staffLabel'), receipt.metadata.staffName, width));
  lines.push(formatReceiptLine(t('sales.receipt.tableLabel'), receipt.metadata.tableName, width));
  lines.push(separatorLine(width));

  for (const item of receipt.items) {
    lines.push(...formatComandaItem(item, names, width));
  }

  return lines.join('\n');
}
