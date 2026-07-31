# تقرير التدقيق الشامل – تطبيق Al-Zahra Smart ERP

> **التاريخ:** 2026-05-24  
> **المنهجية:** فحص يدوي آلي شمل 400+ ملف – تحليل المسارات الحساسة، الحسابات المالية، الصلاحيات، هيكلة الكود، وتجربة المستخدم.  
> **التصنيف:** 🔴 حرج | 🟠 عالي | 🟡 متوسط | 🟢 منخفض

---

## المحور الأول: الأخطاء والعيوب البرمجية

### 🔴 أخطاء حرجة – تؤثر على دقة النتائج المالية

<<<<<<< Updated upstream
| # | الموقع | الوصف | الأثر |
|---|--------|-------|-------|
| 1 | [`src/core/utils/decimalUtils.ts:147-154`](src/core/utils/decimalUtils.ts:147) | دالة `generateCalculationHash` تدّعي استخدام SHA-256 لكشف التلاعب لكنها تستخدم دالة `hash` بسيطة 32-bit غير مشفرة، مما يجعل كشف التلاعب بالحسابات المالية قابلاً للتجاوز بسهولة. | أي متلاعب يمكنه إعادة إنتاج نفس الهاش لقيم مختلفة، مما يُبطل آلية التدقيق SOX المزعومة. |
| 2 | [`src/core/validators/index.ts:103`](src/core/validators/index.ts:103) | التحقق من توازن القيد المحاسبي يستخدم حد تسامح ثابت `0.01` بينما [`decimalUtils.ts:44`](src/core/utils/decimalUtils.ts:44) يعرّف `SOX_BALANCE_TOLERANCE = 0.000001`. عدم الاتساق بين نظامي التحقق يؤدي إلى قبول قيود غير متوازنة بـ 0.01 SAR. | قيود محاسبية غير متوازنة قد تُسجّل، مما يسبب خللاً في ميزان المراجعة. |
| 3 | [`src/features/sales/store.ts:109`](src/features/sales/store.ts:109) | تحويل السعر في [`setProductForRow`](src/features/sales/store.ts:109) يستخدم `basePrice / state.exchangeRate` دون التحقق من أن `exchangeRate !== 0`، مما يسبب `Infinity` أو `NaN` عند سعر صفر. | أعطال في شاشة نقطة البيع مع إمكانية تسجيل فواتير بقيم غير محددة. |
| 4 | [`src/features/sales/store.ts:176-197`](src/features/sales/store.ts:176) | دالة [`calculateTotals`](src/features/sales/store.ts:175) تستخدم `useDiscountStore.getState()` داخل `set()` مما يسبب قراءة حالة خارجية داخل تحديث Zustand – وهذا نمط خطير يسبب عدم اتساق في الحالة وقد يؤدي لقيم إجمالي غير صحيحة عند تغير التخفيضات. | إجماليات فواتير غير دقيقة عند تفعيل/إلغاء التخفيضات. |
| 5 | [`src/features/sales/service.ts:86`](src/features/sales/service.ts:86) | في [`processNewSale`](src/features/sales/service.ts:63) يتم تفكيك `treasuryAccountId` من `payload` ثم إعادة إضافته بشكل مشروط `{ ...(finalTreasuryAccountId ? { treasuryAccountId: finalTreasuryAccountId } : {}) }`. إذا فشل `routeToChildByCurrency` بصمت، يُفقد الحساب دون سقوط آمن. | توجيه خاطئ للمدفوعات متعددة العملات إلى حسابات خزينة غير صحيحة. |

### 🟠 أخطاء عالية – تمنع إتمام العمليات المحاسبية

| # | الموقع | الوصف | الأثر |
|---|--------|-------|-------|
| 6 | [`src/core/usecases/accounting/PostTransactionUsecase.ts:6`](src/core/usecases/accounting/PostTransactionUsecase.ts:6) | `execute(data: any, ...)` يستخدم `any` للمدخلات مما يلغي فحص TypeScript بالكامل. أي حقل خاطئ يمرر إلى قاعدة البيانات. | تجاوز جميع فحوصات الأمان النوعية في أخطر عملية محاسبية. |
| 7 | [`src/features/accounting/api/journalsApi.ts:52-53`](src/features/accounting/api/journalsApi.ts:52) | التحقق من التوازن في `postJournalEntryRPC` يحسب الإجمالي باستخدام `Number(l.debit)` مع `|| 0` – هذا يحول `undefined` و `null` و `""` إلى صفر بصمت بدلاً من رفضها. | قبول قيود ببيانات تالفة دون تنبيه. |
| 8 | [`src/features/pos/pages/POSPage.tsx:309`](src/features/pos/pages/POSPage.tsx:309) | عرض العملة مثبت على `YER` بشكل ثابت: `{formatCurrency(summary.totalAmount)} YER`، متجاهلاً العملة الفعلية المخزنة في الحالة. | عرض عملة خاطئ للمستخدمين غير اليمنيين. |
| 9 | [`src/features/pos/pages/POSPage.tsx:48`](src/features/pos/pages/POSPage.tsx:48) | `initializeItems` يتم استدعاؤه مع القيمة `0` فقط (`if (items.length === 0) initializeItems(0)`) – استدعاء غير مفيد. | كود ميت مع احتمالية سلوك غير متوقع. |

### 🟡 أخطاء متوسطة – ثغرات في التحقق من صحة البيانات

| # | الموقع | الوصف | الأثر |
|---|--------|-------|-------|
| 10 | [`src/features/sales/store.ts:89`](src/features/sales/store.ts:89) | استخدام `@ts-expect-error` لتجاوز خطأ TypeScript في تعيين الحقول، مما يسمح بكتابة أي قيمة لأي حقل. | تجاوز فحص الأنواع، قابلية لإدخال بيانات غير صالحة. |
| 11 | [`src/core/utils/currencyUtils.ts:125`](src/core/utils/currencyUtils.ts:125) | `convertFromBaseCurrency` تتحقق `if (!exchangeRate \|\| exchangeRate === 1)` مما يُرجع المبلغ الأصلي عند `exchangeRate === 0` بدلاً من رمي خطأ كما في `convertToBaseCurrency`. | عدم اتساق في سلوك التحويل بين الاتجاهين. |
| 12 | [`src/core/utils/currencyUtils.ts:77`](src/core/utils/currencyUtils.ts:77) | `CurrencyError` تم تعريفها كـ `class` لكن لا تُستخدم أبداً في `convertFromBaseCurrency` – الدالة تبتلع الخطأ وتُرجع 0 عند `!Number.isFinite(amount)`. | إخفاء أخطاء تحويل العملات بصمت. |

