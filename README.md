# CafeBomBom

Cross-platform point-of-sale (POS) and cafe management system for desktop, web, and mobile.

## Overview

CafeBomBom is a full-stack solution for daily cafe operations: sales and order management, inventory and restocking, products and combos, customer accounts, expenses, cash register, payroll, staff authentication, and receipt printing. It is built with Expo / React Native (frontend) and Express + TypeScript running on Bun (backend).

The backend can be compiled into a standalone executable (Windows/Linux) that also serves the built web frontend, so the whole system can run on a single machine without an external runtime.

## Monorepo Structure

- `frontend/` — Expo + React Native app (Android, iOS, web)
- `backend/` — Express + TypeScript API server (runs on Bun)

## Documentation

- Frontend: [frontend/README.md](frontend/README.md)
- Backend: [backend/README.md](backend/README.md)

## Quick Start

See the README in each folder for setup and usage instructions:

1. Start the backend (`backend/`) — see [backend/README.md](backend/README.md).
2. Start the frontend (`frontend/`) — see [frontend/README.md](frontend/README.md).

## Features

- Sales and order panel with split payments, discounts, surcharges, and tax
- Products, ingredients, categories, and combos
- Inventory tracking and restocking
- Customer accounts and tabs
- Expenses, cash register reconciliation, and payroll
- Configurable payment methods
- Receipt printing via Bluetooth (Android) and Web USB
- Excel seed import (upsert with fail-fast transactions)
- Database backups and restore
- Auto-update (the app can check for and install new releases)

## Versioning

The current release version is tracked in the [VERSION](VERSION) file and exposed by the backend at `GET /api/version`.


## Notes on next fixes
En todas estas paginas agregar iconos y labels para todos los campos:
Mejorar pagina de respaldos
Mejorar pagina de recibos e impresion, labels, iconos, distribucion, y ajustar ubicacion del logo
Ocultar la configuracion manual de ip y puerto, hacerla collapsible, para el input de ip y de puerto hacer formato automatico igual que se hizo para campos de currency
mejorar configuracion de impresora Ocultar direccion MAC de la impresora, en web solo ver botones de probar y borrar ocultar configuracion bluetooth
Mejorar pagina de login y setup para pantallas grandes, iconos, distribucion, labels, etc...