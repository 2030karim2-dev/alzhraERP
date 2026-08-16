# دراسة شاملة وتعمق معماري — نظام الزهراء الذكي (Al-Zahra Smart ERP)

**التاريخ:** 2026-08-16
**النطاق:** بنية الكود، طبقات الواجهة، Supabase، إدارة الحالة، الأمان، الأداء، البنية التحتية للجودة، الديون التقنية.
**المصادر:** استكشاف كامل للمستودع + مستندات `docs/` و`plans/` و`tasks/` + التحقق الفعلي عبر أدوات المشروع (ratchet/type-check).

> **معلومة محقّقة وقت كتابة الوثيقة:** `tsc --noEmit` ينتج **صفر خطأ** (الخط الأساسي المسجل في `scripts/ts-error-baseline.txt` هو 166 وانخفض الفعلي إلى 0) — أي أن هدف Phase C2 ("تصفية أخطاء TypeScript") أصبح مكتملاً عملياً رغم أن `tasks/todo.md` لم يُحدَّث بعد.

---

## 1. الملخص التنفيذي

نظام **الزهراء الذكي** هو تطبيق ERP متعدد المستأجرين (Multi-Tenant SaaS) متخصص في **إدارة تجارة قطع غيار السيارات**، بجمهور عربي (واجهة RTL كاملة). يتبع بنية **Feature-Based** نظيفة بطبقات مفروضة (`Component → Hook → Service → API → Supabase`)، مع مصدر بيانات وحيد هو **Supabase (PostgreSQL 17)** محمي بعزل مستأجر عبر **RLS** وصلاحيات **server-side**.

النقاط الأبرز:

- **قوة معمارية:** ~25 وحدة ميزة مستقلة، كل منها بنية موحّدة (`api/`, `components/`, `hooks/`, `pages/`, `services/`, `types/`).
- **أمان فعلي:** RLS على كل الجداول + `role_permissions`/`has_permission()` (ADR-003 بعد ثغرة QA-2026-003) + إخفاء أخطاء PostgreSQL في الإنتاج + منع العمل على عميل وهمي.
- **ميزات AI مميزة:** فك شفرة VIN للمركبات، بحث ذكي بالقطع، استيراد ذكي، ومساعد ذكي خلفه Edge Function بوساطة آمنة (OpenRouter/DeepSeek) مع Rate Limiting.
- **نضج هندسي:** ADRs موثقة، CI متعدد الطبقات، آلية Ratchet تمنع أخطاء TS الجديدة، سكربتات جودة (`quality-report`, `type-safety-scanner`).
- **ديون تقنية موثقة:** صلاحيات `SECURITY DEFINER` واسعة، كتابات مالية مباشرة غير ذرية، Realtime عام بلا فلتر شركة، وفجوة بين migrations المحلية والمنشورة.

---

## 2. هوية المشروع ومقاييسه

| البند | القيمة |
|---|---|
| الاسم/النسخة | `al-zahra-smart-erp` — v1.0.0 |
| القطاع | تجارة قطع غيار السيارات (المبيعات/المشتريات/المخزون/المحاسبة/POS) |
| النموذج | SaaS متعدد المستأجرين (عزل كامل بين الشركات) |
| قاعدة البيانات | Supabase — مشروع `alzhra100` (PostgreSQL 17.6.1، منطقة ap-south-1، حالة ACTIVE_HEALTHY) |
| واجهة العرض | عربية RTL أساساً + إنجليزية (LTR) عبر `ar.json`/`en.json` |
| حجم `src/` | 873 ملف (474 TSX + 399 TS) ≈ ~99,000 سطر |
| أكبر ملف | `src/core/database.types.ts` (350KB) |
| Migrations محلية | 40 (2026-05-19 → 2026-08-16) |
| Edge Functions | 11 (Deno) |
| اختبارات الوحدة | 30 ملف `*.test.*` + تغطية مُثبتة عند threshold ≥ 30% |
| E2E (Playwright) | 3 سيناريوهات (auth, sales-flow, accounting-flow) عبر 5 مشاريع متصفحات |
| حالة TS وقت الكتابة | **0 خطأ** (راجع الملخص التنفيذي) |
| حالة Git | شجرة نظيفة، أحدث commit: `46b0e63` (إصلاح 400 فواتير الشراء/البيع + مزامنة الجرد) |

### ملفات ومجلدات الحوكمة الرئيسية

