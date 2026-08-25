# خط الأساس الرقمي للجودة — Lint / Types / Tests
**التاريخ:** 2026-08-25 · **المنهجية:** فحص مباشر بأوامر موثقة (لا اعتماد على تقارير سابقة)

## النتائج الرسمية المؤكدة

| الفحص | الأمر | النتيجة |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ **صفر أخطاء** (`TSC_EXIT=0`) |
| ESLint | `npx eslint src` | ❌ **13,155 مشكلة** (12,985 error / 170 warning) — منها **1,547 قابلة للإصلاح الآلي** بـ `--fix` |
| Vitest (نطاق جديد) | `vitest run src/core/sync src/core/workers src/features/supplier-portal` | ✅ **7/7 ناجحة** في 3 ملفات |
| انتهاك طبقات المكوّنات | بحث `.tsx` عن استيراد supabaseClient | ✅ **صفر** بعد كوميت `61ac182` (كانت 3) |

## توزيع أخطاء ESLint حسب القاعدة (أعلى 12)

| العدد | القاعدة | طبيعتها |
|---|---|---|
| 2,731 | strict-boolean-expressions | أسلوبية قابلة للتوحيد الآلي/اليدوي السريع |
| 1,508 | no-unsafe-member-access | **مخاطرة نوعية حقيقية** — مصدرها مواضع `any` |
| 1,441 | prefer-nullish-coalescing | تحويلات `\|\|` → `??` — مناسبة لجلسة تدقيق واحدة |
| 914 | no-confusing-void-expression | إرجاع void في arrow — سهلة الإصلاح |
| 763 | no-unnecessary-condition | تنظيف شروط زائدة |
| 725 | explicit-function-return-type | إضافة توقيعات إرجاع |
| 690 | no-unsafe-assignment | مرتبط بدين `any` نفسه |
| 503 | max-lines-per-function | دوال/مكوّنات ضخمة — تحتاج تفكيكاً مخططاً |
| 476 | security/detect-object-injection | وصول ديناميكي لخصائص — **تدقيق يدوي مطلوب** |
| 423 | no-explicit-any | يتطابق مع عدّي اليدوي (~407 غير الاختبارات) |
| 414 | restrict-template-expressions | template literals بقيم nullable |
| 299 | complexity | تعقيد > 10 — يعاد هيكلته تدريجياً |

## دين `any` — الملفات الأكثر احتواءً (غير اختبارات)

الإجمالي: **~407 موضع**. أعلى 12 ملفاً:

| المواضع | الملف |
|---|---|
| 26 | `src/features/chat/services/chatService.ts` |
| 9 | `src/core/workers/dataProcessor.worker.ts` |
| 8 | `src/features/settings/hooks.ts` |
| 7 | `src/features/supplier-portal/services/excelEngine.ts` |
| 6 | `src/core/utils/bondExcelExporter.ts` |
| 5×6 | `useUserPermissions.ts`, `StockAuditView.tsx`, `useAutoParts.ts`, `TransferWarehousePicker.tsx`, `ProductExcelGrid.tsx`, `useExcelImport.ts`, `returnsExcelExporter.ts` |

## سياسة التخفيض التدريجي المقترحة (Ratchet)

1. **الأسبوع الأول — مكاسب آلية:** `eslint src --fix` يعالج ~1,547 فوراً (فراغات، `??`, تفضيلات أسلوبية). مراجعة بشرية للـ diff ثم commit واحد.
2. **منع الرجوع للخلف:** تثبيت رقم كل قاعدة في هذا المستند؛ أي PR يزيد عدد مشكلة يُرفض. التخفيض فقط مسموح.
3. **الترتيب حسب المخاطرة لا العدد:**
   - أولاً `no-unsafe-*` (2,198 مجتمعة) لأنها ثغرات نوعية فعلية، وجذرها ملفات `any` الساخنة أعلاه.
   - ثانياً `security/detect-object-injection` (476) — مراجعة يدوية لكل موضع.
   - ثالثاً البقية الأسلوبية عبر جلسات مجمعة.
4. **تفكيك الدوال الضخمة (503):** يبدأ بالملفات > 30KB الحالية (`PartsExtractTab.tsx` 48KB، `VinsTab.tsx` 41KB).

## توصيات تكوينية (تحتاج قراراً قبل التنفيذ)

- **عدم تفعيل** `noUncheckedIndexedAccess` الآن — سيضيف مئات الأخطاء بينما العمل متوازٍ نشط على المستودع؛ تفعيله بعد إنزال `no-unsafe-*` تحت 500.
- إضافة سكربت `lint:baseline` يقارن العدادات بهذا الملف ويفشل عند الزيادة (CI gate).

> ملاحظة: تقرير lint الخام محفوظ مؤقتاً في `alzhraERP/lint-report.txt` (2.6MB) — يُحذف بعد اعتماد الأرقام.
