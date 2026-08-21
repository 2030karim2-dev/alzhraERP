# 🔍 تقرير التدقيق الشامل للواجهة الأمامية — Al-Zahra Smart ERP

> **التاريخ:** 2026-08-21
> **المنهجية:** فحص ثابت (Static Analysis) عبر المهارات: `code-review-and-quality`, `security-and-hardening`, `performance-optimization`, `frontend-ui-engineering`, `code-simplification`, `debugging-and-error-recovery` + تشغيل أدوات المشروع الفعلية (`tsc --noEmit`، `eslint src`، `check-encoding`).
> **النطاق:** `src/` (872 ملف TS/TSX) + 13 Edge Function في `supabase/functions/`
> **التصنيف:** 🔴 حرج | 🟠 عالي | 🟡 متوسط | 🟢 منخفض | ✅ نقطة قوة

---

## 📊 الملخص التنفيذي

| المؤشر                            | القيمة                                               |
| --------------------------------- | ---------------------------------------------------- |
| أخطاء TypeScript (`tsc --noEmit`) | **1** (كود ميت)                                      |
| مشاكل ESLint                      | **11,429** (11,275 خطأ + 154 تحذير) في **644 ملفاً** |
| ملفات متأثرة بـ ESLint            | 644 / 872                                            |
| استخدامات `as any` / `any`        | **143+** في 25+ ملفاً                                |
| Edge Functions بـ CORS `*`        | **8 من 13**                                          |
| الملفات > 400 سطر                 | **9 ملفات**                                          |
| ملفات التقارير المتروكة في الجذر  | **5 ملفات** (~229KB)                                 |

**الخلاصة:** البنية المعمارية سليمة بشكل عام (فصل الطبقات، React Query، RLS على مستوى DB، ADRs موثقة، اختبارات متنامية)، لكن هناك **ديوناً تقنية نوعية ضخمة** في سلامة الأنواع والامتثال لقواعد ESLint، مع **ثلاثة تناقضات مالية حرجة** (تسامح توازن القيد، هاش التدقيق غير المشفر، معالجة NaN في تحويل العملات) و**وظائف "حفظ" وهمية** في الإعدادات.

---

## المحور الأول: 🔴 الأخطاء والتناقضات المالية الحرجة

### 1.1 — هاش التدقيق المالي غير مشفّر (SOX معطّل فعلياً)

**الموقع:** `src/core/utils/decimalUtils/hashing.ts:12-63`
**المشكلة:** `generateCalculationHash` — المُستدعاة من `calculateLineItem` و`calculateInvoiceSummary` في `calculations.ts:38,80` (مسار الحسابات المالية الفعلي) — **لا تستخدم SHA-256**. تستخدم مزيج FNV-1a + DJB2 ثم تُرجع hex مبطّناً لـ 64 خانة **مزيفاً** طول SHA-256.
**الأثر:** 🔴 أي متلاعب يمكنه إعادة إنتاج نفس الهاش لقيم مختلفة → آلية كشف التلاعب المالي (المزعومة SOX) **غير فعّالة على الإطلاق**. النسخة الآمنة `generateCalculationHashAsync` موجودة لكنها **غير مستخدمة** في مسار الحسابات.
**الإصلاح المقترح:** استخدام `generateCalculationHashAsync` عبر Web Crypto في المسارات الحرجة، أو إزالة الإدعاء الكاذب "SHA-256".

### 1.2 — تناقض تسامح توازن القيد المحاسبي

**الموقع:** `src/features/accounting/hooks/useJournalEntryForm.ts:82`

```ts
const isBalanced = Math.abs(difference) < 0.01 && totals.debit_amount > 0;
```

