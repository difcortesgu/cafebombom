import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './services/sqlite/database/schema.ts',
  out: './services/sqlite/database/migrations',
  dialect: 'sqlite',
  driver: 'expo',
});
