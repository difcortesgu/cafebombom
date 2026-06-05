import { createHash, randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { ensureProductImagesDir } from '../database';

const { Jimp } = require('jimp');

// Product images are display-only thumbnails; cap the longest side so stored
// files (and therefore backups) stay small. JPEG keeps the footprint low while
// being universally renderable in React Native <Image>.
const MAX_DIMENSION = 800;
const OUTPUT_EXTENSION = 'jpg';

export type SaveProductImageInput = {
    tempFilePath: string;
    originalFileName: string;
    mimeType: string;
};

export type SavedProductImage = {
    imageId: string;
    version: string;
};

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
        return;
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

function resizeToMax(image: any, maxDimension: number): any {
    const width = image.bitmap.width as number;
    const height = image.bitmap.height as number;
    const longest = Math.max(width, height);
    if (longest <= maxDimension) {
        return image;
    }

    const scale = maxDimension / longest;
    const targetWidth = Math.round(width * scale);
    try {
        return image.resize({ w: targetWidth });
    } catch {
        return image.resize(targetWidth, Jimp.AUTO);
    }
}

/**
 * Extracts the imageId from an `image_uri` that points at a server-stored image
 * (`…/api/products/images/<imageId>?v=…`). Returns null for external/data URIs
 * that aren't managed by this service.
 */
export function extractManagedImageId(imageUri: string | null | undefined): string | null {
    if (!imageUri) {
        return null;
    }
    const match = imageUri.match(/\/api\/products\/images\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

export class ProductImageService {
    getImagePath(imageId: string): string {
        return path.join(ensureProductImagesDir(), `${imageId}.${OUTPUT_EXTENSION}`);
    }

    /** Decodes, resizes and stores an uploaded image, returning its stable id + version. */
    async saveUploadedImage(input: SaveProductImageInput): Promise<SavedProductImage> {
        const imageId = randomUUID();
        const sourceBuffer = fs.readFileSync(input.tempFilePath);
        const sourceHash = createHash('sha256').update(sourceBuffer).digest('hex');
        const version = `${Date.now()}-${sourceHash.slice(0, 12)}`;

        const imagesRoot = ensureProductImagesDir();
        const tempOutputPath = path.join(imagesRoot, `.tmp-${imageId}.${OUTPUT_EXTENSION}`);
        const finalOutputPath = this.getImagePath(imageId);

        const decoded = await Jimp.read(input.tempFilePath);
        const resized = resizeToMax(decoded, MAX_DIMENSION);
        await writeImage(resized, tempOutputPath);

        fs.renameSync(tempOutputPath, finalOutputPath);

        return { imageId, version };
    }

    /** Best-effort deletion of a stored image; safe to call for ids that no longer exist. */
    deleteImage(imageId: string): void {
        try {
            fs.rmSync(this.getImagePath(imageId), { force: true });
        } catch {
            // ignore cleanup failures
        }
    }
}
