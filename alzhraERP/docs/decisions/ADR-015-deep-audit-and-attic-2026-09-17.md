# تقرير التدقيق العميق والصيانة — 2026-09-17

## ملخص P0 (الخطر) — ✅ منفّذ

### 1. إصلاح إصدارات Migrations المكررة (كانت ستُفشل `supabase db push`)

| قبل                                                                      | بعد                              |
| ------------------------------------------------------------------------ | -------------------------------- |
| `20260912000015_harden_inventory_audit_bulk...` (مكرر)                   | → `20260912000016_...`           |
| `20260915000002_increase_invoice_search_limit` (مكرر)                    | → `20260915000007_...`           |
| `20260916000004_patch_rpc_security.sql` (72B، تعليق فقط)                 | → أُرشف في `migrations_archive/` |
| `part1..part4` (المحتوى الحقيقي)                                         | → `20260916000013..00016_...`    |
| `part5` (74B فارغ)                                                       | → أُرشف                          |
| `combined_vin_intelligence_update.sql` (بلا طابع زمني — لا يُطبّق أبداً) | → أُرشف مع توثيق السبب           |

**النتيجة: صفر تكرارات، كل ملف بلا طابع زمني خرج من مجلد التطبيق.**

### 2. تسريب تتبع Git

- `alzhraERP/supabase/.temp/cli-latest` أُزيل من التتبع (`git rm --cached`) —
  كان متتبعاً رغم وجود `supabase/.temp/` في `.gitignore` (أُضيف بعده).
- `.kilo/worktrees/mint-bit` (نسخة مستودع كاملة مكررة) أُزيلت بـ `git worktree remove`.

### 3. مخلفات مؤقتة

`tmp-import/` و`final-vitest.txt`: غير متتبعة ومتجاهلة أصلاً — لا إجراء مطلوب.

## ملخص P1 (الأيتام) — ✅ منفّذ بالكامل

**56 ملفاً ميتاً** أُرشف إلى `_attic/orphaned-2026-09-17/` (كلها `git mv` —
استرجاع كامل ممكن). المنهجية والقائمة: `_attic/orphaned-2026-09-17/README.md`.

- الأداة: `scripts/orphan-scan.mjs` — تعدّ **الملفات** المستخدمة (لا التكرارات)،
  شُغّلت تكرارياً حتى الاستقرار على **صفر أيتام** (الجيل الثاني: 6 ملفات تابعة).
- درس ADR-010 طُبّق: تدقيق يدوي لعينة حساسة قبل الأرشفة + تحقق من عدم وجود
  استيراد ديناميكي في المشروع كله.
- `src/scripts/` أُفرغ ونُقل محتواه التشغيلي (`setup-cashboxes`, `migrate-balances`,
  `analyze-codebase`) إلى `scripts/` مع تصحيح مسار `.env`.
- `_attic/**` أُضيف إلى `eslint.ignores`.

## ملخص P2 (God Files) — ✅ بدأ بالملف الأسوأ

### CreateBondModal.tsx: 1,157 → 812 سطراً (-30%)

- استُخرج `src/features/bonds/hooks/useBondForm.ts` (475 سطراً): كل منطق
  النموذج (عملات، YER=410، تطهير الأرقام، Tafqeet، حساب الصرف العكسي،
  الاختصارات، الحسابات المشتقة، التدقيق المالي الخماسي).
- المودال صار عرضاً خالصاً (Presentational) يستقبل كل شيء من الهوك.
- الواجهة العامة للمكون لم تتغير إطلاقاً.

## نتائج بوابات الجودة (بعد كل التعديلات)

| البوابة                 | النتيجة                      |
| ----------------------- | ---------------------------- |
| `tsc --noEmit`          | **0 أخطاء** ✅               |
| `vitest run --coverage` | **820/820 نجح** (108 ملف) ✅ |
| `npm run build` (vite)  | نجح في 2:31 ✅               |
| `check:encoding`        | نظيف ✅                      |
| `check:layers`          | نظيف ✅                      |
| `scan:orphans`          | 0 أيتام ✅                   |

## P3 (تعزيز الرقابة) — ✅ منفّذ

- `check:encoding` موسّع: يفحص الآن 8 ملفات جذر (`.env.example`, README,
  SECURITY, AGENTS, SYSTEM_PROMPT, SUPABASE_RULES, netlify, vercel) +
  يتجاهل `_attic`.
- `npm run scan:orphans` متاح كأمر دائم.
- ديون معروفة متبقية (خارج نطاق هذه الجلسة، موثقة للتتبع):
  ~401 استخدام `any` (معظمه في ملفات الاختبار المعفاة)، ~30 `console.log`،
  54 `eslint-disable`، و7 ملفات God components >700 سطر
  (VinManualVehicleForm 912، CreatePurchaseQuotationModal 904،
  QuotationComparisonView 822، productService 768، PartsExtractTab 747،
  ExcelTable 745، VinsTab 728).