### 🟢 أخطاء منخفضة

| # | الموقع | الوصف |
|---|--------|-------|
| 13 | [`supabase-types.ts`](supabase-types.ts) – ملف فارغ 0 حرف في جذر المشروع. | ملف وهمي لا فائدة منه. |
| 14 | [`src/features/sales/service.ts:13`](src/features/sales/service.ts:13) | `CASH_CUSTOMER_LABEL` معرفة كثابت محلي بدلاً من استخدام نظام الترجمة `i18n`. |
=======
| #   | الموقع                                                                         | الوصف                                                                                                                                                                                                                                                                                   | الأثر                                                                                   |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | [`src/core/utils/decimalUtils.ts:147-154`](src/core/utils/decimalUtils.ts:147) | دالة `generateCalculationHash` تدّعي استخدام SHA-256 لكشف التلاعب لكنها تستخدم دالة `hash` بسيطة 32-bit غير مشفرة، مما يجعل كشف التلاعب بالحسابات المالية قابلاً للتجاوز بسهولة.                                                                                                        | أي متلاعب يمكنه إعادة إنتاج نفس الهاش لقيم مختلفة، مما يُبطل آلية التدقيق SOX المزعومة. |
| 2   | [`src/core/validators/index.ts:103`](src/core/validators/index.ts:103)         | التحقق من توازن القيد المحاسبي يستخدم حد تسامح ثابت `0.01` بينما [`decimalUtils.ts:44`](src/core/utils/decimalUtils.ts:44) يعرّف `SOX_BALANCE_TOLERANCE = 0.000001`. عدم الاتساق بين نظامي التحقق يؤدي إلى قبول قيود غير متوازنة بـ 0.01 SAR.                                           | قيود محاسبية غير متوازنة قد تُسجّل، مما يسبب خللاً في ميزان المراجعة.                   |
| 3   | [`src/features/sales/store.ts:109`](src/features/sales/store.ts:109)           | تحويل السعر في [`setProductForRow`](src/features/sales/store.ts:109) يستخدم `basePrice / state.exchangeRate` دون التحقق من أن `exchangeRate !== 0`، مما يسبب `Infinity` أو `NaN` عند سعر صفر.                                                                                           | أعطال في شاشة نقطة البيع مع إمكانية تسجيل فواتير بقيم غير محددة.                        |
| 4   | [`src/features/sales/store.ts:176-197`](src/features/sales/store.ts:176)       | دالة [`calculateTotals`](src/features/sales/store.ts:175) تستخدم `useDiscountStore.getState()` داخل `set()` مما يسبب قراءة حالة خارجية داخل تحديث Zustand – وهذا نمط خطير يسبب عدم اتساق في الحالة وقد يؤدي لقيم إجمالي غير صحيحة عند تغير التخفيضات.                                   | إجماليات فواتير غير دقيقة عند تفعيل/إلغاء التخفيضات.                                    |
| 5   | [`src/features/sales/service.ts:86`](src/features/sales/service.ts:86)         | في [`processNewSale`](src/features/sales/service.ts:63) يتم تفكيك `treasuryAccountId` من `payload` ثم إعادة إضافته بشكل مشروط `{ ...(finalTreasuryAccountId ? { treasuryAccountId: finalTreasuryAccountId } : {}) }`. إذا فشل `routeToChildByCurrency` بصمت، يُفقد الحساب دون سقوط آمن. | توجيه خاطئ للمدفوعات متعددة العملات إلى حسابات خزينة غير صحيحة.                         |

### 🟠 أخطاء عالية – تمنع إتمام العمليات المحاسبية

| #   | الموقع                                                                                                                 | الوصف                                                                                                                        | الأثر                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| 6   | [`src/core/usecases/accounting/PostTransactionUsecase.ts:6`](src/core/usecases/accounting/PostTransactionUsecase.ts:6) | `execute(data: any, ...)` يستخدم `any` للمدخلات مما يلغي فحص TypeScript بالكامل. أي حقل خاطئ يمرر إلى قاعدة البيانات.        | تجاوز جميع فحوصات الأمان النوعية في أخطر عملية محاسبية. |
| 7   | [`src/features/accounting/api/journalsApi.ts:52-53`](src/features/accounting/api/journalsApi.ts:52)                    | التحقق من التوازن في `postJournalEntryRPC` يحسب الإجمالي باستخدام `Number(l.debit)` مع `                                     |                                                         | 0`– هذا يحول`undefined`و`null`و`""` إلى صفر بصمت بدلاً من رفضها. | قبول قيود ببيانات تالفة دون تنبيه. |
| 8   | [`src/features/pos/pages/POSPage.tsx:309`](src/features/pos/pages/POSPage.tsx:309)                                     | عرض العملة مثبت على `YER` بشكل ثابت: `{formatCurrency(summary.totalAmount)} YER`، متجاهلاً العملة الفعلية المخزنة في الحالة. | عرض عملة خاطئ للمستخدمين غير اليمنيين.                  |
| 9   | [`src/features/pos/pages/POSPage.tsx:48`](src/features/pos/pages/POSPage.tsx:48)                                       | `initializeItems` يتم استدعاؤه مع القيمة `0` فقط (`if (items.length === 0) initializeItems(0)`) – استدعاء غير مفيد.          | كود ميت مع احتمالية سلوك غير متوقع.                     |

### 🟡 أخطاء متوسطة – ثغرات في التحقق من صحة البيانات

| #   | الموقع                                                                       | الوصف                                                                                                                                                                          | الأثر                                              |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 10  | [`src/features/sales/store.ts:89`](src/features/sales/store.ts:89)           | استخدام `@ts-expect-error` لتجاوز خطأ TypeScript في تعيين الحقول، مما يسمح بكتابة أي قيمة لأي حقل.                                                                             | تجاوز فحص الأنواع، قابلية لإدخال بيانات غير صالحة. |
| 11  | [`src/core/utils/currencyUtils.ts:125`](src/core/utils/currencyUtils.ts:125) | `convertFromBaseCurrency` تتحقق `if (!exchangeRate \|\| exchangeRate === 1)` مما يُرجع المبلغ الأصلي عند `exchangeRate === 0` بدلاً من رمي خطأ كما في `convertToBaseCurrency`. | عدم اتساق في سلوك التحويل بين الاتجاهين.           |
| 12  | [`src/core/utils/currencyUtils.ts:77`](src/core/utils/currencyUtils.ts:77)   | `CurrencyError` تم تعريفها كـ `class` لكن لا تُستخدم أبداً في `convertFromBaseCurrency` – الدالة تبتلع الخطأ وتُرجع 0 عند `!Number.isFinite(amount)`.                          | إخفاء أخطاء تحويل العملات بصمت.                    |

