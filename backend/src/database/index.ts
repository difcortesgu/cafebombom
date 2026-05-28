import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { logger } from '../utils/logger'; // Importamos tu nuevo logger

// 1. Verificamos el entorno (recuerda que en index.ts lo forzamos a production si no hay nada)
const isProduction = process.env.NODE_ENV !== 'development';

let dbPath: string;
let migrationsPath: string;

if (isProduction) {
    // =========================================================
    //   PRODUCCIÓN: Base de datos en carpeta segura del usuario
    // =========================================================
    const appDataPath = process.platform === 'win32'
        ? path.join(os.homedir(), 'AppData', 'Roaming', 'CafeBomBom')
        : path.join(os.homedir(), '.config', 'CafeBomBom');

    // Asegurarnos de que la carpeta maestra exista
    if (!fs.existsSync(appDataPath)) {
        fs.mkdirSync(appDataPath, { recursive: true });
    }

    // La base de datos vive a salvo en AppData/.config
    dbPath = path.join(appDataPath, 'sqlite.db');

    const exeDir = path.dirname(process.execPath);
    migrationsPath = path.join(exeDir, 'migrations');

} else {
    // =========================================================
    //   DESARROLLO: Base de datos en la carpeta del proyecto
    // =========================================================
    dbPath = path.join(process.cwd(), 'sqlite.db');
    migrationsPath = path.join(process.cwd(), 'src', 'database', 'migrations');
}

// 2. Inicializamos la conexión
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

// 3. Ejecutamos las migraciones al arrancar
try {
    logger.info(`⏳ Conectando a base de datos en: ${dbPath}`);

    // Verificamos que la carpeta de migraciones exista para evitar un error 500 silencioso
    if (fs.existsSync(migrationsPath)) {
        migrate(db, { migrationsFolder: migrationsPath });
        logger.info(`✅ Base de datos lista y migrada correctamente.`);
    } else {
        logger.error(`⚠️ ALERTA: No se encontró la carpeta de migraciones en: ${migrationsPath}`);
    }
} catch (error) {
    logger.error(`❌ Error fatal al preparar la base de datos:`, error);
    process.exit(1); // Apagamos la app de forma segura si la DB no puede iniciar
}

export { db };
