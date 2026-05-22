eas login
eas build:configure
eas build --platform android
eas build --platform ios
# CafeBomBom

Cross-platform cafe management app for web and mobile.

## Overview

CafeBomBom is a full-stack solution for daily cafe operations, including sales, inventory, products, accounts, and staff authentication. It is built with Expo/React Native (frontend) and Express/TypeScript (backend).

## Monorepo Structure

- `frontend/` — Expo + React Native app (mobile/web)
- `backend/` — Express + TypeScript API server

## Documentation

- Frontend: [frontend/README.md](frontend/README.md)
- Backend: [backend/README.md](backend/README.md)
- Import template v2: [docs/import-template-v2.xlsx](docs/import-template-v2.xlsx)
- Import template guide: [docs/import-template-v2.md](docs/import-template-v2.md)

## Quick Start

See the respective README in each folder for setup and usage instructions.

## Excel Seed Import v2

- Use the official template in [docs/import-template-v2.xlsx](docs/import-template-v2.xlsx).
- Import mode is upsert with transaction fail-fast behavior.
- API template download endpoint: GET /api/setup/import-template

## Next Features To Implement

Unify create product with edit product forms, use only the drawer style, small screens should fallback to full page forms