import type { LogoImageData } from '@point-of-sale/receipt-printer-encoder';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'fast-png';

const LOGO_WIDTH_BY_PAPER = {
  58: 256,
  80: 384,
} as const;

function getLogoTargetWidth(paperWidth?: 58 | 80): number {
  if (paperWidth === 58) {
    return LOGO_WIDTH_BY_PAPER[58];
  }
  return LOGO_WIDTH_BY_PAPER[80];
}

function normalizeDecodedPixels(decodedData: Uint8Array, channels: number, width: number, height: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < width * height; i += 1) {
    const sourceOffset = i * channels;
    const targetOffset = i * 4;
    const alpha = channels >= 4 ? decodedData[sourceOffset + 3] / 255 : 1;

    rgba[targetOffset] = Math.round(decodedData[sourceOffset] * alpha + 255 * (1 - alpha));
    rgba[targetOffset + 1] = Math.round(decodedData[sourceOffset + 1] * alpha + 255 * (1 - alpha));
    rgba[targetOffset + 2] = Math.round(decodedData[sourceOffset + 2] * alpha + 255 * (1 - alpha));
    rgba[targetOffset + 3] = 255;
  }

  return rgba;
}

export async function loadLogoBitmap(logoUri: string, paperWidth?: 58 | 80): Promise<LogoImageData | null> {
  if (!logoUri) {
    return null;
  }

  try {
    const targetWidth = getLogoTargetWidth(paperWidth);
    const transformed = await manipulateAsync(
      logoUri,
      [{ resize: { width: targetWidth } }],
      {
        compress: 1,
        format: SaveFormat.PNG,
      },
    );

    const response = await fetch(transformed.uri);
    if (!response.ok) {
      return null;
    }

    const pngBytes = new Uint8Array(await response.arrayBuffer());
    const decoded = decode(pngBytes);

    if (![3, 4].includes(decoded.channels) || !decoded.data || decoded.width <= 0 || decoded.height <= 0) {
      return null;
    }

    return {
      data: normalizeDecodedPixels(decoded.data, decoded.channels, decoded.width, decoded.height),
      width: decoded.width,
      height: decoded.height,
    };
  } catch {
    return null;
  }
}