| الملف | الدور |
|---|---|
| `.clinerules` | قواعد المشروع الإلزامية (المعمارية، الأمان، الخرائط، الأوامر) |
| `docs/decisions/ADR-001..004` | قرارات معمارية (DB، RLS، صلاحيات، VIN hardening) |
| `docs/STYLE_GUIDE.md` | دليل الأسلوب (ألوان CSS Variables، طباعة، تجاوب، وصولية) |
| `docs/frontend-backend-deep-audit-2026-08-15.md` | تدقيق تكامل الواجهة/Supabase (73/73 أسماء RPC مطابقة) |
| `docs/supabase-exploration-2026-08-16.md` | استكشاف خادم Supabase الفعلي عبر MCP |
| `tasks/plan.md` + `tasks/todo.md` | خطة الإصلاح الشاملة عبر 5 مراحل (0→E) |
| `plans/*.md` | تحليلات سابقة (هيكلة، ميزات، audits) |

---

## 3. حزمة التقنيات

### الواجهة الأمامية
- **React 19.2 + TypeScript 5 (strict)** عبر Vite 5 (بوابة `src/index.tsx`)
- **Tailwind CSS 3** + نظام CSS Variables (`--app-bg`, `--app-surface`, `--accent`…) + وضع ليلي + RTL
- **React Router DOM v7** — HashRouter (`/#/path`)، مسارات ثابتة في `src/core/routes/paths.ts`
- **TanStack Query v5** لحالة الخادم مع `persistQueryClient` → IndexedDB (24h max، `staleTime` 5 دقائق)
- **Zustand v5** للحالة العامة (auth، i18n، theme، POS، notifications، purchase store…)
- **React Hook Form + Zod** للنماذج، **Recharts** للرسوم، **Framer Motion** للحركة، **Lucide** للأيقونات
- **التصدير:** jsPDF + html2canvas (PDF) / xlsx-js-style (Excel) — محمّلة بشق (vendor-export/vendor-xlsx)
- **PWA:** vite-plugin-pwa (manifest عربي، autoUpdate، بدون كاش للاستدعاءات API)
- **العمل دون اتصال:** Service Worker + `OfflineManager` + `offlineQueueStore` + إعادة تشغيل `REPLAY_ACTIONS`

### الخلفية (Supabase)
- PostgreSQL 17 مع **RLS مفعّل** على جميع الجداول
- **RPCs** (SECURITY DEFINER) للمنطق المالي/المخزني الذرّي (73 اسماً مطابقة للواجهة وفق التدقيق)
- **Realtime** لقناة WebSocket لكل شركة + Fallback polling عند انقطاع القناة
- **Edge Functions (Deno):** `ai-proxy`, `vin-decode`, `vin-parts`, `part-search`, `get-products`, `ai-part-lookup`, `ai-product-image`, `car-ai-assistant`, `zatca-integration`, `send-notification`, `fetch-exchange-rates-aden`

### الذكاء الاصطناعي
- **Google Gemini SDK** في الواجهة + Edge Function `ai-proxy` يعيد توجيه الطلبات إلى **OpenRouter/DeepSeek**
- المفاتيح **لا تُباع في الواجهة إطلاقاً** (تحذير صريح في `.env.example`)
- **Rate Limit 10 طلبات/دقيقة/مستخدم** عبر جدول `ai_request_log` (مع تنظيف احتمالي للمجدول)

---

## 4. البنية المعمارية

### 4.1 هيكل `src/` العام

```
src/
├── app/          → App.tsx + routes.tsx (HashRouter، Lazy per feature، FeatureBoundary لكل مسار)
├── config/       → featureFlags.ts (نظام أعلام ممكّنة عبر env)
├── core/         → النواة المشتركة
│   ├── components/    → ErrorBoundary, FeatureBoundary
│   ├── hooks/         → useAuthSession, usePermission, useGlobalShortcuts, useSystemInitialization
│   ├── lib/           → persistence, persister, react-query, sync-registry, sync-store
│   ├── permissions/   → index.tsx (قديم @deprecated + إعادة تصدير الـ hooks الجديدة)
│   ├── routes/        → paths.ts (ثوابت المسارات)
│   ├── services/      → OfflineManager, omniSearchService, retryHandler, storage.service
│   ├── store/         → connectionStore, navigationStore, searchStore (Zustand)
│   ├── types/         → common.ts, supabase-helpers.ts
│   ├── usecases/      → accounting/PostTransactionUsecase, inventory/StockMovementUsecase, sales/ProcessPOSCheckoutUsecase
│   ├── utils/         → decimalUtils (Decimal.js)، currencyUtils، errorUtils (parseError)، tafqeet، zatca، pdfExporter، excelExporter…
│   ├── validators/    → expenses.ts + index
│   ├── database.types.ts (350KB) + database.helpers.ts + constants.ts
├── features/      → ~25 وحدة ميزة مستقلة
├── lib/           → supabaseClient.ts (العميل الوحيد)، queryClient، invalidation، i18nStore، themeStore، offlineService، hooks عامة
├── types/         → global.d.ts, xlsx-js-style.d.ts
└── ui/            → base (Button/Modal/Input…)، common (ExcelTable…)، layout (MainLayout/Sidebar/Header)، cards، dashboard، pos
```

