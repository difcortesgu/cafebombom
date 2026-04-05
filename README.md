# CafeBomBom

Cross-platform cafe management app built with Expo, React Native, and TypeScript.

CafeBomBom supports daily cafe operations across mobile and web, including sales, inventory, products, accounts, and staff authentication.

## Requirements

- Node.js 18 LTS (minimum)
- npm
- Expo-compatible environment
	- Android: Android Studio / emulator (optional if you use Expo Go)
	- iOS: Xcode / simulator on macOS (optional if you use Expo Go)
- Modern browser for web development

## Tech Stack

- Expo + React Native + Expo Router
- TypeScript
- Zustand for state management
- Drizzle ORM + Expo SQLite (native)
- Dexie + IndexedDB (web)

## Installation (Development)

1. Install dependencies:

```bash
npm install
```

2. (Optional) Generate migrations after schema changes:

```bash
npm run db:generate
```

Notes:

- Database migrations and default seed data are applied during app startup.
- Web and native use different data service implementations:
	- Native uses SQLite
	- Web uses IndexedDB

## How To Run

Start Expo dev server:

```bash
npm start
```

Run directly on a platform:

```bash
npm run android
npm run ios
npm run web
```

## Available Commands

| Command | Description |
| --- | --- |
| `npm start` | Start Expo development server |
| `npm run android` | Start app on Android |
| `npm run ios` | Start app on iOS |
| `npm run web` | Start app on web |
| `npm run lint` | Run Expo ESLint configuration |
| `npm run db:generate` | Generate Drizzle SQL migrations from schema changes |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run reset-project` | Expo template reset script that can move/delete core app folders and create a blank starter app |

## Features Implemented

- Authentication
	- PIN-based login
	- Session tracking
	- Role-based user support (owner/staff)

- Dashboard
	- Revenue summary
	- Recent sales insights
	- Low-stock indicators

- Sales Management
	- Create and track sales transactions
	- Sale items and totals
	- Table-linked sales flow

- Table Management
	- Restaurant table records and assignment support

- Product Management
	- Product catalog with categories and prices
	- Product ingredient mapping

- Inventory Management
	- Ingredient stock tracking by unit
	- Low-stock threshold tracking
	- Restock logging
	- Supplier linkage

- Accounts and Finance
	- Expense tracking
	- Employee and payroll records
	- Profit/Loss calculation support

- Settings
	- Theme mode and theme palette selection
	- Sync toggle state in settings

- Cross-Platform Data Layer
	- Native service layer using SQLite
	- Web service layer using IndexedDB

## Production Build Notes (Expo EAS)

For production builds and distribution, use Expo EAS.

Typical flow:

1. Install EAS CLI globally:

```bash
npm install -g eas-cli
```

2. Login to Expo:

```bash
eas login
```

3. Configure EAS in the project:

```bash
eas build:configure
```

4. Build for a platform:

```bash
eas build --platform android
eas build --platform ios
```

If you also plan to publish web, use your preferred static hosting provider for the Expo web output.

## Testing Status

- No automated test script is currently configured in package scripts.

## Next Features To Implement

### 1. Discounts

- [X] Discounts
- [X] Delivery and To-Go Order Types
- [X] Payment Methods
- [ ] Order State Management
- [ ] Receipt Generation and Thermal Printing
- [ ] Dashboard Improvements
- [ ] Biometric Authentication
- [ ] UX/UI Improvements and Persistent User Preferences
- [ ] Ability to load in seed data from an excel spreadsheet
- [ ] Backups
- [ ] 

