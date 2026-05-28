import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import fs from 'fs';
import os from 'os';
import path from 'path';

const exeDir = path.dirname(process.execPath);
const isProduction = process.execPath.endsWith('.exe') || fs.existsSync(path.join(exeDir, 'migrations'));

let dbPath = "";
let migrationsPath = "";

if (isProduction) {
    const appDataDir = process.platform === 'win32'
        ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
        : path.join(os.homedir(), '.config');

    const baseFolder = path.join(appDataDir, 'CafeBomBom');

    try {
        if (!fs.existsSync(baseFolder)) {
            fs.mkdirSync(baseFolder, { recursive: true });
        }
    } catch (err) {
        console.error(`[ERROR FATAL] No se pudo crear la carpeta en: ${baseFolder}`);
        process.exit(1);
    }

    dbPath = path.join(baseFolder, 'sqlite.db');
    migrationsPath = path.join(exeDir, 'migrations');
} else {
    dbPath = path.join(process.cwd(), 'sqlite.db');
    migrationsPath = path.join(process.cwd(), 'src', 'database', 'migrations');
}

console.log(`=========================================`);
console.log(`[MODO] ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
console.log(`[STARTUP] Ruta de Base de Datos: ${dbPath}`);
console.log(`[STARTUP] Ruta de Migraciones: ${migrationsPath}`);
console.log(`=========================================`);

let sqlite;
try {
    sqlite = new Database(dbPath, { create: true });
} catch (error) {
    console.error(`[ERROR FATAL DE BD] No se pudo abrir/crear el archivo en: ${dbPath}`);
    process.exit(1);
}

const db = drizzle(sqlite);

// 3. Ejecutar Migraciones
try {
    if (fs.existsSync(migrationsPath)) {
        console.log(`⏳ Corriendo migraciones...`);
        migrate(db, { migrationsFolder: migrationsPath });
        console.log(`✅ Base de datos lista y migrada.`);
    } else {
        console.error(`[ALERTA] Carpeta de migraciones NO encontrada en: ${migrationsPath}`);
    }
} catch (error) {
    console.error(`[ERROR DE MIGRACIONES] Fallo al ejecutar migraciones:`, error);
}

// 4. Exportar la base de datos para que el resto de la app la use
export { db };