### 🟢 أخطاء منخفضة

| #   | الموقع                                                                    | الوصف                                                                        |
| --- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 13  | [`supabase-types.ts`](supabase-types.ts) – ملف فارغ 0 حرف في جذر المشروع. | ملف وهمي لا فائدة منه.                                                       |
| 14  | [`src/features/sales/service.ts:13`](src/features/sales/service.ts:13)    | `CASH_CUSTOMER_LABEL` معرفة كثابت محلي بدلاً من استخدام نظام الترجمة `i18n`. |
>>>>>>> Stashed changes

---

## المحور الثاني: الثغرات الأمنية ونقاط الضعف

### 🔴 ثغرات حرجة

<<<<<<< Updated upstream
| # | الموقع | الوصف | الأثر |
|---|--------|-------|-------|
| 1 | [`supabase/functions/ai-proxy/index.ts:5`](supabase/functions/ai-proxy/index.ts:5) | `Access-Control-Allow-Origin: '*'` – يسمح لأي موقع على الإنترنت باستدعاء واجهة الذكاء الاصطناعي. | استنزاف رصيد OpenRouter من أي مصدر خارجي. |
| 2 | [`supabase/functions/ai-proxy/index.ts:34-43`](supabase/functions/ai-proxy/index.ts:34) | التحقق من `Authorization` header يكتفي بالتحقق من وجوده دون التحقق من صحة JWT token عبر `supabase.auth.getUser()`. | أي شخص يحمل أي قيمة في الهيدر يمكنه استدعاء الذكاء الاصطناعي على حساب الشركة. |
| 3 | [`src/core/permissions/index.tsx:12-53`](src/core/permissions/index.tsx:12) | نظام الصلاحيات يعمل **بالكامل على جانب العميل** (Client-Side). لا يوجد تطبيق للصلاحيات على مستوى الخادم (RLS) أو RPC. يمكن لأي مستخدم تعديل `localStorage` لتغيير دوره إلى `admin`. | تجاوز كامل لصلاحيات المستخدمين، إمكانية الوصول لكل البيانات المالية. |
| 4 | [`src/features/auth/store.ts:239-243`](src/features/auth/store.ts:239) | حالة المصادقة مخزنة في `localStorage` عبر Zustand persist مع حقل `isAuthenticated`. يمكن التلاعب بها مباشرة من متصفح المستخدم. | تجاوز شاشة تسجيل الدخول بالكامل. |
| 5 | [`src/lib/supabaseClient.ts:8-9`](src/lib/supabaseClient.ts:8) | `supabaseAnonKey` معرّض في `import.meta.env` ويتم تضمينه في حزمة العميل – هذا متوقع ولكن يستدعي التأكد من أن الـ RLS مُفعّل بشكل صحيح على الخادم. | في حال عدم تفعيل RLS: وصول كامل لقاعدة البيانات. |
| 6 | [`src/lib/supabaseClient.ts:152`](src/lib/supabaseClient.ts:152) | `createMockClient()` تُرجع `as any` مما يلغي أي فحص أمان عند عدم توفر Supabase. | كود غير آمن نوعياً في وضع عدم الاتصال. |

### 🟠 ثغرات عالية

| # | الموقع | الوصف | الأثر |
|---|--------|-------|-------|
| 7 | [`src/features/ai/core/config.ts:22`](src/features/ai/core/config.ts:22) | `getActiveModel()` تقرأ من `localStorage` مباشرة دون تحقق من صحة النموذج قبل الإرسال إلى API. | حقن نماذج AI خبيثة أو غير موجودة. |
| 8 | [`src/features/ai/core/provider.ts:109`](src/features/ai/core/provider.ts:109) | استخراج `(data as any)?.choices?.[0]?.message?.content` بدون تنظيف (sanitization). إذا كانت الاستجابة تحتوي على HTML/JS قد تُحقن في واجهة المستخدم. | هجمات XSS عبر استجابة AI مزورة. |
| 9 | [`.env.example`](.env.example) | `VITE_OPENROUTER_API_KEY` و `VITE_GEMINI_API_KEY` مذكوران في مثال المتغيرات كمتغيرات `VITE_` (عميل)، مع أن المفتاح يُستخدم فقط في `ai-proxy` (خادم). التوثيق مضلل. | قد يضع المطور المفاتيح في متغيرات عميل عن طريق الخطأ. |

### 🟡 ثغرات متوسطة

| # | الموقع | الوصف |
|---|--------|-------|
| 10 | [`src/features/auth/store.ts:157`](src/features/auth/store.ts:157) | عند فشل جلب الملف الشخصي، يتم تعيين دور افتراضي `role: 'viewer'` – ولكن هذا التعيين محلي فقط ولا يُزامن مع الخادم. |
| 11 | [`src/features/auth/store.ts:229`](src/features/auth/store.ts:229) | `catch` يستخدم `signOut({ scope: 'local' })` فقط عند خطأ غير متوقع، مما يعني أن الخادم قد يظل يعتقد أن الجلسة صالحة. |
| 12 | لا يوجد تشفير للبيانات المالية المخزنة محلياً (localStorage, IndexedDB). | البيانات المالية معرضة للوصول من أي extension متصفح. |
=======
| #   | الموقع                                                                                  | الوصف                                                                                                                                                                               | الأثر                                                                         |
| --- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | [`supabase/functions/ai-proxy/index.ts:5`](supabase/functions/ai-proxy/index.ts:5)      | `Access-Control-Allow-Origin: '*'` – يسمح لأي موقع على الإنترنت باستدعاء واجهة الذكاء الاصطناعي.                                                                                    | استنزاف رصيد OpenRouter من أي مصدر خارجي.                                     |
| 2   | [`supabase/functions/ai-proxy/index.ts:34-43`](supabase/functions/ai-proxy/index.ts:34) | التحقق من `Authorization` header يكتفي بالتحقق من وجوده دون التحقق من صحة JWT token عبر `supabase.auth.getUser()`.                                                                  | أي شخص يحمل أي قيمة في الهيدر يمكنه استدعاء الذكاء الاصطناعي على حساب الشركة. |
| 3   | [`src/core/permissions/index.tsx:12-53`](src/core/permissions/index.tsx:12)             | نظام الصلاحيات يعمل **بالكامل على جانب العميل** (Client-Side). لا يوجد تطبيق للصلاحيات على مستوى الخادم (RLS) أو RPC. يمكن لأي مستخدم تعديل `localStorage` لتغيير دوره إلى `admin`. | تجاوز كامل لصلاحيات المستخدمين، إمكانية الوصول لكل البيانات المالية.          |
| 4   | [`src/features/auth/store.ts:239-243`](src/features/auth/store.ts:239)                  | حالة المصادقة مخزنة في `localStorage` عبر Zustand persist مع حقل `isAuthenticated`. يمكن التلاعب بها مباشرة من متصفح المستخدم.                                                      | تجاوز شاشة تسجيل الدخول بالكامل.                                              |
| 5   | [`src/lib/supabaseClient.ts:8-9`](src/lib/supabaseClient.ts:8)                          | `supabaseAnonKey` معرّض في `import.meta.env` ويتم تضمينه في حزمة العميل – هذا متوقع ولكن يستدعي التأكد من أن الـ RLS مُفعّل بشكل صحيح على الخادم.                                   | في حال عدم تفعيل RLS: وصول كامل لقاعدة البيانات.                              |
| 6   | [`src/lib/supabaseClient.ts:152`](src/lib/supabaseClient.ts:152)                        | `createMockClient()` تُرجع `as any` مما يلغي أي فحص أمان عند عدم توفر Supabase.                                                                                                     | كود غير آمن نوعياً في وضع عدم الاتصال.                                        |