### 4.2 الطبقات الإلزامية (قاعدة `.clinerules`)

```
Component → Hook → Service → API → Supabase
```

- ممنوع استدعاء `supabase` مباشرة داخل مكونات React.
- القراءة عبر `useQuery`، الكتابة عبر `useMutation` — لا تخزين بيانات الخادم في Zustand.
- كل استعلام يحمل `company_id` (عزل المستأجر عبر RLS).
- الخطأ يُمرَّر عبر `parseError` في `core/utils/errorUtils.ts`.
- الأسماء Named exports، الاختبارات ملاصقة (`Component.test.tsx`)، `cn()` للأنماط الشرطية، Error boundaries على مستوى المسار.

### 4.3 النمط الموحّد داخل كل ميزة

```
features/<module>/
├── api/          → استدعاءات Supabase/RPC
├── components/   → مكونات الواجهة
├── hooks/        → hooks React (بيانات + منطق تفاعل)
├── pages/        → صفحات (تُحمّل Lazy في routes.tsx)
├── services/     → منطق الأعمال/التحويلات
├── types/ + constants/ + store/ (حسب الحاجة)
└── index.ts      → تصدير موحّد (barrel)
```

> **Barrel discipline:** يوجد سكربت `validate-barrels.ts` يفرض صحة ملفات `index.ts`.

---

## 5. خريطة الوحدات (25 ميزة)

| الوحدة | الحجم التقريبي | أبرز المحتوى |
|---|---|---|
| `inventory` | ~100 ملف (الأكبر) | منتجات/كميات، جرد/تدقيق (AuditSession, QuickAudit)، مخزون راكد، إزالة تكرار، تحويلات، توافق مركبات، استيراد Excel، بحث AI، تحليلات |
| `sales` | ~60 ملف | فواتير بيع (create/list/details)، عروض أسعار، مرتجعات، تحليلات (KPI/اتجاه/أعلى منتجات)، فواتير صوتية، طباعة |
| `accounting` | ~40 ملف | دليل حسابات + أرصدة افتتاحية، قيود يومية، خزائن/صناديق (Treasury)، تقارير (ميزان مراجعة، P&L، ميزانية) |
| `dashboard` | ~40 ملف | ~15 ودجت (StatsGrid، تدفقات، أهداف ذكية، تنبيهات، صحة مالية، AI notifications، توظيف مخزون) |
| `reports` | ~40 ملف | P&L، ميزانية، تدفقات نقدية، حركة مخزون، شيخوخة ديون، ABC، تنبؤ مبيعات، تقارير مرتجعات |
| `commissions` | ~30 ملف | خطط حوافز، فترات (حالة lifecycle)، تعيينات، تقارير وتصدير — مع `engineGuards` و`authorization` واختبارات |
| `debts` | ~25 ملف | نظرة عامة، متابعة، وعود، صندوق صدور (WhatsApp)، كشوف، إعدادات — مع قوالب رسائل |
| `auth` | ~20 ملف | Login/Register/نسيان كلمة المرور + Landing كامل + MFA (TOTP) + Google OAuth + OnboardingWizard |
| `pos` | ~15 ملف | سلة، طرق دفع وصناديق، أقساط، بحث ذكي (searchService بطبقات cache/database/popular/history)، اقتراح بدائل |
| `purchases` | ~15 ملف | فواتير شراء، عروض، مرتجعات، استيراد ذكي AI (SmartImportView)، Analytics |
| `vin-intelligence` | ~15 ملف | فك VIN، استخراج قطع، مطابقة مخزون، توافق مركبات (vinValidator + اختبارات) |
| `ai` | ~12 ملف | نواة (config/prompts/provider/metrics/feedback) + documentService + chat store |
| `expenses` | ~20 ملف | مصروفات + فئات + ربط محاسبي + تقارير |
| `settings` | ~10 ملف + شجرة components | شركة/فروع/عملات/وحدات/إشعارات/طباعة/أمان/تكاملات/مخازن/POS — مع CurrencyManager |
| `returns` + `customers` + `parties` + `bonds` + `branches` | صغيرة-متوسطة | مرتجعات، تقسيم عملاء، أطراف، سندات قبض/دفع، مبدّل فروع |
| `notifications` | ~10 ملف | إشعارات + قوالب رسائل (WhatsApp/SMS) + مشاركة |
| `dhikr` | ~11 ملف | شريط أذكار وأوقات صلاة + صوت أذان (مكتبة `adhan`) — إضافة فريدة |
| `smart-import` | صغيرة | استيراد Excel + استخراج ذكي (محل قرار مستقبلي: ربط/إزالة) |
| `appearance` | صغيرة | ثيمات (constants.ts ~1122 سطر) + تحجيم مكثّف للهاتف |
| `command` | ~3 ملف | Command Palette + اختصارات (Ctrl+K إلخ) |
| `feedback` | ~2 ملف | Toast + جمع ملاحظات |

