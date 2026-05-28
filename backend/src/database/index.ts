import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Si no dice "development", asumimos que es el ejecutable de producción
const isDevelopment = process.env.NODE_ENV === 'development';

let dbPath = "";
let migrationsPath = "";

// 1. Calcular las rutas de manera ultra-segura
if (!isDevelopment) {
    // Usamos process.env.APPDATA nativo de Windows (mucho más infalible)
    const appDataDir = process.platform === 'win32'
        ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
        : path.join(os.homedir(), '.config');

    const baseFolder = path.join(appDataDir, 'CafeBomBom');

    // Intentamos crear la carpeta si no existe
    try {
        if (!fs.existsSync(baseFolder)) {
            fs.mkdirSync(baseFolder, { recursive: true });
        }
    } catch (err) {
        console.error(`[ERROR FATAL] No se pudo crear la carpeta en: ${baseFolder}`);
        console.error(err);
        process.exit(1);
    }

    dbPath = path.join(baseFolder, 'sqlite.db');
    migrationsPath = path.join(path.dirname(process.execPath), 'migrations');
} else {
    // Desarrollo
    dbPath = path.join(process.cwd(), 'sqlite.db');
    migrationsPath = path.join(process.cwd(), 'src', 'database', 'migrations');
}

console.log(`=========================================`);
console.log(`[STARTUP] Ruta de Base de Datos: ${dbPath}`);
console.log(`[STARTUP] Ruta de Migraciones: ${migrationsPath}`);
console.log(`=========================================`);

// 2. Inicializar Base de Datos con manejo de errores estricto
let sqlite;
try {
    // { create: true } fuerza a Bun a crear el archivo si no existe
    sqlite = new Database(dbPath, { create: true });
} catch (error) {
    console.error(`[ERROR FATAL DE BD] No se pudo abrir/crear el archivo en: ${dbPath}`);
    console.error(error);
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
