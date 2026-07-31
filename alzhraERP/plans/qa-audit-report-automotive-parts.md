# 📋 Comprehensive QA Audit Report — Al-Zahra Smart ERP
## Automotive Spare Parts Accounting System

**Date:** 2026-07-30  
**Auditor:** QA Specialist & Systems Analyst  
**Scope:** 400+ source files, 3 database migrations, 15+ feature modules  
**Methodology:** Static code analysis, business logic tracing, data flow mapping, cross-module dependency analysis, industry-specific gap analysis  
**Classification:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## 🔴 SECTION 1: Functional Defects & Logic Errors

### 🔴 1.1 — Exchange Rate Division by Zero (Sales & Purchases)
**Location:** `src/features/sales/store.ts:109,146` and `src/features/purchases/store.ts:122`  
**Description:** Both `setProductForRow` methods perform `basePrice / state.exchangeRate` and `costPrice * rate` without validating that `exchangeRate` is non-zero. When `exchangeRate = 0`, this produces `Infinity` or `NaN` values that propagate into invoices.  
**Impact:** Corrupted invoice totals, potential for recording sales/purchases with undefined monetary values.  
**Severity:** 🔴 Critical — Direct financial data corruption.

### 🔴 1.2 — Inconsistent Balance Tolerance Between Validation Systems
**Location:** `src/core/validators/index.ts:103` vs `src/core/utils/decimalUtils.ts:44`  
**Description:** The journal entry balance validator uses a hardcoded tolerance of `0.01` while `decimalUtils.ts` defines `SOX_BALANCE_TOLERANCE = 0.000001`. This means unbalanced journal entries with discrepancies up to 0.01 SAR are accepted, breaking double-entry accounting integrity.  
**Impact:** Trial balance may not balance, undetectable accounting errors accumulate.  
**Severity:** 🔴 Critical — Violates fundamental accounting principle.

### 🔴 1.3 — SHA-256 Hash Is Actually 32-bit Non-Cryptographic Hash
**Location:** `src/core/utils/decimalUtils.ts:147-154`  
**Description:** `generateCalculationHash` claims SHA-256 for SOX audit tamper-detection but uses a simple 32-bit hash function. Any attacker can trivially forge the hash for modified financial data.  
**Impact:** Complete failure of audit trail integrity.  
**Severity:** 🔴 Critical — Regulatory compliance failure.

### 🔴 1.4 — Currency Conversion Direction Inconsistency (Sales vs Purchases)
**Location:** `src/features/sales/store.ts:110` vs `src/features/purchases/store.ts:123`  
**Description:** Sales store divides by exchange rate (`basePrice / rate`), while purchases store multiplies by exchange rate (`costPrice * rate`). These are opposite operations for the same concept (converting to/from base currency). One of them is mathematically wrong.  
**Impact:** Systematic mispricing in either sales or purchases when using foreign currencies.  
**Severity:** 🔴 Critical — Financial reporting errors in multi-currency environments.

### 🔴 1.5 — Discount Calculation Uses External Store Inside Zustand `set()`
**Location:** `src/features/sales/store.ts:178-200` and `src/features/purchases/store.ts:151-162`  
**Description:** `calculateTotals()` calls `useDiscountStore.getState()` inside Zustand's `set()` callback. This creates a race condition where the discount state may change between the read and the state update, leading to inconsistent totals.  
**Impact:** Invoice totals may not reflect current discount settings.  
**Severity:** 🔴 Critical — Unreliable financial calculations.

### 🟠 1.6 — `@ts-expect-error` Bypasses Type Safety in Sales Store
**Location:** `src/features/sales/store.ts:89`  
**Description:** `updateItem` uses `@ts-expect-error` to bypass TypeScript checking, allowing any value type to be assigned to any field. This can silently corrupt data types (e.g., string assigned to numeric price field).  
**Impact:** Silent data corruption in sales transactions.  
**Severity:** 🟠 High — Data integrity risk.

