import type { ReceiptData } from '@/types/receipt';

export type PrinterStatus = {
  connected: boolean;
  printerName?: string;
  mode: 'web-print' | 'native-pending';
};

export interface PrintService {
  getStatus(): Promise<PrinterStatus>;
  previewReceipt(receiptData: ReceiptData): string;
  printReceipt(receiptData: ReceiptData): Promise<void>;
}
