# CafeBomBom Backend

## Requirements

- Node.js 18+
- npm
- SQLite (file-based, included by default)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file and configure as needed:

```bash
cp .env.example .env
# Edit .env to set secrets and config
```

3. (Optional) Generate database migrations after schema changes:

```bash
npm run build
npm run db:generate
```

## Running the Backend

### Development (with auto-reload)

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

- The server will start on the port specified in your `.env` file (default: 3000).

## API Documentation

- Swagger UI is available at `/api/docs` when the server is running.

## Excel Seed Import v2

- Official template file: `../docs/import-template-v2.xlsx`
- Guide: `../docs/import-template-v2.md`
- Download template endpoint: `GET /api/setup/import-template`
- Import endpoint: `POST /api/setup/import`

Behavior:
- Upsert per supported entity (insert/update/skip summary).
- Transaction fail-fast: any validation/write failure rolls back all changes.
- Structured validation issues returned with HTTP `422`.

## Scripts

| Command         | Description                                 |
|-----------------|---------------------------------------------|
| `npm run dev`   | Start dev server with auto-reload (nodemon) |
| `npm run build` | Compile TypeScript to `dist/`               |
| `npm start`     | Run compiled server                         |

## Environment Variables

See `.env.example` for all available configuration options:
- `PORT` - Port to run the server
- `JWT_SECRET` - Secret for JWT signing
- `JWT_EXPIRES_IN` - JWT expiration (e.g. 1d, 12h)
- `SQLITE_FILE_PATH` - Path to SQLite DB file
- `CORS_ORIGIN` - Allowed CORS origin(s)
- `JSON_BODY_LIMIT` - Max JSON body size (default: 10mb)

## Database

- Uses SQLite by default (file: `sqlite.db`)
- Migrations managed with Drizzle ORM
- Migration config: see `drizzle.config.ts`

## Project Structure

- `src/` - Source code
  - `controllers/` - Route logic
  - `database/` - Schema, migrations
  - `middleware/` - Express middleware
  - `routes/` - API route definitions
  - `services/` - Business logic, DB access
  - `types/` - TypeScript types

---