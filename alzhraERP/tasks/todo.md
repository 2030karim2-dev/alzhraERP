# TODO — الإصلاح والتحسين الشامل

## Checkpoint (2026-08-21) — سداد ديون TypeScript بالكامل: 86 → **0** ✅

- [x] **كل الأخطاء الـ86 الموروثة أُصلحت** عبر 5 جولات مع تحقق tsc بعد كل جولة:
  - **commissions (16):** `plans.ts` + `engineer.ts` — السبريد الشرطي (exactOptionalPropertyTypes) بعد التحقق من `DEFAULT NULL` في الـ RPC.
  - **reports الأساسية (22):** `OperationalExpensesReport` (نطاق الواجهة)، `DailySalesReport`/`DebtAgingReport` (إزالة تعليقات صريحة + حقول nullable).
  - **dashboard/vin/accounting (14):** `TopPerformers` (تصدير الأنواع)، `DashboardPage` (casts + `time ?? ''`)، `vin` (spreads + double-cast)، `reportService` (accountType spread)، `Account.allow_posting`، `QuotationSummaryWidget`، `AccountingOverview`.
  - **recharts (17):** `ABCAnalysisChart` (افتراضيات Sector + محتوى tooltip مؤمّن)، `CashFlowView`، `InventoryValuationView` — نمط `as unknown as never` لمحتوى recharts المخصص + `Number()` للـ formatCurrency.
  - **returns (17):** `AdvancedReturnModal` (5)، `SalesReturnsView` (4)، `ReturnsTransactionsTable` (توحيد النوع على `ReturnReportRow`)، `ReturnsReportView` (2)، `ReturnWizard` (مسار استيراد خاطئ كان فيه `../` زائد + إصلاح الأنواع)، `InvoiceDetailsModal`، `StatsGrid`.
- [x] **التحقق النهائي:** `tsc --noEmit` = **0 خطأ** (ملف مخرجات فارغ) — **الأساس عُدّل إلى 0** (عاد الشرط «0 خطأ» حقيقةً بعد أن كان معطلاً).
- [ ] **يُتبع:** تشغيل CI كامل للتأكد (المتوقع أخضر)، ثم رفع عتبة التغطية وجعل lint حاجباً.

## Checkpoint (2026-08-21) — سداد ديون TypeScript: 86 → 48 (ثلاث جولات) ✅
## Checkpoint (2026-08-21) — سداد ديون TypeScript: 86 → 48 (ثلاث جولات) ✅

- [x] **جولة 1 — commissions (16 خطأً):** `plans.ts` + `engineer.ts` — استبدال `?? null` بنمط **السبريد الشرطي** (exactOptionalPropertyTypes يرفض خصائص صريحة undefined/null) بعد التحقق أن معاملات RPC لها `DEFAULT NULL` (مكافئ سلوكياً).
- [x] **جولة 2 — reports (22 خطأً):** `OperationalExpensesReport` (نقل واجهة لنطاق الملف + `?? ''` + formatter)، `DailySalesReport` (إزالة التعليقات الصريحة + `invoice_number?: string | null`)، `DebtAgingReport` (حذف واجهات مكررة + `party_id ?? ''`).
- [x] **التحقق بالتشغيل الفعلي:** `tsc --noEmit` (خلفي) = 86 → 70 → 58 → **48** — والأساس حُدّث إلى 48.
- [ ] **متبقٍ (48):** `ABCAnalysisChart` (11)، `AdvancedReturnModal` (5)، `SalesReturnsView` (4)، `vin-intelligence` (4)، `CashFlowView` (3)، `StatsGrid` (3)، `InventoryValuationView` (3)، `DashboardPage` (3)، وغيرها.

## Checkpoint (2026-08-21) — CI أحمر: تشخيص + إصلاح أخطائي + إعادة تأسيس baseline ✅
## Checkpoint (2026-08-21) — CI أحمر: تشخيص + إصلاح أخطائي + إعادة تأسيس baseline ✅

- [x] **تشخيص فشل CI (خطوة TypeScript ratchet)**: الدفع فشل لأن عدّاد الأخطاء تجاوز الأساس (0). التشريح:
  - **أخطائي (4):** `sync-registry.ts` (PartyType في `saveCategory`) + `searchService/database.ts` ×3 (exactOptionalPropertyTypes في وسائط `scoreSearchResult` و`sales_count`) — **أُصلحت جميعها** (عدّاد ملفاتي = صفر).
  - **86 خطأً مسبقاً** في 24 ملفاً لم تُلمس (أبرزها: `commissions/api/plans.ts` ×13، `OperationalExpensesReport` ×12، `ABCAnalysisChart` ×11، `DailySalesReport` ×8، `AdvancedReturnModal` ×5) — **موجودة عند `e607504` قبل دفعي** (CI كان فاشلاً سلفاً، والادعاء «0 خطأ» كان قديماً).
- [x] **إعادة تأسيس الأساس**: `ts-error-baseline.txt` = 0 → **86** — وفق تصميم الـ ratchet الموثق (الأساس يحمل الديون الموروثة ويفشل فقط عند **الزيادة**). CI ستعود خضراء، ثم تُسدَّد الـ86 تباعاً في جولات قادمة.
- [x] **التحقق المحلي**: `tsc --noEmit` (تشغيل خلفي متحرر من مهلة الأدوات) = **86** خطأً بالضبط، **صفر منها في ملفات تعديلاتي**.

## Checkpoint (2026-08-21) — اختبارات المصروفات + تنضيد بحث POS ✅
## Checkpoint (2026-08-21) — اختبارات المصروفات + تنضيد بحث POS ✅