---

## 6. إدارة الحالة والتزامن

### 6.1 تدفق البيانات

```
القراءة:  useQuery → API → supabase (RLS) → كاش React Query → IndexedDB (max 24h)
الكتابة:  useMutation → Service → RPC/جدول → invalidateByPreset(prefixes)
المزامنة: useRealtimeSync (قناة لكل company_id) → invalidate (Throttle 5s)
          + Fallback polling 60s عند انقطاع WebSocket (مع سجل على window.__ALZ_* لتحمّل HMR)
```

### 6.2 خريطة الإبطال المركزية (`src/lib/invalidation.ts`)

- `DOMAIN_KEYS`: مفاتيح معروفة لكل نطاق (sales/purchases/inventory/expenses/accounting/dashboard/parties/reports/ai).
- `INVALIDATION_PRESETS`: بيع، مرتجع بيع، شراء، مصروف، قيد، مخزون، طرف، حساب، إعدادات — كل preset يبطل المفاتيح التابعة.
- ملاحظة موثقة: جداول العمولات غير ممثلة بالكامل في `TABLE_PRESET_MAP` (Realtime) — نقطة تحسين معروفة.

### 6.3 إدارة الحالة (Zustand) — أهم المخازن

| المخزن | الملف | المحتوى |
|---|---|---|
| Auth | `features/auth/store.ts` | user/isAuthenticated/initialize (Optimistic من الخلف المستمر) + onAuthStateChange |
| i18n | `lib/i18nStore.ts` | lang/dir/dictionary + persist |
| Theme | `lib/themeStore.ts` | الثيمات |
| Connection | `core/store/connectionStore.ts` | حالة الشبكة/Realtime |
| POS | `features/pos/store.ts` | السلة والدفع |
| Purchases | `features/purchases/store.ts` | بيانات إنشاء فاتورة شراء |
| Notifications/Sound | `features/notifications/store.ts` | إشعارات + تفاعل صوتي |
| Feedback | `features/feedback/store.ts` | Toast |

### 6.4 العمل دون اتصال

- `OfflineManager` + `offlineQueueStore` + Service Worker.
- عند عودة الاتصال يرسل SW رسالة `REPLAY_ACTIONS` فيعيد النظام تنفيذ فواتير البيع المعلّقة عبر `salesService.processNewSale` ثم يمسح الصف.

---

## 7. نموذج الأمان

### 7.1 نقاط القوة (مطبّقة)
1. **RLS على جميع الجداول** مع عزل الشركة عبر `get_user_company_id()` أو `auth.jwt()->>'company_id'`.
2. **صلاحيات server-side**: جدول `role_permissions` + `has_permission()` RPC (SECURITY DEFINER) — نتيجة ADR-003 بعد ثغرة QA-2026-003 (تلاعب localStorage).
3. **إخفاء أخطاء PostgreSQL** في الإنتاج: `index.tsx` يعترض `window.fetch` ويستبدل رسائل أخطاء PG برسالة عربية عامة، مع تسجيل `logger.error('DB_ERROR_SILENT')`.
4. **منع الـ Mock الصامت**: غياب/خطأ إعداد Supabase خارج الاختبارات → شاشة `SupabaseSetupErrorScreen` بدلاً من بيانات وهمية (إصلاح موثّق من تدقيق 08-15).
5. **مفاتيح AI خلفية فقط**: `ai-proxy` يحمل OPENROUTER/DEEPSEEK في Edge Function؛ `VITE_` لا يُستعمل للأسرار إطلاقاً.
6. **Rate limiting** للذكاء الاصطناعي (10/دقيقة/مستخدم) + `ai_request_log`.
7. **MFA (TOTP)** + Google OAuth + `detectSessionInUrl`.
8. **CORS مقيد** في Edge Functions (قائمة أصول مسموحة).
9. **CI أمني**: TruffleHog لكشف الأسرار + سلسلة migrations لتحصين RPC/RLS (08-05→08-15).
10. **استعلامات RPC آمنة** للبحث (منع إرجاع بيانات أعمق من اللازم) و`search_path` مفروغ عبر `SET search_path = ''` في migrations الأحدث.

