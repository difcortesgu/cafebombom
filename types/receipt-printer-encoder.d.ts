declare module '@point-of-sale/receipt-printer-encoder' {
  export type ReceiptPrinterEncoderAlignment = 'left' | 'center' | 'right';

  export type LogoImageData = {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  };

  export default class ReceiptPrinterEncoder {
    constructor(options?: Record<string, unknown>);

    initialize(): this;
    align(value: ReceiptPrinterEncoderAlignment): this;
    bold(value: boolean): this;
    line(value?: string): this;
    newline(): this;
    qrcode(value: string): this;
    image(
      imageData: LogoImageData,
      width: number,
      height: number,
      algorithm?: 'threshold' | 'bayer' | 'floydsteinberg' | 'atkinson',
      threshold?: number,
    ): this;
    cut(): this;
    encode(): Uint8Array;
  }
}