### 🟠 ثغرات عالية

| #   | الموقع                                                                         | الوصف                                                                                                                                                              | الأثر                                                 |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| 7   | [`src/features/ai/core/config.ts:22`](src/features/ai/core/config.ts:22)       | `getActiveModel()` تقرأ من `localStorage` مباشرة دون تحقق من صحة النموذج قبل الإرسال إلى API.                                                                      | حقن نماذج AI خبيثة أو غير موجودة.                     |
| 8   | [`src/features/ai/core/provider.ts:109`](src/features/ai/core/provider.ts:109) | استخراج `(data as any)?.choices?.[0]?.message?.content` بدون تنظيف (sanitization). إذا كانت الاستجابة تحتوي على HTML/JS قد تُحقن في واجهة المستخدم.                | هجمات XSS عبر استجابة AI مزورة.                       |
| 9   | [`.env.example`](.env.example)                                                 | `VITE_OPENROUTER_API_KEY` و `VITE_GEMINI_API_KEY` مذكوران في مثال المتغيرات كمتغيرات `VITE_` (عميل)، مع أن المفتاح يُستخدم فقط في `ai-proxy` (خادم). التوثيق مضلل. | قد يضع المطور المفاتيح في متغيرات عميل عن طريق الخطأ. |

### 🟡 ثغرات متوسطة

| #   | الموقع                                                                   | الوصف                                                                                                                |
| --- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| 10  | [`src/features/auth/store.ts:157`](src/features/auth/store.ts:157)       | عند فشل جلب الملف الشخصي، يتم تعيين دور افتراضي `role: 'viewer'` – ولكن هذا التعيين محلي فقط ولا يُزامن مع الخادم.   |
| 11  | [`src/features/auth/store.ts:229`](src/features/auth/store.ts:229)       | `catch` يستخدم `signOut({ scope: 'local' })` فقط عند خطأ غير متوقع، مما يعني أن الخادم قد يظل يعتقد أن الجلسة صالحة. |
| 12  | لا يوجد تشفير للبيانات المالية المخزنة محلياً (localStorage, IndexedDB). | البيانات المالية معرضة للوصول من أي extension متصفح.                                                                 |
>>>>>>> Stashed changes

---

## المحور الثالث: المهملات والتعقيدات البرمجية

### 🔴 ملفات ضخمة (God Files)

<<<<<<< Updated upstream
| # | الملف | الحجم | المشكلة |
|---|-------|-------|---------|
| 1 | [`src/core/database.types.ts`](src/core/database.types.ts) | 125,559 حرف | أكبر ملف في المشروع – يحتوي على تعريفات TypeScript المولدة تلقائياً لكل جداول Supabase. يجب توليده عند البناء فقط وليس تخزينه في المستودع. |
| 2 | [`src/features/appearance/constants.ts`](src/features/appearance/constants.ts) | 39,201 حرف | تعريفات 30+ ثيم بألوانها الكاملة (light + dark) محملة كلها دفعة واحدة في حزمة التطبيق. يجب lazy loading. |
| 3 | [`src/ui/common/ExcelTable.tsx`](src/ui/common/ExcelTable.tsx) | 24,419 حرف | God Component – يجمع العرض، السحب والإفلات، التحرير، التنقل بالكيبورد، التصفية والبحث في مكون واحد. |
| 4 | [`src/features/vehicles/components/VINLookupTab.tsx`](src/features/vehicles/components/VINLookupTab.tsx) | 24,373 حرف | مكون ضخم يجمع واجهة البحث والنتائج وإدارة القطع في ملف واحد. |
| 5 | [`src/features/settings/components/invoice/InvoiceSettings.tsx`](src/features/settings/components/invoice/InvoiceSettings.tsx) | 24,008 حرف | صفحة إعدادات ضخمة جداً. |
| 6 | [`src/features/settings/components/backup/BackupPage.tsx`](src/features/settings/components/backup/BackupPage.tsx) | 22,265 حرف | صفحة نسخ احتياطي هائلة – تحتاج لتقسيم. |
| 7 | [`src/features/bonds/components/CreateBondModal.tsx`](src/features/bonds/components/CreateBondModal.tsx) | 21,533 حرف | Modal إنشاء السندات – منطق عرض وبيانات معقد في ملف واحد. |
| 8 | [`src/features/pos/services/searchService.ts`](src/features/pos/services/searchService.ts) | 19,883 حرف | خدمة بحث تجمع RPC و fallback و cache و popular products و sales history في ملف واحد. |

### 🟠 أكواد مكررة ومهملة (Dead Code)

| # | الموقع | الوصف |
|---|--------|-------|
| 9 | 6 ملفات فارغة | [`ProductCardView.tsx`](src/features/inventory/components/ProductCardView.tsx) و [`POSHeader.tsx`](src/features/pos/components/POSHeader.tsx) و [`index.ts`](src/features/parties/index.ts) و [`usePartiesData.ts`](src/features/parties/hooks/usePartiesData.ts) و [`usePartiesView.ts`](src/features/parties/hooks/usePartiesView.ts) و [`index.ts`](src/features/parties/hooks/index.ts). |
| 10 | 64 استخداماً لـ `as any` | تجاوز منهجي لنظام الأنواع، موجود في كل أقسام التطبيق (راجع نتائج البحث أعلاه). |
| 11 | [`src/config/featureFlags.ts:17`](src/config/featureFlags.ts:17) | Card System V2 مع `rolloutPercentage: 0` – نظام بطاقات جديد معطل بالكامل لكن كوده منتشر في المشروع. |
| 12 | [`src/features/sales/seed.ts`](src/features/sales/seed.ts) | ملف seed للتطوير فقط، موجود في كود الإنتاج. |
| 13 | [`scripts/legacy/`](scripts/legacy/) | مجلد كامل (10 ملفات) لمهام قديمة غير مستخدمة. |
| 14 | [`src/features/inventory/components/DeduplicationTool.tsx`](src/features/inventory/components/DeduplicationTool.tsx) | 1,928 حرف فقط – مكون صغير الحجم لكن غير مكتمل (يحتاج مكونات فرعية). |
| 15 | تكرار كود تحويل `supplier/customer` إلى `Product` type (مثلاً في [`POSPage.tsx`](src/features/pos/pages/POSPage.tsx:61-81) و [`POSPage.tsx`](src/features/pos/pages/POSPage.tsx:91-111) – نفس الكود مكرر مرتين). |