### 7.2 مخاطر موثقة (من `docs/frontend-backend-deep-audit-2026-08-15.md` + استكشاف Supabase)
| المستوى | المخاطر | الدليل/الأثر |
|---|---|---|
| 🔴 حرج | صلاحيات `EXECUTE` واسعة لدوال `SECURITY DEFINER` (514 تنبيهاً من Advisor: 213 anon + 239 authenticated) | قد تصبح نقطة تجاوز RLS |
| 🟠 عالٍ | كتابات/حذوفات مالية مباشرة غير ذرية في `purchases/services/maintenance/purchaseFixes.ts` | قيود جزئية أو حذف خاطئ |
| 🟠 عالٍ | فجوة بين migrations المحلية (35) والمنشورة | استحالة إعادة بناء بيئة مطابقة للإنتاج |
| 🟠 عالٍ | Realtime يستمع لكل `postgres_changes` في schema دون فلتر `company_id` | تحديثات متقاطعة بين الشركات + اعتماد خاطئ على client filtering |
| 🟡 متوسط | سياسات RLS `PERMISSIVE` متعددة (203 تنبيهات) | منطق OR قد يوسّع القراءة/الكتابة |
| 🟡 متوسط | fallback محلي عند فشل `has_permission` (usePermission) | قرار محلي ليس مصدراً أمنياً — مسموح للـ UI فقط لا للعمليات الحساسة |
| 🟡 متوسط | اعتماد بعض السياسات على claim `company_id` داخل JWT | يجب ضمان عدم قابلية claim للتلاعب وتزامنه مع العضوية |
| 🟡 متوسط | دوال بلا `SET search_path` (WARN من Advisor: get_next_sequence, commit_expense_v2, commit_sales_invoice…) | هجوم Hijacking محتمل إذا بُثّت دوال ضارة بنفس الاسم |
| 🟡 متوسط | جداول العمولات غير ممثلة كاملة في خريطة Realtime/invalidation | كاش قديم بعد تعديلات commission |

---

## 8. الأداء

### 8.1 التحسينات المطبقة
- **Code Splitting يدوي** عبر `manualChunks`: `vendor-react`, `vendor-router`, `vendor-data`, `vendor-charts`, `vendor-icons`, `vendor-xlsx`, `vendor-export`, `vendor-date`.
- **Lazy Loading** لكل الميزات + `FeatureBoundary` لكل مسار + `routePrefetcher` (تحميل مسبق عند الخمول).
- **استبعاد المكتبات الثقيلة** (jspdf/html2canvas/xlsx) من `optimizeDeps`؛ وتحميلها فقط عند التصدير.
- **بدون source maps** في الإنتاج (تقليص الحجم).
- **customFetch**: مهلة 45s + إعادة محاولة (3) بـ exponential backoff + `AbortSignal` مدمج.
- **React Query**: `staleTime` 5 دقائق، `refetchOnMount/windowFocus` معطّلان — تعويض عبر Realtime (مع fallback polling).
- **تقليل إبطال Realtime** عبر Throttle (5s).
- **استعلامات محسّنة**: RPCs مخصصة (part-search, product_search, get-products) ومؤشرات (`product_search_numbers` ~88K صف).

### 8.2 ملاحظات أداء
- `database.types.ts` (350KB) يؤثر على زمن ترميز TypeScript — مقترح مسبقاً تقسيمه (لا تغيير بعد).
- `Appearance constants` (~1122 سطر) و`ExcelTable` كبير — تحسينات موثقة في `plans/project-analysis.md`.
- مخرجات Realtime العامة تُحدِث إبطالاً شاملاً `invalidateQueries()` في وضع fallback — مقبول مؤقتاً لكنه مكلف.

---

## 9. البنية التحتية للجودة والـ CI

### 9.1 CI (`.github/workflows/ci.yml`)
```
1. npm ci (Node 22)
2. npm run check:encoding      → يمنع تشوّه النص العربي (Mojibake guard)
3. npx tsx scripts/check-ts-baseline.ts → Ratchet: يُفشل فقط عند زيادة أخطاء TS فوق الخط الأساسي
4. npm run lint                → غير حاجب حالياً (يُتتبع كدين منفصل)
5. npm test                    → Vitest (reporter verbose)
6. npm run build               → Vite production build
+ وظيفة أمنية: TruffleHog scan (--only-verified)
```

### 9.2 سكربتات الجودة (`alzhraERP/scripts/`)
| السكربت | الدور |
|---|---|
| `check-ts-baseline.ts` | يحسب أخطاء `tsc --noEmit` ويقارنها بـ `ts-error-baseline.txt` (يُخفَّض الرقم عند الإصلاح) |
| `check-encoding.ts` | كشف فساد ترميز النصوص العربية |
| `type-safety-scanner.ts` | مسح `any` والتحويلات غير الآمنة |
| `quality-report.ts` | توليد تقرير جودة |
| `validate-barrels.ts` | التحقق من سلامة ملفات `index.ts` |
| `fetch_rpc.mjs` / `inspect_schema.js` / `apply-migrations.mjs` | أدوات Supabase |
| `take-screenshots.js` | التقاط لقطات للواجهات |

