import type { LogoImageData } from '@point-of-sale/receipt-printer-encoder';
import sharp from 'sharp';

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

export async function loadLogoBitmap(logoUri: string, paperWidth?: 58 | 80): Promise<LogoImageData | null> {
  if (!logoUri) {
    return null;
  }

  try {
    const targetWidth = getLogoTargetWidth(paperWidth);
    const { data, info } = await sharp(logoUri)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (!data || info.width <= 0 || info.height <= 0) {
      return null;
    }

    return {
      data: new Uint8ClampedArray(data),
      width: info.width,
      height: info.height,
    };
  } catch {
    return null;
  }
}
