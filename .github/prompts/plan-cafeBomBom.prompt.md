## Plan: CafeBomBom Restaurant Management App

**TL;DR**: Build a full restaurant ops app on top of the existing Expo template, using `expo-sqlite` for local-first storage, `Zustand` for state, and Expo Router for a 5-tab navigation structure. Organized into 5 phased modules: Foundation → Inventory → Sales → Accounts → Dashboard & Sync.

---

**Steps**

### Phase 1 — Foundation
1. Install new dependencies: `zustand`, `expo-sqlite` (already bundled in SDK 54 but needs config)
2. Create `lib/db.ts` — SQLite database initialization module with table creation/migrations
3. Create Zustand store skeletons in `lib/stores/` — one per domain (`auth`, `inventory`, `sales`, `accounts`)
4. Replace the 2-tab layout in `app/(tabs)/_layout.tsx` with a **5-tab structure**: Dashboard, Sales, Inventory, Accounts, Settings
5. Create 4 new tab screen files (sales, inventory, accounts, settings) alongside the existing `index.tsx`
6. Build a PIN-based session login (local user profiles) — Owner sees all tabs; Staff only sees Sales + Inventory

### Phase 2 — Inventory *(depends on Phase 1)*
7. Ingredients list screen: name, unit, quantity, low-stock threshold
8. Add/edit ingredient form (modal screen)
9. Supplier management sub-screen: name, phone, notes
10. Restocking log: record stock-in events (quantity, cost, supplier, date)
11. Low-stock alert badge on the Inventory tab icon (using stored threshold vs. quantity)

### Phase 3 — Sales *(parallel with Phase 2 after Phase 1)*
12. Product catalog: menu items with price, category, and optional recipe linkage to ingredients
13. POS-style sale registration: tap products → set quantities → confirm sale → auto-deduct inventoryplan-cafeBomBom
14. Sale saved to DB with line items and staff ID
15. Daily sales history screen with per-sale detail view

### Phase 4 — Accounts *(depends on Phase 1)*
16. Expense log: date, category, amount, description, optional supplier link
17. Employee roster + payroll entry (hourly or monthly rate)
18. Daily cash summary: total sales income vs. total expenses for a given day
19. P&L report screen: date-range picker, income vs. expenses breakdown

### Phase 5 — Dashboard & Polish *(depends on Phases 2–4)*
20. Dashboard home: today's revenue, top-selling items, low-stock alerts count, quick-action buttons
21. Charts for sales trends (using `react-native-gifted-charts` — lightweight, works Android + Web)
22. Optional Supabase sync toggle in Settings (each local row gets a `synced_at` field)

---

**Relevant files**
- `app/(tabs)/_layout.tsx` — expand from 2 to 5 tabs
- `app/(tabs)/index.tsx` — becomes the Dashboard
- `app/(tabs)/sales.tsx` — new
- `app/(tabs)/inventory.tsx` — new
- `app/(tabs)/accounts.tsx` — new
- `app/(tabs)/settings.tsx` — new
- `constants/theme.ts` — extend with restaurant-specific accent colors
- `package.json` — add `zustand`

---

**Data Models** (SQLite tables)

| Table | Key fields |
|---|---|
| `users` | id, name, role, pin_hash |
| `products` | id, name, category_id, price |
| `ingredients` | id, name, unit, quantity, low_stock_threshold, supplier_id |
| `product_ingredients` | product_id, ingredient_id, quantity_used |
| `suppliers` | id, name, phone, notes |
| `sales` | id, created_at, staff_id, total |
| `sale_items` | sale_id, product_id, quantity, unit_price |
| `restock_logs` | ingredient_id, quantity_added, cost, date |
| `expenses` | date, category, amount, description |
| `employees` | id, name, salary_type, rate |
| `payroll_entries` | employee_id, period_start, period_end, amount |

---

**Verification**
1. Each phase can be demoed independently before the next begins
2. After Phase 1: app launches, PIN prompt appears, 5 tabs render with placeholder screens
3. After Phase 2: add an ingredient, set it below threshold → badge appears on Inventory tab
4. After Phase 3: register a sale with 2 items → check ingredient quantities decreased
5. After Phase 4: log an expense → P&L report shows it subtracted from income
6. After Phase 5: dashboard reflects real data from DB

---

**Decisions**
- No external UI component library — reuse existing `ThemedText`/`ThemedView` + platform StyleSheet
- Cloud sync (Supabase) is deferred to Phase 5 and optional — app is fully functional offline
- Staff role is restricted to Sales + Inventory tabs only (no Accounts visibility)
- Product recipes (ingredient deduction on sale) are optional per-product, not required

**Further Considerations**
1. **Chart library**: `react-native-gifted-charts` is recommended for Android+Web; `Victory Native` is heavier but more flexible. Which do you prefer, or defer to later?
2. **Image support for products**: Should products have photos (expo-image-picker) or just names/icons from the icon set?
3. **Multiple locations**: Is this strictly single-restaurant, or might it serve multiple branches of CafeBomBom in the future?
