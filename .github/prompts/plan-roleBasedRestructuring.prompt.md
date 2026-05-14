# Plan: Role-Based App Restructuring

## TL;DR
Split the current mixed 5-tab layout into two completely separate tab sets — Owner (parametrización) and Staff (operación diaria). Backed by new backend schema for cash adjustments, corrected endpoint permissions, and a security fix on payment-methods routes. No feature overlap between roles.

---

## Phase 1 — Backend: Schema, Permissions, New Endpoints

### 1.1 New table: `cashRegisterAdjustments`
- Add to `backend/src/database/schema.ts`:
  - `id`, `sessionId` → references `cashRegisterSessions(id)`, `amount` (real, positive or negative), `reason` (text, NOT NULL), `adjustedBy` → references `users(id)`, `createdAt`
- Run `drizzle-kit generate` + update `migrate.cjs`

### 1.2 Fix endpoint permissions
- `POST /api/accounts/expenses` → change from `requireRole('owner')` to `authMiddleware` only (staff can record)
- `POST /api/accounts/payroll` → same change (staff records payroll disbursements)
- `POST /api/inventory/restocks` → change from `requireRole('owner')` to `authMiddleware` only
- Files: `backend/src/routes/accounts.ts`, `backend/src/routes/inventory.ts`

### 1.3 New cash adjustment endpoints
- `POST /api/accounts/cash-register/adjustments` → `requireRole('owner')` — create adjustment with `{ sessionId, amount, reason }`
- `GET /api/accounts/cash-register/:sessionId/adjustments` → `requireRole('owner')` — list adjustments for a session
- Files: `backend/src/routes/accounts.ts`, `backend/src/controllers/accounts.ts`

### 1.4 Security fix: payment-methods
- Add `authMiddleware` + `requireRole('owner')` to POST/PUT/DELETE in `backend/src/routes/payment-methods.ts`
- GET routes stay public (needed for active/all listings during sales)

---

## Phase 2 — Frontend: Owner Tabs (5 tabs)

### New files to create in `frontend/app/(tabs)/`:

**`dashboard.tsx`** (rename from `index.tsx`):
- Keep existing content (KPIs, analytics, queue, finance insights)
- Add "Historial de Caja" section: list of cash sessions with opening/closing amounts + adjustment history per session
- Owner can add adjustment → form with `amount` + `reason` fields (required)
- Remove quick-action "add expense" (expense recording is now staff-only)

**`catalog.tsx`** (new):
- Content from: `inventory.tsx` (Products section + Ingredients config) + `products.tsx` (full product list)
- Sections: Products (list + add/edit/remove/restore), Categories (inline), Ingredients (full config: name, unit, supplier, threshold), Suppliers (list + add)
- Navigation: `/product-form`, `/category-form`, `/ingredient-form`, `/inventory-form?section=suppliers`

**`operations.tsx`** (new):
- Content from: `tables.tsx` + `settings.tsx` ('app' section: payment methods, surcharges, discounts)
- Sections: Mesas (list + add/edit/delete), Métodos de pago (PaymentMethodsManager component), Recargos (delivery/to-go surcharge inputs), Descuentos (discount CRUD)
- Navigation: `/table-form`

**`team.tsx`** (new):
- Content from: `settings.tsx` ('profiles' section: user management) + `accounts.tsx` (employees/payroll sections)
- Sections: Usuarios (UserManagementTable component + create user), Empleados (employee roster + add/edit), Historial Nómina (read-only payroll records)
- No payroll disbursement form here (staff records those)

**`appearance.tsx`** (new, shared with staff):
- Content from: `settings.tsx` ('ui' section)
- Sections: Tema, Modo (light/dark/system)
- Also: current user profile edit (change name/PIN) — same for both roles

### Files to delete after content migration:
- `settings.tsx` — content distributed to operations, team, appearance
- `products.tsx` — merged into catalog
- `tables.tsx` — merged into operations
- `accounts.tsx` — split into cash-register (staff) and team (owner)
- `inventory.tsx` — split into catalog (owner) and restock (staff)

---

## Phase 3 — Frontend: Staff Tabs (5 tabs)

### New files to create in `frontend/app/(tabs)/`:

**`cash-register.tsx`** (new):
- Content from: `accounts.tsx` (Caja section only)
- Sections: Sesión actual (opening amount — immutable after saved), Cierre de caja (closing amount — immutable after saved), Resumen del turno (income by payment method), Ajustes (list read-only — owner adds these)
- Immutability: once `openedAt` is set, opening amount input is disabled; once `closedAt` is set, closing amount input is disabled
- Uses: `useAccountsStore`, `usePaymentMethodsStore`

**`restock.tsx`** (new):
- Content from: `inventory.tsx` (Ingredients list — read-only config, shows stock + low-stock alerts)
- Each ingredient row: shows name, unit, current qty, low-stock badge → "Reabastecer" button → navigates to `inventory-form?section=restock&ingredientId={id}`
- NO add/edit/delete ingredient actions
- No suppliers or products sections
- Uses: `useInventoryStore`

