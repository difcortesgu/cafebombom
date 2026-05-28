import { SeedImportIssue } from '../types/setup';
import * as XLSX from 'xlsx';

type SeedBaseRow = {
    rowNumber: number;
};

export type SeedCategoryRow = SeedBaseRow & {
    name: string;
};

export type SeedProviderRow = SeedBaseRow & {
    name: string;
    phone: string | null;
    notes: string | null;
};

export type SeedEmployeeRow = SeedBaseRow & {
    name: string;
    salaryType: 'hourly' | 'monthly';
    rate: number;
};

export type SeedPaymentMethodRow = SeedBaseRow & {
    name: string;
    isActive: boolean;
};

export type SeedIngredientRow = SeedBaseRow & {
    name: string;
    unit: string;
    quantity: number;
    lowStockThreshold: number;
    supplierName: string | null;
};

export type SeedProductRow = SeedBaseRow & {
    name: string;
    categoryName: string | null;
    price: number;
    isActive: boolean;
    imageUri: string | null;
};

export type SeedProductIngredientRow = SeedBaseRow & {
    productName: string;
    ingredientName: string;
    quantityUsed: number;
};

export type SeedProductAdditionalIngredientRow = SeedBaseRow & {
    productName: string;
    ingredientName: string;
    quantityUsed: number;
    additionalPrice: number;
};

export type SeedRestaurantTableRow = SeedBaseRow & {
    name: string;
    tableType: 'dine-in' | 'to-go' | 'delivery';
};

export type SeedDiscountRow = SeedBaseRow & {
    name: string;
    scope: 'product' | 'global';
    productName: string | null;
    type: 'percentage' | 'fixed';
    value: number;
    startsAt: number;
    endsAt: number | null;
    isActive: boolean;
};

export type SeedSurchargeRow = SeedBaseRow & {
    name: 'to-go' | 'delivery';
    value: number;
};

export type SeedReceiptPreferencesRow = SeedBaseRow & {
    businessName: string;
    businessAddress: string;
    businessPhone: string;
    businessNit: string;
    businessLogoUri: string | null;
    footerMessage: string;
    paperWidth: 58 | 80;
    taxRate: number;
};

export type ParsedSeedData = {
    paymentMethods: SeedPaymentMethodRow[];
    providers: SeedProviderRow[];
    employees: SeedEmployeeRow[];
    categories: SeedCategoryRow[];
    ingredients: SeedIngredientRow[];
    products: SeedProductRow[];
    productIngredients: SeedProductIngredientRow[];
    productAdditionalIngredients: SeedProductAdditionalIngredientRow[];
    restaurantTables: SeedRestaurantTableRow[];
    discounts: SeedDiscountRow[];
    surcharges: SeedSurchargeRow[];
    receiptPreferences: SeedReceiptPreferencesRow[];
};

const SHEET_ALIASES: Record<keyof ParsedSeedData, string[]> = {
    paymentMethods: ['payment_methods', 'paymentmethods', 'payment_methods_config', 'paymentmethodsconfig'],
    providers: ['providers', 'provider', 'suppliers', 'supplier'],
    employees: ['employees', 'employee', 'staff'],
    categories: ['categories', 'category'],
    ingredients: ['ingredients', 'ingredient'],
    products: ['products', 'product'],
    productIngredients: ['product_ingredients', 'productingredients', 'recipes', 'recipe'],
    productAdditionalIngredients: [
        'product_additional_ingredients',
        'productadditionalingredients',
        'additional_ingredients',
        'extras',
    ],
    restaurantTables: ['restaurant_tables', 'tables', 'restauranttables'],
    discounts: ['discounts', 'discount'],
    surcharges: ['surcharges', 'surcharge'],
    receiptPreferences: ['receipt_preferences', 'receiptpreferences', 'config', 'configuration'],
};

type WorksheetRow = {
    rowNumber: number;
    data: Record<string, unknown>;
};

export class SeedImportParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SeedImportParseError';
    }
}

export class SeedImportValidationError extends Error {
    readonly issues: SeedImportIssue[];

    constructor(message: string, issues: SeedImportIssue[]) {
        super(message);
        this.name = 'SeedImportValidationError';
        this.issues = issues;
    }
}

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

const toNumber = (value: unknown): number => {
    const normalized = normalizeText(value).replace(',', '.');
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : Number.NaN;
};

const findSheetName = (workbook: XLSX.WorkBook, aliases: string[]): string | null => {
    const aliasSet = new Set(aliases.map((item) => normalizeHeader(item)));

    for (const name of workbook.SheetNames) {
        const normalized = normalizeHeader(name);
        if (aliasSet.has(normalized)) {
            return name;
        }
    }

    return null;
};

