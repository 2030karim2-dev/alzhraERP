# TODO — الإصلاح والتحسين الشامل

## Checkpoint (2026-08-18) — المرحلة ج (جولة 2): تحصين دوال SECURITY DEFINER ✅
- [x] **إلغاء صلاحية `anon`/`PUBLIC` من 180 دالة SECURITY DEFINER إضافية** (من أصل 192 متبقية) — تضم: api_v1_fin_post_journal_entry, api_v1_prc_* (مشتريات)، bulk_adjust_stock/bulk_update_product_prices, fn_reverse_journal_entries, جميع دوال الـ triggers (prevent_*, trg_*, log_*)، دوال البحث والتقارير.
- [x] **الإبقاء على 12 دالة anon-executable عمداً** (مرجعية في سياسات RLS/views/مستدعين غير SD): has_permission, get_user_role, is_super_admin, is_valid_branch, get_user_company_id, user_can_manage_debts, user_is_admin_or_manager, api_v1_sys_publish_event, get_auth_companies, get_next_journal_entry_number, generate_invoice_number, generate_payment_number.
- [x] **المنح**: REVOKE PUBLIC + REVOKE anon + GRANT authenticated (service_role يحتفظ بمنحه الصريح).
- [x] **التحقق المباشر**: anon-executable انخفض من 192 إلى **12**، authenticated يحتفظ بـ **233**. Migration: `20260818000007_revoke_anon_execute_remaining.sql` (557 سطراً).

## Checkpoint (2026-08-18) — المرحلة ج (جولة 1): الأمان والخلفية (Supabase مباشر) ✅
- [x] **إلغاء صلاحية EXECUTE عن `anon`/`PUBLIC`** من **15 دالة مالية SECURITY DEFINER** (commit_purchase_invoice, commit_sales_invoice_v2, commit_payment, post_manual_journal, void_expense, void_bond, create_financial_bond, process_sales_return, process_stock_transfer, recalculate_* …) وإعادة المنح حصرياً لـ `authenticated`. تم التطبيق والتحقق مباشرة: anon = 0، authenticated = 15. Migration: `20260818000005_revoke_anon_execute.sql`.
- [x] **إضافة `p_due_date` إلى `commit_purchase_invoice`** + حفظه في `invoices.due_date` (كان يُفقد صامتاً). إسقاط التحميل القديم 12-معامل + تحصين صلاحيات التحميل الجديد. تم التطبيق والتحقق (التوقيع 13 معامل، anon=false, authenticated=true, الرسائل العربية سليمة). Migration: `20260818000006_add_purchase_due_date.sql`.
- [x] **إصلاح عدم تطابق الخصم**: `commit_purchase_invoice` يقرأ `discount_amount` بينما `commit_purchase_return` يقرأ `discount` — الواجهة ترسل **كلا المفتاحين** الآن.
- [x] ربط `p_due_date` في `purchases/api.ts` (buildPurchaseParams) + تحديث `database.types.ts`.
- [x] فحوصات مباشرة للقاعدة: جميع دوال RPC الأساسية موجودة (73/73 سابقاً)، `commit_sales_invoice_v2` يدعم due_date، لا اعتماديات على الدالة المحدّثة.

## Checkpoint (2026-08-18) — المرحلة د (جولة 1): استبدال console.* بـ logger ✅
- [x] تحويل **83 استدعاء `console.*` في 54 ملفاً** إلى `logger` الموحّد (error/warn/info/debug) عبر سكربت تحويل مؤقت + مراجعة يدوية للحالات الخاصة (`PurchaseDetailsModal`).
- [x] لم يتبقَّ أي `console.*` في كود التطبيق؛ الباقي (42 سطراً في 8 ملفات) مستثنى عمداً: `logger.ts` (التنفيذ)، `index.tsx` (إخفاء أخطاء الإنتاج)، `errorUtils.ts`، `featureFlags.ts` (dev-only)، `supabaseClient.ts` (رسالة الإعداد)، `scripts/*` (أدوات CLI).
- [x] التحقق: `tsc --noEmit` = 0 خطأ.