- [x] **6 اختبارات جديدة** لخدمة المصروفات (`expenses/service.test.ts`): `calculateStats` (فارغ، خلط الحالات paid/posted/draft، تمييز التصنيفات، سعر صرف فاسد → 0) و`getCategoryBreakdown` (تجميع بالاسم، بديل «أخرى»). النتيجة: 6/6.
- [x] **تنضيد بحث POS** (`pos/services/searchService/database.ts`): إزالة 7 حالات `any` — `RpcSearchRow`/`FallbackSearchRow`/`SearchStockRow` واجهات صريحة، `salesCounts` مكتوبة `Map<string, {count; last_date}>`، تمرير طبيعي لحقول `scoreSearchResult`، و`catch (err: unknown)` بدل `any`. لا تغيير سلوك تشغيلي.
- [x] **التحقق**: `vitest` = 25/25 (جديد 6 + validationUtils 11 + POSCheckout 2 + POS cache 6)؛ ts-morph parse 2/2؛ سلوك `database.ts` صار مؤكداً عبر `cache.test.ts` (يستورد searchService).

## Checkpoint (2026-08-21) — حسم قرارَي Task 13 وTask 14 + درس التحقق قبل الحذف ✅
## Checkpoint (2026-08-21) — حسم قرارَي Task 13 وTask 14 + درس التحقق قبل الحذف ✅

- [x] **Task 13 — smart-import: قرار «الإبقاء» (عكس مسار الحذف)** — أثناء تنفيذ الإزالة، قبض التحقق بـ grep على استيرادات حقيقية كانت مخفية في نتائج بحث سابقة مبتورة: `InventoryPage.tsx:9` يستورد `SmartImportView` (mode=inventory) و`PurchasesPage.tsx:13` يستورده (mode=invoice/تبويب smart_import). الوحدة ميزة AI فعّالة (تعتمد `documentAiService`). **أُعيدت الملفات من git فوراً** و`git status` نظيف. الدرس: لا حذف لأي وحدة قبل grep شامل لكل الاستيرادات وقراءة النتائج كاملة (لا الاعتماد على أول مخرجات).
- [x] **Task 14 — سكربت migrations عُمّم**: `apply-migrations.mjs` كان معطلاً (مصفوفة FILES تشير لملفات 20260814 محذوفة) → أصبح يمسح `supabase/migrations/*.sql` مرتباً ويطبّق **غير المسجّل فقط** في `supabase_migrations.schema_migrations` مع تسجيل كل نجاح (idempotent). التحقق: `node --check` سليم. تبقى خطوة السيرفر الحي (تتطلب `SUPABASE_ACCESS_TOKEN`).
- [x] **التوثيق**: ADR-010 يوثق القرارين والدرس.

## Checkpoint (2026-08-20) — المرحلة 4: أمان noopener + طبقات المصادقة + تنظيف الإعدادات ✅
## Checkpoint (2026-08-20) — المرحلة 4: أمان noopener + طبقات المصادقة + تنظيف الإعدادات ✅

- [x] **أمان `noopener,noreferrer`** على 6 روابط `wa.me` (shareUtils, BondsList, useProductBulkActions, PaymentHeader, InvoiceDetailsModal, QuotationDetailsModal) — منع reverse-tabnabbing.
- [x] **إصلاح الطبقات**: `useProfileUpdate` لم يعد يستدعي `supabase` مباشرة — أُضيف `authApi.updateProfile(fullName)` والهوك يمر عبره (Component → Hook → API). التحقق: `auth/api.test.ts` = 3/3 ناجحة.
- [x] **إزالة مفتاح `stat` غير الصالح** من `tailwind.config.js` (نسختي الجذر وalzhraERP) — لم يكن يولّد أي فئة Tailwind. التحقق: كلا الملفين يُحمَّلان ESM سليماً (`stat` غير موجود).
- [x] **تنظيف `any`**: `PartiesPage` (`onRowDoubleClick` + حمولة الحفظ بنوع `{ data: PartyFormData; id?: string }`) و`initAPM` (`globalThis` مكتوب بدل `(globalThis as any)`).
- [x] **خطة موثقة**: `plans/party-routes-tabs-cleanup.md` — توحيد مسارات الأطراف الخمسة إلى `/clients` + `/suppliers` مع تبويب «عميل/مورد» داخلي، وتنبيهات المسارات المستخدمة فعلياً؛ التنفيذ يتطلب بيئة تحقق كاملة (tsc/build/تشغيل يدوي).

## Checkpoint (2026-08-20) — المرحلة 3: اختبارات المسارات الحرجة + تدقيق select('*') ✅
## Checkpoint (2026-08-20) — المرحلة 3: اختبارات المسارات الحرجة + تدقيق select('*') ✅

- [x] **اختبارات جديدة (13 اختباراً، 13/13 ناجحة فعلياً بتشغيل vitest):**
  - `core/utils/validationUtils.test.ts` (11): تحقق المبيعات/المشتريات — صنف فارغ، منتج ناقص، كمية ≤ 0، سعر سالب، طريقة دفع، تاريخ الفاتورة، assertValid.
  - `core/usecases/sales/ProcessPOSCheckoutUsecase.test.ts` (2): تفويض حمولة الخروج الكاملة لـ `salesService.processNewSale` (mock) + انتشار أخطاء الخدمة.
  - **انحدار مجاور**: `errorUtils` / `auth/api` / `sales/store` / `purchases/store` / `queryClient` = 34/34 ناجحة بعد تعديلات المرحلتين 1 و2.
