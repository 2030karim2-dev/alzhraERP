# Al-Zahra ERP — أرشيف الكود المهمل (Attic)

> **لا يُبنى، لا يُفحص نوعياً، لا يُفحص بـ ESLint.** هذا المجلد خارج `tsconfig.include`
> و`eslint.ignores` عمداً. لا تستورده أبداً من `src/`.

## `orphaned-2026-09-17/` — أيتام فحص 2026-09-17

كشفها `scripts/orphan-scan.mjs` (فحص كامل لكل بايت في كل ملفات `src/`):
**اسم الملف لا يظهر في أي ملف آخر إطلاقاً** — لا استيراد، لا re-export، لا lazy import،
لا استيراد ديناميكي (المشروع لا يحتوي أنماط استيراد ديناميكي أصلاً — تحقق 2026-09-17).
ملفات الاختبار أيضاً لا تشير إليها.

| الملف                                          | السبب المرجّح                                                 |
| ---------------------------------------------- | ------------------------------------------------------------- |
| `reports/components/ABCAnalysisChart.tsx`      | جيل قديم من تقارير التحليل — استُبدل بمكوّنات Reports الحالية |
| `reports/components/StockAlertsTable.tsx`      | نفس الجيل القديم                                              |
| `reports/components/StagnantProductsTable.tsx` | نفس الجيل القديم                                              |
| `reports/components/TopProductsTable.tsx`      | نفس الجيل القديم                                              |
| `reports/hooks/useResponsive.ts`               | مرافق الجيل القديم — استُبدل بأدوات UI العامة                 |
| `ui/components/LoadingStates.tsx`              | استُبدل بـ `ui/base/PageLoader` وهياكل التحميل الحديثة        |
| `ui/hooks/useDraggableModal.ts`                | لم يعتمده Modal الحالي                                        |
| `dashboard/services/dashboardStats.ts`         | استُبدل بـ `dashboardInsights` + RPCs                         |
| `dashboard/services/smartAlertsEngine.ts`      | محرك تنبيهات قديم استُبدل                                     |
| `core/services/retryHandler.ts`                | أداة إعادة محاولة قديمة — البنية تستخدم آليات أخرى            |
| `core/store/navigationStore.ts`                | ستور تنقل لم يعد مستخدماً                                     |
| `core/utils/safeOptional.ts`                   | أداة لم تُعتمد                                                |
| `expenses/.../RecurringExpenseSection.tsx`     | قسم "متكرر" غير مربوط في نموذج المصروفات الحالي               |
| `inventory/services/aiInventoryService.ts`     | خدمة AI مخزون تجريبية غير مربوطة                              |
| `inventory/services/stockAlertService.ts`      | خدمة تنبيهات مخزون قديمة                                      |
| `accounting/services/currencyService.ts`       | خدمة عملات موازية قديمة — الحي في `settings`                  |

## سابقة مهمة (ADR-010)

حذف `smart-import` سابقاً رُجِع لأن الفحص المقتطع أخفى استيراده الحي.
**هذه الأرشفة مختلفة**: الفحص كامل (كل بايت × كل ملف) ولا توجد أنماط استيراد
ديناميكي، ويوجد سجل أداة قابل لإعادة التشغيل: `node scripts/orphan-scan.mjs`.

## المنهجية (مهم)

الأداة تعدّ **الملفات** المستخدمة لكل اسم (وليس التكرارات الخام) — ملف يذكر
اسمه مرتين لا يهرب من الكشف. شُغّلت **بشكل تكراري حتى الاستقرار**:
أرشفة الجيل الأول كشفت 6 أيتام تابعين (كانوا مستخدمين فقط من ملفات مؤرشفة)،
فأُرشفوا أيضاً، ثم استقر الفحص على **صفر أيتام**.

**الإجمالي المؤرشف: 56 ملفاً** — القائمة الكاملة الدقيقة في سجل Git
(جميعها نقلت بـ `git mv` من `src/` إلى `_attic/orphaned-2026-09-17/`).

أبرز ما شملته الأرشفة (بجانب جدول الجيل الأول أعلاه):

- `SmartImportModal.tsx` — انظر ADR-010: كان حياً يوم التوثيق (2026-08-21)، وفقد
  استيراده لاحقاً؛ الواجهة الحية هي `SmartImportView` (تحقق 2026-09-17)
- `OnboardingWizard.tsx`، `NotificationsCenter.tsx`، `OmniSearchDropdown.tsx` +
  `omniSearchService.ts`، `HeaderSearch.tsx` + `useGlobalShortcuts.ts`
- `SalesReturns.tsx` (الحي هو `SalesReturnsView.tsx`)، `CartItemRow.tsx` + `EditPriceInline.tsx`
- `JournalEntryCard.tsx`، `storage.service.ts`، `useAuthSession.ts`، `retryHandler.ts`
- جيل تقارير قديم كامل (InventoryValuation, SalesForecast, AIInsight*, FocusView...)
- `VoiceInvoiceButton.tsx` + `VoiceInputButton.tsx`، `QuickActionFAB.tsx`، `SparklineChart.tsx`

أدوات تشغيلية نُقلت من `src/scripts/` (الذي أصبح فارغاً وحُذف) إلى `scripts/`:
`setup-cashboxes.ts`، `migrate-balances.ts`، `analyze-codebase.ts`.

## الاسترجاع

`git mv _attic/orphaned-2026-09-17/<المسار> <المسار>` ثم أعد ربطه بمسار/زر فعلي،
وشغّل `npm run type-check` + `node scripts/orphan-scan.mjs` للتأكد.
