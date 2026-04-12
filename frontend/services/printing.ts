import type { ReceiptData } from '@/types/receipt';

export type PrinterStatus = {
  connected: boolean;
  printerName?: string;
  mode: 'web-print' | 'native-pending';
};

export class PrintService {
  async getStatus(): Promise<PrinterStatus> {
    // Implementation goes here
    return { connected: false, mode: 'web-print' };
  }

  previewReceipt(receiptData: ReceiptData): string {
    // Implementation goes here
    return '';
  }

  async printReceipt(receiptData: ReceiptData): Promise<void> {
    // Implementation goes here
  }
}