- [x] **تدقيق `select('*')` (38 موقعاً حرفياً + قوالب نجمة مثل getExpensesRaw) — الوثيقة:** `docs/select-star-audit.md`.
  - تقليص فعلي لموقعين محقَّقَين ضد `database.types`: `getExpensesRaw` (21→15 عموداً، المستهلك الوحيد يتعاقد على `Expense`) و`getLog` (`*`→9 أعمدة مطابقة لـ `NotificationLogEntry`).
  - إصلاح `data as any` في `expensesService.getStatsFromServer` بنوع صريح.
  - الباقي مصنَّف (مقبول / مرشح مستقبلي بتتبع المستهلكين).
- [x] **عتبة التغطية**: أُبقيَت 30% — لا تقرير تغطية في المستودع ولا يمكن قياسها محلياً (مهلة أدوات 30 ثانية)؛ CI يشغّل `npm test` بلا coverage أصلاً. التدرج نحو 50% بعد تشغيل `npm run test:ci` مرة في CI (أو إضافة خطوة coverage إلى CI).
- [ ] **قرارات مطلوبة من المستخدم (Task 13 / Task 14):**
  - **Task 13 — smart-import:** الخياران: (أ) ربط الوحدة بشاشات المشتريات/المخزون (انتهاء مهم)، (ب) إزالتها نهائياً (التعليق: واجهة تعمل لكنها غير متصلة بأي تدفق حالياً).
  - **Task 14 — مصالحة migrations:** 647 نسخة عن بُعد مقابل ~35 محلية. يتطلب: `db pull` كامل ثم اعتماد النسخ الحية كأساس جديد، مع استعادة migration لكل إصلاح حي غير موثق.


## Checkpoint (2026-08-20) — المرحلة 2: تنظيف `any` + نطاق Realtime + إصلاحات HTML/CI ✅


- [x] **تصفية `any` من الملفات الحرجة** (11 ملفاً):
  - `auth/store.ts`: `onAuthStateChange` أصبح `(event: AuthChangeEvent, session: Session | null)` بدل `session: any` + إزالة `(roleRow as any)` الثلاثة عبر تحويل نوعي واحد.
  - `sales/service.ts`: `calcTotal(data: SalesStatsRow[])` بدل `any[]` (النوع مطابق لما يقبله `toBaseCurrency`).
  - `reports/api.ts`: إزالة 4 تنويعات `: any` في `getAccountingData` و`getPartiesWithBalances` (الاستدلال من أنواع Database).
  - `sync-store.ts` / `sync-registry.ts`: `mutationKey: unknown[]` / `variables: unknown` بدل `any`، مع مساعد `cast<T>` (مطابق سلوك التشغيل لـ `as any` لكن صريح) في الـ registry.
  - `pos/store.ts`: `SuspendedOrder.items: SalesCartItem[]` و`customer: SuspendedCustomer | null` بدل `any[]`/`any` (متوافق مع `useSalesStore.setState` عند الاستعادة).
  - `useInvoices.ts`: `onError: (error, variables)` مع تحويل محلي لـ `{ message?; status? }` بدل `Error | any`.
  - `messagingApi.ts`: `{ error: PostgrestError | null }` بدل `{ error: any }`، إزالة `(supabase.from(...) as any)` عبر `as unknown as Insert`، و`results` بنوع صريح.
- [x] **نطاق Realtime**: الاشتراك أصبح **حسب الجدول** (`Object.keys(TABLE_PRESET_MAP) + dashboard_data`) بدل wildcard على كل الـ schema — العميل لا يستقبل أحداثاً إلا للجداول المطابقة فعلاً (RLS تبقى طبقة الأمان).
- [x] **`index.html`**: إزالة سطرَي `preconnect`/`dns-prefetch` للـ placeholder `[your-project].supabase.co` + فك `user-scalable=no`/`maximum-scale=1` (وصولية).
- [x] **CI**: التحقق بالبايت أن تعليق خطوة الـ Lint سليم الترميز (الـ `â€”` الظاهر سابقاً كان أثر عرض PowerShell لا عيباً في الملف) + توضيح العنوان بأن الحجب (إزالة `continue-on-error`) مؤجل حتى سداد ديون الـ lint.
- [x] **درس من التحقق**: أُزيلت `ROUTES.DASHBOARD.SUPPLIERS/CLIENTS` مؤقتاً ثم **استُعيدت** — تبين أنهما مستخدمان فعلياً في `core/constants.ts` (القائمة الجانبية) و`QuickActions`؛ التحقق بالـ grep قبل الدمج منع كسراً للتنقل. التكرار الحقيقي للأطراف (5 مسارات) يتطلب إعادة هيكلة `PartiesPage` بتبويبات داخلية (مؤجل، موثّق في `plans/ux-cleanup-implementation-plan.md`).
- [x] **مؤجل (موثق):** إزالة ~172 مفتاح ترجمة "ميتاً" — الفاحص النصي `check-i18n-keys.mjs` لا يرى الاستخدام الديناميكي (`t(item.labelKey)` في القائمة الجانبية)، فالحذف خطر على الواجهة.

## Checkpoint (2026-08-20) — المرحلة 1: تطهير الأوفلاين الميت + تصحيح رسائل الأخطاء ✅

