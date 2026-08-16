# TODO — الإصلاح والتحسين الشامل

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
- [ ] Task 14: مصالحة migrations + db pull
- [ ] Task 15: search_path (55 دالة)
- [ ] Task 16: Realtime publication (product_stock + warehouses)
- [ ] Task 17: dedupe commit_sales_invoice overload
- [ ] Task 18: أرشفة prc_*
- [ ] Task 19: إسقاط fin_*

## Phase E: i18n واللمسات
- [ ] Task 20: تدقيق النصوص + سد فجوات الترجمة
- [ ] Task 21: توحيد husky + حذف ملفات 0-byte
