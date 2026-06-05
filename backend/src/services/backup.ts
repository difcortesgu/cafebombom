/**
 * Database + assets backup/restore service.
 *
 * Backups are written as a single timestamped zip into a user-chosen folder.
 * The intended workflow is that the user points the destination at a folder
 * synced by their cloud client (Google Drive Desktop / OneDrive / Dropbox), so
 * the archive is uploaded off-machine automatically — no OAuth required.
 *
 * Each archive contains a consistent `sqlite.db` snapshot (via VACUUM INTO) plus
 * the `logos/` and `product-images/` trees, so a restore is complete.
 *
 * Restore can't replace files this process has open, so — like the self-updater
 * (see updater.ts) — it extracts to a staging dir, spawns a detached helper that
 * waits for this process to exit, swaps the files in, and relaunches.
 */

import AdmZip from 'adm-zip';
import { spawn } from 'child_process';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
    db,
    getDatabasePath,
    logosPath,
    productImagesPath,
    snapshotDatabaseTo,
} from '../database';
import { backupSettings } from '../database/schema';
import { logger } from '../utils/logger';

const SETTINGS_ID = 'singleton';
const BACKUP_PREFIX = 'cafebombom-backup-';
const BACKUP_SUFFIX = '.zip';

export type BackupSettings = {
    destinationPath: string | null;
    scheduleEnabled: boolean;
    frequency: 'daily' | 'weekly';
    retention: number;
    lastBackupAt: string | null;
    lastBackupStatus: string | null;
};

export type BackupSettingsPatch = Partial<Pick<BackupSettings, 'destinationPath' | 'scheduleEnabled' | 'frequency' | 'retention'>>;

export type BackupFile = {
    fileName: string;
    sizeBytes: number;
    createdAt: string;
};

export type CreateBackupResult = BackupFile;

const DEFAULT_SETTINGS: BackupSettings = {
    destinationPath: null,
    scheduleEnabled: false,
    frequency: 'daily',
    retention: 7,
    lastBackupAt: null,
    lastBackupStatus: null,
};

function normalizeFrequency(value: string | null | undefined): 'daily' | 'weekly' {
    return value === 'weekly' ? 'weekly' : 'daily';
}

// ── Settings ────────────────────────────────────────────────────────────────

export function getBackupSettings(): BackupSettings {
    const row = db.select().from(backupSettings).where(eq(backupSettings.id, SETTINGS_ID)).get();
    if (!row) {
        return { ...DEFAULT_SETTINGS };
    }
    return {
        destinationPath: row.destinationPath ?? null,
        scheduleEnabled: Boolean(row.scheduleEnabled),
        frequency: normalizeFrequency(row.frequency),
        retention: row.retention ?? 7,
        lastBackupAt: row.lastBackupAt ?? null,
        lastBackupStatus: row.lastBackupStatus ?? null,
    };
}

export function saveBackupSettings(patch: BackupSettingsPatch): BackupSettings {
    const current = getBackupSettings();
    const next: BackupSettings = {
        ...current,
        ...('destinationPath' in patch ? { destinationPath: patch.destinationPath ?? null } : {}),
        ...('scheduleEnabled' in patch ? { scheduleEnabled: Boolean(patch.scheduleEnabled) } : {}),
        ...('frequency' in patch ? { frequency: normalizeFrequency(patch.frequency) } : {}),
        ...('retention' in patch ? { retention: Math.max(1, Math.floor(Number(patch.retention) || 1)) } : {}),
    };

    db.insert(backupSettings)
        .values({
            id: SETTINGS_ID,
            destinationPath: next.destinationPath,
            scheduleEnabled: next.scheduleEnabled,
            frequency: next.frequency,
            retention: next.retention,
            lastBackupAt: next.lastBackupAt,
            lastBackupStatus: next.lastBackupStatus,
        })
        .onConflictDoUpdate({
            target: backupSettings.id,
            set: {
                destinationPath: next.destinationPath,
                scheduleEnabled: next.scheduleEnabled,
                frequency: next.frequency,
                retention: next.retention,
            },
        })
        .run();

    return next;
}

function recordBackupOutcome(at: string, status: string): void {
    db.insert(backupSettings)
        .values({ id: SETTINGS_ID, lastBackupAt: at, lastBackupStatus: status })
        .onConflictDoUpdate({
            target: backupSettings.id,
            set: { lastBackupAt: at, lastBackupStatus: status },
        })
        .run();
}

// ── Create ──────────────────────────────────────────────────────────────────

function assertWritableDir(dir: string | null): asserts dir is string {
    if (!dir) {
        throw new Error('No se ha configurado una carpeta de destino para los respaldos.');
    }
    if (!fs.existsSync(dir)) {
        throw new Error(`La carpeta de destino no existe: ${dir}`);
    }
    try {
        fs.accessSync(dir, fs.constants.W_OK);
    } catch {
        throw new Error(`No se puede escribir en la carpeta de destino: ${dir}`);
    }
}

function timestampForFileName(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
        `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
        `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    );
}

