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

Arreglar formulario de ajustes de caja, la pantalla se recorta por alguna razon
Arreglar logo en el recibo
Mostrar unidades en formulario de productos
Cambiar los mensajes de la app para usar toasts
Los formularios laterales deberían tener los nuevos ingredientes arriba

Agregar icono
Imprimir comanda para la cocina
Organizar ingredientes y productos alfabéticamente y agrupar productos por categoría

Revisar vinculacion de android, especificamente buscar la direccion ip del servidor, se puede con un qr que se escanee desde el celular?

Mostrar la diferencia entre el cierre de caja esperado y el real
Agregar módulo de propinas
Editar métodos de pago

