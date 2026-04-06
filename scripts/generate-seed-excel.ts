#!/usr/bin/env -S npx tsx
// scripts/generate-seed-excel.ts
// Run: npx tsx scripts/generate-seed-excel.ts   (or: npm run seed:excel)
//
// Generates a ready-to-upload seed Excel file with Spanish sample data.
// Data is typed against ParsedSeedData from utils/excel-seed.ts, which is
// the exact interface consumed by SetupService.importSeedFromExcel().
// Adding or removing a field on any SeedXxxRow type will cause a type error
// here, keeping the script in sync with the service interfaces automatically.

import * as path from 'path';
import * as XLSX from 'xlsx';

import type {
  SeedEmployeeRow,
  ParsedSeedData,
  SeedCategoryRow,
  SeedDiscountRow,
  SeedIngredientRow,
  SeedProviderRow,
  SeedProductIngredientRow,
  SeedProductRow,
  SeedRestaurantTableRow,
  SeedSurchargeRow,
} from '../utils/excel-seed';

// ─── Sheet name map ──────────────────────────────────────────────────────────
// Keys match ParsedSeedData; values match SHEET_ALIASES in utils/excel-seed.ts
// so the importer recognises the sheets automatically.
const SHEET_NAMES: Record<keyof ParsedSeedData, string> = {
  providers: 'providers',
  employees: 'employees',
  categories: 'categories',
  ingredients: 'ingredients',
  products: 'products',
  productIngredients: 'product_ingredients',
  restaurantTables: 'restaurant_tables',
  discounts: 'discounts',
  surcharges: 'surcharges',
};

// ─── Dynamic AOA builder ─────────────────────────────────────────────────────
// Derives column headers from Object.keys() of the first row. This means
// the spreadsheet columns are always in sync with the TypeScript field names.
// The parser normalises headers (lowercase, strips _/-/spaces), so camelCase
// keys produced by Object.keys() match correctly (e.g. lowStockThreshold →
// "lowstockthreshold" which equals what parseSeedWorkbook looks for).
function rowsToSheet(rows: object[]): XLSX.WorkSheet {
  if (rows.length === 0) return XLSX.utils.aoa_to_sheet([[]]);
  const headers = Object.keys(rows[0]) as string[];
  const aoa: unknown[][] = [
    headers,
    ...rows.map((row) => headers.map((h) => {
      const val = (row as Record<string, unknown>)[h];
      return val === null ? '' : val;
    })),
  ];
  return XLSX.utils.aoa_to_sheet(aoa);
}

// ─── Sample seed data ────────────────────────────────────────────────────────
// Each array is typed to the corresponding SeedXxxRow so TypeScript enforces
// field names, required/optional, and union literal values at compile time.

const now = Math.floor(Date.now() / 1000);
const oneYearLater = now + 365 * 24 * 3600;