**المشكلة:** حد تسامح **0.01** على مستوى الواجهة، بينما `SOX_BALANCE_TOLERANCE = 0.000001` في `decimalUtils/constants.ts:8`، و`journalsApi.validateJournalInput` (سطر 45) تستخدم SOX الصحيح، وDB يستخدم `check_journal_balance` بتسامح 0.001.
**الأثر:** 🔴 عدم اتساق 3 طبقات: الواجهة قد تسمح بقيد غير متوازن بـ 0.01، ثم يرفضه الخادم — أو يظهر "متوازن" بصرياً بينما يُرفض عند الحفظ.

### 1.3 — `NaN`/`Infinity` يمرّان عبر تحويل العملات

**الموقع:** `src/core/utils/currencyUtils.ts:51-53` و `77-79`

```ts
if (exchangeRate === 1) { return amount; }   // ← قبل التحقق من amount!
if (!Number.isFinite(amount)) { throw new CurrencyError(...) }
```

**المشكلة:** عندما يكون `exchangeRate === 1` (الوضع الافتراضي لعملة SAR)، تُرجع الدالة `amount` كما هو **دون التحقق من `Number.isFinite`**. تمرر `NaN` و `Infinity` بصمت.
**الأثر:** 🟠 قيمة تالفة تدخل الحسابات دون تنبيه في الحالة الافتراضية الأكثر شيوعاً.

### 1.4 — ملفات مالية إضافية محل تدقيق

- `src/features/expenses/service.ts:5` يستورد `toBaseCurrency` — سلوكه عند `rate===1` يحتاج نفس الفحص.
- `useSalesAnalytics.ts` يستخدم `raw: any` مع `toNum` دفاعي — مقبول لكنه يعتمد على `any`.

---

## المحور الثاني: 🟠 أخطاء البرمجة والسلامة النوعية

### 2.1 — أخطاء TypeScript (فحص فعلي كامل `tsc --noEmit`)

| الملف                                                              | الخطأ                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------- |
| `src/features/vin-intelligence/components/PartsExtractTab.tsx:125` | **TS6133**: `clearAllRows` معرّفة ولا تُستخدم (كود ميت) |

> ✅ بقية المشروع نظيف نوعياً من أخطاء tsc — إنجاز يُحسب للفريق.

### 2.2 — استخدام `as any` / `any` (143+ حالة مؤكدة)

| الملف                                   | العدد | الخطر                               |
| --------------------------------------- | ----- | ----------------------------------- |
| `sales/.../InvoiceDetailsModal.tsx`     | 13    | تمرير بيانات فاتورة غير مُتحقق منها |
| `sales/.../QuotationDetailsModal.tsx`   | 10    | `setQuotation<any>` يلغي فحص القيم  |
| `inventory/.../TransferHistoryView.tsx` | 9     | حركة مخزون بلا أنواع                |
| `settings/hooks.ts`                     | 8     | `profile.data as AuthUser`          |
| `inventory/.../TransferItemsList.tsx`   | 8     | عناصر تحويل بلا أنواع               |
| `accounting/.../AccountsTable.tsx`      | 7     | حسابات مالية                        |
| `accounting/.../TreasurySidebar.tsx`    | 7     | `node: any` شجرة الحسابات           |
| `sales/hooks/useSalesAnalytics.ts`      | 7     | تحليلات مبيعات                      |

### 2.3 — إحصاءات ESLint (فحص فعلي كامل `eslint src`)