### 🟡 إجراءات مخزنة غير مستخدمة

| # | الملاحظة |
|---|---------|
| 16 | يستخدم التطبيق RPC functions مثل `post_manual_journal`, `commit_sales_invoice`, `calculate_and_update_wac`, `search_inventory_paginated`, `get_popular_products`, `get_customer_stats`, `get_top_customers_by_revenue`, `get_sales_stats` – لكن لم يتم العثور على كود SQL الخاص بها في المستودع (قد تكون موجودة في Supabase مباشرة). غيابها عن المستودع يعني غياب الـ version control عن المنطق المالي الأخطر. |
| 17 | لا يوجد tests كافية: فقط [`PostTransactionUsecase.test.ts`](src/core/usecases/accounting/PostTransactionUsecase.test.ts) (112 سطر)، [`StockMovementUsecase.test.ts`](src/core/usecases/inventory/StockMovementUsecase.test.ts) (109 سطر)، [`sales/store.test.ts`](src/features/sales/store.test.ts) (محدود). الغالبية العظمى من المنطق المالي غير مختبَر. |
=======
| #   | الملف                                                                                                                          | الحجم       | المشكلة                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | [`src/core/database.types.ts`](src/core/database.types.ts)                                                                     | 125,559 حرف | أكبر ملف في المشروع – يحتوي على تعريفات TypeScript المولدة تلقائياً لكل جداول Supabase. يجب توليده عند البناء فقط وليس تخزينه في المستودع. |
| 2   | [`src/features/appearance/constants.ts`](src/features/appearance/constants.ts)                                                 | 39,201 حرف  | تعريفات 30+ ثيم بألوانها الكاملة (light + dark) محملة كلها دفعة واحدة في حزمة التطبيق. يجب lazy loading.                                   |
| 3   | [`src/ui/common/ExcelTable.tsx`](src/ui/common/ExcelTable.tsx)                                                                 | 24,419 حرف  | God Component – يجمع العرض، السحب والإفلات، التحرير، التنقل بالكيبورد، التصفية والبحث في مكون واحد.                                        |
| 4   | [`src/features/vehicles/components/VINLookupTab.tsx`](src/features/vehicles/components/VINLookupTab.tsx)                       | 24,373 حرف  | مكون ضخم يجمع واجهة البحث والنتائج وإدارة القطع في ملف واحد.                                                                               |
| 5   | [`src/features/settings/components/invoice/InvoiceSettings.tsx`](src/features/settings/components/invoice/InvoiceSettings.tsx) | 24,008 حرف  | صفحة إعدادات ضخمة جداً.                                                                                                                    |
| 6   | [`src/features/settings/components/backup/BackupPage.tsx`](src/features/settings/components/backup/BackupPage.tsx)             | 22,265 حرف  | صفحة نسخ احتياطي هائلة – تحتاج لتقسيم.                                                                                                     |
| 7   | [`src/features/bonds/components/CreateBondModal.tsx`](src/features/bonds/components/CreateBondModal.tsx)                       | 21,533 حرف  | Modal إنشاء السندات – منطق عرض وبيانات معقد في ملف واحد.                                                                                   |
| 8   | [`src/features/pos/services/searchService.ts`](src/features/pos/services/searchService.ts)                                     | 19,883 حرف  | خدمة بحث تجمع RPC و fallback و cache و popular products و sales history في ملف واحد.                                                       |

### 🟠 أكواد مكررة ومهملة (Dead Code)

| #   | الموقع                                                                                                                                                                                                           | الوصف                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | 6 ملفات فارغة                                                                                                                                                                                                    | [`ProductCardView.tsx`](src/features/inventory/components/ProductCardView.tsx) و [`POSHeader.tsx`](src/features/pos/components/POSHeader.tsx) و [`index.ts`](src/features/parties/index.ts) و [`usePartiesData.ts`](src/features/parties/hooks/usePartiesData.ts) و [`usePartiesView.ts`](src/features/parties/hooks/usePartiesView.ts) و [`index.ts`](src/features/parties/hooks/index.ts). |
| 10  | 64 استخداماً لـ `as any`                                                                                                                                                                                         | تجاوز منهجي لنظام الأنواع، موجود في كل أقسام التطبيق (راجع نتائج البحث أعلاه).                                                                                                                                                                                                                                                                                                               |
| 11  | [`src/config/featureFlags.ts:17`](src/config/featureFlags.ts:17)                                                                                                                                                 | Card System V2 مع `rolloutPercentage: 0` – نظام بطاقات جديد معطل بالكامل لكن كوده منتشر في المشروع.                                                                                                                                                                                                                                                                                          |
| 12  | [`src/features/sales/seed.ts`](src/features/sales/seed.ts)                                                                                                                                                       | ملف seed للتطوير فقط، موجود في كود الإنتاج.                                                                                                                                                                                                                                                                                                                                                  |
| 13  | [`scripts/legacy/`](scripts/legacy/)                                                                                                                                                                             | مجلد كامل (10 ملفات) لمهام قديمة غير مستخدمة.                                                                                                                                                                                                                                                                                                                                                |
| 14  | [`src/features/inventory/components/DeduplicationTool.tsx`](src/features/inventory/components/DeduplicationTool.tsx)                                                                                             | 1,928 حرف فقط – مكون صغير الحجم لكن غير مكتمل (يحتاج مكونات فرعية).                                                                                                                                                                                                                                                                                                                          |
| 15  | تكرار كود تحويل `supplier/customer` إلى `Product` type (مثلاً في [`POSPage.tsx`](src/features/pos/pages/POSPage.tsx:61-81) و [`POSPage.tsx`](src/features/pos/pages/POSPage.tsx:91-111) – نفس الكود مكرر مرتين). |

### 🟡 إجراءات مخزنة غير مستخدمة

