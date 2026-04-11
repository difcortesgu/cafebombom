import * as XLSX from 'xlsx';

export type SeedCategoryRow = {
  name: string;
};

export type SeedProviderRow = {
  name: string;
  phone: string | null;
  notes: string | null;
};

export type SeedEmployeeRow = {
  name: string;
  salaryType: 'hourly' | 'monthly';
  rate: number;
};

export type SeedIngredientRow = {
  name: string;
  unit: 'grams' | 'liters' | 'pieces';
  quantity: number;
  lowStockThreshold: number;
};

export type SeedProductRow = {
  name: string;
  categoryName: string | null;
  price: number;
  isActive: boolean;
};

export type SeedProductIngredientRow = {
  productName: string;
  ingredientName: string;
  quantityUsed: number;
};

export type SeedRestaurantTableRow = {
  name: string;
  tableType: 'dine-in' | 'to-go' | 'delivery';
};

export type SeedDiscountRow = {
  name: string;
  scope: 'product' | 'global';
  productName: string | null;
  type: 'percentage' | 'fixed';
  value: number;
  startsAt: number;
  endsAt: number | null;
  isActive: boolean;
};

export type SeedSurchargeRow = {
  name: 'to-go' | 'delivery';
  value: number;
};

export type ParsedSeedData = {
  providers: SeedProviderRow[];
  employees: SeedEmployeeRow[];
  categories: SeedCategoryRow[];
  ingredients: SeedIngredientRow[];
  products: SeedProductRow[];
  productIngredients: SeedProductIngredientRow[];
  restaurantTables: SeedRestaurantTableRow[];
  discounts: SeedDiscountRow[];
  surcharges: SeedSurchargeRow[];
};

const SHEET_ALIASES: Record<keyof ParsedSeedData, string[]> = {
  providers: ['providers', 'provider', 'suppliers', 'supplier'],
  employees: ['employees', 'employee', 'staff'],
  categories: ['categories', 'category'],
  ingredients: ['ingredients', 'ingredient'],
  products: ['products', 'product'],
  productIngredients: ['product_ingredients', 'productingredients', 'recipes', 'recipe'],
  restaurantTables: ['restaurant_tables', 'tables', 'restauranttables'],
  discounts: ['discounts', 'discount'],
  surcharges: ['surcharges', 'surcharge'],
};

const normalizeText = (value: unknown): string => String(value ?? '').trim();

const normalizeHeader = (value: unknown): string =>
  normalizeText(value)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '')
    .replace(/-/g, '');

const toBool = (value: unknown, fallback = true): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  const raw = normalizeText(value).toLowerCase();
  if (!raw) {
    return fallback;
  }

  if (['true', '1', 'yes', 'y', 'si'].includes(raw)) {
    return true;
  }

  if (['false', '0', 'no', 'n'].includes(raw)) {
    return false;
  }

  return fallback;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const findSheetName = (workbook: XLSX.WorkBook, aliases: string[]): string | null => {
  const aliasSet = new Set(aliases.map((item) => item.toLowerCase()));

  for (const name of workbook.SheetNames) {
    const normalized = normalizeHeader(name);
    if (aliasSet.has(normalized)) {
      return name;
    }
  }

  return null;
};

const sheetToRows = (sheet: XLSX.WorkSheet): Record<string, unknown>[] => {
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

  if (rawRows.length === 0) {
    return [];
  }

  const headerRow = rawRows[0] ?? [];
  const headers = headerRow.map((cell) => normalizeHeader(cell));

  const rows: Record<string, unknown>[] = [];
  for (const row of rawRows.slice(1)) {
    if (!row || row.every((cell) => normalizeText(cell) === '')) {
      continue;
    }

    const mapped: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (!header) {
        return;
      }
      mapped[header] = row[index];
    });
    rows.push(mapped);
  }

  return rows;
};

const parseTableType = (value: unknown): 'dine-in' | 'to-go' | 'delivery' => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'delivery') {
    return 'delivery';
  }
  if (normalized === 'to-go' || normalized === 'togo') {
    return 'to-go';
  }
  return 'dine-in';
};

const parseUnit = (value: unknown): 'grams' | 'liters' | 'pieces' => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'liters' || normalized === 'liter') {
    return 'liters';
  }
  if (normalized === 'pieces' || normalized === 'piece') {
    return 'pieces';
  }
  return 'grams';
};

const parseScope = (value: unknown): 'product' | 'global' => {
  return normalizeText(value).toLowerCase() === 'global' ? 'global' : 'product';
};

