import { setupService, usersService } from '../services';
import { getSetupStatus as getBootstrapStatus } from '../services/bootstrap';
import { SeedImportParseError, SeedImportValidationError } from '../services/seed-import';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';


export function getSetupStatus(req: Request, res: Response): void {
  try {
    const status = getBootstrapStatus();
    res.status(200).json(status);
  } catch (error) {
    console.error('[setup] getSetupStatus failed:', error);
    res.status(500).json({ error: 'Failed to fetch setup status.' });
  }
}

export async function getReceiptPreferences(req: Request, res: Response): Promise<void> {
  try {
    const prefs = await setupService.getReceiptPreferences();
    res.status(200).json(prefs);
  } catch (error) {
    console.error('[setup] getReceiptPreferences failed:', error);
    res.status(500).json({ error: 'Failed to fetch receipt preferences.' });
  }
}

export async function saveReceiptPreferences(req: Request, res: Response): Promise<void> {
  const { businessName, businessAddress, businessPhone, businessNit, businessLogoUri, footerMessage, paperWidth, taxRate } = req.body;

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

  try {
    await setupService.saveReceiptPreferences({
      businessName,
      businessAddress: businessAddress ?? '',
      businessPhone: businessPhone ?? '',
      businessNit: businessNit ?? '',
      businessLogoUri: businessLogoUri ?? null,
      footerMessage: footerMessage ?? '',
      paperWidth,
      taxRate,
    });
    res.status(204).send();
  } catch (error) {
    console.error('[setup] saveReceiptPreferences failed:', error);
    res.status(500).json({ error: 'Failed to save receipt preferences.' });
  }
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
    if (error instanceof SeedImportParseError) {
      res.status(400).json({
        error: error.message,
        code: 'INVALID_WORKBOOK',
      });
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

    console.error('[setup] importSeedFromExcel failed:', error);
    res.status(500).json({ error: 'Failed to import seed data.' });
  }
}

export function downloadImportTemplate(req: Request, res: Response): void {
  const templatePath = path.resolve(__dirname, '../../../docs/import-template-v2.xlsx');

  if (!fs.existsSync(templatePath)) {
    res.status(404).json({ error: 'Import template not found.' });
    return;
  }

  res.download(templatePath, 'import-template-v2.xlsx');
}

// ── Setup-phase user management (no actor checks) ────────────────────────────

export async function setupGetAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await usersService.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error('[setup] setupGetAllUsers failed:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
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

  try {
    const user = await usersService.createUser({ name, role, pin });
    if (!user) {
      res.status(409).json({ error: 'User already exists or PIN is too short.' });
      return;
    }
    res.status(201).json(user);
  } catch (error) {
    console.error('[setup] setupCreateUser failed:', error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
}

export async function setupUpdateUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const { name, pin, role } = req.body as { name?: string; pin?: string; role?: string };

  if (role !== undefined && role !== 'owner' && role !== 'staff') {
    res.status(400).json({ error: 'role must be owner or staff.' });
    return;
  }

  try {
    const user = await usersService.setupUpdateUser(id, { name, pin, role: role as 'owner' | 'staff' | undefined });
    if (!user) {
      res.status(404).json({ error: 'User not found or inactive.' });
      return;
    }
    res.status(200).json(user);
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (msg.includes('empty') || msg.includes('PIN') || msg.includes('already uses')) {
      res.status(422).json({ error: msg });
      return;
    }
    console.error('[setup] setupUpdateUser failed:', error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
}

export async function setupDeleteUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    await usersService.setupDeleteUser(id);
    res.status(204).send();
  } catch (error) {
    console.error('[setup] setupDeleteUser failed:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
}

export async function setupHardDeleteUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    await usersService.setupHardDeleteUser(id);
    res.status(204).send();
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    if (msg.includes('linked sales')) {
      res.status(422).json({ error: msg });
      return;
    }
    console.error('[setup] setupHardDeleteUser failed:', error);
    res.status(500).json({ error: 'Failed to hard-delete user.' });
  }
}

export async function setupReactivateUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  try {
    await usersService.setupReactivateUser(id);
    res.status(204).send();
  } catch (error) {
    console.error('[setup] setupReactivateUser failed:', error);
    res.status(500).json({ error: 'Failed to reactivate user.' });
  }
}
