import { createHash, randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { ensureLogosDir } from '../database';
import type { LogoMetadataV1, LogoRasterVariant } from '../types/logo';

const ReceiptPrinterEncoder = require('@point-of-sale/receipt-printer-encoder');
const { Jimp } = require('jimp');

const RASTER_WIDTHS: Array<{ paperWidth: 58 | 80; pixelWidth: number }> = [
    { paperWidth: 58, pixelWidth: 384 },
    { paperWidth: 80, pixelWidth: 576 },
];

type ProcessLogoInput = {
    tempFilePath: string;
    originalFileName: string;
    mimeType: string;
};

export type ProcessedLogoResult = {
    logoId: string;
    logoVersion: string;
    metadata: LogoMetadataV1;
};

export type LogoManifest = {
    logoId: string;
    logoVersion: string;
    updatedAt: number;
    previewRelativePath: string;
    raster58RelativePath: string;
    raster80RelativePath: string;
};

function getMimeFromFileName(fileName: string): string {
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.png')) return 'image/png';
    if (lowerName.endsWith('.webp')) return 'image/webp';
    if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
    return 'application/octet-stream';
}

function toSafeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'logo';
}

function resizeToWidth(image: any, targetWidth: number): any {
    const clone = image.clone();
    try {
        return clone.resize({ w: targetWidth });
    } catch {
        return clone.resize(targetWidth, Jimp.AUTO);
    }
}

function flattenAlphaToWhite(image: any): void {
    const data = image.bitmap.data as Buffer;
    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3] / 255;
        if (alpha >= 1) {
            continue;
        }

        const red = data[i];
        const green = data[i + 1];
        const blue = data[i + 2];

        data[i] = Math.round(red * alpha + 255 * (1 - alpha));
        data[i + 1] = Math.round(green * alpha + 255 * (1 - alpha));
        data[i + 2] = Math.round(blue * alpha + 255 * (1 - alpha));
        data[i + 3] = 255;
    }
}

function toUint8ClampedArray(buffer: Buffer): Uint8ClampedArray {
    const out = new Uint8ClampedArray(buffer.length);
    out.set(buffer);
    return out;
}

