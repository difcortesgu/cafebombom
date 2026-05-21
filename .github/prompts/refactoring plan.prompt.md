## Plan: Next Refactor Targets for CafeBomBom

Recommended direction: do quick, low-risk deduplication first, then backend consistency foundations, then larger UI/state decomposition.

**Highest-value refactors next**
1. Extract shared payment method selector UI from:
[frontend/components/expense-panel.tsx](frontend/components/expense-panel.tsx),
[frontend/components/payroll-panel.tsx](frontend/components/payroll-panel.tsx),
[frontend/components/restock-panel.tsx](frontend/components/restock-panel.tsx)
using patterns from [frontend/components/payment-method-display.tsx](frontend/components/payment-method-display.tsx).  
Effort: Small. Impact: High.

2. Centralize surcharge calculations used across order/sale flows, starting from:
[frontend/components/order-panel.tsx](frontend/components/order-panel.tsx).  
Effort: Small. Impact: Medium-high.

3. Extract shared normalization utilities from backend services:
[backend/src/services/sales.ts](backend/src/services/sales.ts),
[backend/src/services/products.ts](backend/src/services/products.ts),
[backend/src/services/inventory.ts](backend/src/services/inventory.ts).  
Effort: Small. Impact: High.

4. Standardize backend error handling and status mapping by refactoring:
[backend/src/controllers/sales.ts](backend/src/controllers/sales.ts),
[backend/src/controllers/products.ts](backend/src/controllers/products.ts),
[backend/src/controllers/inventory.ts](backend/src/controllers/inventory.ts),
[backend/src/controllers/accounts.ts](backend/src/controllers/accounts.ts),
and aligning with [backend/src/services/messages.ts](backend/src/services/messages.ts).  
Effort: Medium. Impact: Very high.

5. Move request validation out of controllers into DTO/validator layer for same controller set above.  
Effort: Medium-large. Impact: Very high.

6. Decompose tab layout mixed responsibilities in:
[frontend/app/(tabs)/_layout.tsx](frontend/app/(tabs)/_layout.tsx)
(auth hydration, role routing, sidebar state).  
Effort: Medium. Impact: Very high.

7. Reduce redundant multi-store hydration cascades in:
[frontend/stores/products.ts](frontend/stores/products.ts),
[frontend/stores/sales.ts](frontend/stores/sales.ts),
[frontend/stores/inventory.ts](frontend/stores/inventory.ts),
[frontend/stores/accounts.ts](frontend/stores/accounts.ts).  
Effort: Medium. Impact: High.

8. Split oversized UI orchestrators:
[frontend/components/order-panel.tsx](frontend/components/order-panel.tsx),
[frontend/components/setup-screen.tsx](frontend/components/setup-screen.tsx).  
Effort: Medium-large. Impact: Very high.

9. Remove unsafe icon casting and tighten type boundaries from:
[frontend/components/restock-panel.tsx](frontend/components/restock-panel.tsx)
and related payment method types.  
Effort: Small. Impact: Medium.

10. Introduce backend service factory/DI after validation/error layers are stable:
[backend/src/controllers/sales.ts](backend/src/controllers/sales.ts),
[backend/src/controllers/products.ts](backend/src/controllers/products.ts),
[backend/src/controllers/inventory.ts](backend/src/controllers/inventory.ts),
[backend/src/controllers/accounts.ts](backend/src/controllers/accounts.ts).  
Effort: Large. Impact: High.

**Execution order**
1. Quick wins: 1, 2, 3, 9 (parallelizable).
2. Backend consistency: 4 then 5.
3. Frontend architecture: 6 and 7.
4. Large decompositions: 8 and 10.

If you want, I can refine this into a sprint-sized refactor backlog (for example, 1-week or 2-week slices) with explicit acceptance criteria per item.