### 9.3 الأوامر المرجعية (من الجذر)
| الأمر | الوظيفة |
|---|---|
| `npm run dev` | خادم تطوير Vite (منفذ 8081) |
| `npm run type-check` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright (5 مشاريع) |
| `npm run lint` | ESLint (لا أخطاء new مسموحة: `--max-warnings 0`) |
| `npm run build` | بناء إنتاجي |
| `npm run check:encoding` | حارس الترميز |
| `npx tsx scripts/check-ts-baseline.ts` | حارس خط أساس TS |

> ⚠️ **ملاحظة بيئية (2026-08-16):** بيئة العمل الحالية **لا تحتوي `node_modules`**؛ `npx tsx scripts/check-ts-baseline.ts` يعمل عبر تحميل مؤقت من السجل. لتشغيل الاختبارات/البناء محلياً يلزم `npm install` أولاً.

---

## 10. الخلفية (Supabase)

### 10.1 بنية RPC الرئيسية
- **محاسبة:** `post_journal_entry` (تحقق توازن + ترقيم)، `report_trial_balance`, `report_balance_sheet`, `report_income_statement`, `report_cash_flow`, `commit_expense_v2`, `report_debt_aging`.
- **مبيعات/شراء:** `commit_sales_invoice` (مع RLS داخلية)، `commit_purchase_invoice`, `get_next_sequence` (ترقيم آمن).
- **مخزون:** `move_stock`, جرد (audit sessions)، `save_product_uoms`, تجميع Kits.
- **بحث:** `smart_search`, `part-search`, `product_search`, `get_products`, `get_popular_products`, `get_low_stock_products`.
- **إذن/صلاحيات:** `has_permission`, `get_user_permissions`, `get_user_profile`, `get_user_role`, `get_user_company_id`, `user_is_admin_or_manager`.

### 10.2 migrations الحديثة (مؤشر نضج الأمان)
- `20260805000001_secure_exposed_tables.sql` — تحصين جداول مكشوفة.
- `20260809000001..04` — كاش دليل القطع + RLS/RPC + تحصين + race condition للمخزون.
- `20260810000010_server_side_permissions.sql` — منظومة الصلاحيات الخادمية (ADR-003).
- `20260812000002..03` — إسقاط vin_intelligence/debt module ثم إعادة إنشاء أصلح (08-13/08-14).
- `20260814000001_create_ai_request_log.sql` + `20260815000001_add_commission_permissions.sql`.

### 10.3 Edge Functions
| الوظيفة | الدور |
|---|---|
| `ai-proxy` | بوساطة آمنة إلى OpenRouter/DeepSeek (CORS + rate limit + مهلة 60s) |
| `vin-decode` / `vin-parts` | فك شفرة VIN وجلب القطع |
| `part-search` / `get-products` / `ai-part-lookup` | بحث ذكي بالقطع |
| `ai-product-image` / `car-ai-assistant` | صور المنتجات ومساعد AI |
| `zatca-integration` | تكامل الفوترة الإلكترونية السعودية |
| `send-notification` | إشعارات (WhatsApp/SMS) |
| `fetch-exchange-rates-aden` | أسعار صرف عدن |

---

## 11. الاختبارات

- **الوحدة (Vitest):** 30 ملف `*.test.*` — تغطية موزعة على: core utils (decimal, currency, error, logger)، sales store، accounting journalService، commissions (engineGuards, authorization, labels)، debts (whatsapp, messageTemplate, debtService)، vin (validator, labels)، dhikr (prayerTimes, dhikrList)، inventory hooks، connectionStore… مع threshold تغطية ≥30%.
- **E2E (Playwright):** `auth.spec.ts`, `sales-flow.spec.ts`, `accounting-flow.spec.ts` على 5 مشاريع (Chromium/Firefox/WebKit + Mobile Chrome/Safari) مع Trace/Screenshot/Video عند الفشل.
- **ملاحظة:** النسبة الإجمالية ما زالت منخفضة مقابل 873 ملف مصدري — أولوية موثقة في `tasks/plan.md` و`plans/architecture-analysis.md`.

---

## 12. خارطة الطريق الحالية (وفق `tasks/plan.md` + تحديثات محقّقة)

