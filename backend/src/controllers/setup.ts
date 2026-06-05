import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { logoService, setupService, usersService } from '../services';
import { getSetupStatus as getBootstrapStatus } from '../services/bootstrap';
import { SeedImportParseError, SeedImportValidationError } from '../services/seed-import';

// Known business-rule violations are thrown by the services as AppError and
// turned into 4xx responses by the central error handler (see utils/errors.ts).
// Unexpected errors propagate there too and become a logged 500.

function buildSetupAssetUrls(req: Request, logoId: string, logoVersion: string) {
  const baseUrl = `${req.protocol}://${req.get('host')}/api/setup`;
  return {
    raster58Url: `${baseUrl}/logo/${logoId}/raster/58?v=${logoVersion}`,
    raster80Url: `${baseUrl}/logo/${logoId}/raster/80?v=${logoVersion}`,
    previewUrl: `${baseUrl}/logo/${logoId}/preview?v=${logoVersion}`,
  };
}

export function getSetupStatus(req: Request, res: Response): void {
  const status = getBootstrapStatus();
  res.status(200).json(status);
}

export async function getReceiptPreferences(req: Request, res: Response): Promise<void> {
  const prefs = await setupService.getReceiptPreferences();
  res.status(200).json(prefs);
}

export async function saveReceiptPreferences(req: Request, res: Response): Promise<void> {
  const {
    businessName,
    businessAddress,
    businessPhone,
    businessNit,
    businessLogoUri,
    logoId,
    logoVersion,
    footerMessage,
    paperWidth,
    taxRate,
  } = req.body;

  if (!businessName) {
    res.status(400).json({ error: 'businessName is required.' });
    return;
  }

  if (paperWidth !== 58 && paperWidth !== 80) {
    res.status(400).json({ error: 'paperWidth must be 58 or 80.' });
    return;
  }

  if (typeof taxRate !== 'number' || taxRate < 0 || taxRate > 1) {
    res.status(400).json({ error: 'taxRate must be a number between 0 and 1.' });
    return;
  }

  await setupService.saveReceiptPreferences({
    businessName,
    businessAddress: businessAddress ?? '',
    businessPhone: businessPhone ?? '',
    businessNit: businessNit ?? '',
    businessLogoUri: businessLogoUri ?? null,
    logoId: typeof logoId === 'string' ? logoId : undefined,
    logoVersion: typeof logoVersion === 'string' ? logoVersion : undefined,
    footerMessage: footerMessage ?? '',
    paperWidth,
    taxRate,
  });
  res.status(204).send();
}

export async function importSeedFromExcel(req: Request, res: Response): Promise<void> {
  const upload = req as Request & { file?: { buffer?: Buffer } };
  const fileBuffer = upload.file?.buffer;
  const content = (req.body as { content?: number[] } | undefined)?.content;

  let workbookBytes: Uint8Array | null = null;

  if (fileBuffer && fileBuffer.length > 0) {
    workbookBytes = new Uint8Array(fileBuffer);
  } else if (Array.isArray(content) && content.length > 0) {
    workbookBytes = new Uint8Array(content);
  }

  if (!workbookBytes) {
    res.status(400).json({ error: 'file (multipart) or content (byte array) is required.' });
    return;
  }

  try {
    const result = await setupService.importSeedFromExcel(workbookBytes);
    res.status(200).json(result);
  } catch (error) {
    // These carry extra response fields (code/issues), so they're shaped here
    // rather than by the generic error handler. Anything else propagates.
    if (error instanceof SeedImportParseError) {
      res.status(400).json({ error: error.message, code: 'INVALID_WORKBOOK' });
      return;
    }

    if (error instanceof SeedImportValidationError) {
      res.status(422).json({
        error: error.message,
        code: 'SEED_VALIDATION_FAILED',
        issues: error.issues,
      });
      return;
    }

    throw error;
  }
}

export function downloadImportTemplate(req: Request, res: Response): void {
  const exeDir = path.dirname(process.execPath);
  const isProduction = process.execPath.endsWith('.exe') || fs.existsSync(path.join(exeDir, 'public'));
  const baseDir = isProduction ? exeDir : process.cwd();
  const templatePath = path.join(baseDir, 'assets', 'import-template.xlsx');

  if (!fs.existsSync(templatePath)) {
    res.status(404).json({ error: 'Import template not found.' });
    return;
  }

  res.download(templatePath, 'import-template.xlsx');
}

