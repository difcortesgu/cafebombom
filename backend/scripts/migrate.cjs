const Database = require('better-sqlite3');
const { drizzle } = require('drizzle-orm/better-sqlite3');
const { migrate } = require('drizzle-orm/better-sqlite3/migrator');

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

        console.log(`[db:migrate] OK - ${applied} migration(s) applied. Total: ${after}. DB: ${sqliteFilePath}`);
    } catch (error) {
        const message = error instanceof Error ? error.stack || error.message : String(error);
        console.error('[db:migrate] Failed');
        console.error(message);
        process.exitCode = 1;
    } finally {
        sqlite.close();
    }
}

main();