| #   | الملاحظة                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16  | يستخدم التطبيق RPC functions مثل `post_manual_journal`, `commit_sales_invoice`, `calculate_and_update_wac`, `search_inventory_paginated`, `get_popular_products`, `get_customer_stats`, `get_top_customers_by_revenue`, `get_sales_stats` – لكن لم يتم العثور على كود SQL الخاص بها في المستودع (قد تكون موجودة في Supabase مباشرة). غيابها عن المستودع يعني غياب الـ version control عن المنطق المالي الأخطر. |
| 17  | لا يوجد tests كافية: فقط [`PostTransactionUsecase.test.ts`](src/core/usecases/accounting/PostTransactionUsecase.test.ts) (112 سطر)، [`StockMovementUsecase.test.ts`](src/core/usecases/inventory/StockMovementUsecase.test.ts) (109 سطر)، [`sales/store.test.ts`](src/features/sales/store.test.ts) (محدود). الغالبية العظمى من المنطق المالي غير مختبَر.                                                      |
>>>>>>> Stashed changes

---

## المحور الرابع: الانفصال والتماسك بين المكونات

### 🔴 اعتماد مفرط (Tight Coupling)

<<<<<<< Updated upstream
| # | الموقع | الوصف |
|---|--------|-------|
| 1 | [`src/features/pos/pages/POSPage.tsx`](src/features/pos/pages/POSPage.tsx:13-15) | يستورد مباشرة من 3 متاجر Zustand مختلفة: `useSalesStore` و `usePOSStore` و `useAuthStore`، بالإضافة إلى `posSearchService` و `usePOSCheckout` و `usePOSSearch`. 6 تبعيات مباشرة في مكون واجهة واحد. |
| 2 | [`src/features/sales/service.ts`](src/features/sales/service.ts:9) | يستورد `accountsService` من ميزة `accounting` – خرق لحدود الـ Bounded Context بين المبيعات والمحاسبة. |
| 3 | [`src/features/bonds/components/CreateBondModal.tsx`](src/features/bonds/components/CreateBondModal.tsx:7-9) | يستورد hooks من 3 ميزات مختلفة: `accounting/hooks`, `settings/hooks`, `parties/hooks`. |
| 4 | [`src/features/sales/store.ts`](src/features/sales/store.ts:4) | `useSalesStore` تستورد `useDiscountStore` من `settings` للوصول إلى حالة التخفيضات داخل `calculateTotals`. |
| 5 | [`src/core/usecases/inventory/StockMovementUsecase.ts`](src/core/usecases/inventory/StockMovementUsecase.ts:2) | يستورد `supabase` مباشرة بدلاً من المرور عبر طبقة API. |

### 🟠 انتهاك فصل الطبقات (Layer Violation)

| # | الموقع | الوصف |
|---|--------|-------|
| 6 | [`src/core/usecases/accounting/PostTransactionUsecase.ts`](src/core/usecases/accounting/PostTransactionUsecase.ts:7) | Use Case يتصل مباشرة بـ `journalEntrySchema.parse(data)` (طبقة Validation) ويستدعي API – دمج 3 طبقات في 30 سطر. |
| 7 | [`src/ui/common/ExcelTable.tsx`](src/ui/common/ExcelTable.tsx) | مكون UI يجمع منطق العرض مع السحب والإفلات مع التحرير مع التصفية – 4 مسؤوليات في مكون واحد. |
| 8 | العديد من مكونات UI تستورد `supabase` مباشرة بدلاً من استخدام custom hooks أو services. |

### 🟡 مشاكل هيكلية

| # | الوصف |
|---|-------|
| 9 | استخدام غير متسق لمسارات الاستيراد: بعضها `@/` والبعض `../../../`. مثلاً [`InventorySettings.tsx`](src/features/settings/components/inventory/InventorySettings.tsx:5) يستخدم `@/lib/i18nStore` بينما [`BondsPage.tsx`](src/features/bonds/BondsPage.tsx:12) يستخدم `../../lib/hooks/useTranslation`. |
| 10 | [`src/core/database.types.ts`](src/core/database.types.ts) (125KB) هو ملف واحد يحتوي على جميع أنواع قاعدة البيانات – يجب تقسيمه حسب المجال (accounting, sales, inventory...). |
| 11 | لا يوجد `shared` kernel واضح – بعض الأدوات المساعدة مكررة (مثلاً `MoneyUtils` في [`domain.ts`](src/features/sales/types/domain.ts:158) و [`decimalUtils.ts`](src/core/utils/decimalUtils.ts) و [`currencyUtils.ts`](src/core/utils/currencyUtils.ts) كلها تتعامل مع المال بطرق مختلفة). |
=======
| #   | الموقع                                                                                                         | الوصف                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [`src/features/pos/pages/POSPage.tsx`](src/features/pos/pages/POSPage.tsx:13-15)                               | يستورد مباشرة من 3 متاجر Zustand مختلفة: `useSalesStore` و `usePOSStore` و `useAuthStore`، بالإضافة إلى `posSearchService` و `usePOSCheckout` و `usePOSSearch`. 6 تبعيات مباشرة في مكون واجهة واحد. |
| 2   | [`src/features/sales/service.ts`](src/features/sales/service.ts:9)                                             | يستورد `accountsService` من ميزة `accounting` – خرق لحدود الـ Bounded Context بين المبيعات والمحاسبة.                                                                                               |
| 3   | [`src/features/bonds/components/CreateBondModal.tsx`](src/features/bonds/components/CreateBondModal.tsx:7-9)   | يستورد hooks من 3 ميزات مختلفة: `accounting/hooks`, `settings/hooks`, `parties/hooks`.                                                                                                              |
| 4   | [`src/features/sales/store.ts`](src/features/sales/store.ts:4)                                                 | `useSalesStore` تستورد `useDiscountStore` من `settings` للوصول إلى حالة التخفيضات داخل `calculateTotals`.                                                                                           |
| 5   | [`src/core/usecases/inventory/StockMovementUsecase.ts`](src/core/usecases/inventory/StockMovementUsecase.ts:2) | يستورد `supabase` مباشرة بدلاً من المرور عبر طبقة API.                                                                                                                                              |

### 🟠 انتهاك فصل الطبقات (Layer Violation)

| #   | الموقع                                                                                                               | الوصف                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 6   | [`src/core/usecases/accounting/PostTransactionUsecase.ts`](src/core/usecases/accounting/PostTransactionUsecase.ts:7) | Use Case يتصل مباشرة بـ `journalEntrySchema.parse(data)` (طبقة Validation) ويستدعي API – دمج 3 طبقات في 30 سطر. |
| 7   | [`src/ui/common/ExcelTable.tsx`](src/ui/common/ExcelTable.tsx)                                                       | مكون UI يجمع منطق العرض مع السحب والإفلات مع التحرير مع التصفية – 4 مسؤوليات في مكون واحد.                      |
| 8   | العديد من مكونات UI تستورد `supabase` مباشرة بدلاً من استخدام custom hooks أو services.                              |

