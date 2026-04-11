import type { PrintService } from '@/services/interfaces/printing';
import type { ReceiptData } from '@/types/receipt';
import { encodeReceiptToEscPos } from '@/utils/esc-pos';
import { loadLogoBitmap } from '@/utils/logo-bitmap';
import { buildPrintableReceiptText } from '@/utils/receipt-formatter';

export class PrintSqliteService implements PrintService {
  async getStatus() {
    return {
      connected: false,
      printerName: undefined,
      mode: 'native-pending' as const,
    };
  }

  previewReceipt(receiptData: ReceiptData): string {
    return buildPrintableReceiptText(receiptData);
  }

  async printReceipt(receiptData: ReceiptData): Promise<void> {
    // TODO: Replace with Bluetooth ESC/POS adapter once the thermal printer is available.
    // Keep this method signature stable so only this file needs implementation later.
      const logo = receiptData.business.logoUri
        ? await loadLogoBitmap(receiptData.business.logoUri, receiptData.paperWidth)
        : undefined;
      const payload = encodeReceiptToEscPos(receiptData, logo ?? undefined);
    console.warn('Thermal printing adapter pending. ESC/POS payload prepared:', {
      byteLength: payload.byteLength,
      previewText: this.previewReceipt(receiptData),
    });
  }
}