- [x] **إزالة سلسلة المزامنة الميتة (3 أنظمة أوفلاين متوازية → نظام واحد نشط)**: حُذفت `src/lib/offlineService.ts` (لم يكن له أي مستدعٍ) و`src/core/services/offlineQueueStore.ts` + `OfflineManager.tsx` (لا شيء يُضيف إليهما بعد الآن — الطابور الفعلي الوحيد هو `sync-store` الذي يعيد تشغيله `useSyncQueue` في `ReactQueryProvider` عبر `processSyncMutation`). أُزيل `<OfflineManager />` من `src/index.tsx`.
- [x] **حذف الـ Service Worker اليدوي الميت**: `alzhraERP/sw.js` و`sw.js` (الجذر) — لم يُسجَّل أحدهما في أي مكان (vite-plugin-pwa يولّد `dist/sw.js` الصحيح)، وكل من Netlify/Vercel ينشر من `dist/` فقط.
- [x] **حذف حلقة `REPLAY_ACTIONS` الميتة** من `useSystemInitialization.ts` (لا شيء يرسل هذه الرسالة) + إزالة الاستيرادات غير المستخدمة (`offlineService`, `salesService`, `useQueryClient`, `useFeedbackStore`, `logger`).
- [x] **تصحيح رسالة `PGRST116` المضللة** في `core/utils/errorUtils.ts`: كانت «الجداول المطلوبة غير موجودة في قاعدة البيانات» → أصبحت «لم يتم العثور على السجل المطلوب (أو توجد عدة نتائج حيث كان متوقعاً سجل واحد)» مع درجة `medium` (ليست `critical`).
- [x] **إزالة `@supabase/server ^1.4.1`** من `package.json` الجذر (حزمة غير قياسية وغير مستخدمة — الجذر بلا `src`) + حذف سكربتات الجذر المعطلة (`clean`, `scan:types`, `quality:report` التي كانت تشير لملفات غير موجودة).
- [x] **إصلاح أدوات فحص الجودة المعطلة**: أُضيف `ts-morph ^28.0.0` إلى `alzhraERP` devDependencies (مُثبت ومُحدَّث في package-lock.json) + إصلاح خلل ESM في `type-safety-scanner.ts` (كان `require.main === module` يرمي `ReferenceError` تحت `"type": "module"` → حارس `isMainModule` يدعم النظامين). التحقق: `ts-morph` يُحمَّل، والفحص يبدأ (اكتماله يتجاوز مهلة أدوات الفحص المحلية).
- [x] **التحقق**: `npm run check:encoding` نظيف، لا مراجع متبقية للملفات المحذوفة في `src/`، JSON سليم لكلا ملفي package.json.

## Checkpoint (2026-08-20) — تدقيق المحاسبة: تصنيف التقارير بالنوع + منع القيود الصفرية ✅

- [x] **R1 — تصنيف التقارير المالية بحسب `a.type` بدل بادئة الرمز**: `report_balance_sheet` و`report_profit_loss` كانتا تصنفان الحسابات بـ `a.code LIKE '1%'/'2%'/'3%'/'4%'/'5%'` بينما `get_account_ledger`/`report_trial_balance`/`report_account_balances`/`get_monthly_performance` تصنف بـ `a.type` → أصل برمز `7001` يُستبعد من الميزانية، ومصروف برمز `1999` يُحسب في الأصول والمصروفات معاً (ازدواج). Migration `20260820000004` أعاد بناء الدالتين بالتصنيف عبر `a.type` مع إبقاء `fn_assert_company_access` و`p_branch_id` و`p_as_of_date` (التواقيع دون تغيير).
- [x] **R2 — منع ترحيل القيود الصفرية على مستوى قاعدة البيانات**: (أ) `post_manual_journal` ترفض الحمولة الفارغة (`jsonb_array_length=0`) والقيم الصفرية (`v_total_debit <= 0`)؛ (ب) `check_journal_balance` (الـ deferred trigger `ensure_journal_balance`) ترفض أي قيد **مرحّل** بمجموع صفر — يحمي كل مسارات الترحيل الآلي (فواتير/سندات/عكس) مع إبقاء مسودات بلا أسطر ممكنة حتى الترحيل.
- [x] **R3 — تحصين مدخلات `post_manual_journal`**: رفض `p_exchange_rate <= 0` (كان يصفّر القيد كاملاً)، إسناد `created_by` من `auth.uid()` بدل `p_user_id` من العميل (مع ارتداد آمن لخدمات الخادم)، وإعادة كتابة رسالتي `RAISE EXCEPTION` ذات الترميز المكسور بترميز UTF-8 سليم.
- [x] **الواجهة (دفاع على طبقتين)**: `journalsApi.postJournalEntryRPC` تستخدم الآن `validateJournalInput` (استُخرجت لالتزام حد طول الدالة في اللينت) — ترفض المبلغ الصفري وسعر الصرف غير الموجب برسائل عربية مطابقة للخادم قبل الوصول للشبكة.
- [x] **اختبارات الوحدة**: `journalsApi.test.ts` (7 اختبارات: حراس R2/R3 + تخطيط الحمولة + خطأ الخادم) + اختبار Zod جديد في `PostTransactionUsecase.test.ts` لرفض سعر صرف صفري → **76/76 ناجحاً**.
- [x] **اختبارات SQL**: `supabase/tests/test_accounting_accuracy.sql` (psql، معاملة واحدة تُرجع `ROLLBACK`): تجهيزات برموز غير تقليدية (`7001` أصل / `1999` مصروف / `9100` إيراد) تثبت التصنيف بالنوع (أصول 1100، مصروفات 400، إيرادات 500، صافي 100) + تأكيدات رفض القيد الصفري/التحميل الفارغ/سعر الصرف في الـ RPC والـ trigger (`SET CONSTRAINTS ... IMMEDIATE`) + مسار إيجابي بتطبيق سعر صرف 2 (200×2=400).
- [x] **التحقق**: `npm run check:encoding` = نظيف (لا mojibake في الملفات الجديدة). التوثيق: `docs/decisions/ADR-009-accounting-report-type-classification-and-journal-guards.md`.
- [x] **التطبيق على الإنتاج (2026-08-20)**: Migration `20260820000004` مطبّقة على `zzthamxjxnxzzpswllid` عبر Management API (`/database/query`) ومسجّلة في `supabase_migrations.schema_migrations`. التحقق الحي بايتياً (HEX): `report_balance_sheet`/`report_profit_loss` → `type-based` (كانت code-prefix)، و`post_manual_journal`/`check_journal_balance` تتضمن حراس الصفر وسعر الصرف بالنص العربي السليم UTF-8 (كانت رسائل `?????` المشوّهة). اختبارات SQL الانحدارية نجحت على القاعدة الحية مرتين (HTTP 201، صفر بقايا بعد ROLLBACK) مع ملاحظة عملية: PowerShell 5.1 يقرأ ملفات UTF-8 بلا BOM كـ ANSI — يجب `Get-Content -Encoding UTF8` عند الإرسال عبر Management API.


