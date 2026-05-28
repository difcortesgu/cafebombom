import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { logger } from '../src/utils/logger';

const sqliteFilePath = process.env.SQLITE_FILE_PATH
    ? process.env.SQLITE_FILE_PATH
    : path.join(process.cwd(), 'sqlite.db');

const migrationsFolder = './src/database/migrations';

function getMigrationCount(db) {
    try {
        const row = db.prepare('select count(*) as count from __drizzle_migrations').get();
        return Number(row?.count || 0);
    } catch {
        return 0;
    }
}

function main() {
    const sqlite = new Database(sqliteFilePath);
    const db = drizzle(sqlite);

    try {
        const before = getMigrationCount(sqlite);
        migrate(db, { migrationsFolder });
        const after = getMigrationCount(sqlite);
        const applied = Math.max(0, after - before);

        logger.info(`[db:migrate] OK - ${applied} migration(s) applied. Total: ${after}. DB: ${sqliteFilePath}`);
    } catch (error) {
        const message = error instanceof Error ? error.stack || error.message : String(error);
        logger.error('[db:migrate] Failed');
        logger.error(message);
        process.exitCode = 1;
    } finally {
        sqlite.close();
    }
}

main();
