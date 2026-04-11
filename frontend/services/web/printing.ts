import type { PrintService } from '@/services/interfaces/printing';
import type { ReceiptData } from '@/types/receipt';
import { buildPrintableReceiptText } from '@/utils/receipt-formatter';

function escapeHtml(content: string): string {
  return content
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildReceiptHtml(receiptData: ReceiptData): string {
  const printableText = buildPrintableReceiptText(receiptData);
  const logoHtml = receiptData.business.logoUri
    ? `<div style=\"text-align:center;margin-bottom:8px;\"><img src=\"${escapeHtml(receiptData.business.logoUri)}\" style=\"max-width:240px;max-height:120px;object-fit:contain;\"/></div>`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <title>Receipt ${escapeHtml(receiptData.metadata.orderShortId)}</title>
    <style>
      body { margin: 0; font-family: 'Courier New', monospace; }
      .sheet { width: ${receiptData.paperWidth === 58 ? '58mm' : '80mm'}; margin: 0 auto; padding: 6mm 4mm; }
      pre { margin: 0; white-space: pre-wrap; font-size: 12px; line-height: 1.35; }
      @media print {
        body { margin: 0; }
        .sheet { width: ${receiptData.paperWidth === 58 ? '58mm' : '80mm'}; }
      }
    </style>
  </head>
  <body>
    <div class=\"sheet\">
      ${logoHtml}
      <pre>${escapeHtml(printableText)}</pre>
    </div>
  </body>
</html>`;
}

export class PrintWebService implements PrintService {
  async getStatus() {
    return {
      connected: true,
      printerName: 'Browser Print',
      mode: 'web-print' as const,
    };
  }

  previewReceipt(receiptData: ReceiptData): string {
    return buildPrintableReceiptText(receiptData);
  }

  async printReceipt(receiptData: ReceiptData): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    const html = buildReceiptHtml(receiptData);
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=460,height=740');

    if (!printWindow) {
      throw new Error('No se pudo abrir la ventana de impresion.');
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
}
