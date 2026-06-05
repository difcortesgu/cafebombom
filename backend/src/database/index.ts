import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { logger } from '../utils/logger';

const exeDir = path.dirname(process.execPath);
const isProduction = process.execPath.endsWith('.exe') || fs.existsSync(path.join(exeDir, 'migrations'));
const appDataDir = process.platform === 'win32'
    ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    : path.join(os.homedir(), '.config');

export const appDataBaseFolder = path.join(appDataDir, 'CafeBomBom');
export const logosPath = path.join(appDataBaseFolder, 'logos');
export const productImagesPath = path.join(appDataBaseFolder, 'product-images');

function ensureDirectoryOrExit(targetPath: string, label: string): void {
    try {
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }
    } catch (error) {
        logger.error(`[ERROR FATAL] No se pudo crear ${label} en: ${targetPath}`, error);
        process.exit(1);
    }
}

let dbPath = "";
let migrationsPath = "";

if (isProduction) {
    ensureDirectoryOrExit(appDataBaseFolder, 'la carpeta de datos');
    dbPath = path.join(appDataBaseFolder, 'sqlite.db');
    migrationsPath = path.join(exeDir, 'migrations');
} else {
    dbPath = path.join(process.cwd(), 'sqlite.db');
    migrationsPath = path.join(process.cwd(), 'src', 'database', 'migrations');
}

logger.info(`[MODO] ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
logger.info(`[STARTUP] Ruta de Base de Datos: ${dbPath}`);
logger.info(`[STARTUP] Ruta de Migraciones: ${migrationsPath}`);

let sqlite;
try {
    sqlite = new Database(dbPath, { create: true });
} catch (error) {
    logger.error(`[ERROR FATAL DE BD] No se pudo abrir/crear el archivo en: ${dbPath}`, error);
    process.exit(1);
}

const db = drizzle(sqlite);

// 3. Ejecutar Migraciones
try {
    if (fs.existsSync(migrationsPath)) {
        logger.info(`⏳ Corriendo migraciones...`);
        migrate(db, { migrationsFolder: migrationsPath });
        logger.info(`✅ Base de datos lista y migrada.`);
    } else {
        logger.error(`[ALERTA] Carpeta de migraciones NO encontrada en: ${migrationsPath}`);
    }
} catch (error) {
    logger.error(`[ERROR DE MIGRACIONES] Fallo al ejecutar migraciones:`, error);
}

export function ensureLogosDir(): string {
    ensureDirectoryOrExit(logosPath, 'la carpeta de logos');
    return logosPath;
}

export function ensureProductImagesDir(): string {
    ensureDirectoryOrExit(productImagesPath, 'la carpeta de imágenes de productos');
    return productImagesPath;
}

/** Absolute path to the live SQLite file (used by the backup service). */
export function getDatabasePath(): string {
    return dbPath;
}

/** Runs `VACUUM INTO` to write a consistent snapshot of the live DB to destPath. */
export function snapshotDatabaseTo(destPath: string): void {
    sqlite!.exec(`VACUUM INTO '${destPath.replace(/'/g, "''")}'`);
}

// 4. Exportar la base de datos para que el resto de la app la use
export { db };