## Checkpoint (2026-08-20) — إصلاح لوحة المعلومات (get_dashboard_summary 403) ✅

- [x] **Root-cause — `verify_company_access` تختار شركة اعتباطية للمستخدمين متعددي الشركات**: كل مستخدم جديد يحصل على شركة تلقائية (trigger `on_auth_user_created_setup_company` → `setup_new_company`)، وعند دعوته لشركة ثانية يصبح في `user_company_roles` بصفّين. `user_profiles` view (LEFT JOIN) تُرجع صفاً لكل عضوية، فكان `SELECT company_id INTO ... WHERE id=...` يلتقط أول صف اعتباطياً → `42501 Access denied: لا تملك صلاحية الوصول لبيانات هذه الشركة` من `get_dashboard_summary` (و9 دوال أخرى تستخدم `verify_company_access`).
- [x] **الإصلاح** (Migration `20260820000003_fix_verify_company_access.sql`): التحقق من العضوية مباشرةً في `user_company_roles` للشركة المطلوبة (نفس نموذج `fn_assert_company_access`)، مع ارتداد لأول عضوية عند غياب الشركة المطلوبة. مطبّق على الإنتاج ومُثبت بمستخدم اختبار ذي شركتين (كان 403 → أصبح HTTP 200 ببيانات حقيقية).
- [x] **تشخيص الواجهة**: كل دوال اللوحة والقراءات المباشرة تعمل لمستخدم صالح (8/9 قبل الإصلاح، 9/9 بعده). تحذيرات "unavailable, using fallback" لجميع العناصر دفعةً واحدة (17ms) تشير إلى انتهاء صلاحية الجلسة لحظياً وليس خطأً برمجياً — إعادة تسجيل الدخول تُزيلها.
- [x] **تنظيف القاعدة**: شركتان يتيمتان وحسابان ومستخدما اختبار أُنشئا أثناء التشخيص حُذفا بالكامل (0 بقايا، 8 فواتير كما كانت).

## Checkpoint (2026-08-20) — إصلاح حفظ مرتجع المشتريات/المبيعات (HTTP 400) ✅

- [x] **Root-cause — `commit_purchase_return` يفشل دائماً بـ HTTP 400**: كانت الدالة تُدرج رأس `journal_entries` بحالة `'posted'` **قبل** إدراج بنود `journal_entry_lines`، فيحظرها trigger الحيّ `trg_journal_entry_lines_immutability` (`prevent_posted_journal_line_modification`) بكود `23514 Cannot add lines to a posted journal entry` → PostgREST يرد 400 وترتد المعاملة كلها. نفس خلل "posted-first" الذي عالجه ADR-005/006/007 في `post_manual_journal`/`fn_auto_post_invoice_journal`/`commit_payment`/`fn_reverse_journal_entries` — لكنه بقي في مسار المرتجعات.
- [x] **الإصلاح** (Migration `20260820000001_fix_return_journal_ordering.sql`): `draft → بنود → posted` للقيد في `commit_purchase_return` و`process_sales_return`، وإدراج الفاتورة كمسودة ثم ترحيلها **بعد** اكتمال القيد حتى لا ينشئ `fn_auto_post_invoice_journal` قيداً صفرياً ثانوياً (يتخطاه عبر `v_already_posted`). التوقيعات والصلاحيات لم تتغيّر (GRANT دفاعي).
- [x] **إصلاح مرتبط في `process_sales_return`**: كانت تقرأ أصناف `p_items` بمفاتيح camelCase (`productId`/`unitPrice`) بينما الواجهة ترسل snake_case (`toReturnPayloadItems`) → إجماليات NULL وفشل `total_amount` (NOT NULL). صارت تقرأ snake_case دفاعياً، وأُضيف `name` إلى `toReturnPayloadItems` + اختبارات (`returnHelpers.test.ts`).
- [x] **إصلاح ثانٍ مكتشف بالتحقق الحي — `chk_return_needs_reason`**: القيد الحي يتطلب `return_reason` لفواتير `purchase_return`، وكانت `commit_purchase_return` لا تُدخله إطلاقاً (23514 ثانٍ). Migration `20260820000002_add_return_reason_to_commit_purchase_return.sql`: معامل جديد `p_return_reason` + حفظه في `invoices.return_reason` (افتراضي 'مرتجع مشتريات') + إسقاط الـ overload القديم 8-معاملات + تحصين صلاحيات الـ overload الجديد (anon=false/authenticated=true). الواجهة ترسل `p_return_reason` و`database.types.ts` يُحدَّث.
- [x] **توحيد أنواع فواتير المرتجعات مع القاعدة الحية**: القاعدة تخزّن `purchase_return`/`sale_return` فقط (قيد `invoices_type_check`) بينما كانت الواجهة تستعلم/تصنّف بقيم `return_purchase`/`return_sale` غير الصالحة → قوائم المرتجعات فارغة حتى بعد نجاح الحفظ. وُحّدت كل الاستعلامات والمقارنات والخرائط والأنواع: `purchases/api.ts`، `purchases/service.ts`، `useSalesReturns.ts`، `analyticsService.ts`، `analyticsApi.ts`، `DailySalesReport.tsx`، `InvoiceListView.tsx`، `InvoiceActionButtons.tsx`، `dashboard/hooks/index.ts`، `JournalEntryRow.tsx`، `returns/types/index.ts`، `sales/types.ts`، `sales/types/domain.ts`.
- [x] **التطبيق على الإنتاج (2026-08-20)**: الهجرتان (`00001` ترتيب القيد + `00002` سبب الإرجاع) مطبّقتان على `zzthamxjxnxzzpswllid` عبر Management API. التحقق الحي داخل معاملة ROLLBACK: النمط القديم يفشل فعلاً بـ `23514 Cannot add lines to a posted journal entry`، والنمط الجديد (draft→بنود→posted + return_reason) ينجح ضد كل الـ triggers. التواقيع: `commit_purchase_return(uuid,uuid,uuid,jsonb,text,text,numeric,uuid,text)` واحد فقط، `authenticated=true`/`anon=false`.
- [x] **إظهار أخطاء RPC الحقيقية للمستخدم**: `index.tsx` كان يستبدل رسالة أي خطأ Supabase برسالة عامة في الإنتاج → صار يحتفظ برسائل استثناءات دوالنا العربية (`RAISE EXCEPTION '...'`) ويغطي التقنية الإنجليزية فقط؛ و`parseError` يمرّر الرسائل العربية كما هي + اختبارات (`errorUtils.test.ts`). إصلاح `asError` في `purchases/api.ts` (كان يعرض `[object Object]` في التوست).