## Checkpoint (2026-08-18) — المرحلة ب: توحيد البنية وتنظيف الكود الميت ✅
- [x] توحيد المزامنة دون اتصال: `useCreateInvoice` انتقل من `offlineQueueStore` (النظام القديم) إلى `syncStore` الموحد بمفتاح `['sales', 'create']`؛ `offlineQueueStore` + `OfflineManager` يبقيان فقط كتصريف (drain) للطابور القديم حتى يفرغ.
- [x] `useSyncQueue`: إضافة سقف أقصى `MAX_SYNC_RETRIES = 5` (إسقاط الطفرات الفاشلة دائماً مع log حرج) + إصلاح `break` الذي كان يعطّل بقية الطابور نهائياً عند أول فشل دائم (أصبح `continue`).
- [x] حذف 9 ملفات كود ميت مؤكدة: `LoginPage.tsx`, `RegisterPage.tsx`, `localDB.ts`, `ImportProductsModal.tsx`, `WarehouseManager.tsx` (القديم), مجلد `settings/components/warehouses/` بالكامل (WarehouseManager + WarehouseModal) — التطبيق يستخدم نظام المخازن داخل ميزة `inventory`.
- [x] حذف ثابت `ROUTES.DASHBOARD.AI` غير المستخدم + تنظيف برميل `auth/index.ts`.
- [x] حل تعارضات الدمج في `plans/comprehensive-audit-report.md` (5 مناطق تعارض → 0، بإزالة 147 سطراً مكرراً).
- [x] التحقق: `tsc --noEmit` = 0 خطأ، Vitest كامل أخضر.

## Checkpoint (2026-08-18) — المرحلة أ: احتواء الخطر المالي ✅
- [x] إزالة أزرار الصيانة المدمرة («حذف التكرار»، «تصحيح القيود») من `PurchasesPage.tsx` وحذف `purchaseFixes.ts` كلياً (كانت كتابات/حذوفات مالية غير ذرية من المتصفح). أُبقي زر «فحص النظام» (قراءة فقط).
- [x] تحصين `importSystemData`: owner-only عبر `assertOwner` + تحقق `company_id` لكل الصفوف قبل أي كتابة + فشل صوتي عالٍ + استبعاد `supported_currencies` (جدول مرجعي عام).
- [x] إصلاح `offlineQueueStore.syncQueue`: الأنواع غير المعالجة تبقى في الطابور مع خطأ بدلاً من حذفها صامتاً.
- [x] توحيد `convertCurrency` مع `convertToBaseCurrency`/`convertFromBaseCurrency` (كانت معكوسة لعملات divide) + تمرير `exchangeOperator` من sales store.
- [x] `toBaseCurrency` ترمي `CurrencyError` بدلاً من إرجاع المبلغ الخام صامتاً؛ حُسّنت الحماية في قوائم المبيعات/المشتريات/المصروفات والمرتجعات.
- [x] منع حفظ سعر صرف ≤ 0 في `useCurrencyManager` و`setRate` mutation.
- [x] إزالة المسار الاحتياطي الخطير في `deleteExpenseRecord` (كان يسوي المصروف دون عكس القيد المحاسبي).
- [x] توسيع `TABLE_PRESET_MAP` في Realtime ليشمل `journal_entry_lines`, `accounts`, `inventory_transactions`, `stock_transfers`, `audit_*`, `exchange_rates`, `branches`, `fiscal_years`, `supported_currencies`.
- [x] استبدال `console.*` بـ `logger` في auth/hooks + settings/service.
- [x] التحقق: `tsc --noEmit` = 0 خطأ، Vitest = 321/321 ناجحة.

## Phase 0: البوابات والمكاسب السريعة
- [x] Task 1: إصلاح 3 اختبارات فاشلة (localStorage mock + StockMovementUsecase RPC stale) — ✅ 224/224
- [x] Task 2: كنس TS6133 (83 خطأً) — ✅ baseline 275 → 191
- [x] Task 3: إصلاح CI (encoding + ratchet بدل tsc الحاجب) — ci.yml + quality-gate.yml

### Checkpoint 0
- [x] 224/224 + CI أخضر-واقعي + baseline 191 (≤ 192)

## Phase C1: الأمان والصلاحيات
- [x] Task 4: استبدال AuthorizeActionUsecase بـ usePermission (6 مواقع) — ✅ لا وجود لأي استيراد للصلاحيات القديمة؛ `assertPermission`/`usePermission` مستخدمان في accounting/bonds
- [x] Task 5: القائمة الجانبية server-driven — ✅ `MenuItem.requiredPermission` + `useAllPermissions()` (get_user_permissions RPC) مع owner-bypass مطابق لـ assertPermission
- [x] Task 6: حذف المنظومة القديمة (ADR-003 Phase 3) — ✅ حُذف `core/permissions/index.tsx`؛ بقي فقط `offlineRolePermissions.ts` كـ fallback دون اتصال

