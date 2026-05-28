import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import path from 'path';
import * as schema from './schema';

const SQLITE_FILE_PATH = process.env.SQLITE_FILE_PATH
    ? process.env.SQLITE_FILE_PATH
    : path.join(process.cwd(), 'sqlite.db');

const sqlite = new Database(SQLITE_FILE_PATH);

export const db = drizzle(sqlite, { schema });