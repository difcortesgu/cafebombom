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

### 1. Product Additionals

- [x] Define the `additionals` data model (id, name, price, active flag)
- [x] Create DB schema table for `additionals` and generate migration
- [x] Build the additionals management screen (list, create, edit, delete)
- [x] Link additionals to products via a `productAdditionals` join table
- [x] Add additional selection UI in the sale item entry flow
- [x] Store selected additionals per sale item in `saleItemAdditionals` table
- [x] Include additionals prices in sale item subtotal calculation
- [x] Display selected additionals on the sale detail view

### 2. Discounts

- [ ] Define discount types: fixed amount and percentage
- [ ] Create DB schema for discounts (id, name, type, value, active flag)
- [ ] Build discounts management screen (list, create, edit, delete)
- [ ] Add per-item discount selection in the sale item entry flow
- [ ] Add per-sale (order-level) discount field in the sale form
- [ ] Calculate discounted subtotals per item and apply order-level discount to total
- [ ] Display applied discounts in the sale detail and receipt views
- [ ] Store discount snapshots on `saleItems` and `sales` tables to preserve historical amounts

### 3. Delivery and To-Go Order Types

- [ ] Add order type field to `sales` table: dine-in, to-go, delivery
- [ ] Define additional cost rules per order type (e.g., delivery fee, packaging surcharge)
- [ ] Create a configuration screen to set additional cost amounts per order type
- [ ] Auto-apply the corresponding additional cost when an order type is selected in the sale form
- [ ] Display order type and additional cost line in sale summary and receipt

### 4. Order State Management

- [ ] Add `status` field to `sales` table: `created`, `in_progress`, `paid`
- [ ] Generate migration for the new status field
- [ ] Update sale creation flow to set initial status to `created`
- [ ] Build an active orders view showing orders grouped by status
- [ ] Add action buttons to advance order status: mark as in progress, mark as paid
- [ ] Prevent editing of paid orders; allow editing of created/in-progress orders
- [ ] Show order status badge in sale list and sale detail views
- [ ] Filter sales history by status

### 5. Payment Methods

- [ ] Create DB schema for `paymentMethods` (id, name, active flag)
- [ ] Seed default payment methods (cash, card, bank transfer)
- [ ] Build payment methods management screen (list, create, edit, toggle active)
- [ ] Add payment method selection step in the checkout/pay flow
- [ ] Support split payment: multiple methods for a single sale
- [ ] Store payment method(s) used on `salePayments` table (sale id, method id, amount)
- [ ] Display payment breakdown in sale detail and receipt views
- [ ] Include payment method totals in the accounts/financial summary

### 6. Receipt Generation and Thermal Printing

- [ ] Design receipt data model (cafe name, date/time, order items, additionals, discounts, totals, payment method)
- [ ] Build an ESC/POS encoder module that converts receipt data into a raw ESC/POS byte command sequence (text alignment, bold, line feeds, cut command)
- [ ] Support ESC/POS text formatting: header block, item rows with right-aligned prices, separator lines, totals block, footer
- [ ] Add logo printing support: convert the restaurant logo image to a 1-bit raster bitmap and encode it using ESC/POS raster graphics commands (GS v 0) for inclusion at the top of the receipt
- [ ] Allow the logo image to be configured in settings (upload or select from assets) with a preview of how it will appear on the receipt
- [ ] Integrate a BLE/USB/Wi-Fi thermal printer library (e.g., `react-native-thermal-receipt-printer-image-text` or equivalent) to send the encoded byte buffer to the printer
- [ ] Add printer discovery and connection management screen in settings (scan, pair, save default printer)
- [ ] Add a "Print Receipt" button on the sale detail view that encodes and sends to the paired printer
- [ ] Support re-printing a receipt for any past sale
- [ ] Build a PDF renderer of the receipt layout using `react-native-html-to-pdf` or `expo-print` as the print/share fallback
- [ ] Expose a "Share as PDF" option when no printer is paired or printing fails
- [ ] Handle printer errors gracefully (not connected, paper out) with user-facing messages and automatic PDF fallback

### 7. Dashboard Improvements

- [ ] Add date range filter (today, this week, this month, custom range)
- [ ] Add filter by product or product category
- [ ] Add filter by staff member
- [ ] Add top-selling products chart
- [ ] Add revenue by order type breakdown (dine-in, to-go, delivery)
- [ ] Add revenue by payment method breakdown
- [ ] Add expenses vs revenue trend chart over selected period
- [ ] Add average ticket size metric
- [ ] Implement Excel export for sales data within the selected date range
- [ ] Implement Excel export for inventory/restock data
- [ ] Implement Excel export for payroll/expense data

### 8. Biometric Authentication

- [ ] Integrate `expo-local-authentication` to check device biometric capability (fingerprint, Face ID)
- [ ] Add a biometrics toggle in settings, only shown when the device supports and has biometrics enrolled
- [ ] Store the biometric preference per user in the local settings store
- [ ] On login, if biometrics is enabled for the user, prompt biometric verification instead of PIN entry
- [ ] Fall back to PIN entry if biometric verification fails or is cancelled
- [ ] Require PIN re-entry when enabling biometrics for the first time to confirm identity before activating
- [ ] Handle the case where biometric enrollment changes on the device (e.g., new fingerprint added) by invalidating the biometric preference and requiring PIN re-confirmation

### 9. UX/UI Improvements and Persistent User Preferences

- [ ] Persist the last selected tab so the app reopens on the same screen the user was on
- [ ] Remember the last used filters per screen (date range, category, staff member) and restore them on re-open
- [ ] Persist sort order preferences per list (e.g., products sorted by name, sales sorted by date)
- [ ] Remember the last selected order type (dine-in, to-go, delivery) as default in the sale form
- [ ] Remember the last used payment method as default at checkout
- [ ] Add swipe-to-delete and swipe-to-edit gestures on list items
- [ ] Add pull-to-refresh on all data lists
- [ ] Add empty state illustrations and messages for lists with no data
- [ ] Add loading skeletons instead of spinners for initial data fetch screens
- [ ] Improve form validation feedback with inline field-level error messages
- [ ] Add confirmation dialogs before destructive actions (delete product, delete ingredient, remove sale item)
- [ ] Add haptic feedback on key interactions (successful save, error, destructive action)
- [ ] Support landscape orientation on tablet for dashboard and sales screens
- [ ] Audit and standardize spacing, typography, and color usage across all screens to match the theme system

