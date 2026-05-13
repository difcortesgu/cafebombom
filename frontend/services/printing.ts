import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { Buffer } from 'buffer';
import { PermissionsAndroid, Platform } from 'react-native';

import type { ReceiptData, ReceiptPaperWidth } from '@/types/receipt';
import { buildPrintableReceiptText } from '@/utils/receipt-formatter';

export type PrinterTarget = {
  name?: string;
  address?: string;
};

export type PrinterStatus = {
  connected: boolean;
  printerName?: string;
  mode: 'web-print' | 'native-pending' | 'native-ready';
};

type BluetoothClassicDevice = {
  name?: string;
  address?: string;
  id?: string;
};

type BluetoothClassicModule = {
  isBluetoothAvailable: () => Promise<boolean>;
  isBluetoothEnabled: () => Promise<boolean>;
  requestBluetoothEnabled: () => Promise<boolean>;
  getBondedDevices: () => Promise<BluetoothClassicDevice[]>;
  isDeviceConnected: (address: string) => Promise<boolean>;
  connectToDevice: (address: string, options?: Record<string, unknown>) => Promise<BluetoothClassicDevice>;
  writeToDevice: (address: string, message: string | Buffer, encoding?: BufferEncoding) => Promise<boolean>;
  disconnectFromDevice: (address: string) => Promise<boolean>;
};

let bluetoothClassicModulePromise: Promise<BluetoothClassicModule> | null = null;

async function getBluetoothClassicModule(): Promise<BluetoothClassicModule> {
  if (Platform.OS !== 'android') {
    throw new Error('Bluetooth clasico solo esta disponible en Android.');
  }

  if (!bluetoothClassicModulePromise) {
    bluetoothClassicModulePromise = import('react-native-bluetooth-classic').then((module) => {
      return module.default as unknown as BluetoothClassicModule;
    });
  }

  return bluetoothClassicModulePromise;
}

async function ensureBluetoothPermissions(): Promise<void> {
  if (Platform.OS !== 'android' || Platform.Version < 31) {
    return;
  }

  const granted = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
  ]);

  const connectGranted = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
  const scanGranted = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;

  if (!connectGranted || !scanGranted) {
    throw new Error('Se requieren permisos de Bluetooth para usar la impresora. Otorgalos en los ajustes de la app.');
  }
}

