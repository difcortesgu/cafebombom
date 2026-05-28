import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import fs from 'fs';
import path from 'path';
import * as schema from './schema';

const SQLITE_FILE_PATH = process.env.SQLITE_FILE_PATH
    ? process.env.SQLITE_FILE_PATH
    : path.join(process.cwd(), 'sqlite.db');

const sqlite = new Database(SQLITE_FILE_PATH);

const db = drizzle(sqlite, { schema });

// --- MAGIA DE AUTO-MIGRACIÓN ---
// 1. Definimos ambas rutas posibles
const devMigrationsPath = path.join(process.cwd(), 'src', 'database', 'migrations');
const prodMigrationsPath = path.join(process.cwd(), 'migrations');

// 2. Elegimos dinámicamente cuál usar
const migrationsPath = fs.existsSync(devMigrationsPath)
    ? devMigrationsPath
    : prodMigrationsPath;

try {
    console.log(`⏳ Verificando base de datos y corriendo migraciones...`);
    migrate(db, { migrationsFolder: migrationsPath });
    console.log(`✅ Base de datos lista y actualizada.`);
} catch (error) {
    console.error(`❌ Error fatal al preparar la base de datos:`, error);
    process.exit(1); // Detiene la app si la BD falla
}
// --------------------------------

export { db };