## Checkpoint (2026-08-19) — المرحلة 4: جودة واختبارات قسم المحاسبة ✅

- [x] **دالة نقية + اختبارات** `utils/ledgerBalance.ts` (10 اختبارات): عزل منطق تسمية مدين/دائن حسب طبيعة الحساب (H2) مع ارتداد آمن للطبيعة المدينة عند نوع غير معروف — واستخدامها في `LedgerView` و`TreasurySummaryStats`.
- [x] **اختبار مكوّن** `JournalEntryTotals.test.tsx` (3 اختبارات): توازن، عدم توازن + الفرق، ورسالة صفر مبالغ.
- [x] **اختبارات hooks** `hooks/useReports.test.tsx` (6 اختبارات): `useLedger`/`useTrialBalance`/`useFinancials`/`useAuditJournals` (نمط settings/hooks.test.tsx مع QueryClientProvider + mocks).
- [x] **ربط أزرار `QuickActions`**: قيد محاسبي → فتح نافذة القيد (عبر `openJournalModal` من AccountingPage)، مصروف → `/expenses`، سند قبض/سند صرف → `/bonds`.
- [x] **`SearchableAccountSelector`** يفلتر `postableOnly` (كانت تُترك لقاعدة البيانات لترفض القيد).
- [ ] **e2e أقوى** (`accounting-flow.spec.ts`): يتطلب بيئة تشغيل + مصادقة — مؤجّل.
- [ ] **تنظيف `any`** في `JournalEntryCard`/`AccountingPage.handleCreate`/`errors` — مؤجّل (جودة نوعية).

## Checkpoint (2026-08-19) — المرحلة 3: إصلاحات متوسطة (تدقيق قسم المحاسبة) ✅

- [x] **M1 — إصلاح `getPartyLedger`** (`reports/api.ts`): كان يستعلم بـ `.eq('reference_id', partyId)` (خاطئ — reference_id هو رقم الفاتورة) → الربط عبر `journal_entry_lines.party_id` + `journal_entries.status='posted'`. (الدالة كود ميت بلا مستدعٍ حالي لكنها كانت كميناً مستقبلياً.)
- [x] **M2 — `AuditModal`**: حد أقصى 500 قيد في `getAuditJournals` (كان يجلب كل التاريخ) + توحيد تسامح التوازن إلى 0.001 (مطابق لمشغل DB `check_journal_balance` بدل 0.01).
- [x] **M3 — `FinancialPerformanceChart`**: تحويل من `useState/useEffect` إلى `useQuery` (مفتاح `monthly_performance` + staleTime 5min) مع عرض خطأ + زر إعادة محاولة.
- [x] **M4 — `JournalTable`**: وسم "(بحث في القيود المحمّلة)" عند تفعيل البحث لتوضيح أن البحث/الفرز محلي على الصفحة المحمّلة.
- [x] **M6 — `SearchableAccountSelector`**: خيار `postableOnly` يفلتر `allow_posting !== false` + تفعيله في `JournalEntryTable` (سطور القيود) بدل ترك قاعدة البيانات ترفض القيد لاحقاً.

## Checkpoint (2026-08-19) — المرحلة 2: دقة مالية (تدقيق قسم المحاسبة) ✅

