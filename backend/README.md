# CafeBomBom Backend

Express + TypeScript API server for the CafeBomBom POS, running on the [Bun](https://bun.sh) runtime with SQLite (Drizzle ORM).

## Requirements

- [Bun](https://bun.sh) (used to run, develop, and build the server)
- SQLite (file-based, created automatically)

## Setup

1. Install dependencies:

```bash
bun install
```

2. Copy the example environment file and configure as needed:

```bash
cp .env.example .env
# Edit .env to set secrets and config
```

3. (Optional) Generate / apply database migrations after schema changes:

```bash
bun run db:generate   # generate migrations from schema
bun run db:migrate    # apply migrations (Runs on startup automatically)
```

## Running the Backend

### Development (with auto-reload)

```bash
bun run dev
```

### Production

```bash
bun start
```

The server starts on the port specified in your `.env` file (default: 3000). It also serves the built web frontend as static files when present.

## Building a Standalone Executable

The backend can be compiled into a single self-contained binary (no Bun install required to run it):

```bash
bun run build:windows   # produces pos-app.exe
bun run build:linux     # produces pos-app-linux
bun run build:exe       # builds both
```

## API Documentation

- Swagger UI is available at `/api/docs` when the server is running.
- Version endpoint: `GET /api/version`
- Update endpoints: `GET /api/update/check`, `POST /api/update/apply`

### Main route groups

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Login, current user (`/me`), logout |
| `/api/users` | Staff/user management |
| `/api/sales` | Sales and orders |
| `/api/products` | Products, combos, categories |
| `/api/inventory` | Ingredients and restocking |
| `/api/accounts` | Customer accounts |
| `/api/payment-methods` | Payment methods |
| `/api/setup` | Bootstrap, Excel seed import/export |
| `/api/pairing` | Device pairing |
| `/api/backup` | Database backups and restore |

## Excel Seed Import

- Official template file: `assets/import-template.xlsx` (served to clients, not edited by hand).
- Download template endpoint: `GET /api/setup/import-template`
- Import endpoint: `POST /api/setup/import`

### Template sheets and headers

The workbook contains one sheet per entity:

| Sheet | Columns |
|-------|---------|
| `payment_methods` | `name`, `isActive` |
| `suppliers` | `name`, `phone`, `notes` |
| `employees` | `name`, `salaryType`, `rate` |
| `categories` | `name` |
| `ingredients` | `name`, `unit`, `quantity`, `lowStockThreshold`, `supplierName` |
| `products` | `name`, `categoryName`, `price`, `isActive`, `imageUri` |
| `product_ingredients` | `productName`, `ingredientName`, `quantityUsed` |
| `product_additional_ingredients` | `productName`, `ingredientName`, `quantityUsed`, `additionalPrice` |
| `restaurant_tables` | `name`, `tableType` |
| `discounts` | `name`, `scope`, `productName`, `type`, `value`, `startsAt`, `endsAt`, `isActive` |
| `surcharges` | `name`, `value` |
| `receipt_preferences` | `businessName`, `businessAddress`, `businessPhone`, `businessNit`, `businessLogoUri`, `footerMessage`, `paperWidth`, `taxRate` |

Key enumerated values:

- `tableType`: `dine-in` \| `to-go` \| `delivery`
- `scope` (discount): `product` \| `global`
- `type` (discount): `percentage` \| `fixed`
- `salaryType`: `hourly` \| `monthly`
- `surcharge name`: `to-go` \| `delivery`
- booleans: `true`/`false`, `yes`/`no`, `si`/`no`, `1`/`0`

## Scripts

| Command | Description |
|---------|-------------|
| `bun start` | Run the server (`src/index.ts`) |
| `bun run dev` | Start dev server with auto-reload (`--watch`) |
| `bun run db:generate` | Generate Drizzle migrations from schema |
| `bun run db:migrate` | Apply Drizzle migrations |
| `bun run build:windows` | Compile a standalone Windows executable |
| `bun run build:linux` | Compile a standalone Linux executable |
| `bun run build:exe` | Compile both Windows and Linux executables |

## Environment Variables

See `.env.example` for all available configuration options:

- `PORT` — Port to run the server (default: 3000)
- `JWT_SECRET` — Secret for JWT signing
- `JWT_EXPIRES_IN` — JWT expiration (e.g. `1d`, `12h`)
- `SQLITE_FILE_PATH` — Path to the SQLite DB file
- `CORS_ORIGIN` — Allowed CORS origin(s)
- `JSON_BODY_LIMIT` — Max JSON body size (default: 10mb)

## Database

- Uses SQLite by default (file: `sqlite.db`).
- Schema and migrations managed with Drizzle ORM.
- Migration config: see `drizzle.config.ts`.
- Migrations live in `src/database/migrations/`.

## Project Structure

- `src/` — Source code
  - `index.ts` — App entry point, auth routes, static serving
  - `controllers/` — Route logic
  - `routes/` — API route definitions
  - `services/` — Business logic and DB access (analytics, auth, backup, printing/logo, pricing, seed import, updater, …)
  - `database/` — Schema and migrations
  - `middleware/` — Express middleware (auth, bootstrap, swagger)
  - `validators/` — Request validation
  - `types/` — TypeScript types
  - `utils/` — Helpers
- `scripts/` — Maintenance scripts (e.g. `migrate.cjs`)
- `assets/` — Static assets

## Notable Capabilities

- JWT-based authentication (`bcryptjs` hashing).
- Receipt rendering/encoding (`@point-of-sale/receipt-printer-encoder`).
- Logo and product image handling (`multer` uploads, `jimp` processing).
- Database backups and restore (`adm-zip`).
- Structured logging with `winston`.
- Self-update support (check/apply new releases).
