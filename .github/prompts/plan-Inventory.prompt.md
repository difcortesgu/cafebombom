## Plan: Recursive Product BOM + Real-Time Inventory Deduction

Implement recursive bill-of-materials support so products consume both direct ingredients and nested processed ingredients, and keep inventory updated immediately when sales are registered on both native SQLite and web storage. This plan includes backend/service changes plus a basic owner-facing management UI in tabs.

**Steps**

1. Phase 1 - Data model and migration foundation.
2. Add a new composition table to schema for ingredient-to-ingredient dependencies (processed ingredient -> child ingredient with quantity needed), while keeping existing product_ingredients for product -> ingredient links.
3. Generate and review a new Drizzle migration, then ensure Expo runtime migration bundle references the new SQL migration file and updated journal metadata so native app startup migration still works.
4. Extend web storage model to persist processed ingredient composition records and IDs.
5. Phase 2 - Shared deduction algorithm and service wiring.
6. Add a shared recipe resolver utility in services layer that expands a sale item into final ingredient consumptions by recursively traversing product_ingredients and processed ingredient composition edges.
7. Include cycle detection and safe-guards for broken references to avoid infinite recursion and hard crashes; unresolved paths should fail gracefully with logging.
8. Apply the resolver in SQLite sales transaction so each sale item inserts sale_items and then deducts all resolved leaf ingredients with clamp-at-zero behavior (current policy).
9. Mirror the same resolver logic in web sales service so web inventory updates exactly like SQLite after each sale.
10. Keep inventory deduction immediate in sale creation path; no background job or delayed reconciliation in this phase.
11. Phase 3 - Product and composition management capabilities.
12. Add product management service contract (list/create/update/archive and recipe composition management) and implement both SQLite and web service backends.
13. Add a products store for hydration and CRUD actions, similar to existing sales/inventory store patterns.
14. Build a basic owner-only Products tab screen with two sections: product CRUD and recipe/composition editor.
15. Recipe editor behavior: assign direct ingredient quantities to products, and for any ingredient mark/add nested child ingredients with quantities to represent processed ingredients.
16. Keep UI intentionally basic for this phase (forms + lists), but sufficient to maintain product recipes and processed ingredient compositions without touching raw DB.
17. Phase 4 - Integration and consistency hardening.
18. Wire new products service exports in both platform service index files.
19. Add Products tab routing and owner visibility rules in tabs layout.
20. Ensure inventory and sales views rehydrate after recipe/product changes and after sale registration so counts reflect latest deductions.
21. Add validation rules at service/UI boundary: positive quantities, unique recipe pairs, and preventing self-reference in processed ingredient links.
22. Phase 5 - Verification and rollout checks.
23. Run lint and type checks, then manually verify native and web flows for: direct recipe deduction, recursive processed ingredient deduction, and clamp-at-zero behavior on insufficient stock.
24. Validate migration from fresh DB and existing DB paths, plus web localStorage upgrade path for newly added composition data arrays.

**Relevant files**
- /home/farid/Code/CafeBomBom/database/schema.ts - add processed ingredient composition table and indexes/constraints.
- /home/farid/Code/CafeBomBom/database/migrations - generated SQL + meta updates for new schema.
- /home/farid/Code/CafeBomBom/database/migrations/migrations.js - include new migration import in runtime migration bundle.
- /home/farid/Code/CafeBomBom/services/sqlite/sales.ts - integrate recursive consumption resolution into createSale transaction deduction.
- /home/farid/Code/CafeBomBom/services/web/sales.ts - add same deduction behavior for web platform.
- /home/farid/Code/CafeBomBom/services/web/storage.ts - add processed composition records and IDs persistence.
- /home/farid/Code/CafeBomBom/services/index.ts - export and wire products/composition-capable SQLite service.
- /home/farid/Code/CafeBomBom/services/index.web.ts - export and wire web products/composition-capable service.
- /home/farid/Code/CafeBomBom/services/interfaces/sales.ts - if needed, add sale precheck/diagnostic types for recursive deductions.
- /home/farid/Code/CafeBomBom/stores/sales.ts - ensure post-sale hydration keeps UI synchronized with new deductions.
- /home/farid/Code/CafeBomBom/stores/inventory.ts - ensure hydration update path remains correct after sale deductions.
- /home/farid/Code/CafeBomBom/app/(tabs)/_layout.tsx - add Products tab route and owner visibility.
- /home/farid/Code/CafeBomBom/app/(tabs)/sales.tsx - keep submission flow aligned, optionally surface warnings/errors if resolver fails.
- /home/farid/Code/CafeBomBom/app/(tabs)/inventory.tsx - optional: quick visibility for processed ingredients and adjusted stock signals.

**Verification**
1. Run npm run db:generate and confirm new migration files plus migration metadata are created as expected.
2. Run npm run lint and resolve any TypeScript/ESLint issues.
3. Native manual test: create ingredient tree (A -> B -> C), map product to A, sell quantity 2, verify C stock decreases by multiplied amount and A/B stock behavior matches chosen design.
4. Web manual test: repeat same tree and sale flow; verify localStorage inventory changes mirror native behavior.
5. Insufficient stock test: set low quantity, sell beyond available amount, confirm stock clamps at 0 and sale still succeeds.
6. Regression test: direct (non-processed) product recipes continue to deduct correctly.
7. UI test: owner can create/update/archive products and edit recipe/composition links without app crash or stale state.

**Decisions**
- Include backend/service + basic in-app management UI in this phase.
- Keep stock policy as sale allowed with clamp-to-zero inventory deduction.
- Processed ingredients use recursive ingredient-to-ingredient BOM model.
- Quantity semantics are proportional deduction only; no batch yield/waste modeling in this phase.

**Further Considerations**
1. Processed ingredient stock semantics recommendation: treat processed ingredients as virtual nodes for deduction only in this phase (consume only leaf/raw ingredients) to avoid double-decrement complexity.
2. Performance recommendation: memoize composition expansion per product within a sale transaction/update call to avoid repeated graph traversal for repeated cart items.
3. Future phase candidate: optional pre-sale availability preview (insufficient ingredient warning) without blocking sale, matching current business policy.
