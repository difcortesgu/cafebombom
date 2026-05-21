import type { ReceiptData, ReceiptPaperWidth } from '@/types/receipt';

export type ReceiptVariant = {
    id: string;
    label: string;
    receipt: ReceiptData;
};

export type PaymentModalBusiness = {
    name: string;
    address: string;
    phone: string;
    nit: string;
    logoUri: string | null;
    footerMessage: string;
    taxRate: number;
    paperWidth: ReceiptPaperWidth;
    printerDeviceName: string | null;
    printerDeviceAddress: string | null;
};
