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

- UX/UI Improvements and Persistent User Preferences
- Biometric Authentication
- Backups
- Sync multiple devices
- Ranking de productos por ventas mas popular menos popular
- Promedios Semanales, por dias, por horas, mensuales
- Inventario, cuando debo hacer pedido
- Pedido de ingredientes hecho por los empleados
- Que pasa si por algun accidente se pierden productos o ingredientes
- Limite de descuentos diarios
- Agrupar productos por categorias
- Que se vea mas claro cuando se agrega un producto