export async function createBackup(): Promise<CreateBackupResult> {
    const settings = getBackupSettings();
    try {
        assertWritableDir(settings.destinationPath);

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cafebombom-backup-'));
        const snapshotPath = path.join(tmpDir, 'sqlite.db');

        try {
            snapshotDatabaseTo(snapshotPath);

            // Skip transient multer/processing staging dirs (e.g. logos/.tmp,
            // product-images/.tmp, logos/.tmp-<uuid>).
            const skipTmp = (entry: string) => !/(^|[\\/])\.tmp/.test(entry);

            const zip = new AdmZip();
            zip.addLocalFile(snapshotPath, '', 'sqlite.db');
            if (fs.existsSync(logosPath)) {
                zip.addLocalFolder(logosPath, 'logos', skipTmp);
            }
            if (fs.existsSync(productImagesPath)) {
                zip.addLocalFolder(productImagesPath, 'product-images', skipTmp);
            }

            const createdAt = new Date();
            const fileName = `${BACKUP_PREFIX}${timestampForFileName(createdAt)}${BACKUP_SUFFIX}`;
            const destPath = path.join(settings.destinationPath, fileName);
            zip.writeZip(destPath);

            applyRetention(settings.destinationPath, settings.retention);

            const sizeBytes = fs.statSync(destPath).size;
            recordBackupOutcome(createdAt.toISOString(), 'success');
            logger.info(`[BACKUP] Respaldo creado: ${destPath} (${sizeBytes} bytes)`);
            return { fileName, sizeBytes, createdAt: createdAt.toISOString() };
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        recordBackupOutcome(new Date().toISOString(), `error: ${message}`);
        logger.error('[BACKUP] Falló la creación del respaldo.', error);
        throw error;
    }
}

function applyRetention(dir: string, retention: number): void {
    const files = listBackupFiles(dir);
    const excess = files.slice(retention); // files are newest-first
    for (const file of excess) {
        try {
            fs.rmSync(path.join(dir, file.fileName), { force: true });
        } catch {
            // ignore deletion failures; retention is best-effort
        }
    }
}

// ── List ──────────────────────────────────────────────────────────────────

function listBackupFiles(dir: string): BackupFile[] {
    if (!fs.existsSync(dir)) {
        return [];
    }
    return fs
        .readdirSync(dir)
        .filter((name) => name.startsWith(BACKUP_PREFIX) && name.endsWith(BACKUP_SUFFIX))
        .map((name) => {
            const stat = fs.statSync(path.join(dir, name));
            return { fileName: name, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listBackups(): BackupFile[] {
    const settings = getBackupSettings();
    if (!settings.destinationPath) {
        return [];
    }
    return listBackupFiles(settings.destinationPath);
}

// ── Restore ─────────────────────────────────────────────────────────────────

export function restoreBackup(fileName: string): void {
    const settings = getBackupSettings();
    if (!settings.destinationPath) {
        throw new Error('No se ha configurado una carpeta de destino para los respaldos.');
    }
    // Reject anything that isn't a bare backup file name (no path traversal).
    if (path.basename(fileName) !== fileName || !fileName.startsWith(BACKUP_PREFIX) || !fileName.endsWith(BACKUP_SUFFIX)) {
        throw new Error('Nombre de respaldo inválido.');
    }

    const archivePath = path.join(settings.destinationPath, fileName);
    if (!fs.existsSync(archivePath)) {
        throw new Error(`No se encontró el respaldo: ${fileName}`);
    }

    const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cafebombom-restore-'));
    const zip = new AdmZip(archivePath);
    zip.extractAllTo(stagingDir, /* overwrite */ true);

    const stagedDb = path.join(stagingDir, 'sqlite.db');
    if (!fs.existsSync(stagedDb)) {
        fs.rmSync(stagingDir, { recursive: true, force: true });
        throw new Error('El respaldo no contiene una base de datos válida.');
    }

    spawnRestoreHelper({
        stagingDir,
        dbPath: getDatabasePath(),
        logosPath,
        productImagesPath,
        appExe: process.execPath,
        appDir: path.dirname(process.execPath),
        pid: process.pid,
    });

    // Give the HTTP response time to flush before this process exits.
    setTimeout(() => {
        logger.info('[BACKUP] Cerrando para restaurar el respaldo…');
        process.exit(0);
    }, 1500);
}

type RestoreHelperOpts = {
    stagingDir: string;
    dbPath: string;
    logosPath: string;
    productImagesPath: string;
    appExe: string;
    appDir: string;
    pid: number;
};

function spawnRestoreHelper(opts: RestoreHelperOpts): void {
    if (process.platform === 'win32') {
        spawnWindowsRestoreHelper(opts);
    } else {
        spawnUnixRestoreHelper(opts);
    }
}

function spawnUnixRestoreHelper(opts: RestoreHelperOpts): void {
    const scriptPath = path.join(opts.stagingDir, 'apply-restore.sh');
    const script = `#!/bin/bash
set -e
STAGING="${opts.stagingDir}"
DB_PATH="${opts.dbPath}"
LOGOS="${opts.logosPath}"
PRODUCT_IMAGES="${opts.productImagesPath}"
APP_EXE="${opts.appExe}"
APP_DIR="${opts.appDir}"
PID="${opts.pid}"

# Esperar a que la app se cierre
while kill -0 "$PID" 2>/dev/null; do sleep 0.5; done

# Reemplazar la base de datos (y limpiar WAL/SHM por si acaso)
cp -f "$STAGING/sqlite.db" "$DB_PATH"
rm -f "$DB_PATH-wal" "$DB_PATH-shm"

# Reemplazar carpetas de archivos si vienen en el respaldo
if [ -d "$STAGING/logos" ]; then
  rm -rf "$LOGOS"
  mkdir -p "$LOGOS"
  cp -Rf "$STAGING/logos/." "$LOGOS/"
fi
if [ -d "$STAGING/product-images" ]; then
  rm -rf "$PRODUCT_IMAGES"
  mkdir -p "$PRODUCT_IMAGES"
  cp -Rf "$STAGING/product-images/." "$PRODUCT_IMAGES/"
fi

rm -rf "$STAGING"

# Relanzar
cd "$APP_DIR"
nohup "$APP_EXE" >/dev/null 2>&1 &
`;
    fs.writeFileSync(scriptPath, script, { mode: 0o755 });
    const child = spawn('bash', [scriptPath], { detached: true, stdio: 'ignore' });
    child.unref();
}

function spawnWindowsRestoreHelper(opts: RestoreHelperOpts): void {
    const scriptPath = path.join(opts.stagingDir, 'apply-restore.bat');
    const script = `@echo off
:waitloop
tasklist /FI "PID eq ${opts.pid}" 2>NUL | find "${opts.pid}" >NUL
if not errorlevel 1 (
  timeout /t 1 /nobreak >NUL
  goto waitloop
)
copy /Y "${opts.stagingDir}\\sqlite.db" "${opts.dbPath}"
del /Q "${opts.dbPath}-wal" "${opts.dbPath}-shm" 2>NUL
if exist "${opts.stagingDir}\\logos" (
  rmdir /S /Q "${opts.logosPath}"
  xcopy /E /I /Y "${opts.stagingDir}\\logos" "${opts.logosPath}"
)
if exist "${opts.stagingDir}\\product-images" (
  rmdir /S /Q "${opts.productImagesPath}"
  xcopy /E /I /Y "${opts.stagingDir}\\product-images" "${opts.productImagesPath}"
)
cd /d "${opts.appDir}"
start "" "${opts.appExe}"
rmdir /S /Q "${opts.stagingDir}"
`;
    fs.writeFileSync(scriptPath, script);
    const child = spawn('cmd.exe', ['/c', scriptPath], { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
}

// ── Native folder picker (desktop host only) ──────────────────────────────────

export async function pickDestinationFolder(): Promise<string | null> {
    try {
        if (process.platform === 'win32') {
            return await pickFolderWindows();
        }
        return await pickFolderLinux();
    } catch (error) {
        logger.warn(`[BACKUP] No se pudo abrir el selector de carpetas: ${error}`);
        return null;
    }
}

function runCommand(command: string, args: string[]): Promise<string | null> {
    return new Promise((resolve) => {
        const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'ignore'] });
        let out = '';
        child.stdout.on('data', (chunk) => {
            out += chunk.toString();
        });
        child.on('error', () => resolve(null));
        child.on('close', (code) => {
            const trimmed = out.trim();
            resolve(code === 0 && trimmed ? trimmed : null);
        });
    });
}

async function pickFolderLinux(): Promise<string | null> {
    return runCommand('zenity', ['--file-selection', '--directory', '--title=Carpeta de respaldos']);
}

async function pickFolderWindows(): Promise<string | null> {
    const psScript =
        'Add-Type -AssemblyName System.Windows.Forms; ' +
        '$d = New-Object System.Windows.Forms.FolderBrowserDialog; ' +
        "if ($d.ShowDialog() -eq 'OK') { Write-Output $d.SelectedPath }";
    return runCommand('powershell', ['-NoProfile', '-STA', '-Command', psScript]);
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

const FREQUENCY_MS: Record<'daily' | 'weekly', number> = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
};

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

async function runScheduledBackupIfDue(): Promise<void> {
    const settings = getBackupSettings();
    if (!settings.scheduleEnabled || !settings.destinationPath) {
        return;
    }

    const dueMs = FREQUENCY_MS[settings.frequency];
    const last = settings.lastBackupAt ? Date.parse(settings.lastBackupAt) : 0;
    const lastSucceeded = settings.lastBackupStatus === 'success';
    if (lastSucceeded && Number.isFinite(last) && Date.now() - last < dueMs) {
        return;
    }

    try {
        await createBackup();
        logger.info('[BACKUP] Respaldo programado completado.');
    } catch (error) {
        logger.error('[BACKUP] Respaldo programado falló.', error);
    }
}

export function startBackupScheduler(): void {
    if (schedulerTimer) {
        return;
    }
    // Check shortly after boot, then hourly.
    setTimeout(() => void runScheduledBackupIfDue(), 30 * 1000);
    schedulerTimer = setInterval(() => void runScheduledBackupIfDue(), 60 * 60 * 1000);
}
