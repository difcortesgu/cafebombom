import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { Platform } from 'react-native';

import type { PrinterStatus, PrinterTarget } from '@/types/printer';
import type { ReceiptData, ReceiptPaperWidth } from '@/types/receipt';
import { buildPrintableReceiptText } from '@/utils/receipt-formatter';
import { AndroidBluetoothPrinter } from './androidBluetoothPrinter';
import { apiClient } from './api-client';
import { WebUSBPrinter } from './webUsbPrinter';

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function stripEscPosInitialize(payload: Uint8Array): Uint8Array {
  if (payload.length >= 2 && payload[0] === 0x1b && payload[1] === 0x40) {
    return payload.slice(2);
  }
  return payload;
}

function normalizeAssetUrl(rawUrl: string): string {
  try {
    const apiUrl = new URL(apiClient.getBaseUrl());
    const candidate = new URL(rawUrl, `${apiUrl.origin}/`);
    const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1']);
    const candidateIsLoopback = loopbackHosts.has(candidate.hostname);
    const apiIsLoopback = loopbackHosts.has(apiUrl.hostname);

    if (candidateIsLoopback && !apiIsLoopback) {
      candidate.protocol = apiUrl.protocol;
      candidate.host = apiUrl.host;
    }

    return candidate.toString();
  } catch {
    return rawUrl;
  }
}

export class PrintService {
  private webPrinter = new WebUSBPrinter();
  private bluetoothPrinter = new AndroidBluetoothPrinter();

  private normalizeEscPosText(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[–—]/g, '-')
      .replace(/\u00a0/g, ' ')
      .replace(/[^\x0a\x20-\x7e]/g, '?');
  }

  private async fetchLogoRasterPayload(receiptData: ReceiptData): Promise<Uint8Array | null> {
    const rasterUrl = receiptData.business.logoRasterUrl;
    if (!rasterUrl) {
      return null;
    }

    const normalizedUrl = normalizeAssetUrl(rasterUrl);
    const token = apiClient.getToken();
    const candidates = normalizedUrl === rasterUrl
      ? [normalizedUrl]
      : [normalizedUrl, rasterUrl];

    for (const candidateUrl of candidates) {
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(candidateUrl, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          continue;
        }

        const content = await response.arrayBuffer();
        return new Uint8Array(content);
      } catch {
        // Try next URL candidate.
      }
    }

    return null;
  }

  private async encodeReceiptToEscPos(receiptData: ReceiptData): Promise<Uint8Array> {
    const encoder = new ReceiptPrinterEncoder();
    const textPreview = buildPrintableReceiptText(receiptData);
    const lines = textPreview.split('\n');
    const logoPayload = await this.fetchLogoRasterPayload(receiptData);

    encoder.initialize();
    for (const line of lines) {
      encoder.line(this.normalizeEscPosText(line));
    }
    if (receiptData.qrCodeData) {
      encoder.newline();
      encoder.qrcode(this.normalizeEscPosText(receiptData.qrCodeData));
    }
    encoder.newline().newline().cut();

    const textPayload = encoder.encode();
    if (!logoPayload || logoPayload.length === 0) {
      return textPayload;
    }

    return concatUint8Arrays([logoPayload, stripEscPosInitialize(textPayload)]);
  }

  private buildTestReceipt(paperWidth: ReceiptPaperWidth): ReceiptData {
    const now = Math.floor(Date.now() / 1000);
    return {
      business: {
        name: 'CafeBomBom',
        address: 'Prueba de impresion',
        phone: '000-000-0000',
        nit: '',
        logoUri: null,
        logoRasterUrl: null,
        footerMessage: 'Ticket de prueba',
      },
      metadata: {
        orderId: `test-${now}`,
        orderShortId: 'TEST01',
        createdAt: now,
        paidAt: now,
        status: 'completed',
        paymentMethod: 'cash',
        tableName: 'Mostrador',
        staffName: 'Sistema',
      },
      items: [
        {
          id: 'test-item-1',
          name: 'Cafe Americano',
          observation: null,
          quantity: 1,
          unitPrice: 5,
          lineSubtotal: 5,
          discountAmount: 0,
          lineTotal: 5,
          discountName: null,
          additionalIngredients: [],
        },
      ],
      pricing: {
        subtotal: 5,
        itemDiscountTotal: 0,
        globalDiscountName: null,
        globalDiscountAmount: 0,
        orderTypeSurcharge: 0,
        surchargeBreakdown: [],
        taxLabel: 'IVA',
        taxRate: 0,
        taxAmount: 0,
        preTaxTotal: 5,
        total: 5,
      },
      paperWidth,
      qrCodeData: null,
    };
  }


  async getStatus(target?: PrinterTarget): Promise<PrinterStatus> {
    if (Platform.OS === 'web') {
      return { connected: true, mode: 'web-print' };
    }

    if (this.bluetoothPrinter.hasConfiguredPrinter(target)) {
      const isReady = await this.bluetoothPrinter.isReady(target);
      return {
        connected: isReady,
        printerName: target?.name?.trim() || target?.address,
        mode: 'native-ready',
      };
    }

    return {
      connected: false,
      printerName: undefined,
      mode: 'native-pending',
    };
  }

  previewReceipt(receiptData: ReceiptData): string {
    return buildPrintableReceiptText(receiptData);
  }

  async printReceipt(receiptData: ReceiptData, target?: PrinterTarget): Promise<void> {
    const payload = await this.encodeReceiptToEscPos(receiptData);

    if (Platform.OS === 'web') {
      await this.webPrinter.print(payload);
      return;
    }

    if (!this.bluetoothPrinter.hasConfiguredPrinter(target)) {
      throw new Error('Configura la impresora Bluetooth en Ajustes para imprimir desde Android.');
    }

    await this.bluetoothPrinter.print(payload, target ?? {});
  }

  async printTestReceipt(paperWidth: ReceiptPaperWidth, target?: PrinterTarget): Promise<void> {
    const testReceipt = this.buildTestReceipt(paperWidth);
    await this.printReceipt(testReceipt, target);
  }

  async getBondedPrinters(): Promise<PrinterTarget[]> {
    return this.bluetoothPrinter.getBondedPrinters();
  }

  /**
   * Método exclusivo para Web: Fuerza la solicitud de permisos de WebUSB al usuario.
   * Útil para enlazar a un botón "Conectar Impresora" en la interfaz web.
   */
  async requestWebUSBConnection(): Promise<void> {
    if (Platform.OS === 'web') {
      await this.webPrinter.connect();
    }
  }
}