| القاعدة                                            | العدد | الدلالة                              |
| -------------------------------------------------- | ----- | ------------------------------------ |
| `@typescript-eslint/strict-boolean-expressions`    | 2,275 | شروط غير صريحة → أخطاء منطقية محتملة |
| `@typescript-eslint/no-unsafe-member-access`       | 1,429 | وصول لأعضاء `any`                    |
| `@typescript-eslint/prefer-nullish-coalescing`     | 1,163 | `                                    |     | `بدل`??` |
| `@typescript-eslint/no-confusing-void-expression`  | 879   | تعبيرات void مربكة                   |
| `@typescript-eslint/explicit-function-return-type` | 652   | دوال بلا نوع إرجاع                   |
| `@typescript-eslint/no-unnecessary-condition`      | 622   | شروط زائدة                           |
| `@typescript-eslint/no-unsafe-assignment`          | 580   | إسناد قيم `any`                      |
| `max-lines-per-function`                           | 435   | دوال ضخمة (>50 سطر)                  |
| `@typescript-eslint/no-explicit-any`               | 415   | استخدام `any`                        |
| `security/detect-object-injection`                 | 391   | 🔴 إسقاط كائنات في فهارس             |
| `restrict-template-expressions`                    | 351   | قوالب غير آمنة                       |
| `complexity`                                       | 255   | دوال معقدة (>10)                     |
| `no-floating-promises`                             | 161   | 🔴 وعود غير معالجة → أخطاء صامتة     |
| `jsx-a11y/label-has-associated-control`            | 99    | 🟠 حقول بلا `label`                  |

### 2.4 — تناقض محلي في إحصائيات `as any`

تقرير `docs/supabase-audit-evidence.md` يذكر 186 استخدام `any` + 61 `as unknown as`؛ الفحص الحالي رصد 143 `as any` — التباين يعود لاختلاف منهجية العد (نطاقات وأنماط مختلفة). **الاتجاه تنازلي لكن ما زال مرتفعاً.**

---

## المحور الثالث: 🟠 الثغرات الأمنية

### 3.1 — CORS المفتوح في Edge Functions

**الملفات (8 من 13):** `ai-part-lookup`, `ai-product-image`, `ai-proxy`, `car-ai-assistant`, `part-search`, `vin-decode`, `vin-parts`, `zatca-integration`

```ts
const corsHeaders = { 'Access-Control-Allow-Origin': '*', ... };
```

**الأثر:** 🟠 أي موقع ويب يمكنه استدعاء هذه الدوال من متصفح المستخدم (مخاطر CSRF/إساءة استخدام AI proxy الذي يستهلك رصيد OpenRouter).

### 3.2 — Object Injection (391 حالة)

`security/detect-object-injection` في `featureFlags.ts:50,67,77,92` و`ErrorBoundary.tsx:81` وغيرها — وصول ديناميكي بفهارس مفاتيح غير موثوقة.
**الأثر:** 🟡 منخفض-متوسط في الواجهة الأمامية لكن يجب إصلاحه ضمن قاعدة عامة.

### 3.3 — Floating Promises (161 حالة)

وعود بلا `await`/`void`/`.catch` — أخطاء شبكة تظهر بصمت ولا تُعالج.

### 3.4 — ✅ نقاط أمان جيدة مؤكدة

- `supabaseClient.ts`: circuit breaker + فشل صاخب عند غياب الإعداد + منع الـ mock في الإنتاج.
- نظام الصلاحيات انتقل إلى `has_permission()` RPC خادمي (ADR-003) بدل client-side فقط.
- `check-encoding.ts`: جميع المصادر UTF-8 نظيفة (لا mojibake).
- لا يوجد `dangerouslySetInnerHTML`، ولا `eval`، ولا أسرار مضمّنة في `src/`.
- RLS مفعّل على جداول الجرد والديون (في migrations).
- `errorUtils.parseError` يمرّر عبره كل الأخطاء تقريباً.

---

## المحور الرابع: 🟡 الملفات الضخمة والمعقدة