### 🟡 مشاكل هيكلية

| #   | الوصف                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | استخدام غير متسق لمسارات الاستيراد: بعضها `@/` والبعض `../../../`. مثلاً [`InventorySettings.tsx`](src/features/settings/components/inventory/InventorySettings.tsx:5) يستخدم `@/lib/i18nStore` بينما [`BondsPage.tsx`](src/features/bonds/BondsPage.tsx:12) يستخدم `../../lib/hooks/useTranslation`. |
| 10  | [`src/core/database.types.ts`](src/core/database.types.ts) (125KB) هو ملف واحد يحتوي على جميع أنواع قاعدة البيانات – يجب تقسيمه حسب المجال (accounting, sales, inventory...).                                                                                                                         |
| 11  | لا يوجد `shared` kernel واضح – بعض الأدوات المساعدة مكررة (مثلاً `MoneyUtils` في [`domain.ts`](src/features/sales/types/domain.ts:158) و [`decimalUtils.ts`](src/core/utils/decimalUtils.ts) و [`currencyUtils.ts`](src/core/utils/currencyUtils.ts) كلها تتعامل مع المال بطرق مختلفة).               |
>>>>>>> Stashed changes

---

## المحور الخامس: الميزات والخدمات المعطلة والعناصر الوهمية

### 🔴 ميزات معلنة وغير مفعلة فعلياً

<<<<<<< Updated upstream
| # | الموقع | الوصف | تجربة المستخدم |
|---|--------|-------|----------------|
| 1 | [`src/app/routes.tsx:66-68`](src/app/routes.tsx:66) | مسارات `/login` و `/register` تؤدي إلى `Navigate to /welcome` مباشرة. صفحات تسجيل الدخول والتسجيل المنفصلة موجودة في الكود [`LoginPage.tsx`](src/features/auth/LoginPage.tsx) و [`RegisterPage.tsx`](src/features/auth/RegisterPage.tsx) ولكن غير قابلة للوصول. | إرباك للمستخدم. |
| 2 | [`src/features/ai/AIBrainPage.tsx`](src/features/ai/AIBrainPage.tsx) | صفحة AI Brain موجودة في المسارات لكن AI Features معطلة افتراضياً (`VITE_ENABLE_AI_FEATURES`). | صفحة قد تظهر فارغة أو بخطأ عند الوصول. |
| 3 | [`src/app/routes.tsx:131-132`](src/app/routes.tsx:131) | `AICommandCenter` يُمرر `isOpen={true} onClose={() => {}}` – استخدام غير صحيح لمكون modal كمكون صفحة. | سلوك غير متوقع. |
| 4 | [`src/config/featureFlags.ts:17`](src/config/featureFlags.ts:17) | Card System V2 بنسبة rollout 0% – تم بناء نظام بطاقات كامل لكنه غير مفعل لأي مستخدم. | كود ميت بحجم كبير. |

### 🟠 ميزات غير مكتملة أو معطلة

| # | الموقع | الوصف |
|---|--------|-------|
| 5 | [`src/features/inventory/components/ProductCardView.tsx`](src/features/inventory/components/ProductCardView.tsx) | ملف فارغ تماماً (0 bytes) – تم استيراده في مكان ما أو مخطط له لكن لم يُنفذ. |
| 6 | [`src/features/pos/components/POSHeader.tsx`](src/features/pos/components/POSHeader.tsx) | ملف فارغ (0 bytes) – مكون رئيسي للـ POS لم يُكتب. |
| 7 | [`src/features/inventory/components/DeduplicationTool.tsx`](src/features/inventory/components/DeduplicationTool.tsx) | مكون صغير (1,928 حرف) يبدو غير مكتمل – يحتوي على هيكل أساسي فقط. |
| 8 | [`src/features/smart-import/`](src/features/smart-import/) | ميزة الاستيراد الذكي موجودة لكن غير مربوطة بأي مسار route في [`routes.tsx`](src/app/routes.tsx). |
| 9 | [`src/features/feedback/store.ts`](src/features/feedback/store.ts) | نظام الملاحظات موجود لكن بحجم صغير جداً (1,263 حرف) للمتجر فقط – غير مكتمل. |
| 10 | قسم `PartiesHooks` فارغ: [`usePartiesData.ts`](src/features/parties/hooks/usePartiesData.ts) و [`usePartiesView.ts`](src/features/parties/hooks/usePartiesView.ts) و [`index.ts`](src/features/parties/hooks/index.ts) جميعها 0 حرف. |

### 🟡 عناصر واجهة وهمية

| # | الموقع | الوصف |
|---|--------|-------|
| 11 | [`src/features/settings/components/inventory/InventorySettings.tsx:73-76`](src/features/settings/components/inventory/InventorySettings.tsx:73) | خيارات `FIFO`, `LIFO`, `المتوسط` في إعدادات المخزون – لكن نظام التكاليف الفعلي يستخدم `calculate_and_update_wac` (Weighted Average) فقط. خيار FIFO/LIFO وهمي. |
| 12 | [`src/features/accounting/AccountingPage.tsx:57-58`](src/features/accounting/AccountingPage.tsx:57) | شارة "Financial Core Active" معروضة بشكل دائم – عنصر تجميلي لا يعكس حالة فعلية. |
| 13 | [`supabase/functions/ai/`](supabase/functions/ai) | مجلد موجود لكن لا يحتوي على `index.ts` – دالة `ai` غير موجودة، فقط `ai-proxy`. |
=======
| #   | الموقع                                                               | الوصف                                                                                                                                                                                                                                                           | تجربة المستخدم                         |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | [`src/app/routes.tsx:66-68`](src/app/routes.tsx:66)                  | مسارات `/login` و `/register` تؤدي إلى `Navigate to /welcome` مباشرة. صفحات تسجيل الدخول والتسجيل المنفصلة موجودة في الكود [`LoginPage.tsx`](src/features/auth/LoginPage.tsx) و [`RegisterPage.tsx`](src/features/auth/RegisterPage.tsx) ولكن غير قابلة للوصول. | إرباك للمستخدم.                        |
| 2   | [`src/features/ai/AIBrainPage.tsx`](src/features/ai/AIBrainPage.tsx) | صفحة AI Brain موجودة في المسارات لكن AI Features معطلة افتراضياً (`VITE_ENABLE_AI_FEATURES`).                                                                                                                                                                   | صفحة قد تظهر فارغة أو بخطأ عند الوصول. |
| 3   | [`src/app/routes.tsx:131-132`](src/app/routes.tsx:131)               | `AICommandCenter` يُمرر `isOpen={true} onClose={() => {}}` – استخدام غير صحيح لمكون modal كمكون صفحة.                                                                                                                                                           | سلوك غير متوقع.                        |
| 4   | [`src/config/featureFlags.ts:17`](src/config/featureFlags.ts:17)     | Card System V2 بنسبة rollout 0% – تم بناء نظام بطاقات كامل لكنه غير مفعل لأي مستخدم.                                                                                                                                                                            | كود ميت بحجم كبير.                     |

