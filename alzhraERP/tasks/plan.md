# Implementation Plan: الإصلاح والتحسين الشامل — Al-Zahra Smart ERP

## Overview
معالجة منهجية للدين التقني الموروث عبر 5 مراحل مرتبة حسب مخطط التبعية:
البوابات أولًا، ثم الأمان (الصلاحيات)، ثم تصفية أخطاء TypeScript، ثم قرار AI، ثم Backend.
آلية الـ ratchet (`scripts/check-ts-baseline.ts`) هي الضمان المانع للارتداد —
كل مهمة تخفض `scripts/ts-error-baseline.txt` في نفس الـ commit.

## خط الأساس المقاس (2026-08-12)
| المقياس | القيمة |
|---|---|
| أخطاء TS | 275 (منها 83 TS6133 — متغيرات غير مستخدمة) |
| `any` | 833 |
| اختبارات فاشلة | 3 / 224 (`ai/config.test.ts` ×2 + `StockMovementUsecase`) |
| صلاحيات client-side | ~6 مواقع `AuthorizeActionUsecase` + `isOwner` في القائمة |
| CI | أحمر دائمًا (`tsc --noEmit` حاجب مع 275 خطأً) |

## Architecture Decisions
- **Ratchet لا حظر مطلق:** الدين الموروث لا يمنع الشحن؛ الزيادة فقط تُمنع. عند الوصول لصفر يعود الحظر الكامل.
- **الصلاحيات server-side فقط:** ADR-003 — لا قرار صلاحيات في العميل (ثغرة QA-2026-003).
- **migrations تتسلسل ولا تتوازى:** تبدأ بمصالحة `db pull` كأساس لكل تغيير لاحق.
- **لا `any` جديد:** قاعدة دائمة تُفرض عبر lint على الملفات المعدلة.

## Task List

### Phase 0: البوابات والمكاسب السريعة
- [ ] Task 1: إصلاح 3 اختبارات فاشلة (ai/config ×2 + StockMovementUsecase) — S
- [ ] Task 2: كنس TS6133 (83 خطأً) — baseline: 275 → ~192 — L ملفات / S مخاطرة
- [ ] Task 3: إصلاح CI (encoding + ratchet بدل tsc الحاجب) — S

### Checkpoint 0
- [ ] 224/224 اختبار أخضر + CI يعكس الواقع + baseline ≤ 192

### Phase C1: الأمان وإزالة الصلاحيات القديمة
- [ ] Task 4: استبدال AuthorizeActionUsecase بـ usePermission في 6 مواقع — M
- [ ] Task 5: القائمة الجانبية server-driven (إزالة isOwner client-side) — S
- [ ] Task 6: حذف المنظومة القديمة نهائيًا (ADR-003 Phase 3) — S

### Checkpoint C1
- [ ] صفر استيرادات AuthorizeActionUsecase + المجموعة خضراء

### Phase C2: تصفية أخطاء TypeScript
- [ ] Task 7: useReturnsReport.ts (15) — مواءمة SalesReturn مع database.types — M
- [ ] Task 8: عنقود Dashboard (~28: hooks 9 + api 7 + FinancialHealthScore 7 + StatsGrid 5) — M
- [ ] Task 9: عنقود APIs المالية (~23: sales/api 8 + purchases/api 7 + TreasurySidebar 8) — M
- [ ] Task 10: عنقود Inventory/POS (~25: AuditSessionPage 9 + ProductDetailsContent 8 + ...) — M
- [ ] Task 11: الذيل المتبقي حتى baseline = 0 — L مجزأة
- [ ] Task 12: تقليص any (موجة أولى: طبقة api/service) — 833 → <700 — M

### Checkpoint C2
- [ ] tsc --noEmit نظيف تمامًا → CI يعود حاجبًا كاملًا

### Phase C3: قرار الذكاء الاصطناعي
- [x] Task 13: smart-import — **قرار 2026-08-21: الإبقاء** — الميزة مربوطة فعلياً عبر `InventoryPage` (mode=inventory) و`PurchasesPage` (mode=invoice/تبويب smart_import)؛ لا إزالة. بقي فقط متابعة الثغرتين في AI core (config.ts:22, provider.ts:109) كبند مستقل عند الحاجة.

### Phase D: Backend (Supabase) — تسلسل إلزامي
- [~] Task 14: مصالحة migrations — **سكربت `apply-migrations.mjs` عُمّم** (مسح `supabase/migrations/*.sql` مرتباً + idempotent عبر `schema_migrations`) — تبقى خطوة السيرفر الحي (تتطلب `SUPABASE_ACCESS_TOKEN` + قرار `db pull`).
- [ ] Task 15: search_path لـ 55 دالة SECURITY DEFINER — M — أمني
- [ ] Task 16: إضافة product_stock + warehouses لمنشور Realtime — S
- [ ] Task 17: إزالة overload المكرر في commit_sales_invoice — S
- [ ] Task 18: أرشفة prc_* (3,882 صفًا) — M — قرار الأرشفة/الحذف للمستخدم
- [ ] Task 19: إسقاط fin_* — S

### Checkpoint D
- [ ] db pull نظيف (صفر drift) + Security Advisor بلا تحذيرات search_path

### Phase E: i18n واللمسات
- [ ] Task 20: تدقيق النصوص الثابتة وسد فجوات الترجمة — M
- [ ] Task 21: توحيد husky + حذف ملفات 0-byte الموثقة — S

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| كنس TS6133 يحذف متغيرًا مستخدمًا ديناميكيًا | متوسط | commits مجزأة + مراجعة diff + مجموعة خضراء بعد كل دفعة |
| استبدال الصلاحيات يغير سلوك شاشة | عالٍ | اختبار يدوي لكل شاشة + مطابقة أسماء permissions مع بذور role_permissions |
| migration مصالحة يكسر DB | عالٍ | staging أولًا + نسخة احتياطية |
| storageKey change يسجل خروج المستخدمين | منخفض pre-launch | موثق في ملاحظات الإصدار |

## Open Questions (بانتظار قرار المستخدم)
1. smart-import/AI: ربط وإصلاح أم إزالة؟
2. prc_*: أرشفة queryable أم حذف بعد تصدير CSV؟
3. تدوير مفاتيح Supabase: الآن أم عند الإطلاق؟