export async function uploadBusinessLogo(req: Request, res: Response): Promise<void> {
  const upload = req as Request & { file?: { path?: string; originalname?: string; mimetype?: string } };
  const filePath = upload.file?.path;

  if (!filePath) {
    res.status(400).json({ error: 'Logo file is required.' });
    return;
  }

  try {
    const processed = await logoService.processUploadedLogo({
      tempFilePath: filePath,
      originalFileName: upload.file?.originalname ?? 'logo.png',
      mimeType: upload.file?.mimetype ?? 'image/png',
    });

    const currentPreferences = await setupService.getReceiptPreferences();
    await setupService.saveReceiptPreferences({
      businessName: currentPreferences.businessName,
      businessAddress: currentPreferences.businessAddress,
      businessPhone: currentPreferences.businessPhone,
      businessNit: currentPreferences.businessNit,
      businessLogoUri: currentPreferences.businessLogoUri,
      logoId: processed.logoId,
      logoVersion: processed.logoVersion,
      footerMessage: currentPreferences.footerMessage,
      paperWidth: currentPreferences.paperWidth,
      taxRate: currentPreferences.taxRate,
    });

    const urls = buildSetupAssetUrls(req, processed.logoId, processed.logoVersion);

    res.status(201).json({
      logoId: processed.logoId,
      logoVersion: processed.logoVersion,
      updatedAt: processed.metadata.createdAt,
      ...urls,
    });
  } finally {
    // Always clean up the multer temp file, even when processing fails and the
    // error propagates to the central handler.
    try {
      fs.rmSync(filePath, { force: true });
    } catch {
      // ignore temp cleanup failures
    }
  }
}

export async function getLogoManifest(req: Request, res: Response): Promise<void> {
  const prefs = await setupService.getReceiptPreferences();
  if (!prefs.logoId || !prefs.logoVersion) {
    res.status(200).json({
      status: prefs.businessLogoUri ? 'unmanaged' : 'empty',
      logoId: null,
      logoVersion: null,
    });
    return;
  }

  const manifest = logoService.readManifest(prefs.logoId);
  if (!manifest) {
    res.status(404).json({ error: 'Logo metadata not found.' });
    return;
  }

  const urls = buildSetupAssetUrls(req, manifest.logoId, manifest.logoVersion);
  res.status(200).json({
    status: 'ready',
    logoId: manifest.logoId,
    logoVersion: manifest.logoVersion,
    updatedAt: manifest.updatedAt,
    ...urls,
  });
}

export async function getLogoRaster(req: Request, res: Response): Promise<void> {
  const { id, width } = req.params as Record<string, string>;
  const parsedWidth = Number(width);

  if (parsedWidth !== 58 && parsedWidth !== 80) {
    res.status(400).json({ error: 'width must be 58 or 80.' });
    return;
  }

  const prefs = await setupService.getReceiptPreferences();
  if (!prefs.logoId || id !== prefs.logoId) {
    res.status(404).json({ error: 'Logo not configured.' });
    return;
  }

  const rasterPath = logoService.getRasterPath(id, parsedWidth);
  if (!fs.existsSync(rasterPath)) {
    res.status(404).json({ error: 'Raster payload not found.' });
    return;
  }

  if (prefs.logoVersion) {
    res.setHeader('ETag', `"${prefs.logoVersion}-${parsedWidth}"`);
  }
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.sendFile(path.resolve(rasterPath), { dotfiles: 'allow' });
}

export async function getLogoPreview(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;

  const prefs = await setupService.getReceiptPreferences();
  if (!prefs.logoId || id !== prefs.logoId) {
    res.status(404).json({ error: 'Logo not configured.' });
    return;
  }

  const previewPath = logoService.getPreviewPath(id);
  if (!fs.existsSync(previewPath)) {
    res.status(404).json({ error: 'Logo preview not found.' });
    return;
  }

  if (prefs.logoVersion) {
    res.setHeader('ETag', `"${prefs.logoVersion}-preview"`);
  }
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('Content-Type', 'image/png');
  res.sendFile(path.resolve(previewPath), { dotfiles: 'allow' });
}

// ── Setup-phase user management (no actor checks) ────────────────────────────

export async function setupGetAllUsers(req: Request, res: Response): Promise<void> {
  const users = await usersService.getAllUsers();
  res.status(200).json(users);
}

export async function setupCreateUser(req: Request, res: Response): Promise<void> {
  const { name, role, pin } = req.body as { name?: string; role?: string; pin?: string };

  if (!name || !role || !pin) {
    res.status(400).json({ error: 'name, role, and pin are required.' });
    return;
  }

  if (role !== 'owner' && role !== 'staff') {
    res.status(400).json({ error: 'role must be owner or staff.' });
    return;
  }

  const user = await usersService.createUser({ name, role, pin });
  if (!user) {
    res.status(409).json({ error: 'User already exists or PIN is too short.' });
    return;
  }
  res.status(201).json(user);
}

export async function setupUpdateUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { name, pin, role } = req.body as { name?: string; pin?: string; role?: string };

  if (role !== undefined && role !== 'owner' && role !== 'staff') {
    res.status(400).json({ error: 'role must be owner or staff.' });
    return;
  }

  const user = await usersService.setupUpdateUser(id, { name, pin, role: role as 'owner' | 'staff' | undefined });
  if (!user) {
    res.status(404).json({ error: 'User not found or inactive.' });
    return;
  }
  res.status(200).json(user);
}

export async function setupDeleteUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  await usersService.setupDeleteUser(id);
  res.status(204).send();
}

export async function setupHardDeleteUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  await usersService.setupHardDeleteUser(id);
  res.status(204).send();
}

export async function setupReactivateUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  await usersService.setupReactivateUser(id);
  res.status(204).send();
}