### 🟠 ميزات غير مكتملة أو معطلة

| #   | الموقع                                                                                                                                                                                                                               | الوصف                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 5   | [`src/features/inventory/components/ProductCardView.tsx`](src/features/inventory/components/ProductCardView.tsx)                                                                                                                     | ملف فارغ تماماً (0 bytes) – تم استيراده في مكان ما أو مخطط له لكن لم يُنفذ.                      |
| 6   | [`src/features/pos/components/POSHeader.tsx`](src/features/pos/components/POSHeader.tsx)                                                                                                                                             | ملف فارغ (0 bytes) – مكون رئيسي للـ POS لم يُكتب.                                                |
| 7   | [`src/features/inventory/components/DeduplicationTool.tsx`](src/features/inventory/components/DeduplicationTool.tsx)                                                                                                                 | مكون صغير (1,928 حرف) يبدو غير مكتمل – يحتوي على هيكل أساسي فقط.                                 |
| 8   | [`src/features/smart-import/`](src/features/smart-import/)                                                                                                                                                                           | ميزة الاستيراد الذكي موجودة لكن غير مربوطة بأي مسار route في [`routes.tsx`](src/app/routes.tsx). |
| 9   | [`src/features/feedback/store.ts`](src/features/feedback/store.ts)                                                                                                                                                                   | نظام الملاحظات موجود لكن بحجم صغير جداً (1,263 حرف) للمتجر فقط – غير مكتمل.                      |
| 10  | قسم `PartiesHooks` فارغ: [`usePartiesData.ts`](src/features/parties/hooks/usePartiesData.ts) و [`usePartiesView.ts`](src/features/parties/hooks/usePartiesView.ts) و [`index.ts`](src/features/parties/hooks/index.ts) جميعها 0 حرف. |

### 🟡 عناصر واجهة وهمية

| #   | الموقع                                                                                                                                          | الوصف                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11  | [`src/features/settings/components/inventory/InventorySettings.tsx:73-76`](src/features/settings/components/inventory/InventorySettings.tsx:73) | خيارات `FIFO`, `LIFO`, `المتوسط` في إعدادات المخزون – لكن نظام التكاليف الفعلي يستخدم `calculate_and_update_wac` (Weighted Average) فقط. خيار FIFO/LIFO وهمي. |
| 12  | [`src/features/accounting/AccountingPage.tsx:57-58`](src/features/accounting/AccountingPage.tsx:57)                                             | شارة "Financial Core Active" معروضة بشكل دائم – عنصر تجميلي لا يعكس حالة فعلية.                                                                               |
| 13  | [`supabase/functions/ai/`](supabase/functions/ai)                                                                                               | مجلد موجود لكن لا يحتوي على `index.ts` – دالة `ai` غير موجودة، فقط `ai-proxy`.                                                                                |
>>>>>>> Stashed changes

---

## ملخص تنفيذي وترتيب الأولويات

### الأولوية القصوى (إصلاح فوري – سلامة البيانات المالية)

1. **إصلاح دالة `generateCalculationHash`** – استخدام SHA-256 حقيقي عبر `crypto.subtle` بدلاً من دالة الهاش البسيطة.
2. **توحيد حد التسامح المحاسبي** بين `decimalUtils.ts` و `validators/index.ts` لاستخدام `SOX_BALANCE_TOLERANCE`.
3. **إصلاح القسمة على صفر** في `sales/store.ts` عند `exchangeRate === 0`.
4. **تفعيل RLS** على جميع جداول Supabase لضمان عزل البيانات متعدد المستأجرين (multi-tenant).
5. **إضافة JWT verification** في `ai-proxy/index.ts` باستخدام `supabase.auth.getUser()`.
6. **تغيير CORS header** من `*` إلى النطاق المحدد للتطبيق.

### الأولوية العالية (أسبوعين – استقرار وأمان)

7. **نقل الصلاحيات إلى الخادم** – الصلاحيات الحالية client-side فقط، يجب نقلها إلى RLS Policies.
8. **إزالة جميع `as any`** – 64 حالة تحتاج لتعريف أنواع صحيحة.
9. **تقسيم الملفات الضخمة** – البدء بـ [`ExcelTable.tsx`](src/ui/common/ExcelTable.tsx) و [`VINLookupTab.tsx`](src/features/vehicles/components/VINLookupTab.tsx).
10. **إزالة الملفات الفارغة** – 6 ملفات.
11. **حذف مجلد [`scripts/legacy/`](scripts/legacy/)**.
12. **نقل SQL RPC functions إلى المستودع** للـ version control.

### الأولوية المتوسطة (شهر – تحسين البنية)

13. **فصل الطبقات** – عدم استيراد `supabase` مباشرة من المكونات.
14. **توحيد أدوات العملات** – دمج `MoneyUtils` و `decimalUtils` و `currencyUtils` في وحدة مالية واحدة.
15. **تقسيم [`database.types.ts`](src/core/database.types.ts)** حسب المجال.
16. **إزالة الميزات الوهمية** – إما إكمالها أو إخفاؤها من واجهة المستخدم.
17. **كتابة اختبارات** للمسارات المالية الحرجة (المبيعات، المشتريات، القيود المحاسبية).

### الأولوية المنخفضة (خطة مستمرة)

18. **توحيد مسارات الاستيراد** (`@/` بدلاً من `../../../`).
19. **Lazy loading** لملف [`appearance/constants.ts`](src/features/appearance/constants.ts).
20. **تنظيف الـ feature flags** غير المستخدمة.

---

> **عدد الملاحظات الإجمالي:** 47 ملاحظة موثقة  
> 🔴 16 حرجة | 🟠 16 عالية | 🟡 15 متوسطة | 🟢 2 منخفضة  
> **أخطر اكتشاف:** نظام الصلاحيات client-side بالكامل (قابل للتجاوز من أي مستخدم) مع عدم وجود JWT validation في الـ AI Proxy – مما يعرض البيانات المالية للخطر من محورين.