const sheetToRows = (sheet: XLSX.WorkSheet): WorksheetRow[] => {
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        blankrows: false,
        defval: '',
    });

    if (rawRows.length === 0) {
        return [];
    }

    const headerRow = rawRows[0] ?? [];
    const headers = headerRow.map((cell: unknown) => normalizeHeader(cell));

    const rows: WorksheetRow[] = [];
    for (let index = 1; index < rawRows.length; index += 1) {
        const row = rawRows[index];
        if (!row || row.every((cell: unknown) => normalizeText(cell) === '')) {
            continue;
        }

        const mapped: Record<string, unknown> = {};
        headers.forEach((header: string, cellIndex: number) => {
            if (!header) {
                return;
            }
            mapped[header] = row[cellIndex];
        });

        rows.push({ rowNumber: index + 1, data: mapped });
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

const parseScope = (value: unknown): 'product' | 'global' => {
    return normalizeText(value).toLowerCase() === 'global' ? 'global' : 'product';
};

const parseDiscountType = (value: unknown): 'percentage' | 'fixed' => {
    return normalizeText(value).toLowerCase() === 'fixed' ? 'fixed' : 'percentage';
};

const parseSalaryType = (value: unknown): 'hourly' | 'monthly' => {
    return normalizeText(value).toLowerCase() === 'monthly' ? 'monthly' : 'hourly';
};

const parsePaperWidth = (value: unknown): 58 | 80 => {
    const numeric = toNumber(value);
    return numeric === 58 ? 58 : 80;
};

const parseTaxRate = (value: unknown): number => {
    const numeric = toNumber(value);
    if (!Number.isFinite(numeric)) {
        return 0;
    }

    if (numeric > 1) {
        return Math.max(0, Math.min(100, numeric)) / 100;
    }

    return Math.max(0, Math.min(1, numeric));
};

export function parseSeedWorkbook(content: Uint8Array): ParsedSeedData {
    let workbook: XLSX.WorkBook;

    try {
        workbook = XLSX.read(content, { type: 'array' });
    } catch (error) {
        throw new SeedImportParseError('Invalid or unreadable Excel workbook.');
    }

    const read = <T>(
        key: keyof ParsedSeedData,
        parser: (row: WorksheetRow) => T | null,
    ): T[] => {
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
        const name = normalizeText(row.data.name);
        if (!name) {
            return null;
        }

        return { rowNumber: row.rowNumber, name };
    });

    const paymentMethods = read('paymentMethods', (row) => {
        const name = normalizeText(row.data.name);
        if (!name) {
            return null;
        }

        return {
            rowNumber: row.rowNumber,
            name,
            isActive: toBool(row.data.isactive ?? row.data.active, true),
        };
    });

    const providers = read('providers', (row) => {
        const name = normalizeText(row.data.name);
        if (!name) {
            return null;
        }

        const phone = normalizeText(row.data.phone);
        const notes = normalizeText(row.data.notes);

        return {
            rowNumber: row.rowNumber,
            name,
            phone: phone || null,
            notes: notes || null,
        };
    });

    const employees = read('employees', (row) => {
        const name = normalizeText(row.data.name);
        if (!name) {
            return null;
        }

        const rate = toNumber(row.data.rate);
        if (!Number.isFinite(rate) || rate < 0) {
            return null;
        }

        return {
            rowNumber: row.rowNumber,
            name,
            salaryType: parseSalaryType(row.data.salarytype ?? row.data.salary),
            rate,
        };
    });

    const ingredients = read('ingredients', (row) => {
        const name = normalizeText(row.data.name);
        if (!name) {
            return null;
        }

        const quantity = toNumber(row.data.quantity);
        const lowStockThreshold = toNumber(row.data.lowstockthreshold ?? row.data.lowthreshold);
        if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
            return null;
        }

        const supplierName = normalizeText(row.data.suppliername ?? row.data.supplier);

        return {
            rowNumber: row.rowNumber,
            name,
            unit: normalizeText(row.data.unit).toLowerCase() || 'unidad',
            quantity,
            lowStockThreshold,
            supplierName: supplierName || null,
        };
    });

    const products = read('products', (row) => {
        const name = normalizeText(row.data.name);
        if (!name) {
            return null;
        }

        const price = toNumber(row.data.price);
        if (!Number.isFinite(price) || price < 0) {
            return null;
        }

        const categoryName = normalizeText(row.data.categoryname ?? row.data.category);
        const imageUri = normalizeText(row.data.imageuri ?? row.data.image);

        return {
            rowNumber: row.rowNumber,
            name,
            categoryName: categoryName || null,
            price,
            isActive: toBool(row.data.isactive, true),
            imageUri: imageUri || null,
        };
    });

    const productIngredients = read('productIngredients', (row) => {
        const productName = normalizeText(row.data.productname ?? row.data.product);
        const ingredientName = normalizeText(row.data.ingredientname ?? row.data.ingredient);
        const quantityUsed = toNumber(row.data.quantityused ?? row.data.quantity);

        if (!productName || !ingredientName || !Number.isFinite(quantityUsed) || quantityUsed <= 0) {
            return null;
        }

        return {
            rowNumber: row.rowNumber,
            productName,
            ingredientName,
            quantityUsed,
        };
    });

    const productAdditionalIngredients = read('productAdditionalIngredients', (row) => {
        const productName = normalizeText(row.data.productname ?? row.data.product);
        const ingredientName = normalizeText(row.data.ingredientname ?? row.data.ingredient);
        const quantityUsed = toNumber(row.data.quantityused ?? row.data.quantity);
        const additionalPrice = toNumber(row.data.additionalprice ?? row.data.price);

        if (
            !productName ||
            !ingredientName ||
            !Number.isFinite(quantityUsed) ||
            quantityUsed <= 0 ||
            !Number.isFinite(additionalPrice) ||
            additionalPrice < 0
        ) {
            return null;
        }

        return {
            rowNumber: row.rowNumber,
            productName,
            ingredientName,
            quantityUsed,
            additionalPrice,
        };
    });

    const restaurantTables = read('restaurantTables', (row) => {
        const name = normalizeText(row.data.name);
        if (!name) {
            return null;
        }

        return {
            rowNumber: row.rowNumber,
            name,
            tableType: parseTableType(row.data.tabletype ?? row.data.type),
        };
    });

    const discounts = read('discounts', (row) => {
        const name = normalizeText(row.data.name);
        if (!name) {
            return null;
        }

        const value = toNumber(row.data.value);
        const startsAt = toNumber(row.data.startsat);
        const endsAtRaw = toNumber(row.data.endsat);

        if (!Number.isFinite(value) || value < 0 || !Number.isFinite(startsAt) || startsAt < 0) {
            return null;
        }

        const productName = normalizeText(row.data.productname ?? row.data.product);

        return {
            rowNumber: row.rowNumber,
            name,
            scope: parseScope(row.data.scope),
            productName: productName || null,
            type: parseDiscountType(row.data.type),
            value,
            startsAt: Math.floor(startsAt),
            endsAt: Number.isFinite(endsAtRaw) ? Math.floor(endsAtRaw) : null,
            isActive: toBool(row.data.isactive, true),
        };
    });

    const surcharges = read('surcharges', (row) => {
        const name = normalizeText(row.data.name).toLowerCase();
        const value = toNumber(row.data.value);

        if (!Number.isFinite(value) || value < 0) {
            return null;
        }

        if (name !== 'to-go' && name !== 'togo' && name !== 'delivery') {
            return null;
        }

        const normalizedName: 'to-go' | 'delivery' = name === 'delivery' ? 'delivery' : 'to-go';

        return {
            rowNumber: row.rowNumber,
            name: normalizedName,
            value,
        };
    });

    const receiptPreferences = read('receiptPreferences', (row) => {
        const businessName = normalizeText(row.data.businessname);
        if (!businessName) {
            return null;
        }

        const logo = normalizeText(row.data.businesslogouri ?? row.data.logouri);

        return {
            rowNumber: row.rowNumber,
            businessName,
            businessAddress: normalizeText(row.data.businessaddress),
            businessPhone: normalizeText(row.data.businessphone),
            businessNit: normalizeText(row.data.businessnit),
            businessLogoUri: logo || null,
            footerMessage: normalizeText(row.data.footermessage),
            paperWidth: parsePaperWidth(row.data.paperwidth),
            taxRate: parseTaxRate(row.data.taxrate),
        };
    });

    const rowsRead = [
        paymentMethods.length,
        providers.length,
        employees.length,
        categories.length,
        ingredients.length,
        products.length,
        productIngredients.length,
        productAdditionalIngredients.length,
        restaurantTables.length,
        discounts.length,
        surcharges.length,
        receiptPreferences.length,
    ].reduce((acc, value) => acc + value, 0);

    if (rowsRead === 0) {
        throw new SeedImportValidationError('Workbook does not contain importable rows.', [
            {
                code: 'EMPTY_WORKBOOK',
                entity: 'workbook',
                message: 'No recognized rows found in workbook.',
            },
        ]);
    }

    return {
        paymentMethods,
        providers,
        employees,
        categories,
        ingredients,
        products,
        productIngredients,
        productAdditionalIngredients,
        restaurantTables,
        discounts,
        surcharges,
        receiptPreferences,
    };
}