async function ensureBluetoothEnabled(bluetooth: BluetoothClassicModule): Promise<void> {
  const available = await bluetooth.isBluetoothAvailable();
  if (!available) {
    throw new Error('Este dispositivo no soporta Bluetooth clasico.');
  }

  const enabled = await bluetooth.isBluetoothEnabled();
  if (enabled) {
    return;
  }

  const turnedOn = await bluetooth.requestBluetoothEnabled();
  if (!turnedOn) {
    throw new Error('Activa Bluetooth para imprimir recibos.');
  }
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildReceiptHtml(receiptData: ReceiptData): string {
  const textPreview = buildPrintableReceiptText(receiptData);
  const paperWidthPx = receiptData.paperWidth === 58 ? 280 : 380;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Recibo ${escapeHtml(receiptData.metadata.orderShortId)}</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 16px;
        background: #ece8df;
        font-family: "Courier New", Courier, monospace;
      }
      .ticket {
        width: min(100%, ${paperWidthPx}px);
        margin: 0 auto;
        border: 1px solid #31291f;
        border-radius: 10px;
        background: #fffefa;
        color: #1f1912;
        padding: 14px;
        box-shadow: 0 12px 30px rgba(24, 17, 10, 0.15);
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.35;
        font-size: 12px;
      }
      .hint {
        width: min(100%, ${paperWidthPx}px);
        margin: 12px auto 0;
        color: #4f4031;
        font-size: 12px;
      }
      @media print {
        body {
          background: #ffffff;
          padding: 0;
        }
        .ticket {
          border: 0;
          border-radius: 0;
          box-shadow: none;
          width: 100%;
        }
        .hint {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    <section class="ticket">
      <pre>${escapeHtml(textPreview)}</pre>
    </section>
    <p class="hint">Usa el dialogo del navegador para imprimir o guardar como PDF.</p>
  </body>
</html>`;
}

function openWebPrintPreview(html: string): void {
  if (typeof window === 'undefined') {
    throw new Error('La vista previa web no esta disponible en este entorno.');
  }

  const previewWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!previewWindow) {
    throw new Error('No se pudo abrir la vista previa. Verifica bloqueadores de ventanas emergentes.');
  }

  previewWindow.document.open();
  previewWindow.document.write(html);
  previewWindow.document.close();
  previewWindow.focus();
  previewWindow.print();
}

function encodeReceiptToEscPos(receiptData: ReceiptData): Uint8Array {
  const encoder = new ReceiptPrinterEncoder();
  const textPreview = buildPrintableReceiptText(receiptData);
  const lines = textPreview.split('\n');

  encoder.initialize();
  for (const line of lines) {
    encoder.line(normalizeEscPosText(line));
  }
  if (receiptData.qrCodeData) {
    encoder.newline();
    encoder.qrcode(normalizeEscPosText(receiptData.qrCodeData));
  }
  encoder.newline().newline().cut();

  return encoder.encode();
}

function hasConfiguredPrinter(target?: PrinterTarget): boolean {
  return Boolean(target?.address && target.address.trim().length > 0);
}

async function sendEscPosOverAndroidBluetooth(payload: Uint8Array, target: PrinterTarget): Promise<void> {
  await ensureBluetoothPermissions();
  const bluetooth = await getBluetoothClassicModule();
  await ensureBluetoothEnabled(bluetooth);

  const address = target.address?.trim() ?? '';
  if (!address) {
    throw new Error('No hay direccion Bluetooth configurada para la impresora.');
  }

  const isConnected = await bluetooth.isDeviceConnected(address).catch(() => false);
  if (!isConnected) {
    await bluetooth.connectToDevice(address, {
      connectorType: 'rfcomm',
      delimiter: '',
      charset: 'ascii',
    });
  }

  const wrote = await bluetooth.writeToDevice(address, Buffer.from(payload));
  if (!wrote) {
    throw new Error('No se pudo enviar el ticket a la impresora Bluetooth.');
  }

  await bluetooth.disconnectFromDevice(address).catch(() => false);
}

function buildTestReceipt(paperWidth: ReceiptPaperWidth): ReceiptData {
  const now = Math.floor(Date.now() / 1000);
  return {
    business: {
      name: 'CafeBomBom',
      address: 'Prueba de impresion',
      phone: '000-000-0000',
      logoUri: null,
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

export class PrintService {
  async getStatus(target?: PrinterTarget): Promise<PrinterStatus> {
    if (Platform.OS === 'web') {
      return { connected: true, mode: 'web-print' };
    }

    if (hasConfiguredPrinter(target)) {
      let connected = true;
      try {
        await ensureBluetoothPermissions();
        const bluetooth = await getBluetoothClassicModule();
        await ensureBluetoothEnabled(bluetooth);
      } catch {
        connected = false;
      }

      return {
        connected,
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
    if (Platform.OS === 'web') {
      return buildReceiptHtml(receiptData);
    }

    return buildPrintableReceiptText(receiptData);
  }

  async printReceipt(receiptData: ReceiptData, target?: PrinterTarget): Promise<void> {
    if (Platform.OS === 'web') {
      openWebPrintPreview(this.previewReceipt(receiptData));
      return;
    }

    if (!hasConfiguredPrinter(target)) {
      throw new Error('Configura la impresora Bluetooth en Ajustes para imprimir desde Android.');
    }

    const payload = encodeReceiptToEscPos(receiptData);
    await sendEscPosOverAndroidBluetooth(payload, target ?? {});
  }

  async printTestReceipt(paperWidth: ReceiptPaperWidth, target?: PrinterTarget): Promise<void> {
    const testReceipt = buildTestReceipt(paperWidth);
    await this.printReceipt(testReceipt, target);
  }

  async getBondedPrinters(): Promise<PrinterTarget[]> {
    if (Platform.OS !== 'android') {
      return [];
    }

    await ensureBluetoothPermissions();
    const bluetooth = await getBluetoothClassicModule();
    await ensureBluetoothEnabled(bluetooth);
    const devices = await bluetooth.getBondedDevices();

    return devices
      .map((device) => {
        const address = (device.address ?? device.id ?? '').trim();
        const name = (device.name ?? '').trim();
        return { name, address };
      })
      .filter((device) => device.address.length > 0);
  }
}