function writeJsonFile(filePath: string, value: unknown): void {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function readJsonFile<T>(filePath: string): T {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
}

async function writeImage(image: any, targetPath: string): Promise<void> {
    if (typeof image.writeAsync === 'function') {
        await image.writeAsync(targetPath);
        return;
    }

    if (typeof image.write === 'function') {
        const maybePromise = image.write(targetPath);
        if (maybePromise && typeof maybePromise.then === 'function') {
            await maybePromise;
            return;
        }
    }

    await new Promise<void>((resolve, reject) => {
        image.write(targetPath, (error: unknown) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

function buildEscPosRaster(image: any): Uint8Array {
    const width = image.bitmap.width as number;
    const height = image.bitmap.height as number;
    const rgba = toUint8ClampedArray(image.bitmap.data as Buffer);
    const encoder = new ReceiptPrinterEncoder();

    encoder.initialize();
    encoder.align('center');
    encoder.image({ data: rgba, width, height }, width, height, 'threshold', 150);
    encoder.newline();

    return encoder.encode();
}

export class LogoProcessingService {
    getLogoDirectory(logoId: string): string {
        return path.join(ensureLogosDir(), logoId);
    }

    getMetadataPath(logoId: string): string {
        return path.join(this.getLogoDirectory(logoId), 'metadata.json');
    }

    getPreviewPath(logoId: string): string {
        return path.join(this.getLogoDirectory(logoId), 'preview.png');
    }

    getRasterPath(logoId: string, paperWidth: 58 | 80): string {
        return path.join(this.getLogoDirectory(logoId), `raster-${paperWidth}.bin`);
    }

    readManifest(logoId: string): LogoManifest | null {
        const metadataPath = this.getMetadataPath(logoId);
        if (!fs.existsSync(metadataPath)) {
            return null;
        }

        const metadata = readJsonFile<LogoMetadataV1>(metadataPath);
        const raster58 = metadata.rasters.find((item) => item.paperWidth === 58);
        const raster80 = metadata.rasters.find((item) => item.paperWidth === 80);

        if (!raster58 || !raster80) {
            return null;
        }

        return {
            logoId: metadata.logoId,
            logoVersion: metadata.logoVersion,
            updatedAt: metadata.createdAt,
            previewRelativePath: metadata.preview.relativePath,
            raster58RelativePath: raster58.relativePath,
            raster80RelativePath: raster80.relativePath,
        };
    }

    async processUploadedLogo(input: ProcessLogoInput): Promise<ProcessedLogoResult> {
        const logoId = randomUUID();
        const sourceBuffer = fs.readFileSync(input.tempFilePath);
        const sourceHash = createHash('sha256').update(sourceBuffer).digest('hex');
        const logoVersion = `${Date.now()}-${sourceHash.slice(0, 12)}`;

        const logosRoot = ensureLogosDir();
        const tempOutputDir = path.join(logosRoot, `.tmp-${logoId}-${Date.now()}`);
        const finalOutputDir = path.join(logosRoot, logoId);

        fs.mkdirSync(tempOutputDir, { recursive: true });

        const decoded = await Jimp.read(input.tempFilePath);
        flattenAlphaToWhite(decoded);

        const safeOriginalName = toSafeFileName(input.originalFileName);
        const sourceMime = input.mimeType || getMimeFromFileName(safeOriginalName);
        const sourceExt = sourceMime.includes('png')
            ? 'png'
            : sourceMime.includes('webp')
                ? 'webp'
                : 'jpg';

        const sourceRelativePath = `original.${sourceExt}`;
        fs.writeFileSync(path.join(tempOutputDir, sourceRelativePath), sourceBuffer);

        const previewImage = resizeToWidth(decoded, 384);
        flattenAlphaToWhite(previewImage);
        const previewRelativePath = 'preview.png';
        await writeImage(previewImage, path.join(tempOutputDir, previewRelativePath));

        const rasters: LogoRasterVariant[] = [];

        for (const config of RASTER_WIDTHS) {
            const rasterImage = resizeToWidth(decoded, config.pixelWidth);
            flattenAlphaToWhite(rasterImage);
            const bytes = buildEscPosRaster(rasterImage);
            const relativePath = `raster-${config.paperWidth}.bin`;
            fs.writeFileSync(path.join(tempOutputDir, relativePath), Buffer.from(bytes));

            rasters.push({
                paperWidth: config.paperWidth,
                pixelWidth: rasterImage.bitmap.width,
                pixelHeight: rasterImage.bitmap.height,
                relativePath,
                bytes: bytes.byteLength,
                algorithm: 'threshold',
                threshold: 150,
            });
        }

        const metadata: LogoMetadataV1 = {
            version: 1,
            logoId,
            logoVersion,
            createdAt: Math.floor(Date.now() / 1000),
            source: {
                originalFileName: safeOriginalName,
                mimeType: sourceMime,
                relativePath: sourceRelativePath,
                sha256: sourceHash,
                pixelWidth: decoded.bitmap.width,
                pixelHeight: decoded.bitmap.height,
            },
            preview: {
                relativePath: previewRelativePath,
                pixelWidth: previewImage.bitmap.width,
                pixelHeight: previewImage.bitmap.height,
            },
            rasters,
        };

        writeJsonFile(path.join(tempOutputDir, 'metadata.json'), metadata);

        if (fs.existsSync(finalOutputDir)) {
            fs.rmSync(finalOutputDir, { recursive: true, force: true });
        }

        fs.renameSync(tempOutputDir, finalOutputDir);

        return {
            logoId,
            logoVersion,
            metadata,
        };
    }
}