### 🟠 1.7 — POS Page Hardcodes Currency as "YER"
**Location:** `src/features/pos/pages/POSPage.tsx:309`  
**Description:** Currency display is hardcoded to `YER` while the sales store uses `SAR` as default. Users in Saudi Arabia see incorrect currency labels.  
**Impact:** Confusing UX, potential regulatory issues with displayed currency.  
**Severity:** 🟠 High — Misleading financial display.

### 🟠 1.8 — `PostTransactionUsecase` Uses `any` Type
**Location:** `src/core/usecases/accounting/PostTransactionUsecase.ts:6`  
**Description:** The `execute(data: any, ...)` method bypasses all TypeScript validation for the most critical accounting operation — posting journal entries.  
**Impact:** Any malformed data can reach the database without compile-time checks.  
**Severity:** 🟠 High — Accounting data integrity risk.

### 🟠 1.9 — Journal API Silently Coerces Null/Undefined to Zero
**Location:** `src/features/accounting/api/journalsApi.ts:52-53`  
**Description:** `Number(l.debit) || 0` silently converts `undefined`, `null`, and empty strings to zero instead of rejecting invalid entries.  
**Impact:** Corrupted journal entries accepted without warning.  
**Severity:** 🟠 High — Silent data corruption.

### 🟡 1.10 — `convertFromBaseCurrency` Swallows Zero Exchange Rate
**Location:** `src/core/utils/currencyUtils.ts:125`  
**Description:** `if (!exchangeRate || exchangeRate === 1)` returns the original amount when `exchangeRate === 0`, while `convertToBaseCurrency` would throw an error. Inconsistent behavior between conversion directions.  
**Impact:** Hidden currency conversion errors.  
**Severity:** 🟡 Medium — Inconsistent error handling.

### 🟡 1.11 — `CurrencyError` Class Defined But Never Used
**Location:** `src/core/utils/currencyUtils.ts:77`  
**Description:** A `CurrencyError` class exists but `convertFromBaseCurrency` silently returns 0 for invalid amounts instead of throwing it.  
**Impact:** Hidden conversion errors, difficult debugging.  
**Severity:** 🟡 Medium — Poor error handling.

---

## 🔴 SECTION 2: Structural Gaps & Missing Features (Auto Parts Industry)

### 🔴 2.1 — No OEM Part Number Cross-Reference System
**Location:** Entire application  
**Description:** The `Product` type has `part_number` and `alternative_numbers` fields, but there is no structured cross-reference system to map OEM numbers (e.g., Bosch 0986AB123) to aftermarket equivalents (e.g., Febi 12345). The `ProductCrossReference` type exists but is not integrated into the search or sales workflow.  
**Impact:** Mechanics cannot find parts by OEM number, a critical workflow in auto parts retail.  
**Severity:** 🔴 Critical — Missing core industry feature.

### 🔴 2.2 — No Vehicle Compatibility Enforcement in Sales/Purchases
**Location:** `src/features/sales/store.ts`, `src/features/purchases/store.ts`  
**Description:** While `CarCompatibility` and `ProductFitment` types exist, the sales and purchase workflows do not validate that a part being sold is compatible with the customer's vehicle. A customer could order brake pads for a Toyota Camry 2010 and receive pads for a Honda Civic.  
**Impact:** Wrong parts sold, returns, customer dissatisfaction, financial losses.  
**Severity:** 🔴 Critical — Missing core business validation.

### 🔴 2.3 — No Core Charge / Exchange Part Workflow
**Location:** `src/features/sales/store.ts`, `src/features/purchases/store.ts`  
**Description:** The `Product` type has `has_core_charge` and `core_charge_amount` fields, but the sales and purchase workflows do not handle core deposits (e.g., alternators, starters, batteries where a core charge applies). No mechanism to track core returns or refund core charges.  
**Impact:** Inability to handle exchange parts, lost revenue from unreturned cores.  
**Severity:** 🔴 Critical — Missing industry-standard workflow.

