import { t } from '@/i18n';
import type { ReceiptData, ReceiptLineItem, ReceiptPaperWidth } from '@/types/receipt';

export function getReceiptLineWidth(paperWidth: ReceiptPaperWidth): number {
  return paperWidth === 58 ? 32 : 48;
}

export function formatCurrency(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return `$${normalized.toFixed(2)}`;
}

export function separatorLine(width: number, char = '-'): string {
  return char.repeat(Math.max(1, width));
}

export function centerText(text: string, width: number): string {
  const normalized = text.trim();
  if (normalized.length >= width) {
    return normalized.slice(0, width);
  }
  const leftPadding = Math.floor((width - normalized.length) / 2);
  return `${' '.repeat(leftPadding)}${normalized}`;
}

function trimToFit(text: string, width: number): string {
  if (text.length <= width) {
    return text;
  }
  if (width <= 1) {
    return text.slice(0, width);
  }
  return `${text.slice(0, width - 1)}~`;
}

export function formatReceiptLine(left: string, right: string, width: number): string {
  const leftNormalized = left.trim();
  const rightNormalized = right.trim();
  if (!rightNormalized) {
    return trimToFit(leftNormalized, width);
  }

  const minGap = 1;
  const availableLeftWidth = Math.max(0, width - rightNormalized.length - minGap);
  const leftText = trimToFit(leftNormalized, availableLeftWidth);
  const gapSize = Math.max(minGap, width - leftText.length - rightNormalized.length);

  return `${leftText}${' '.repeat(gapSize)}${rightNormalized}`;
}

export function formatReceiptItem(item: ReceiptLineItem, width: number): string[] {
  const qtyAndPrice = `${item.quantity} x ${formatCurrency(item.unitPrice)}`;
  const mainLine = formatReceiptLine(item.name, formatCurrency(item.lineTotal), width);
  const detailLine = formatReceiptLine(qtyAndPrice, '', width);

  if (item.discountAmount <= 0) {
    return [mainLine, detailLine];
  }

  const discountLabel = item.discountName
    ? t('sales.receipt.discountNamed', { name: item.discountName })
    : t('sales.receipt.discount');
  const discountLine = formatReceiptLine(discountLabel, `-${formatCurrency(item.discountAmount)}`, width);
  return [mainLine, detailLine, discountLine];
}

function paymentMethodLabel(method: string): string {
  if (method === 'card') {
    return t('sales.payment.card');
  }
  if (method === 'transfer') {
    return t('sales.payment.transfer');
  }
  return t('sales.payment.cash');
}

export function buildPrintableReceiptText(receipt: ReceiptData): string {
  const width = getReceiptLineWidth(receipt.paperWidth);
  const lines: string[] = [];

  lines.push(centerText(receipt.business.name || 'CafeBomBom', width));
  if (receipt.business.address) {
    lines.push(centerText(receipt.business.address, width));
  }
  if (receipt.business.phone) {
    lines.push(centerText(`${t('sales.receipt.phonePrefix')}: ${receipt.business.phone}`, width));
  }

  lines.push(separatorLine(width));
  lines.push(formatReceiptLine(t('sales.receipt.orderLabel'), `#${receipt.metadata.orderShortId}`, width));
  lines.push(formatReceiptLine(t('sales.receipt.dateLabel'), new Date(receipt.metadata.createdAt * 1000).toLocaleString('es-CO'), width));
  lines.push(formatReceiptLine(t('sales.receipt.staffLabel'), receipt.metadata.staffName, width));
  lines.push(formatReceiptLine(t('sales.receipt.tableLabel'), receipt.metadata.tableName, width));
  lines.push(formatReceiptLine(t('sales.receipt.paymentLabel'), paymentMethodLabel(receipt.metadata.paymentMethod), width));

  lines.push(separatorLine(width));
  for (const item of receipt.items) {
    lines.push(...formatReceiptItem(item, width));
  }

  lines.push(separatorLine(width));
  lines.push(formatReceiptLine(t('sales.receipt.subtotalLabel'), formatCurrency(receipt.pricing.subtotal), width));
  if (receipt.pricing.itemDiscountTotal > 0) {
    lines.push(formatReceiptLine(t('sales.receipt.itemDiscountLabel'), `-${formatCurrency(receipt.pricing.itemDiscountTotal)}`, width));
  }
  if (receipt.pricing.globalDiscountAmount > 0) {
    lines.push(formatReceiptLine(receipt.pricing.globalDiscountName || t('sales.receipt.globalDiscountLabel'), `-${formatCurrency(receipt.pricing.globalDiscountAmount)}`, width));
  }
  if (receipt.pricing.surchargeBreakdown.length > 0) {
    for (const surchargeLine of receipt.pricing.surchargeBreakdown) {
      const label = surchargeLine.description
        ? `${surchargeLine.label} (${surchargeLine.description})`
        : surchargeLine.label;
      lines.push(formatReceiptLine(label, formatCurrency(surchargeLine.amount), width));
    }
  } else if (receipt.pricing.orderTypeSurcharge > 0) {
    lines.push(formatReceiptLine(t('sales.surcharge.generic'), formatCurrency(receipt.pricing.orderTypeSurcharge), width));
  }

  lines.push(
    formatReceiptLine(
      t('sales.receipt.taxInclusiveLabel', {
        label: receipt.pricing.taxLabel,
        rate: (receipt.pricing.taxRate * 100).toFixed(0),
      }),
      formatCurrency(receipt.pricing.taxAmount),
      width,
    ),
  );
  lines.push(formatReceiptLine(t('sales.receipt.preTaxTotalLabel'), formatCurrency(receipt.pricing.preTaxTotal), width));
  lines.push(formatReceiptLine(t('sales.receipt.totalLabel'), formatCurrency(receipt.pricing.total), width));

  if (receipt.business.footerMessage) {
    lines.push(separatorLine(width));
    lines.push(centerText(receipt.business.footerMessage, width));
  }

  if (receipt.qrCodeData) {
    lines.push(separatorLine(width));
    lines.push(centerText(`${t('sales.receipt.qrLabel')}:`, width));
    lines.push(centerText(receipt.qrCodeData, width));
  }

  return lines.join('\n');
}
