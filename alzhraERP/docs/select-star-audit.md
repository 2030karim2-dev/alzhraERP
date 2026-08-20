# تدقيق `select('*')` في الواجهة الأمامية — 2026-08-20

هدف التدقيق: تقليل نقل الأعمدة غير الضرورية في الاستعلامات المتكررة/الكبيرة، مع توثيق
ما هو مقصود وما يحتاج تتبع مستهلكين قبل التقليص. التحقق من أسماء الأعمدة تم ضد
`src/core/database.types.ts` (مولّدة من المخطط الحي).

## ✅ تم تقليصه فعلياً (محقَّق عموداً بعمود)

| الموقع | من → إلى | السبب |
|---|---|---|
| `features/expenses/api.ts` — `getExpensesRaw` | `*` (21 عموداً) → 15 عموداً + join | المستهلك الوحيد `expensesService.getExpensesList` يتعاقد على واجهة `Expense` فقط؛ الأعمدة المحذوفة (`company_id, created_by, deleted_at, updated_at, updated_by`) غير مستهلكة. |
| `features/notifications/messagingApi.ts` — `getLog` | `*` → 9 أعمدة | تطابق تام مع واجهة `NotificationLogEntry` في نفس الملف. |

## 🟢 `*` مقبول (جداول إعداد صغيرة / جلب صف كامل / فهارس)

| الموقع | السبب |
|---|---|
| `settings/api.ts` — getCompany/getBranches/getWarehouses/getSupportedCurrencies/getExchangeRates/getFiscalYears | جداول إعداد صغيرة، والواجهات تستهلك معظم الأعمدة. |
| `settings/api/warehouseApi.ts` — fetchWarehouses | جدول `warehouses` صغير. |
| `inventory/api/productsApi.ts` — getProductById (صف واحد) / getCategories | جلب صف واحد / جدول فئات صغير. |
| `inventory/api/aiPartLookupApi.ts:51` — كاش بحث | صف واحد (idempotency lookup). |
| `expenses/api.ts` — getExpenseCategories | جدول صغير. |
| `accounting/api/treasuryApi.ts` — الخزن | جداول صغيرة. |
| `commissions/api/plans.ts` (6 مواقع) / `debts/api/debtApi.ts` (3 مواقع) / `vin-intelligence/api` (موقعان) | جداول متوسطة لكن القوائم تحتاج معظم الحقول. |
| `auth/api.ts:163` — profiles fallback | جلب البروفايل الكامل مقصود (سقوط من RPC). |
| `notifications/messagingApi.ts` — getConfig | صف واحد؛ وتقليصه محفوف بمخاطر تسمية أعمدة (`notify_on_bond` مقابل `notify_on_payment_bond` في الـ types). |
| `core/services/storage.service.ts:105` | قائمة ملفات المخزن. |
| `scripts/setup-cashboxes.ts:80` | سكربت لمرة واحدة. |

## 🟠 مرشح للتقليص مستقبلاً (يتطلب تتبع المستهلكين أولاً)

| الموقع | ملاحظة |
|---|---|
| `inventory/api/warehouseApi.ts` — `getProductMovements` | جدول حركات (`inventory_transactions`) — تقليصه يفيد، لكن واجهة حركة المنتج قد تعرض أعمدة متعددة. |
| `accounting/api/accountsApi.ts:9` — قائمة الحسابات | جدول متوسط الحجم؛ واجهة الحسابات تستهلك حقولاً كثيرة (code/type/balance…). |
| `parties/api.ts:93` — بحث الأطراف | محدود بـ limit(10) لكنه يجلب الصف الكامل؛ تقليصه يحتاج تأكيد حقول بطاقة الطرف. |

## توصية

المكسب الحقيقي التالي هو تقليص `getProductMovements` وقائمة الحسابات بعد تتبع
واجهاتهما، ثم قائمة الفواتير/قيود اليومية في `reports/api.ts` (المتعمّدة أصلاً في
أعمدة محددة). الأولوية الأدنى لملفات التصدير (excel) لأنها تعمل على ذاكرة محلية.