const parseDiscountType = (value: unknown): 'percentage' | 'fixed' => {
  return normalizeText(value).toLowerCase() === 'fixed' ? 'fixed' : 'percentage';
};

const parseSalaryType = (value: unknown): 'hourly' | 'monthly' => {
  return normalizeText(value).toLowerCase() === 'monthly' ? 'monthly' : 'hourly';
};

export function parseSeedWorkbook(content: Uint8Array): ParsedSeedData {
  const workbook = XLSX.read(content, { type: 'array' });

  const read = <T>(key: keyof ParsedSeedData, parser: (row: Record<string, unknown>) => T | null): T[] => {
    const sheetName = findSheetName(workbook, SHEET_ALIASES[key]);
    if (!sheetName) {
      return [];
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return [];
    }

    return sheetToRows(sheet)
      .map((row) => parser(row))
      .filter((value): value is T => value !== null);
  };

  const categories = read('categories', (row) => {
    const name = normalizeText(row.name);
    if (!name) {
      return null;
    }
    return { name };
  });

  const providers = read('providers', (row) => {
    const name = normalizeText(row.name);
    if (!name) {
      return null;
    }

    const phone = normalizeText(row.phone);
    const notes = normalizeText(row.notes);

    return {
      name,
      phone: phone || null,
      notes: notes || null,
    };
  });

  const employees = read('employees', (row) => {
    const name = normalizeText(row.name);
    if (!name) {
      return null;
    }

    return {
      name,
      salaryType: parseSalaryType(row.salarytype ?? row.salary),
      rate: Math.max(0, toNumber(row.rate, 0)),
    };
  });

  const ingredients = read('ingredients', (row) => {
    const name = normalizeText(row.name);
    if (!name) {
      return null;
    }

    return {
      name,
      unit: parseUnit(row.unit),
      quantity: Math.max(0, toNumber(row.quantity, 0)),
      lowStockThreshold: Math.max(0, toNumber(row.lowstockthreshold ?? row.lowthreshold, 10)),
    };
  });

  const products = read('products', (row) => {
    const name = normalizeText(row.name);
    if (!name) {
      return null;
    }

    const categoryName = normalizeText(row.categoryname ?? row.category);
    return {
      name,
      categoryName: categoryName || null,
      price: Math.max(0, toNumber(row.price, 0)),
      isActive: toBool(row.isactive, true),
    };
  });

  const productIngredients = read('productIngredients', (row) => {
    const productName = normalizeText(row.productname ?? row.product);
    const ingredientName = normalizeText(row.ingredientname ?? row.ingredient);
    const quantityUsed = toNumber(row.quantityused ?? row.quantity, 0);

    if (!productName || !ingredientName || quantityUsed <= 0) {
      return null;
    }

    return {
      productName,
      ingredientName,
      quantityUsed,
    };
  });

  const restaurantTables = read('restaurantTables', (row) => {
    const name = normalizeText(row.name);
    if (!name) {
      return null;
    }

    return {
      name,
      tableType: parseTableType(row.tabletype ?? row.type),
    };
  });

  const discounts = read('discounts', (row) => {
    const name = normalizeText(row.name);
    if (!name) {
      return null;
    }

    const productName = normalizeText(row.productname ?? row.product);
    const startsAt = Math.floor(toNumber(row.startsat, Math.floor(Date.now() / 1000)));
    const endsAtRaw = toNumber(row.endsat, Number.NaN);

    return {
      name,
      scope: parseScope(row.scope),
      productName: productName || null,
      type: parseDiscountType(row.type),
      value: Math.max(0, toNumber(row.value, 0)),
      startsAt,
      endsAt: Number.isFinite(endsAtRaw) ? Math.floor(endsAtRaw) : null,
      isActive: toBool(row.isactive, true),
    };
  });

  const surcharges = read('surcharges', (row) => {
    const name = normalizeText(row.name).toLowerCase();
    if (name !== 'to-go' && name !== 'togo' && name !== 'delivery') {
      return null;
    }

    const normalizedName: 'to-go' | 'delivery' = name === 'delivery' ? 'delivery' : 'to-go';

    return {
      name: normalizedName,
      value: Math.max(0, toNumber(row.value, 0)),
    };
  });

  return {
    providers,
    employees,
    categories,
    ingredients,
    products,
    productIngredients,
    restaurantTables,
    discounts,
    surcharges,
  };
}
