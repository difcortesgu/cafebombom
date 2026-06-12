import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import {
    createBackup,
    getBackupSettings,
    listBackups,
    pickDestinationFolder,
    restoreBackup,
    saveBackupSettings,
} from '../services/backup';
import { logger } from '../utils/logger';

const router = Router();

// Backups expose the whole database; restrict to owners.
router.use(authMiddleware, requireRole('owner'));

/**
 * @openapi
 * /api/backup/settings:
 *   get:
 *     tags: [Backup]
 *     summary: Get backup settings
 *     responses:
 *       200: { description: Current backup settings }
 *   put:
 *     tags: [Backup]
 *     summary: Update backup settings
 *     responses:
 *       200: { description: Updated backup settings }
 */
router.get('/settings', (_req: Request, res: Response) => {
    res.json(getBackupSettings());
});

router.put('/settings', (req: Request, res: Response) => {
    try {
        const body = req.body ?? {};
        const patch: Parameters<typeof saveBackupSettings>[0] = {};
        if ('destinationPath' in body) patch.destinationPath = body.destinationPath;
        if ('scheduleEnabled' in body) patch.scheduleEnabled = body.scheduleEnabled;
        if ('frequency' in body) patch.frequency = body.frequency;
        if ('retention' in body) patch.retention = body.retention;
        const updated = saveBackupSettings(patch);
        res.json(updated);
    } catch (error) {
        logger.error('[BACKUP] Falló al guardar la configuración.', error);
        res.status(500).json({ error: 'No se pudo guardar la configuración de respaldos.' });
    }
});

/**
 * @openapi
 * /api/backup/run:
 *   post:
 *     tags: [Backup]
 *     summary: Create a backup now
 *     responses:
 *       200: { description: Backup created }
 */
router.post('/run', async (_req: Request, res: Response) => {
    try {
        const result = await createBackup();
        res.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo crear el respaldo.';
        logger.error('[BACKUP] Falló la creación del respaldo.', error);
        res.status(400).json({ error: message });
    }
});

/**
 * @openapi
 * /api/backup/list:
 *   get:
 *     tags: [Backup]
 *     summary: List existing backups in the destination folder
 *     responses:
 *       200: { description: Array of backups }
 */
router.get('/list', (_req: Request, res: Response) => {
    try {
        res.json(listBackups());
    } catch (error) {
        logger.error('[BACKUP] Falló al listar respaldos.', error);
        res.status(500).json({ error: 'No se pudieron listar los respaldos.' });
    }
});

/**
 * @openapi
 * /api/backup/restore:
 *   post:
 *     tags: [Backup]
 *     summary: Restore from a backup; the app restarts to apply it
 *     responses:
 *       200: { description: Restore started }
 */
router.post('/restore', (req: Request, res: Response) => {
    try {
        const { fileName } = (req.body ?? {}) as { fileName?: string };
        if (!fileName) {
            res.status(400).json({ error: 'fileName es obligatorio.' });
            return;
        }
        restoreBackup(fileName);
        res.json({ status: 'restoring' });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo restaurar el respaldo.';
        logger.error('[BACKUP] Falló la restauración.', error);
        res.status(400).json({ error: message });
    }
});

/**
 * @openapi
 * /api/backup/pick-folder:
 *   post:
 *     tags: [Backup]
 *     summary: Open a native folder picker on the desktop host
 *     responses:
 *       200: { description: Selected path, or unsupported }
 */
router.post('/pick-folder', async (_req: Request, res: Response) => {
    const selectedPath = await pickDestinationFolder();
    if (selectedPath === null) {
        res.json({ status: 'unsupported', path: null });
        return;
    }
    res.json({ status: 'ok', path: selectedPath });
});

export default router;