| الملف                                  | الحجم          | التقييم                                                                        |
| -------------------------------------- | -------------- | ------------------------------------------------------------------------------ |
| `src/core/database.types.ts`           | **13,018 سطر** | 🟠 أنتجته Supabase CLI لكنه عملاق؛ يُنصح بالتقسيم حسب المجال                   |
| `src/features/appearance/constants.ts` | 1,252 سطر      | 🟡 ثيمات بيانات — مقبول لكنه ثقيل في الحِزمة                                   |
| `src/ui/common/ExcelTable.tsx`         | 611 سطر        | 🟠 تحول لمكوّن عملاق رغم تقسيمه جزئياً — ما زال منطق التجميع والفرز واللصق فيه |
| `PartsExtractTab.tsx`                  | 518 سطر        | 🟡 جدول بيانات + منطق، قابل للتقسيم                                            |
| `VinDecodeTab.tsx`                     | 511 سطر        | 🟡 حالات يدوية متعددة في ملف واحد                                              |
| `ProductSelectionModal.tsx`            | 496 سطر        | 🟠 منطق resizing + جدول + modals فرعية                                         |
| `AuditSessionPage.tsx`                 | 495 سطر        | 🟡 جلسة جرد بمنطق مزامنة معقد                                                  |
| `AdvancedReturnModal.tsx`              | 411 سطر        | 🟡 Modal قابل للسحب/التحجيم + سير خطوات                                        |
| `dashboard/api/index.ts`               | 392 سطر        | 🟡 12 RPC متوازي في كائن واحد                                                  |

> `ExcelTable.tsx` لديه `getStringContent` متكرر/معقد (سطر 137-159) يتنقل في كائنات React — **استدعاء `col.accessor(item)` لكل صف في كل عملية بحث** = عبء أداء على جداول كبيرة (راجع `performance-optimization`).

---

## المحور الخامس: 🟡 العيوب والنواقص الوظيفية

### 5.1 — أزرار "حفظ" وهمية (لا تدفع للخادم)

| الملف                            | السلوك                                        |
| -------------------------------- | --------------------------------------------- |
| `useInvoiceSettings.ts:14-18`    | `setSaved(true)` + toast فقط — لا يكتب للخادم |
| `POSSettings.tsx:19-21`          | toast فقط — لا حفظ فعلي                       |
| `LocalizationSettings.tsx:38-41` | **زر بلا `onClick` إطلاقاً**                  |
| `NotificationSettings.tsx:19-25` | `setTimeout` + toast فقط — لا حفظ فعلي        |

**الأثر:** 🟡 المستخدم يعتقد أن الإعدادات مُنقذة بينما تُفقد عند تحديث الصفحة (إلا ما يلتقطه zustand persist محلياً). تناقض بين مكوّنات الإعدادات: `InventorySettings`/`useBackupManager` تستخدم `settingsService` فعلياً، بينما هذه الأربعة لا.

### 5.2 — نواقص مؤكدة

- **`routes.tsx`**: 36 مساراً، لكن `smart-import` **لا يملك route مستقل** — يُستدعى كمكوّن داخل `InventoryPage` و`PurchasesPage` فقط (قرار مقصود بحسب ADR-010، لكن لا مدخل اكتشاف له من القائمة).
- **`src/features/accounting/types.ts`**: barrel أحادي السطر `export * from './types/index';` (31 بايت) — طبقة زائدة بلا قيمة.
- **`src/features/pos/index.ts`** و **`dashboard/index.ts`**: barrels صغيرة إعادة تصدير فقط.

### 5.3 — نقاط قوة معمارية ✅

- فصل `Component → Hook → Service → API` محترم في معظم الوحدات.
- 63 استيراداً فقط لـ `supabase` مباشرة، **كلها في طبقات api/service** (لا انتهاك في components).
- Lazy loading لكل الصفحات عدا auth/dashboard (مقصود).
- Recharts/jspdf/xlsx في chunks منفصلة (`vite.config.ts`).
- Realtime sync + invalidation مبنية على خرائط واضحة.
- i18n: 263 مفتاحاً مستخدماً، 435 في ar/en، **صفر مفتاح ناقص** (تحقق فعلي).
- تعاملات صحيحة مع `exactOptionalPropertyTypes` (أنماط `...(cond ? {} : {})`).

---

## المحور السادس: 🟢 المهملات والتالف

