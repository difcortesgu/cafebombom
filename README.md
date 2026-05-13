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

## Quick Start

See the respective README in each folder for setup and usage instructions.

## Next Features To Implement

- Cuando se haga un restock poder registrar el proveedor inline y que se guarde como un proveedor nuevo

- Asociar por defecto el último proveedor usado para cada ingrediente en el restock