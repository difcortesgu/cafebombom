import ReceiptPrinterEncoder, { type LogoImageData } from '@point-of-sale/receipt-printer-encoder';

import { t } from '@/i18n';
import type { ReceiptData } from '@/types/receipt';
import {
  centerText,
  formatCurrency,
  formatReceiptItem,
  formatReceiptLine,
  getReceiptLineWidth,
  separatorLine,
} from '@/utils/receipt-formatter';

function paymentMethodLabel(method: string): string {
  if (method === 'card') {
    return t('sales.payment.card');
  }
  if (method === 'transfer') {
    return t('sales.payment.transfer');
  }
  return t('sales.payment.cash');
}

function normalizeEscPosText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x0a\x20-\x7e]/g, '?');
}

export function encodeReceiptToEscPos(receipt: ReceiptData, logo?: LogoImageData): Uint8Array {
  const width = getReceiptLineWidth(receipt.paperWidth);
  const encoder = new ReceiptPrinterEncoder();

  encoder.initialize();

  encoder.align('center');
  if (logo) {
    encoder.image(logo, logo.width, logo.height, 'threshold');
    encoder.newline();
  }
  encoder.bold(true).line(centerText(receipt.business.name || 'CafeBomBom', width)).bold(false);

  if (receipt.business.address) {
    encoder.line(centerText(receipt.business.address, width));
  }
  if (receipt.business.phone) {
    encoder.line(centerText(`${t('sales.receipt.phonePrefix')}: ${receipt.business.phone}`, width));
  }

  encoder.align('left');
  encoder.line(separatorLine(width));
  encoder.line(formatReceiptLine(t('sales.receipt.orderLabel'), `#${receipt.metadata.orderShortId}`, width));
  encoder.line(
    formatReceiptLine(
      t('sales.receipt.dateLabel'),
      new Date(receipt.metadata.createdAt * 1000).toLocaleString('es-CO'),
      width,
    ),
  );
  encoder.line(formatReceiptLine(t('sales.receipt.staffLabel'), receipt.metadata.staffName, width));
  encoder.line(formatReceiptLine(t('sales.receipt.tableLabel'), receipt.metadata.tableName, width));
  encoder.line(formatReceiptLine(t('sales.receipt.paymentLabel'), paymentMethodLabel(receipt.metadata.paymentMethod), width));

  encoder.line(separatorLine(width));
  for (const item of receipt.items) {
    for (const line of formatReceiptItem(item, width)) {
      encoder.line(line);
    }
  }

  encoder.line(separatorLine(width));
  encoder.line(formatReceiptLine(t('sales.receipt.subtotalLabel'), formatCurrency(receipt.pricing.subtotal), width));
  if (receipt.pricing.itemDiscountTotal > 0) {
    encoder.line(formatReceiptLine(t('sales.receipt.itemDiscountLabel'), `-${formatCurrency(receipt.pricing.itemDiscountTotal)}`, width));
  }
  if (receipt.pricing.globalDiscountAmount > 0) {
    encoder.line(
      formatReceiptLine(
        receipt.pricing.globalDiscountName || t('sales.receipt.globalDiscountLabel'),
        `-${formatCurrency(receipt.pricing.globalDiscountAmount)}`,
        width,
      ),
    );
  }
  if (receipt.pricing.surchargeBreakdown.length > 0) {
    for (const surchargeLine of receipt.pricing.surchargeBreakdown) {
      const label = surchargeLine.description
        ? `${surchargeLine.label} (${surchargeLine.description})`
        : surchargeLine.label;
      encoder.line(formatReceiptLine(label, formatCurrency(surchargeLine.amount), width));
    }
  } else if (receipt.pricing.orderTypeSurcharge > 0) {
    encoder.line(formatReceiptLine(t('sales.surcharge.generic'), formatCurrency(receipt.pricing.orderTypeSurcharge), width));
  }

  encoder.line(
    formatReceiptLine(
      t('sales.receipt.taxInclusiveLabel', {
        label: receipt.pricing.taxLabel,
        rate: (receipt.pricing.taxRate * 100).toFixed(0),
      }),
      formatCurrency(receipt.pricing.taxAmount),
      width,
    ),
  );
  encoder.line(formatReceiptLine(t('sales.receipt.preTaxTotalLabel'), formatCurrency(receipt.pricing.preTaxTotal), width));
  encoder.bold(true).line(formatReceiptLine(t('sales.receipt.totalLabel'), formatCurrency(receipt.pricing.total), width)).bold(false);

  if (receipt.business.footerMessage) {
    encoder.line(separatorLine(width));
    encoder.align('center').line(centerText(receipt.business.footerMessage, width)).align('left');
  }

  if (receipt.qrCodeData) {
    encoder.line(separatorLine(width));
    encoder.align('center');
    encoder.line(centerText(`${t('sales.receipt.qrLabel')}:`, width));
    encoder.qrcode(normalizeEscPosText(receipt.qrCodeData));
    encoder.newline();
    encoder.align('left');
  }

  encoder.newline().newline().cut();
  return encoder.encode();
}