**`expenses.tsx`** (new):
- Content from: `accounts.tsx` (Expenses + Payroll sections only)
- Sections: Gastos (list today's expenses, add new — inline form), Nómina (list recent entries, add new — inline form)
- Uses: `useAccountsStore`, `usePaymentMethodsStore`

**`sales.tsx`** — KEEP AS-IS (no changes)

**`appearance.tsx`** — same file as owner (shared)

---

## Phase 4 — Frontend: Update Routing

### `(tabs)/_layout.tsx`:
- Replace `visibleTabs` logic:
  ```
  owner: ['dashboard', 'catalog', 'operations', 'team', 'appearance']
  staff: ['sales', 'cash-register', 'restock', 'expenses', 'appearance']
  ```
- Register new Tabs.Screen entries for all new files
- Remove entries for deleted files
- Update `hydrateInventory`/`hydrateProducts` trigger (currently triggered for all users — keep for staff restock, keep for owner catalog)

### `_layout.tsx` (root Stack):
- Remove `accounts-form` stack screen (content goes inline)
- Keep: `product-form`, `category-form`, `ingredient-form`, `table-form`, `inventory-form`, `sale-form`

### `accounts-form.tsx` decision:
- Option A: Keep as staff-only stack screen for expenses + payroll forms (remove employees section)
- Option B: Make expense/payroll forms inline within `expenses.tsx` tab
- **Recommendation: Option B** (inline forms, simpler navigation, fewer stack screens)

---

## Phase 5 — i18n

Add to `frontend/i18n/index.ts`:
- `nav.tab.catalog` → "Catálogo"
- `nav.tab.operations` → "Operaciones"
- `nav.tab.team` → "Equipo"
- `nav.tab.appearance` → "Apariencia"
- `nav.tab.cashRegister` → "Caja"
- `nav.tab.restock` → "Inventario"
- `nav.tab.expenses` → "Gastos"
- Any new section/label keys for new screens

---

## Relevant Files

### Backend
- `backend/src/database/schema.ts` — add cashRegisterAdjustments table
- `backend/src/routes/accounts.ts` — permission changes + new adjustment endpoints
- `backend/src/routes/inventory.ts` — permission change for restocks
- `backend/src/routes/payment-methods.ts` — add auth guards
- `backend/src/controllers/accounts.ts` — implement adjustment handlers

### Frontend (new)
- `frontend/app/(tabs)/catalog.tsx`
- `frontend/app/(tabs)/operations.tsx`
- `frontend/app/(tabs)/team.tsx`
- `frontend/app/(tabs)/cash-register.tsx`
- `frontend/app/(tabs)/restock.tsx`
- `frontend/app/(tabs)/expenses.tsx`
- `frontend/app/(tabs)/appearance.tsx`

### Frontend (modified)
- `frontend/app/(tabs)/_layout.tsx` — new tab routing logic
- `frontend/app/(tabs)/index.tsx` → `dashboard.tsx` — add cash session history + adjustment
- `frontend/app/_layout.tsx` — update stack screens if accounts-form removed
- `frontend/i18n/index.ts` — new keys
- `frontend/stores/accounts.ts` — add adjustment actions
- `frontend/services/accounts.ts` — add adjustment API calls
- `frontend/types/accounts.ts` — add CashAdjustment type

### Frontend (deleted)
- `frontend/app/(tabs)/settings.tsx`
- `frontend/app/(tabs)/products.tsx`
- `frontend/app/(tabs)/tables.tsx`
- `frontend/app/(tabs)/accounts.tsx`
- `frontend/app/(tabs)/inventory.tsx`
- `frontend/app/accounts-form.tsx` (if going inline)

---

## Verification

1. Run `drizzle-kit generate` + migration → verify `cash_register_adjustments` table created
2. Test backend: unauthenticated request to `POST /api/payment-methods` → expect 401
3. Test backend: staff token on `POST /api/accounts/expenses` → expect 200
4. Test backend: staff token on `POST /api/inventory/restocks` → expect 200
5. Login as owner → verify only 5 owner tabs visible, no sales kanban
6. Login as staff → verify only 5 staff tabs visible, no catalog/operations/team
7. Staff opens cash register → saves opening amount → verify field becomes read-only
8. Staff closes cash register → verify closing amount becomes read-only
9. Owner adds cash adjustment → verify it appears in staff's session view (read-only)
10. Staff navigates to restock → can restock but cannot edit ingredient names/units

---

## Decisions
- Roles are mutually exclusive (no overlap) — owner cannot enter sales kanban, staff cannot enter catalog
- Cash register is immutable after entry; corrections via owner-only adjustment records (auditable)
- No third "admin" role — owner handles all configuration + oversight
- Appearance tab (theme/mode) is shared between both roles, same file
- Expense and payroll forms go inline in `expenses.tsx` (no stack screen for these)
- Cash adjustment form goes inline in `dashboard.tsx` for owner
- Restock form keeps existing `inventory-form?section=restock` stack screen

## Out of Scope
- Analytics/reporting enhancements beyond what's needed for adjustment display
- Receipt info and printer settings move to `operations.tsx` (from old settings 'app' section) — owner-only
