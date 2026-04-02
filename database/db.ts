import * as SQLite from 'expo-sqlite';

const DB_NAME = 'cafebombom.db';
const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export type Row = Record<string, unknown>;

export async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await initializeDatabase(db);
      return db;
    });
  }

  return dbPromise;
}

async function initializeDatabase(db: SQLite.SQLiteDatabase) {
  await db.execAsync('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY NOT NULL);');

  const versionRow = (await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version LIMIT 1;'
  )) ?? { version: 0 };

  if (versionRow.version < 1) {
    await runV1Migration(db);
    await db.execAsync('DELETE FROM schema_version;');
    await db.runAsync('INSERT INTO schema_version (version) VALUES (?);', [SCHEMA_VERSION]);
  }

  await seedDefaults(db);
}

async function runV1Migration(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('owner', 'staff')),
      pin_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
      updated_at INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
      synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      logged_in_at INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
      logged_out_at INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      phone TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
      updated_at INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
      synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      unit TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      low_stock_threshold REAL NOT NULL DEFAULT 10,
      supplier_id INTEGER,
      created_at INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
      updated_at INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
      synced_at INTEGER,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
      updated_at INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
      synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category_id INTEGER,
      price REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
      updated_at INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
      synced_at INTEGER,
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS product_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      quantity_used REAL NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
      updated_at INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
      synced_at INTEGER,
      UNIQUE(product_id, ingredient_id),
      FOREIGN KEY(product_id) REFERENCES products(id),
      FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
      staff_id INTEGER NOT NULL,
      total REAL NOT NULL,
      synced_at INTEGER,
      FOREIGN KEY(staff_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      FOREIGN KEY(sale_id) REFERENCES sales(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS restock_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL,
      quantity_added REAL NOT NULL,
      cost REAL NOT NULL,
      supplier_id INTEGER,
      date INTEGER NOT NULL,
      synced_at INTEGER,
      FOREIGN KEY(ingredient_id) REFERENCES ingredients(id),
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date INTEGER NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      supplier_id INTEGER,
      synced_at INTEGER,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      salary_type TEXT NOT NULL CHECK(salary_type IN ('hourly', 'monthly')),
      rate REAL NOT NULL,
      synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS payroll_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      period_start INTEGER NOT NULL,
      period_end INTEGER NOT NULL,
      amount REAL NOT NULL,
      synced_at INTEGER,
      FOREIGN KEY(employee_id) REFERENCES employees(id)
    );

    CREATE INDEX IF NOT EXISTS idx_ingredients_low_stock ON ingredients(quantity, low_stock_threshold);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
  `);
}

export function hashPin(pin: string) {
  let hash = 2166136261;
  for (let i = 0; i < pin.length; i += 1) {
    hash ^= pin.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

async function seedDefaults(db: SQLite.SQLiteDatabase) {
  const owner = await db.getFirstAsync<{ id: number }>('SELECT id FROM users WHERE name = ?;', [
    'Owner',
  ]);

  if (!owner) {
    await db.runAsync(
      'INSERT INTO users (name, role, pin_hash) VALUES (?, ?, ?), (?, ?, ?);',
      ['Owner', 'owner', hashPin('1234'), 'Staff', 'staff', hashPin('2222')]
    );
  }

  const defaultCategories = ['Coffee', 'Tea', 'Pastry', 'Snacks'];
  for (const category of defaultCategories) {
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (name) VALUES (?);',
      [category]
    );
  }

  const hasProducts = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM products;');
  if ((hasProducts?.total ?? 0) === 0) {
    const coffeeCategory = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM categories WHERE name = ?;',
      ['Coffee']
    );
    const teaCategory = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM categories WHERE name = ?;',
      ['Tea']
    );
    const pastryCategory = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM categories WHERE name = ?;',
      ['Pastry']
    );

    if (coffeeCategory && teaCategory && pastryCategory) {
      await db.runAsync(
        `INSERT INTO products (name, category_id, price) VALUES
          (?, ?, ?),
          (?, ?, ?),
          (?, ?, ?),
          (?, ?, ?);`,
        [
          'Cappuccino',
          coffeeCategory.id,
          4.5,
          'Latte',
          coffeeCategory.id,
          4.25,
          'Thai Milk Tea',
          teaCategory.id,
          3.9,
          'Butter Croissant',
          pastryCategory.id,
          2.8,
        ]
      );
    }
  }
}

export async function execute(sql: string, params: unknown[] = []) {
  const db = await getDb();
  return db.runAsync(sql, params);
}

export async function queryAll<T extends Row>(sql: string, params: unknown[] = []) {
  const db = await getDb();
  return db.getAllAsync<T>(sql, params);
}

export async function queryFirst<T extends Row>(sql: string, params: unknown[] = []) {
  const db = await getDb();
  return db.getFirstAsync<T>(sql, params);
}

export function dayRangeUnix(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    start: Math.floor(start.getTime() / 1000),
    end: Math.floor(end.getTime() / 1000),
  };
}