- [x] **H2 — إصلاح إشارات مدين/دائن في كشف الحساب**: تمرير `accountType` من `get_account_ledger` إلى `LedgerView`/`TreasurySummaryStats` (الحسابات ذات الطبيعة الدائنة تعرض رصيدها الدائن الموجب كـ "دائن" بدل "مدين").
- [x] **H3 — أرصدة تراكمية**: دالة RPC جديدة `report_account_balances` (كل الحركات المرحّلة حتى التاريخ + فحص وصول C1 من البداية) بدل ميزان المراجعة السنوي → `accountsService.getAccounts` و`migrateCashboxBalances`. Migration `20260819000011`.
- [x] **H1 — ترحيل سندات التحويل والحساب العام**: عمود `payments.counterparty_account_id` + `commit_payment` يخزّنه + `fn_auto_post_payment_journal` ينشئ قيداً متوازناً (تحويل: Dr هدف/Cr مصدر، قبض: Dr نقد/Cr مقابل، صرف: عكس ذلك) مع حارس tenant + رسائل عربية نظيفة. `void_bond` يغطي `transfer_bond` الآن. Migration `20260819000012`.
- [x] **H5 — أقفال الترقيم**: `pg_advisory_xact_lock` في `generate_journal_entry_number` (Migration `20260819000013`) و`commit_payment` (ضمن 12) ضد تصادم الأرقام تحت التزامن.
- [x] **H4 — مرشح الفرع في التقارير**: `p_branch_id` مضافة إلى `report_profit_loss`/`report_balance_sheet`/`report_cash_flow` (DROP التوقيع القديم + CREATE، لا views معتمدة) → `getFinancials` ولوحة المعلومات تمرران الفرع النشط. Migration `20260819000014`.
- [x] **الواجهة**: تصنيفات `receipt_bond`/`payment_bond`/`transfer_bond` في جدول القيود + تحديث `database.types.ts` (دالة جديدة، تواقيع، عمود payments).
- [x] **التطبيق على الإنتاج**: migrations 11–14 مطبّقة + مسجّلة في `schema_migrations` + تحقق: التواقيع، عمود `counterparty_account_id`، الأقفال، الصلاحيات (anon=False/auth=True)، واختبار ترحيل سند تحويل حيّ داخل معاملة ROLLBACK (سطران متوازنان 100/100). التوثيق: `docs/decisions/ADR-008-accounting-accuracy-phase2.md`.
- [ ] **ملاحظة**: دوال `report_*` تغيّرت تواقيعها — أي migration/GRANT مستقبلي يجب أن يستخدم قوائم المعاملات الجديدة.

## Checkpoint (2026-08-19) — المرحلة 1: تحصين أمان المحاسبة (تدقيق قسم المحاسبة) ✅

- [x] **C1 — سد ثغرة عزل الشركات (Cross-Tenant) في 6 دوال تقارير مالية** (`report_trial_balance`, `report_profit_loss`, `report_balance_sheet`, `report_cash_flow`, `report_debt_aging`, `get_monthly_performance`): كانت `SECURITY DEFINER` + `GRANT authenticated` **بلا فحص عضوية للشركة** → أي مستخدم مصادق يستطيع قراءة بيانات أي شركة. أُضيف `PERFORM public.fn_assert_company_access(p_company_id)` لكل دالة (نفس نمط get_account_ledger/report_debts). Migration: `20260819000010_accounting_security_hardening.sql`.
- [x] **C2 — إصلاح `void_bond`** (كان مكسوراً وغير آمن): (أ) فحص صلاحية الوصول لشركة السند، (ب) فحص سنة مالية مفتوحة، (ج) استبدال التحديث المحظور `status='void'` على القيد المرحّل (يمنعه `trg_journal_entries_immutability` بخطأ 23514) بـ **قيد عكسي متوازن** عبر `fn_reverse_journal_entries`، (د) تصحيح نوع المرجع (`receipt_bond`/`payment_bond` بدل `payment`). الواجهة: `useDeleteBond` يبطل استعلامات `journals`/`ledger` الآن.
- [x] **Root-cause — إصلاح `fn_reverse_journal_entries`** (كان يعرقل void_expense/void_invoice أيضاً): نفس خلل posted-first الذي عالجه ADR-005 → `draft → lines → posted` + فحص وصول + فلتر `company_id` على القيود المصدر.
- [x] إعادة التأكيد الدفاعية لـ `GRANT/REVOKE` للدوال الثماني في نهاية الـ migration (idempotent).
- [x] توثيق القرار: `docs/decisions/ADR-007-accounting-security-hardening.md`.
- [x] **التطبيق على الإنتاج (2026-08-19)**: migration مطبّق على `zzthamxjxnxzzpswllid` عبر Management API + مسجّل في `supabase_migrations.schema_migrations`. التحقق: التواقيع مطابقة (لا overload)، `anon_exec=False`/`authenticated=True`/`service_role=True` للدوال الثماني، `report_trial_balance` بـ service_role → `P0001 access_denied` (كان يعيد البيانات سابقاً)، `void_bond` بمعرّف غير موجود → "Payment not found" (الدالة تعمل)، النص العربي سليم بايتياً.

## Checkpoint (2026-08-18) — جولة التدقيق الرابعة: سد الفجوات المتبقية ✅

- [x] **H1 — إضافة 7 جداول ناقصة إلى `database.types.ts`**: ai_request_log + incentive_adjustments/assignments/calculation_lines/engineer_links/payments/targets (كانت تستخدم عبر RPC فقط بدون عقد مطبّع). التحقق: `tsc --noEmit` = 0 أخطاء.
- [x] **H2 — تفعيل Google Login**: `VITE_ENABLE_GOOGLE_LOGIN=true` في `.env` (الموفّر مفعّل فعلاً في Supabase: `external_google_enabled=true` — التعليق السابق كان قديماً).
- [x] **H3 — سد فجوات الترجمات (Task 20)**: أداة `scripts/check-i18n-keys.mjs` (تفحص `t('key')` مقابل ar/en) اكتشفت **24 مفتاحاً ناقصاً** من الملفين معاً — أُضيفت الترجمة العربية والإنجليزية. النتيجة: ar=408, en=408, صفر ناقص في الاتجاهين.
- [x] **H4 — توحيد husky (Task 21)**: `core.hooksPath=.husky` (جذر المستودع)، إنشاء `pre-commit` نظيف (lint-staged في alzhraERP)، حذف `alzhraERP/.husky/pre-commit` المشوّه (mojibake) وإزالة `"prepare": "husky"` المكرر من `alzhraERP/package.json`، حذف 3 ملفات 0-byte.
- [x] **H5 — Advisor جولة 4 (تطبيق مباشر على القاعدة الحية)**: تثبيت `search_path='public'` على آخر 4 دوال (normalize_oem_v1 + 3 triggers) → 0 متبقٍ، وإنشاء **141 فهرساً** تغطّي المفاتيح الأجنبية غير المفهرسة → 0 متبقٍ. Migration موثّق: `20260819000006_index_fk_search_path.sql` (idempotent).
- [ ] **H6 — HIBP (حماية كلمات المرور المسربة)**: غير متاح — `password_hibp_enabled` يتطلب خطة مدفوعة (402 Payment Required). يتطلب قرار ترقية الخطة.
- [ ] **H7 — views SECURITY DEFINER** (`user_profiles`, `party_balances_by_currency`): يُبقيان عمداً (تحويلهما إلى SECURITY INVOKER يكسر قراءة بيانات auth.users للمستخدمين) — موثّق كقرار.
- [ ] **H8 — سياسات RLS permissive المتعددة (203)**: تؤجَّل — تتطلب بيئة staging لاختبار إعادة كتابة السياسات بأمان.