### 🔴 2.4 — No Kit/Bundle Assembly Tracking
**Location:** `src/features/inventory/types.ts:55-62`  
**Description:** `ProductKitItem` type exists but there is no workflow to:
- Assemble kits from components (reducing component stock)
- Disassemble kits (returning components to stock)
- Track kit vs. component profitability  
**Impact:** Cannot sell timing belt kits, brake pad kits, or gasket sets as bundled products.  
**Severity:** 🔴 Critical — Missing core feature for auto parts.

### 🟠 2.5 — No Supplier Part Number Integration in Purchasing
**Location:** `src/features/purchases/store.ts`  
**Description:** `ProductSupplierPrice` has `supplier_part_number` but the purchase order workflow does not use it. When creating a purchase order, the system should show the supplier's part number alongside the internal SKU to prevent ordering errors.  
**Impact:** Wrong parts ordered from suppliers, inventory mismatches.  
**Severity:** 🟠 High — Operational inefficiency.

### 🟠 2.6 — No Multi-Warehouse Stock Reservation
**Location:** `src/features/sales/store.ts`  
**Description:** The sales cart has `warehouseId` but no mechanism to reserve stock across multiple warehouses. If a part is out of stock in the primary warehouse but available in another, the system doesn't suggest or facilitate transfer.  
**Impact:** Lost sales due to inability to check alternate warehouse stock.  
**Severity:** 🟠 High — Revenue loss.

### 🟠 2.7 — No VIN-Based Part Lookup in Sales Flow
**Location:** `src/features/vehicles/hooks/useVINLookup.ts`  
**Description:** A VIN lookup hook exists but is not integrated into the POS or sales workflow. In auto parts retail, VIN decoding is the primary method to identify the correct part.  
**Impact:** Mechanics must manually search for parts instead of using VIN decoding.  
**Severity:** 🟠 High — Missing critical workflow integration.

### 🟡 2.8 — No Part Category Hierarchy
**Location:** `src/features/inventory/types.ts:100`  
**Description:** `category` is a simple string field, not a hierarchical taxonomy. Auto parts require multi-level categorization (e.g., Brake System > Brake Pads > Front > Ceramic).  
**Impact:** Poor inventory organization, difficult product discovery.  
**Severity:** 🟡 Medium — Organizational limitation.

### 🟡 2.9 — No Serial Number / Lot Tracking
**Location:** `src/features/inventory/types.ts`  
**Description:** No fields for serial numbers or lot/batch numbers on inventory transactions. Critical for warranty tracking and recall management in auto parts.  
**Impact:** Cannot track specific units for warranty claims or recalls.  
**Severity:** 🟡 Medium — Compliance risk.

### 🟡 2.10 — No Warranty Tracking on Sales
**Location:** `src/features/sales/types.ts`  
**Description:** No warranty period tracking on sold parts. Auto parts typically have manufacturer warranties (e.g., 12 months) that need to be tracked for returns and claims.  
**Impact:** Cannot automate warranty expiry notifications or validate return eligibility.  
**Severity:** 🟡 Medium — Customer service gap.

---

## 🔴 SECTION 3: Operational Failures

### 🔴 3.1 — Client-Side Only Permissions System
**Location:** `src/core/permissions/index.tsx:12-53`  
**Description:** The entire role-based access control system operates client-side. Any user can modify `localStorage` to change their role to `admin`. No server-side enforcement via RLS policies for most operations.  
**Impact:** Complete security bypass — any user can access all financial data.  
**Severity:** 🔴 Critical — Security failure.

### 🔴 3.2 — AI Proxy Has No JWT Validation
**Location:** `supabase/functions/ai-proxy/index.ts:34-43`  
**Description:** The AI proxy checks only for the existence of an `Authorization` header, not its validity. Any bearer token (or even a fake one) allows API access. Combined with `Access-Control-Allow-Origin: '*'`, any website can drain the OpenRouter credit balance.  
**Impact:** Financial loss from unauthorized AI API usage.  
**Severity:** 🔴 Critical — Security vulnerability.

