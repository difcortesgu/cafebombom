# CafeBomBom Frontend

Expo + React Native app for the CafeBomBom POS. Runs on Android, iOS, and web.

## Requirements

- Node.js 18 LTS (minimum)
- npm
- Expo-compatible environment
  - Android: Android Studio / emulator (or Expo Go)
  - iOS: Xcode / simulator on macOS (or Expo Go)
  - Web: a modern browser
- A running CafeBomBom backend (see [../backend/README.md](../backend/README.md))

## Tech Stack

- Expo + React Native + Expo Router (file-based routing)
- TypeScript
- Zustand for state management
- Custom lightweight i18n (Spanish)
- `react-native-gifted-charts` for dashboards
- Receipt printing over Bluetooth (`react-native-bluetooth-classic`) and Web USB

## Installation (Development)

Install dependencies:

```bash
npm install
```

## How To Run

Start the Expo dev server:

```bash
npm start
```

Run directly on a platform:

```bash
npm run android
npm run ios
npm run web
```

> The app talks to the backend API. Make sure the backend is running and the API base URL is reachable from your device/emulator.

## Available Commands

| Command | Description |
| --- | --- |
| `npm start` | Start Expo development server |
| `npm run android` | Build and run on Android |
| `npm run ios` | Build and run on iOS |
| `npm run web` | Start the app on web |
| `npm run lint` | Run Expo ESLint configuration |

## Project Structure

- `app/` — Expo Router screens
  - `(tabs)/` — Main tabbed screens (sales, catalog, restock, expenses, cash register, dashboard, team, operations, appearance)
  - Form/detail routes (product, ingredient, expense, payroll, sale, user, backups, import, …)
- `components/` — UI components (order panel, receipt preview, setup screen, restock/expense/payroll panels, etc.)
- `services/` — API client and feature services (sales, products, inventory, accounts, auth, backup, printing, updates, Bluetooth/Web USB printers)
- `stores/` — Zustand stores (auth, sales, products, inventory, accounts, payment methods, settings)
- `utils/` — Pricing, discounts, tax, surcharge, receipt formatting, date helpers
- `hooks/`, `constants/`, `types/` — Shared hooks, constants, and types
- `i18n/` — Localized strings (Spanish)

## Features

- Sales/order panel with split payments, discounts, surcharges, and tax
- Product, combo, and category management
- Inventory and restocking
- Customer accounts, expenses, cash register, and payroll
- Dashboard charts and reporting
- Receipt printing via Bluetooth (Android) and Web USB
- Excel data import
- Database backups
- In-app update checking and APK install (Android)

## Testing Status

- No automated test script is currently configured in package scripts.
- `npm run lint` is available for static checks.