| الملف                                    | الوصف                                     |
| ---------------------------------------- | ----------------------------------------- |
| `alzhraERP/eslint_audit.txt` (35KB)      | تقرير lint قديم (736 مشكلة) بتاريخ 8/18   |
| `alzhraERP/lint-debt-report.txt` (138KB) | تقرير ديون lint بتاريخ 8/20               |
| `alzhraERP/returns_lint.txt` (52KB)      | تقرير lint للـ returns                    |
| `alzhraERP/eslint_exit.txt` (10B)        | كود خروج قديم                             |
| `alzhraERP/todo.md`                      | سليم UTF-8 ✅ (التحقق عبر check-encoding) |
| `DeduplicationTool.tsx`                  | ✅ **تم حذفه** (لم يعد موجوداً)           |
| `src/features/parties/hooks/`            | ✅ لا ملفات فارغة متبقية                  |

---

## 🎯 خطة الإصلاح المقترحة (مرتبة بالأولوية)

### الأولوية القصوى (حرج — سلامة مالية)

1. **استبدال `generateCalculationHash`** في مسار الحسابات بـ Web Crypto SHA-256 (`generateCalculationHashAsync`) أو إزالة الادعاء الكاذب.
2. **توحيد تسامح التوازن**: `useJournalEntryForm.ts:82` ← استخدام `SOX_BALANCE_TOLERANCE` (0.000001) أو 0.001 المطابق لـ DB.
3. **إصلاح `currencyUtils.ts`**: نقل `Number.isFinite(amount)` **قبل** `exchangeRate === 1` في الاتجاهين.

### أولوية عالية

4. تصغير `ExcelTable.tsx` و`ProductSelectionModal.tsx` وتقسيم `database.types.ts`.
5. تقليل `as any` في الملفات المالية (InvoiceDetailsModal, QuotationDetailsModal, AccountsTable, TreasurySidebar).
6. معالجة 161 floating promise و391 object-injection (قواعد ESLint قيد التنفيذ).
7. تقييد CORS في edge functions إلى `SITE_URL` بدل `*` (خصوصاً `ai-proxy`).

### أولوية متوسطة

8. ربط أزرار الحفظ الوهمية بخدمات حقيقية أو إزالتها/إظهار "محلي فقط".
9. إزالة ملفات التقارير المتروكة من الجذر.
10. إضافة `label` لحقول النماذج (99 مخالفة jsx-a11y).
11. حذف `(process as any).cwd()` في `vite.config.ts`.

### أولوية منخفضة

12. تقسيم `appearance/constants.ts` وتحميله كسلاً عند الحاجة فقط.
13. دمج barrels أحادية السطر.
14. إضافة `aria-label`/دعم لوحة مفاتيح في المكونات المخصصة (Modal القابل للسحب، أزرار الأيقونات).

---

## 📈 إحصاءات إضافية

- **أخطاء `eslint` قابلة للإصلاح تلقائياً (`--fix`):** 1,454 خطأ + 2 تحذير.
- **مخالفات `no-console`:** 33 حالة في `src/` (معظمها داخل `logger` المشروع — مقبول، لكن الباقي يجب تنظيمه).
- **مكونات > 200 سطر:** 9 ملفات (بحد `frontend-ui-engineering`).
- **الملفات النظيفة من أخطاء tsc بعد الإصلاحات:** **872 / 872 (صفر أخطاء)** ✅

---

## ✅ ملحق: الإصلاحات المنجزة (2026-08-21)

> **الحالة بعد التنفيذ:** `npx tsc --noEmit` → **0 خطأ** · `npx vitest run` → **57 ملف / 452 اختباراً ناجحاً**