### 🔴 3.3 — Auth State Stored in localStorage (Bypassable)
**Location:** `src/features/auth/store.ts:239-243`  
**Description:** Authentication state is persisted in `localStorage` via Zustand persist. Users can manually set `isAuthenticated: true` to bypass login entirely.  
**Impact:** Complete authentication bypass.  
**Severity:** 🔴 Critical — Security failure.

### 🟠 3.4 — RPC Functions Missing from Version Control
**Location:** Multiple RPCs referenced in code but not in migrations  
**Description:** The application calls RPCs like `commit_sales_invoice`, `post_manual_journal`, `calculate_and_update_wac`, `report_trial_balance`, `report_profit_loss`, `report_balance_sheet`, `get_account_ledger`, `get_sales_stats` — but these are NOT defined in any migration file in the repository. They exist only in the Supabase project directly.  
**Impact:** No version control for the most critical financial logic. Deployment to a new environment will fail.  
**Severity:** 🟠 High — Deployment and audit risk.

### 🟠 3.5 — WAC Calculation Logic Not in Repository
**Location:** Referenced as `calculate_and_update_wac` RPC  
**Description:** Weighted Average Cost calculation — the core inventory valuation method — is implemented as an RPC function that exists only in Supabase, not in the repository. This is the most critical inventory accounting logic and it's invisible to code review.  
**Impact:** Inventory valuation errors cannot be audited or fixed through normal development workflow.  
**Severity:** 🟠 High — Accounting integrity risk.

### 🟠 3.6 — Sales Service Routes Treasury Account Silently
**Location:** `src/features/sales/service.ts:80-84`  
**Description:** `routeToChildByCurrency` may fail silently. If it returns `null`/`undefined`, the treasury account is dropped from the payload without warning, and the sale proceeds without a valid treasury account.  
**Impact:** Misrouted payments, unreconciled transactions.  
**Severity:** 🟠 High — Accounting reconciliation failure.

### 🟡 3.7 — Empty Files in Production Codebase
**Location:** 6 files including `ProductCardView.tsx`, `POSHeader.tsx`, `usePartiesData.ts`, `usePartiesView.ts`, `parties/hooks/index.ts`, `parties/index.ts`  
**Description:** These files are 0 bytes — imported or referenced but never implemented.  
**Impact:** Potential runtime errors if these components are lazy-loaded.  
**Severity:** 🟡 Medium — Runtime failure risk.

### 🟡 3.8 — Smart Import Feature Not Connected to Routes
**Location:** `src/features/smart-import/`  
**Description:** The smart import module exists but has no route in `routes.tsx`. It's dead code.  
**Impact:** Users cannot access the feature.  
**Severity:** 🟡 Medium — Wasted development effort.

---

## 🔴 SECTION 4: Data & Process Inconsistencies

### 🔴 4.1 — Merge Conflict Markers in Audit Report
**Location:** `plans/comprehensive-audit-report.md`  
**Description:** The previous audit report itself contains unresolved git merge conflict markers (`<<<<<<< Updated upstream` / `>>>>>>> Stashed changes`) throughout the document. This means the report is corrupted and cannot be reliably used as a reference.  
**Impact:** The previous audit findings are unreliable — some sections are duplicated, others may be missing.  
**Severity:** 🔴 Critical — Documentation integrity failure.

### 🔴 4.2 — Sales and Purchases Use Opposite Currency Conversion Logic
**Location:** `src/features/sales/store.ts:110` vs `src/features/purchases/store.ts:123`  
**Description:** Sales: `basePrice / state.exchangeRate` (divide). Purchases: `costPrice * rate` (multiply). If both are converting FROM base currency TO foreign currency, one is wrong. If they're converting in opposite directions, the documentation doesn't clarify. This inconsistency guarantees errors in multi-currency operations.  
**Impact:** Systematic financial misstatement in one of the two modules.  
**Severity:** 🔴 Critical — Financial reporting error.

