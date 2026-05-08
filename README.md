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

- Colocar anotaciones para cada producto, por ejemplo sin cebolla o sin salsa...
- Mejorar la forma de hacer restock Que se registren en gastos
- Mover el restock también para que se pueda hacer desde gastos
- Habilitar la posibilidad de eliminar algunos ingredientes cuando se haga una venta, por ejemplo sin cebolla no descuenta la cebolla del inventario si está en la receta
- Si la cuenta se dividió, quiero después siempre poder imprimir los recibos parciales tal cual como se pagaron
- Ajustar las unidades para que sean personalizables pero desde una lista predefinida
- Cuando se haga un restock poder registrar el proveedor inline y que se guarde como un proveedor nuevo
- Asociar por defecto el último proveedor usado para cada ingrediente en el restock
- Agregar nit del negocio
