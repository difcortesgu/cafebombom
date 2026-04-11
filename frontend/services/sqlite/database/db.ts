import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';
import migrations from './migrations/migrations';
import * as schema from './schema';

const expo = openDatabaseSync('cafebombom.db');
expo.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(expo, { schema });

export const dbReady: Promise<void> = migrate(db, migrations);