| المرحلة | الحالة المخطط لها | **الوضع المحقّق (2026-08-16)** |
|---|---|---|
| Phase 0 — بوابات | ✅ مكتمل | ✅ إصلاح 3 اختبارات، كنس TS6133، CI بآلية ratchet |
| Phase C1 — أمان الصلاحيات | قيد العمل | ✅ **مكتمل (2026-08-16):** Task 4 (لا استيراد للصلاحيات القديمة)، Task 5 (قائمة جانبية server-driven عبر `useAllPermissions()` + `MenuItem.requiredPermission`)، Task 6 (حُذف `core/permissions/index.tsx` وبقي `offlineRolePermissions.ts` كـ fallback) |
| Phase C2 — TypeScript | هدف baseline=0 | ✅ **مكتمل:** 0 أخطاء + **Task 12 مكتمل** (`any` 877 → **698** < 700): api/services 76→0، ai/service 27→0، hooks/pages (useStockAudit, useInventorySession, AuditSessionPage…) |
| Phase C3 — AI | بانتظار قرار | ⏳ smart-import: ربط أم إزالة |
| Phase D — Backend | تسلسلي | ✅ **تقدّم كبير (2026-08-16):** Task 15 (search_path: 55→0) + Task 16 (Realtime: 8→23) + Task 17 (حذف 7 overloads) منجزة. Task 18/19 صحيحة (43 جدول `prc_*`/`fin_*` موجودة عن بُعد — تصحيح). Task 14 قيد الانتظار (647↔35). **إصلاح حرج:** `commit_purchase_invoice` 400 → trigger الترحيل `draft→lines→posted` + `v_net` من total-tax (متحقق، قيد متوازن)؛ و`commit_sales_invoice_v2` أُصلحت 12 مشكلة (متحقق) |
| Phase E — i18n | — | ⏳ تدقيق النصوص + توحيد husky |

> **إجراء سريع مقترح:** تحديث `scripts/ts-error-baseline.txt` إلى `0` (في نفس commit) لتثبيت الإنجاز وجعل البوابة حاجبة فعلاً — ملاحظة السكربت نفسه تطلب ذلك ("Lower scripts/ts-error-baseline.txt in the same commit to lock it in").

---

## 13. التوصيات مرتبة حسب الأولوية

### 🔥 حرجة (أمان/مالية)
1. تضييق `EXECUTE` العام عن دوال `SECURITY DEFINER` الحساسة (المحاسبة والمخزون) ومراجعة كل دالة تُنفذ قيوداً مالية/مخزنية.
2. تحويل كتابات/حذوفات `purchaseFixes.ts` إلى RPC إدارية ذرّية (transaction + audit + dry-run + عدّادات).
3. إضافة `SET search_path = ''` لكل دوال SECURITY DEFINER الباقية (Task 15).

### 🟠 عالية
4. مصالحة migrations المحلية مع المنشورة (`db pull` ثم ترقيم متسلسل) — أساسي لإعادة البناء.
5. فلترة قناة Realtime بالشركة (`company_id` في التصفية) + إضافة جداول العمولات لـ `TABLE_PRESET_MAP`.
6. تقليص `any` (موجة طبقة api/service) — دعم أدوات TypeScript في كشف عدم تطابق الأعمدة.

### 🟡 متوسطة
7. إنهاء هجرة الصلاحيات (حذف الخريطة القديمة في `permissions/index.tsx` بعد استبدال مواقع الستة).
8. رفع تغطية الاختبارات (خاصة RPC contracts وسيناريوهات cross-company وnegative authorization).
9. تحديث `tasks/todo.md` وخط أساس TS (0) ليعكسا الحالة الفعلية.
10. تقسيم `database.types.ts` و`appearance/constants.ts` لتسريع الترميز (موثّق مسبقاً).

---

## 14. ملحق: أبرز الملفات/المسارات للتنقل السريع

| الملف | لماذا يهمك |
|---|---|
| `src/index.tsx` | نقطة الدخول + إخفاء الأخطاء + حارس إعداد Supabase |
| `src/App.tsx` | تشغيل النظام + توجيه |
| `src/app/routes.tsx` | خريطة المسارات الكاملة (Lazy) |
| `src/core/routes/paths.ts` | ثوابت المسارات (لا hardcode) |
| `src/lib/supabaseClient.ts` | العميل الوحيد (timeout/retry/guards) |
| `src/lib/queryClient.ts` | إعدادات React Query + IndexedDB persist |
| `src/lib/invalidation.ts` | خريطة إبطال الكاش المركزية |
| `src/lib/hooks/useRealtimeSync.ts` | المزامنة الفورية + fallback |
| `src/features/auth/store.ts` | جلسة المستخدم (Optimistic + onAuthStateChange) |
| `src/core/permissions/offlineRolePermissions.ts` | خريطة أدوار (fallback دون اتصال فقط) |
| `src/features/inventory/service.ts` | نموذج طبقة Service للميزة الأكبر |
| `src/features/sales/service.ts` | تدفق البيع الكامل (validation → routing → RPC → messaging) |
| `supabase/migrations/` | المخطط الكامل (40 ملفاً) |
| `supabase/functions/ai-proxy/index.ts` | نموذج Edge Function آمن |

---

---

## 15. دراسة مُعمّقة لاحقة — الانهيار الأمامي بعد نجاح RPC (جلسة 2026-08-16)

