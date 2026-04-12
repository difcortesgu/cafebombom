import ReceiptPrinterEncoder, { type LogoImageData } from '@point-of-sale/receipt-printer-encoder';

import { paymentMethodLabel, receiptLabels, taxInclusiveLabel } from '../services/messages';
import {
    centerText,
    formatCurrency,
    formatReceiptItem,
    formatReceiptLine,
    getReceiptLineWidth,
    separatorLine,
} from '../services/printing-formatter';
import type { ReceiptData } from '../types/receipt';

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
    encoder.line(centerText(`${receiptLabels.phonePrefix}: ${receipt.business.phone}`, width));
  }

  encoder.align('left');
  encoder.line(separatorLine(width));
  encoder.line(formatReceiptLine(receiptLabels.order, `#${receipt.metadata.orderShortId}`, width));
  encoder.line(
    formatReceiptLine(
      receiptLabels.date,
      new Date(receipt.metadata.createdAt * 1000).toLocaleString('es-CO'),
      width,
    ),
  );
  encoder.line(formatReceiptLine(receiptLabels.staff, receipt.metadata.staffName, width));
  encoder.line(formatReceiptLine(receiptLabels.table, receipt.metadata.tableName, width));
  encoder.line(formatReceiptLine(receiptLabels.payment, paymentMethodLabel(receipt.metadata.paymentMethod), width));

  encoder.line(separatorLine(width));
  for (const item of receipt.items) {
    for (const line of formatReceiptItem(item, width)) {
      encoder.line(line);
    }
  }

  encoder.line(separatorLine(width));
  encoder.line(formatReceiptLine(receiptLabels.subtotal, formatCurrency(receipt.pricing.subtotal), width));
  if (receipt.pricing.itemDiscountTotal > 0) {
    encoder.line(formatReceiptLine(receiptLabels.itemDiscount, `-${formatCurrency(receipt.pricing.itemDiscountTotal)}`, width));
  }
  if (receipt.pricing.globalDiscountAmount > 0) {
    encoder.line(
      formatReceiptLine(
        receipt.pricing.globalDiscountName || receiptLabels.globalDiscount,
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
    encoder.line(formatReceiptLine(receiptLabels.surchargeGeneric, formatCurrency(receipt.pricing.orderTypeSurcharge), width));
  }

  encoder.line(
    formatReceiptLine(
      taxInclusiveLabel(receipt.pricing.taxLabel, (receipt.pricing.taxRate * 100).toFixed(0)),
      formatCurrency(receipt.pricing.taxAmount),
      width,
    ),
  );
  encoder.line(formatReceiptLine(receiptLabels.preTaxTotal, formatCurrency(receipt.pricing.preTaxTotal), width));
  encoder.bold(true).line(formatReceiptLine(receiptLabels.total, formatCurrency(receipt.pricing.total), width)).bold(false);

  if (receipt.business.footerMessage) {
    encoder.line(separatorLine(width));
    encoder.align('center').line(centerText(receipt.business.footerMessage, width)).align('left');
  }

  if (receipt.qrCodeData) {
    encoder.line(separatorLine(width));
    encoder.align('center');
    encoder.line(centerText(`${receiptLabels.qr}:`, width));
    encoder.qrcode(normalizeEscPosText(receipt.qrCodeData));
    encoder.newline();
    encoder.align('left');
  }

  encoder.newline().newline().cut();
  return encoder.encode();
}