### Checkpoint C1
- [x] صفر استيرادات للصلاحيات القديمة + `tsc --noEmit` = 0 خطأ

## Phase C2: تصفية أخطاء TypeScript
- [x] Task 7: useReturnsReport.ts (15)
- [x] Task 8: عنقود Dashboard (~28)
- [x] Task 9: عنقود APIs المالية (~23)
- [x] Task 10: عنقود Inventory/POS (~25)
- [x] Task 11: الذيل المتبقي → baseline 0 — ✅ `tsc --noEmit` = 0 والخط الأساسي مثبت في الملف (166 → 0)
- [x] Task 12: تقليص any (موجة أولى) → <700 — ✅ **اكتمل (2026-08-16):** الموجة الأولى (api/services) 76→0، ثم AI/hooks/pages؛ الإجمالي 877 → **698**

## Phase C3: الذكاء الاصطناعي
- [ ] Task 13: smart-import — ربط/إزالة (قرار المستخدم)

## Phase D: Backend (تسلسلي)
- [ ] Task 14: مصالحة migrations + db pull — ⏳ اكتُشف: الخادم 647 نسخة مقابل 35 محلية (لا تتطابق أرقام النسخ)؛ أُصلح تكرار `20260814000001` → `00007`. يتطلب قرار استراتيجي (db pull snapshot)
- [x] Task 15: search_path (55 دالة) — ✅ **منجز (2026-08-16):** `20260816000001_harden_search_path.sql` طُبق + سُجلت النسخة؛ التحقق: 0 متبقية. (القيمة `'public'` لأن الأجسام تستخدم مراجع غير مؤهلة؛ التحصين الكامل `''` مشروع متابعة)
- [x] Task 16: Realtime publication — ✅ **منجز:** `20260816000002_realtime_publication.sql` أضاف 15 جدولاً → التغطية 8 → **23 جدولاً** (product_stock/warehouses/commission/debt/audit)
- [x] Task 17: dedupe commit_sales_invoice overload — ✅ **منجز:** `20260816000003_drop_legacy_overloads.sql` حذف 7 overloads قديمة (commit_sales_invoice×2، finalize 4-arg، get_dashboard_summary 4-arg، get_expense_stats 4-arg، get_monthly_performance p_month، get_sales_stats 3-arg) بعد التحقق من المستدعين
- [x] Task 18: أرشفة prc_* — ✅ **قديمة (N/A):** الخادم الحي لا يحتوي أي جدول `prc_*`
- [x] Task 19: إسقاط fin_* — ✅ **قديمة (N/A):** الخادم الحي لا يحتوي أي جدول `fin_*`
- ✅ **إصلاح خطأ إنتاجي حرج (2026-08-16):** `commit_purchase_invoice` كان يفشل دائماً بـ 400 — التشخيص: `fn_auto_post_invoice_journal` يُدرج القيد `posted` ثم السطور (مخالفة `prevent_posted_journal_line_modification`). أُصلح: `draft→lines→posted` + `v_net` من `total-tax`. **مُتحقق**: شراء/بيع بقيد `posted` متوازن (`balance_diff=0`).
- ✅ **إصلاح `commit_sales_invoice_v2` (12 خطأ schema/تشغيل):** أُضيف `invoices.idempotency_key` (00005)، وأُصلحت المراجع الخاطئة (is_default, invoice_date, total_tax, payment_type, tax_rate, notes/performed_by, parties.balance, `v_item jsonb→record`, COALESCE الضريبة, `'sale'→'sales'`) — migration `00006`.
- ✅ **إصلاح انهيار واجهة المشتريات بعد نجاح RPC (2026-08-16):** ظهر `TypeError: Cannot read properties of undefined (reading 'invoice_number')` في `PurchasesPage` بعد أول إنشاء ناجح لفواتير شراء — السبب: `PurchaseDetailsModal.tsx` يحوّل `useQuery.data` بـ `as … | null` بينما قيمتها `undefined` أثناء أول تحميل، والحُراسة `invoice !== null` تُمرّر `undefined` (لأن `undefined !== null`). أُصلح بـ `(data ?? null)`. (نفس نمط الحماية مؤكد سليم في `InvoiceDetailsModal` المبيعات)

## Phase E: i18n واللمسات
- [ ] Task 20: تدقيق النصوص + سد فجوات الترجمة
- [ ] Task 21: توحيد husky + حذف ملفات 0-byte
