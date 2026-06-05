import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import {
    downloadImportTemplate,
    getLogoManifest,
    getLogoPreview,
    getLogoRaster,
    getReceiptPreferences,
    getSetupStatus,
    importSeedFromExcel,
    saveReceiptPreferences,
    setupCreateUser,
    setupDeleteUser,
    setupGetAllUsers,
    setupHardDeleteUser,
    setupReactivateUser,
    setupUpdateUser,
    uploadBusinessLogo,
} from '../controllers/setup';
import { ensureLogosDir } from '../database';
import { authMiddleware } from '../middleware/auth';
import { bootstrapOrOwnerAuth } from '../middleware/bootstrap';
import { logger } from '../utils/logger';

const router = Router();
const logosRoot = ensureLogosDir();
const logosTmpDir = path.join(logosRoot, '.tmp');

if (!fs.existsSync(logosTmpDir)) {
    fs.mkdirSync(logosTmpDir, { recursive: true });
}

const importUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        // Import only needs one workbook; keep this conservative.
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        const acceptedMimeTypes = new Set([
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/octet-stream',
        ]);
        const lowerName = file.originalname.toLowerCase();
        const hasExcelExtension = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');

        if (hasExcelExtension || acceptedMimeTypes.has(file.mimetype)) {
            cb(null, true);
            return;
        }

        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file'));
    },
});

const logoUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, logosTmpDir);
        },
        filename: (_req, file, cb) => {
            const timestamp = Date.now();
            const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            cb(null, `${timestamp}-${sanitizedName}`);
        },
    }),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        const acceptedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
        const lowerName = file.originalname.toLowerCase();
        const validExtension = lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.webp');

        if (validExtension || acceptedMimeTypes.has(file.mimetype)) {
            cb(null, true);
            return;
        }

        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file'));
    },
});

function importUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
    importUpload.single('file')(req, res, (error: unknown) => {
        if (!error) {
            next();
            return;
        }

        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                res.status(400).json({ error: 'File exceeds maximum size of 10MB.', code: error.code });
                return;
            }

            res.status(400).json({ error: 'Invalid import file upload.', code: error.code });
            return;
        }

        res.status(400).json({ error: 'Invalid import file upload.', code: 'UPLOAD_FAILED' });
    });
}

function logoUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
    logoUpload.single('file')(req, res, (error: unknown) => {
        if (!error) {
            next();
            return;
        }

        logger.error('Logo upload error:', error);
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                res.status(400).json({ error: 'Logo file exceeds maximum size of 5MB.', code: error.code });
                return;
            }

            res.status(400).json({ error: 'Invalid logo file upload.', code: error.code });
            return;
        }

        res.status(400).json({ error: 'Invalid logo file upload.', code: 'UPLOAD_FAILED' });
    });
}

/**
 * @openapi
 * /api/setup/status:
 *   get:
 *     tags: [Setup]
 *     summary: Read whether initial setup is complete
 *     security: []
 *     responses:
 *       200:
 *         description: Setup status payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSetupDone: { type: boolean }
 *                 activeOwnerCount: { type: integer }
 */
router.get('/status', getSetupStatus);

// Receipt prefs are readable by any authenticated user (staff need them for the app)
router.get('/receipt-prefs', authMiddleware, getReceiptPreferences);
router.get('/logo/manifest', authMiddleware, getLogoManifest);
router.get('/logo/:id/raster/:width', getLogoRaster);
router.get('/logo/:id/preview', getLogoPreview);

// All other setup routes are public during bootstrap, owner-auth after first owner exists
router.use(bootstrapOrOwnerAuth);

/**
 * @openapi
 * /api/setup/receipt-prefs:
 *   get:
 *     tags: [Setup]
 *     summary: Get receipt printing preferences
 *     security:
 *       - {}
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current receipt preferences
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReceiptPreferences'
 *   put:
 *     tags: [Setup]
 *     summary: Save receipt printing preferences
 *     security:
 *       - {}
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReceiptPreferences'
 *     responses:
 *       204:
 *         description: Saved
 */
router.put('/receipt-prefs', saveReceiptPreferences);
router.post('/logo', logoUploadMiddleware, uploadBusinessLogo);

/**
 * @openapi
 * /api/setup/import-template:
 *   get:
 *     tags: [Setup]
 *     summary: Download the official Excel import template
 *     security:
 *       - {}
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Template file not found on server
 */
router.get('/import-template', downloadImportTemplate);

/**
 * @openapi
 * /api/setup/import:
 *   post:
 *     tags: [Setup]
 *     summary: Import seed data from an Excel file
 *     security:
 *       - {}
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel workbook (.xlsx)
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: array
 *                 items: { type: integer }
 *                 description: Raw bytes of the Excel workbook (legacy fallback)
 *     responses:
 *       200:
 *         description: Import result summary
 *       400:
 *         description: Invalid file content
 */
router.post('/import', importUploadMiddleware, importSeedFromExcel);

/**
 * @openapi
 * /api/setup/users:
 *   get:
 *     tags: [Setup]
 *     summary: List all users (including inactive) during setup
 *     security:
 *       - {}
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ManagedUser'
 */
router.get('/users', setupGetAllUsers);
router.post('/users', setupCreateUser);

/**
 * @openapi
 * /api/setup/users/{id}:
 *   patch:
 *     tags: [Setup]
 *     summary: Update a user's name, PIN, or role during setup
 *     security:
 *       - {}
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               pin: { type: string }
 *               role: { type: string, enum: [owner, staff] }
 *     responses:
 *       204:
 *         description: Updated
 *   delete:
 *     tags: [Setup]
 *     summary: Soft-delete a user during setup
 *     security:
 *       - {}
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deactivated
 */
router.patch('/users/:id', setupUpdateUser);
router.delete('/users/:id', setupDeleteUser);

/**
 * @openapi
 * /api/setup/users/{id}/hard:
 *   delete:
 *     tags: [Setup]
 *     summary: Permanently delete a user during setup (blocked if user has linked sales)
 *     security:
 *       - {}
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       409:
 *         description: User has linked sales records
 */
router.delete('/users/:id/hard', setupHardDeleteUser);

/**
 * @openapi
 * /api/setup/users/{id}/reactivate:
 *   post:
 *     tags: [Setup]
 *     summary: Reactivate a deactivated user during setup
 *     security:
 *       - {}
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Reactivated
 */
router.post('/users/:id/reactivate', setupReactivateUser);

export default router;