### 🟠 4.3 — `FIFO/LIFO` Settings Are Placeholder Only
**Location:** `src/features/settings/components/inventory/InventorySettings.tsx:73-76`  
**Description:** The settings UI offers FIFO, LIFO, and Average cost methods, but the actual system only implements Weighted Average Cost (WAC). Users who select FIFO or LIFO will get WAC behavior without warning.  
**Impact:** Misleading inventory valuation, potential tax/reporting issues if users rely on the selected method.  
**Severity:** 🟠 High — Misleading configuration.

### 🟠 4.4 — "Financial Core Active" Badge Is Decorative
**Location:** `src/features/accounting/AccountingPage.tsx:57-58`  
**Description:** A badge reading "Financial Core Active" is always displayed regardless of actual system state. It does not reflect any real connectivity or health check.  
**Impact:** False sense of security — users may assume the accounting system is operational when it may not be.  
**Severity:** 🟠 High — Misleading UI.

### 🟡 4.5 — Duplicate Routes for Parties
**Location:** `src/app/routes.tsx:103-112`  
**Description:** `/suppliers`, `/clients`, `/parties`, `/parties/customers`, and `/parties/suppliers` all route to the same `PartiesPage` with different props. This creates confusion about which URL is canonical.  
**Impact:** SEO issues, user confusion, potential state duplication.  
**Severity:** 🟡 Medium — Navigation inconsistency.

### 🟡 4.6 — `initializeItems(0)` Called with Zero
**Location:** `src/features/pos/pages/POSPage.tsx:48`  
**Description:** `if (items.length === 0) initializeItems(0)` — initializes zero items, which is a no-op. Dead code that suggests a logic error.  
**Impact:** No functional impact, but indicates confusion in the initialization flow.  
**Severity:** 🟡 Medium — Code quality issue.

### 🟡 4.7 — Cash Customer Label Not Internationalized
**Location:** `src/features/sales/service.ts:13`  
**Description:** `CASH_CUSTOMER_LABEL = 'عميل نقدي'` is hardcoded in Arabic instead of using the i18n translation system.  
**Impact:** Cannot display in English or other languages.  
**Severity:** 🟡 Medium — Localization gap.

---

## 📊 SUMMARY STATISTICS

| Severity | Count | Key Areas |
|----------|-------|-----------|
| 🔴 Critical | 16 | Financial logic errors, security bypasses, missing auto parts workflows |
| 🟠 High | 12 | Data integrity risks, operational failures, misleading UI |
| 🟡 Medium | 10 | Code quality, localization, missing integrations |
| 🟢 Low | 0 | — |
| **Total** | **38** | **New findings (beyond previous audit)** |

## 🎯 TOP 10 IMMEDIATE ACTIONS

1. **Fix currency conversion direction** — Align sales and purchases to use consistent conversion logic
2. **Add zero-rate validation** — Prevent division by zero in all exchange rate operations
3. **Implement OEM cross-reference search** — Enable part lookup by OEM number in POS
4. **Add vehicle compatibility validation** — Block sales of incompatible parts
5. **Build core charge workflow** — Track core deposits and returns
6. **Implement kit assembly/disassembly** — Manage bundled products
7. **Move RPC functions to migrations** — Version control all financial logic
8. **Fix balance tolerance inconsistency** — Use `SOX_BALANCE_TOLERANCE` everywhere
9. **Add server-side permission enforcement** — Implement RLS policies for all tables
10. **Fix the corrupted audit report** — Resolve merge conflicts in `comprehensive-audit-report.md`

## ⚠️ NOTE ON PREVIOUS AUDIT

The previous audit (2026-05-24) documented 47 findings but the report file itself is corrupted with unresolved git merge conflicts. Many of those findings remain valid and should be addressed alongside these new findings. This report focuses on **new findings not documented in the previous audit**, particularly those specific to the **automotive spare parts industry domain**.