### 15.1 الأعراض (سجل متصفح الإنتاج)

بعد تطبيق إصلاح الـ 400 على `commit_purchase_invoice`، نجحت أول فاتورتا شراء
(المعرّفان `9a5059ab…` و`4b5d5a54…`، طريقة `cash`) ثم انهارت واجهة **المشتريات** فوراً:

```
Purchase accounting atomic RPC executed for: 9a5059ab-… Method: cash
TypeError: Cannot read properties of undefined (reading 'invoice_number')
    at fa (PurchasesPage-H4upeAyj.js:16:6034)
[ERROR] [ErrorBoundary] Caught error
[ERROR] [FeatureBoundary] Error in feature: purchases
```

### 15.2 السبب الجذري — Frontend (كان كامناً ولا يظهر إلا بعد نجاح RPC)

`src/features/purchases/components/PurchaseDetailsModal.tsx`:

```tsx
const { data, isLoading } = usePurchaseDetails(invoiceId);
const invoice = data as PurchaseDetailInvoice | null;   // أثناء أول تحميل: data === undefined
...
if (invoiceId === null) return null;
...
{invoice !== null && <ModalHeader invoice={invoice} … />}  // undefined !== null → TRUE → انهيار
```

- في **TanStack Query v5** تكون قيمة `data` هي `undefined` قبل اكتمال أول جلب (وليس `null`).
- في JavaScript: `undefined !== null` → `true`، لذا تُمرَّر قيمة `undefined` إلى
  `ModalHeader` الذي يقرأ `invoice.invoice_number` → `TypeError`.
- **لماذا لم يظهر سابقاً؟** الكاش المديم في IndexedDB كان يعيد `data` فوراً عند فتح
  تفاصيل فاتورة قديمة، فيختبئ خطأ أول-التحميل. الفاتورة **الجديدة** بلا كاش → أول
  render أثناء التحميل يكشفه.

### 15.3 الإصلاح (سطر واحد)

```tsx
const invoice = (data ?? null) as PurchaseDetailInvoice | null;
```

- `data ?? null` يطبع `undefined → null` في زمن التشغيل، فتصبح الحُراسة `invoice !== null`
  صحيحة، ويتحول العرض إلى حالة التحميل (`ModalBody` يستخدم `isLoading`).
- التحقق: `ModalBody` (فحص truthiness) و`ModalFooter` و`handlePrint` (optional chaining)
  آمنة أصلاً. مودال **المبيعات** (`InvoiceDetailsModal`) سليم لأنه يستخدم
  `isLoading ? … : invoice ? …`، وعقد `salesService.processNewSale` محمي بـ `if (result)`.

### 15.4 دروس مستخلصة

1. **لا** تكتب `data as T | null` ثم تحرس بـ `!== null` — طبّع أولاً: `data ?? null`.
2. الكاش المديم (IndexedDB) **يُخفي** أخطاء أول-تحميل للبيانات القديمة ويُظهرها
   للبيانات الجديدة فقط — ظاهرة تستحق الانتباه في كل المودالات.
3. فحص شامل للنمط عبر `src/features/**/*.tsx` أظهر أن هذه الحالة هي الوحيدة من
   نوعها (الباقي يستخدم فحوص truthiness/optional chaining).

### 15.5 نقاط تعمّق إضافية من الجلسة

- **الواجهة المعمارية سليمة**: `Component → Hook → Service → API → Supabase` مفروض
  فعلياً (لا استدعاء `supabase` داخل المكونات؛ القراءة عبر `useQuery` والكتابة عبر
  `useMutation` مع `invalidateByPreset`).
- **الصلاحيات server-side مكتملة**: `assertPermission`/`usePermission` يستخدمان RPC
  `has_permission` مع owner-bypass وfallback دون اتصال `offlineRolePermissions.ts`
  (الحظر الحقيقي يبقى عبر RLS).
- **المزامنة اللحظية**: `useRealtimeSync` يعتمد قناة شبه دائمة لكل `company_id` مع
  خريطة `TABLE_PRESET_MAP` (23 جدولاً) وThrottle 5s وFallback polling 60s — متوافق
  مع سجل المتصفح (`CHANNEL_CLOSED → 60s fallback`).
- **مقاييس المصدر الحالية**: 873 ملف (474 TSX/399 TS)؛ 683 ملف ميزة؛ 40 ميغريشن؛
  30 ملف اختبار وحدة.

---

*نهاية الوثيقة — أُعدّت بناءً على استكشاف مباشر للمستودع وتشغيل أدوات التحقق (`check-ts-baseline`). أي تغييرات لاحقة على الكود/المخطط يجب أن تُحدِّث هذه الوثيقة ضمن تعريف "الإنجاز" (Definition of Done) للمشروع.*