| #     | البند                             | الحالة                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | هاش التدقيق المالي المزيف         | ✅ `hashing.ts` أعيدت كتابتها: أُزيل الادعاء الكاذب "SHA-256"، و`generateCalculationHash` أصبحت بصمة غير مشفرة موثقة صراحةً، و`generateCalculationHashAsync` (SHA-256 حقيقي عبر Web Crypto) مُشار إليها كمسار التدقيق. أُضيفت 4 اختبارات للنسخة الآمنة.                                                                                                                                                   |
| 2     | تناقض تسامح القيد المحاسبي        | ✅ `useJournalEntryForm.ts`: استُبدل `0.01` بـ `BALANCE_TOLERANCE` المستوردة من `SOX_BALANCE_TOLERANCE` في الموضعين (schema + isBalanced).                                                                                                                                                                                                                                                                |
| 3     | `NaN` عبر تحويل العملات           | ✅ `currencyUtils.ts`: نُقل `Number.isFinite(amount)` قبل إرجاع `rate === 1` في الدالتين، وأُزيل شرط القسمة على صفر الميت. أُضيفت 4 اختبارات.                                                                                                                                                                                                                                                             |
| 4     | CORS المفتوح                      | ✅ **تصحيح**: الدوال المحمية أصلاً (allow-list): `ai-proxy`, `zatca-integration`, `vin-decode`, `vin-parts`, `part-search`, `send-notification`, `car-ai-assistant`. المفتوحة فعلياً كانت **4** فقط — أُصلحت كلها: `ai-part-lookup`, `ai-product-image`, `fetch-exchange-rates-aden`, `get-products` (تحوّلت إلى `ALLOWED_ORIGINS` + `corsHeaders(req)`).                                                 |
| 5     | أزرار الحفظ الوهمية               | ✅ `LocalizationSettings` (زر بلا onClick): رُبط بـ `handleSave` مع toast "حُفظ على هذا الجهاز". `POSSettings` و`useInvoiceSettings`: رسائل واضحة بأن الحفظ محلي. `NotificationSettings`: أصبحت تُخزَّن فعلياً في `localStorage` (كانت state فقط تُفقد). أُضيف مفتاح i18n `settings_saved_local` للعربية/الإنجليزية.                                                                                      |
| 6     | تقليل `as any` في الملفات المالية | ✅ **7 ملفات نُظفت بالكامل من `any`**: `InvoiceDetailsModal` (13)، `QuotationDetailsModal` (10)، `TransferHistoryView` (9)، `TransferItemsList` (8)، `TreasurySidebar` (7)، `AccountsTable` (7)، `useSalesAnalytics` (7). أُضيفت أنواع مُصدَّرة (`InvoiceDetailItem`, `InvoiceWithDetails`, `QuotationDetailRow`, `QuotationDetailItem`) وأنواع محلية (`AccountNode`, `TransferHistoryRow`, `RawRecord`). |
| إضافي | كود ميت                           | ✅ أُزيل `clearAllRows` غير المستخدم في `PartsExtractTab.tsx` (كان خطأ tsc الوحيد TS6133).                                                                                                                                                                                                                                                                                                                |

---

## 🧭 طريقة التحقق (Evidence Trail)

| الأداة     | الأمر                               | النتيجة                                 |
| ---------- | ----------------------------------- | --------------------------------------- |
| TypeScript | `npx tsc --noEmit`                  | قبل: خطأ 1 · **بعد: صفر أخطاء**         |
| ESLint     | `npx eslint src`                    | 11,429 مشكلة / 644 ملف                  |
| Encoding   | `npx tsx scripts/check-encoding.ts` | ✅ نظيف                                 |
| Vitest     | `npx vitest run`                    | **57 ملف / 452 اختباراً ناجحاً**        |
| فحص يدوي   | قراءة 20+ ملفاً حرجاً               | رصد التناقضات المالية + الأزرار الوهمية |
| Git        | `git status`                        | 27 ملفاً معدلاً (إصلاحات)               |

> **وضع التقرير:** التدقيق اكتمل بالأدوات الفعلية، وتم تنفيذ **إصلاحات الأولوية القصوى والعالية** للبنود الستة مع تحقق كامل (`tsc` + `vitest`). المتبقي ضمن البند 6 هو بقية ملفات `as any` (332 حالة في ملفات أقل خطورة) وديون ESLint العامة — قابل للتنفيذ في جولات لاحقة.
