# ADR-016: بوابة سقف دَين lint الكلي وتنظيف المرحلة الأولى (2026-09-18)

## الحالة: مقبول ومُنفّذ (Phase 0 + Phase 1 mechanical)

## السياق

القياس الفعلي بتاريخ 2026-09-18 أظهر:

- 10,701 مشكلة ESLint (10,482 خطأ / 219 تحذيراً) عبر 705 ملفاً.
- `lint-baseline.json` (ratchet لكل ملف) كان مُقيَّداً على 8,928 خطأ فقط (تاريخ 2026-09-04) — أي أن ~1,554 خطأ تسرّبت رغم الـ ratchet لكل ملف، عبر ترقية `--update` لملفات متغيرة دون بوابة إجمالية.

## القرار

1. **بوابة سقف إجمالي جديدة**: `scripts/check-lint-total.mjs` + `scripts/lint-total-baseline.json`.
   - تفحص المستودع كاملاً (`eslint . --report-unused-disable-directives --format json`) وتفشل إذا زاد الإجمالي فوق خط الأساس.
   - **الفرض في CI** (استبدلت خطوة `Full lint (non-blocking)`) لأنها 5-10 دقائق على أجهزة ويندوز المحلية — وضُع الحكم المركزي بدل تعطيل المطورين لـ pre-push بـ `--no-verify`.
   - أُضيف أيضًا إلى سكربت `pre-push` اليدوي في package.json.
2. **تجميد الخط الأساسي عند 10,145** بعد الإصلاحات الآلية (انظر التقدم).
3. **تنظيف يدوي ميكانيكي آمن** (~63 خطأ): إزالة روابط `catch` غير المستخدمة، `() => {}` → `() => undefined` (و`async () => undefined`)، حذف أنواع/استيرادات غير مستخدمة، `console.log` → `logger.debug` أو `console.info`، وتعطيلات موثقة لـ 3 مواضع مشروعة في `logger.ts` و`index.tsx` (هي نفسها آلية الكبت الإنتاجي/transport).
4. **إصلاحات hooks الآمنة فقط** (6): إضافة `pageSizeRef` (ref)، إضافة `isCore` (إصلاح سلوكي: إعادة الجلب عند تغيير الفلتر)، وتغليف المصفوفات المشتقة في `useMemo` (warehouses, movements, rateHistory, rawResults, popularResults, items).

## القائمة المؤجلة للمرحلة 2 (مواضع دقيقة — كل واحد يحتاج قرار تصميم)

- `AccountingPage.tsx:180` — handleRefresh (تحتاج useCallback أو إعادة تفكير في useMemo)
- `command/hooks.ts:24` — newActions/registerActions (التسجيل mount-only مقصود)
- `ReminderModal.tsx:98` — 5 تبعيات (تأثيرات توليد AI — إعادة تصميم)
- `ProductDetailModal.tsx:22` — handleClose
- `ProductExcelGrid.tsx:127` — handleToggleCore
- `TransferProductSearch.tsx:71` — getWhStock
- `SupplierPortalShareModal.tsx:55` — currentToken/isRegenerating/onTokenUpdated/showToast (خطر حلقة — يُمنع الإضافة العمياء)
- `useDefaultExchangeRates.ts:82` — refreshRates/setRate
- `POSPage.tsx:96`, `CreatePaymentModal.tsx:299`, `CreatePurchaseModal.tsx:330`, `PurchaseInvoiceCells.tsx:81`, `InvoiceRow.tsx:51`, `InvoiceListView.tsx:75`, `QuotationsTab.tsx:101`
- `useTableKeyboardNavigation.ts:115,471`, `WorkspaceTabBar.tsx:149`
- تغليف useMemo إضافية: `ReturnItemsStep` (مُنفّذ)، `usePOSSearch` (مُنفّذ)، المتبقي: `ReportsPage.tsx:206` (allTabs)، `SettingsPage.tsx:68` (menuGroups)، `PurchaseMeta.tsx:412` (currencyRows)
- `useAudioPlayer.ts:84` — playbackRate (إعادة البناء تدمر التشغيل — يلزم نقل التطبيق خارج بناء العنصر)

## التقدم المقاس

| التاريخ            | الأخطاء       | الحدث              |
| ------------------ | ------------- | ------------------ |
| 2026-09-18 (قبل)   | 10,482        | القياس الأول       |
| 2026-09-18 (--fix) | 10,145        | -337 إصلاحاً آلياً |
| 2026-09-18 (يدوي)  | ~10,082 متوقع | ~63 إصلاحاً يدوياً |

## العواقب

- أي PR يضيف خطأ lint إجمالياً → CI أحمر (قابل للإنفاذ أخيراً).
- تصفية الدين تتم فقط لأسفل: كل إصلاح يخفض الرقم ويُقفل في نفس الـ commit.
- المرحلة 2 (فرز strict-boolean-expressions/إصلاح no-unsafe-*) تتبع هذا الملف.