const seedData: ParsedSeedData = {

  providers: [
    { name: 'Cafe Don Pedro',        phone: '555-0101', notes: 'Proveedor de cafe en grano y molido' },
    { name: 'Lacteos La Pradera',    phone: '555-0102', notes: 'Leche y derivados' },
    { name: 'Panaderia San Miguel',  phone: '555-0103', notes: 'Pan y bolleria fresca diaria' },
  ] satisfies SeedProviderRow[],

  employees: [
    { name: 'Ana Gomez',   salaryType: 'monthly', rate: 12000 },
    { name: 'Luis Perez',  salaryType: 'hourly',  rate: 75 },
    { name: 'Maria Ruiz',  salaryType: 'hourly',  rate: 70 },
  ] satisfies SeedEmployeeRow[],

  categories: [
    { name: 'Bebidas calientes' },
    { name: 'Bebidas frias' },
    { name: 'Postres' },
    { name: 'Snacks' },
    { name: 'Desayunos' },
  ] satisfies SeedCategoryRow[],

  ingredients: [
    { name: 'Cafe molido',        unit: 'grams',  quantity: 2000, lowStockThreshold: 300  },
    { name: 'Leche entera',       unit: 'liters', quantity: 10,   lowStockThreshold: 2    },
    { name: 'Azucar',             unit: 'grams',  quantity: 5000, lowStockThreshold: 500  },
    { name: 'Chocolate en polvo', unit: 'grams',  quantity: 1500, lowStockThreshold: 200  },
    { name: 'Harina',             unit: 'grams',  quantity: 3000, lowStockThreshold: 500  },
    { name: 'Mantequilla',        unit: 'grams',  quantity: 800,  lowStockThreshold: 100  },
    { name: 'Huevo',              unit: 'pieces', quantity: 24,   lowStockThreshold: 6    },
    { name: 'Crema para batir',   unit: 'liters', quantity: 2,    lowStockThreshold: 0.5  },
    { name: 'Vainilla',           unit: 'liters', quantity: 0.5,  lowStockThreshold: 0.1  },
    { name: 'Canela molida',      unit: 'grams',  quantity: 300,  lowStockThreshold: 50   },
    { name: 'Sal',                unit: 'grams',  quantity: 1000, lowStockThreshold: 100  },
    { name: 'Levadura',           unit: 'grams',  quantity: 200,  lowStockThreshold: 30   },
    { name: 'Queso crema',        unit: 'grams',  quantity: 500,  lowStockThreshold: 100  },
    { name: 'Fresa',              unit: 'grams',  quantity: 1000, lowStockThreshold: 200  },
    { name: 'Platano',            unit: 'pieces', quantity: 12,   lowStockThreshold: 3    },
  ] satisfies SeedIngredientRow[],

  products: [
    { name: 'Cafe americano',           categoryName: 'Bebidas calientes', price: 35, isActive: true },
    { name: 'Cappuccino',               categoryName: 'Bebidas calientes', price: 45, isActive: true },
    { name: 'Latte de vainilla',        categoryName: 'Bebidas calientes', price: 50, isActive: true },
    { name: 'Chocolate caliente',       categoryName: 'Bebidas calientes', price: 40, isActive: true },
    { name: 'Cafe con leche',           categoryName: 'Bebidas calientes', price: 38, isActive: true },
    { name: 'Agua fresca de fresa',     categoryName: 'Bebidas frias',     price: 30, isActive: true },
    { name: 'Frappe de cafe',           categoryName: 'Bebidas frias',     price: 55, isActive: true },
    { name: 'Smoothie de platano',      categoryName: 'Bebidas frias',     price: 48, isActive: true },
    { name: 'Te helado',                categoryName: 'Bebidas frias',     price: 28, isActive: true },
    { name: 'Brownie de chocolate',     categoryName: 'Postres',           price: 40, isActive: true },
    { name: 'Cheesecake de fresa',      categoryName: 'Postres',           price: 55, isActive: true },
    { name: 'Muffin de vainilla',       categoryName: 'Postres',           price: 32, isActive: true },
    { name: 'Pay de queso',             categoryName: 'Postres',           price: 60, isActive: true },
    { name: 'Croissant de mantequilla', categoryName: 'Snacks',            price: 35, isActive: true },
    { name: 'Sandwich de jamon',        categoryName: 'Snacks',            price: 70, isActive: true },
    { name: 'Granola con yogurt',       categoryName: 'Desayunos',         price: 65, isActive: true },
    { name: 'Hotcakes con platano',     categoryName: 'Desayunos',         price: 75, isActive: true },
    { name: 'Tostadas francesas',       categoryName: 'Desayunos',         price: 68, isActive: true },
  ] satisfies SeedProductRow[],

  productIngredients: [
    { productName: 'Cafe americano',       ingredientName: 'Cafe molido',        quantityUsed: 15    },
    { productName: 'Cappuccino',           ingredientName: 'Cafe molido',        quantityUsed: 18    },
    { productName: 'Cappuccino',           ingredientName: 'Leche entera',       quantityUsed: 0.12  },
    { productName: 'Latte de vainilla',    ingredientName: 'Cafe molido',        quantityUsed: 18    },
    { productName: 'Latte de vainilla',    ingredientName: 'Leche entera',       quantityUsed: 0.18  },
    { productName: 'Latte de vainilla',    ingredientName: 'Vainilla',           quantityUsed: 0.01  },
    { productName: 'Chocolate caliente',   ingredientName: 'Chocolate en polvo', quantityUsed: 20    },
    { productName: 'Chocolate caliente',   ingredientName: 'Leche entera',       quantityUsed: 0.2   },
    { productName: 'Chocolate caliente',   ingredientName: 'Azucar',             quantityUsed: 10    },
    { productName: 'Cafe con leche',       ingredientName: 'Cafe molido',        quantityUsed: 15    },
    { productName: 'Cafe con leche',       ingredientName: 'Leche entera',       quantityUsed: 0.15  },
    { productName: 'Frappe de cafe',       ingredientName: 'Cafe molido',        quantityUsed: 20    },
    { productName: 'Frappe de cafe',       ingredientName: 'Leche entera',       quantityUsed: 0.15  },
    { productName: 'Frappe de cafe',       ingredientName: 'Crema para batir',   quantityUsed: 0.05  },
    { productName: 'Frappe de cafe',       ingredientName: 'Azucar',             quantityUsed: 15    },
    { productName: 'Smoothie de platano',  ingredientName: 'Platano',            quantityUsed: 1     },
    { productName: 'Smoothie de platano',  ingredientName: 'Leche entera',       quantityUsed: 0.2   },
    { productName: 'Smoothie de platano',  ingredientName: 'Azucar',             quantityUsed: 10    },
    { productName: 'Agua fresca de fresa', ingredientName: 'Fresa',              quantityUsed: 80    },
    { productName: 'Agua fresca de fresa', ingredientName: 'Azucar',             quantityUsed: 20    },
    { productName: 'Brownie de chocolate', ingredientName: 'Chocolate en polvo', quantityUsed: 30    },
    { productName: 'Brownie de chocolate', ingredientName: 'Harina',             quantityUsed: 60    },
    { productName: 'Brownie de chocolate', ingredientName: 'Mantequilla',        quantityUsed: 40    },
    { productName: 'Brownie de chocolate', ingredientName: 'Huevo',              quantityUsed: 1     },
    { productName: 'Brownie de chocolate', ingredientName: 'Azucar',             quantityUsed: 50    },
    { productName: 'Cheesecake de fresa',  ingredientName: 'Queso crema',        quantityUsed: 120   },
    { productName: 'Cheesecake de fresa',  ingredientName: 'Fresa',              quantityUsed: 50    },
    { productName: 'Cheesecake de fresa',  ingredientName: 'Azucar',             quantityUsed: 40    },
    { productName: 'Cheesecake de fresa',  ingredientName: 'Mantequilla',        quantityUsed: 30    },
    { productName: 'Muffin de vainilla',   ingredientName: 'Harina',             quantityUsed: 80    },
    { productName: 'Muffin de vainilla',   ingredientName: 'Azucar',             quantityUsed: 40    },
    { productName: 'Muffin de vainilla',   ingredientName: 'Huevo',              quantityUsed: 1     },
    { productName: 'Muffin de vainilla',   ingredientName: 'Vainilla',           quantityUsed: 0.005 },
    { productName: 'Muffin de vainilla',   ingredientName: 'Mantequilla',        quantityUsed: 25    },
    { productName: 'Croissant de mantequilla', ingredientName: 'Harina',         quantityUsed: 100   },
    { productName: 'Croissant de mantequilla', ingredientName: 'Mantequilla',    quantityUsed: 60    },
    { productName: 'Croissant de mantequilla', ingredientName: 'Sal',            quantityUsed: 2     },
    { productName: 'Croissant de mantequilla', ingredientName: 'Levadura',       quantityUsed: 5     },
    { productName: 'Hotcakes con platano', ingredientName: 'Harina',             quantityUsed: 80    },
    { productName: 'Hotcakes con platano', ingredientName: 'Huevo',              quantityUsed: 1     },
    { productName: 'Hotcakes con platano', ingredientName: 'Leche entera',       quantityUsed: 0.1   },
    { productName: 'Hotcakes con platano', ingredientName: 'Platano',            quantityUsed: 1     },
    { productName: 'Hotcakes con platano', ingredientName: 'Mantequilla',        quantityUsed: 15    },
    { productName: 'Tostadas francesas',   ingredientName: 'Huevo',              quantityUsed: 2     },
    { productName: 'Tostadas francesas',   ingredientName: 'Leche entera',       quantityUsed: 0.08  },
    { productName: 'Tostadas francesas',   ingredientName: 'Canela molida',      quantityUsed: 2     },
    { productName: 'Tostadas francesas',   ingredientName: 'Azucar',             quantityUsed: 10    },
    { productName: 'Granola con yogurt',   ingredientName: 'Fresa',              quantityUsed: 40    },
    { productName: 'Granola con yogurt',   ingredientName: 'Azucar',             quantityUsed: 5     },
  ] satisfies SeedProductIngredientRow[],

  restaurantTables: [
    { name: 'Mesa 1',              tableType: 'dine-in'  },
    { name: 'Mesa 2',              tableType: 'dine-in'  },
    { name: 'Mesa 3',              tableType: 'dine-in'  },
    { name: 'Mesa 4',              tableType: 'dine-in'  },
    { name: 'Mesa 5',              tableType: 'dine-in'  },
    { name: 'Mesa 6',              tableType: 'dine-in'  },
    { name: 'Barra 1',             tableType: 'dine-in'  },
    { name: 'Barra 2',             tableType: 'dine-in'  },
    { name: 'Para llevar',         tableType: 'to-go'    },
    { name: 'Entrega a domicilio', tableType: 'delivery' },
  ] satisfies SeedRestaurantTableRow[],

  discounts: [
    {
      name: 'Descuento lunes 10%',
      scope: 'global',
      productName: null,
      type: 'percentage',
      value: 10,
      startsAt: now,
      endsAt: oneYearLater,
      isActive: true,
    },
    {
      name: 'Promo desayuno',
      scope: 'product',
      productName: 'Hotcakes con platano',
      type: 'percentage',
      value: 15,
      startsAt: now,
      endsAt: oneYearLater,
      isActive: true,
    },
    {
      name: 'Descuento fidelidad',
      scope: 'global',
      productName: null,
      type: 'fixed',
      value: 5,
      startsAt: now,
      endsAt: null,
      isActive: false,
    },
  ] satisfies SeedDiscountRow[],

  surcharges: [
    { name: 'to-go',     value: 5  },
    { name: 'delivery',  value: 15 },
  ] satisfies SeedSurchargeRow[],
};

// ─── Build workbook ───────────────────────────────────────────────────────────
// Iterate ParsedSeedData keys in insertion order so the sheet order is stable.
const wb = XLSX.utils.book_new();

for (const key of Object.keys(seedData) as (keyof ParsedSeedData)[]) {
  XLSX.utils.book_append_sheet(wb, rowsToSheet(seedData[key]), SHEET_NAMES[key]);
}

// ─── Write to disk ────────────────────────────────────────────────────────────
const outPath = path.resolve(__dirname, '..', 'semilla-cafebombom.xlsx');
XLSX.writeFile(wb, outPath);
console.log(`✓ Archivo Excel generado: ${outPath}`);
console.log(`  Hojas: ${wb.SheetNames.join(', ')}`);
for (const key of Object.keys(seedData) as (keyof ParsedSeedData)[]) {
  console.log(`  ${SHEET_NAMES[key]}: ${seedData[key].length} filas`);
}