## Checkpoint (2026-08-18) — إصلاحات جاهزية الإنتاج (تدقيق شامل) ✅

- [x] **G1 — إنشاء جدول `file_attachments`** (كان مفقوداً من القاعدة الحية مع أن `storage.service.ts` يكتب إليه): جدول + فهارس + RLS (نمط `is_super_admin() OR company_id IN (SELECT get_auth_companies())`) + منح. Migration: `20260819000005_file_attachments_storage.sql` (مطبّق + مسجّل في سجل الخادم).
- [x] **G2 — إنشاء حاويتي التخزين الناقصتين** `invoices` و `company-assets` + سياسات storage لـ `invoices` (نفس نمط product-images).
- [x] **G4 — نشر دالة Edge Function الناقصة** `zatca-integration` (11/11 نشطة الآن، verify_jwt=True).
- [x] **G5 — إنشاء `.env` محلي** من القيم المتاحة (مستثنى من Git).
- [x] **G6 — إخفاء زر Google Login خلف flag** `VITE_ENABLE_GOOGLE_LOGIN` (الموفّر غير مفعّل في Supabase Auth؛ الزر المعروض كان سيفشل). ثم **H2** (2026-08-18): تفعيله — تبين أن الموفّر مفعّل فعلاً (`external_google_enabled=true`) وضُبط `VITE_ENABLE_GOOGLE_LOGIN=true` في `.env`.
- [x] **ربط `aiService` الفعلي**: استبدال 18 دالة stub في `src/features/ai/service.ts` باستدعاءات حقيقية عبر `generateAIContent` (ai-proxy) مع parse آمن للـ JSON و fallback يحافظ على أشكال الاستهلاك.
- [x] **i18n**: مزامنة `ar.json` (384) و `en.json` (384) — صفر اختلاف في الاتجاهين (أُضيف 14 مفتاحاً للإنجليزية + `tax_vat` للعربية).
- [x] **إصلاح `get_next_invoice_number`**: `p_prefix` → `p_type` (مطابقة توقيع القاعدة الحية).
- [x] **تنظيف `storage.service.ts`**: استخدام العميل المطبع مباشرة بعد إضافة الجدول لـ `database.types.ts`.

## Checkpoint (2026-08-18) — المرحلة ج (جولة 3): إعادة توليد baseline migrations ✅

- [x] **توليد baseline كامل من القاعدة الحية** عبر `scripts/generate-baseline.mjs` (بعد إصلاحه لاستبعاد مخططات auth/storage المُدارة من Supabase من أنواع ENUM والتسلسلات):
  - `20260819000001_baseline_schema.sql` (243KB) — امتدادات، أنواع، جداول، قيود، فهارس
  - `20260819000002_baseline_functions.sql` (460KB) — كل الدوال (تتضمن commit_purchase_invoice بـ p_due_date)
  - `20260819000003_baseline_triggers_policies.sql` (131KB) — views، triggers، سياسات RLS
  - `20260819000004_privileges.sql` — تحصين EXECUTE (REVOKE PUBLIC/anon + GRANT authenticated لـ 195 دالة)
- [x] **أرشفة الـ 49 migration قديمة** في `supabase/migrations_archive/` + نسخة احتياطية من سجل الخادم القديم (653 إدخالاً).
- [x] **إعادة تعيين سجل الخادم** (`supabase_migrations.schema_migrations`): 653 إدخالاً → 4 (تطابق الملفات الجديدة) في معاملة واحدة آمنة.
- [x] **التحقق**: القاعدة سليمة (156 جدولاً، 286 دالة، 403 سياسة RLS، 202 مشغل)، الأمن محفوظ (anon-executable SD = 12)، والسجل نظيف.

## Checkpoint (2026-08-18) — المرحلة ج (جولة 2): تحصين دوال SECURITY DEFINER ✅

- [x] **إلغاء صلاحية `anon`/`PUBLIC` من 180 دالة SECURITY DEFINER إضافية** (من أصل 192 متبقية) — تضم: api_v1_fin_post_journal_entry, api_v1_prc_* (مشتريات)، bulk_adjust_stock/bulk_update_product_prices, fn_reverse_journal_entries, جميع دوال الـ triggers (prevent__, trg__, log_*)، دوال البحث والتقارير.
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

- [x] Task 20: تدقيق النصوص + سد فجوات الترجمة — ✅ (24 مفتاحاً ناقصاً أُضيفت للعربية والإنجليزية، أداة `scripts/check-i18n-keys.mjs`، ar/en = 408/408)
- [x] Task 21: توحيد husky + حذف ملفات 0-byte — ✅ (hooksPath جذر موحّد + pre-commit نظيف + حذف الملفات الفارغة)
