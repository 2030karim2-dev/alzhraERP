# 🛠️ الخطة الرئيسية للإصلاح الشامل — Al-Zahra Smart ERP

**التاريخ:** 2026-08-26
**المصدر:** التدقيق العميق الصارم لهذه الجلسة (قياسات حية موثقة) + `docs/FINAL-SECURITY-VERIFICATION-2026-08-26.md`
**الحالة المرجعية عند الإعداد:** تقييم عام 67/100 • tsc=0 • vitest 471/471 ✅ • lint=13,375 مشكلة • هجرات أمنية غير مطبقة

---

## 📌 ملخص تنفيذي لعدد الأصناف

| الصنف | العدد | أخطر مثال |
|---|---|---|
| ثغرات أمنية بانتظار التطبيق الحي | 10 هجرات (تشمل Critical R-26) | كتابة عابرة للمستأجرين عبر 40 دالة `api_v1_*` |
| أخطاء ESLint | 13,203 خطأ + 172 تحذيراً في 708 ملفات | `chatService.ts` وحده 435 |
| تسريبات نوعية | 398 `any` + 135 `as unknown as` + 25 `console.log` | `(supabase as any)` في خدمات الدردشة |
| تناقضات موثقة | 6 | تقريران أمنيان متعاركان (19 مقابل 28 ثغرة) |
| نواقص بوابات/تغطية | 6 | lint غير مانع في CI؛ تغطية 30% فقط |
| تكرارات بنيوية | 5 | عائلة مُصدِّرات Excel (~1,000 سطر مكرر النمط) |

---

# 🔴 المرحلة B — إغلاق الثغرات الأمنية (P0 — قبل أي شيء)

> **المبرر:** أرخص قفزة نوعية (+8 نقاط تقييم) وأخطرها حالياً على الإنتاج.

## B-1: تطبيق الهجرات العشر `20260826000000 → 20260826000010`
| # | الملف | ما يعالجه |
|---|---|---|
| 000 | security_sweep_audit | MIME guard + قفل idempotency لكل شركة + مشغّل دردشة `content` |
| 001 | fix_api_v1_cross_tenant_vulnerability | ⚠️ **CRITICAL R-26**: حقن `fn_assert_company_access` في 40 دالة |
| 002 | storage_per_bucket_tenant_policies | HIGH R-27: عزل مستأجرين على buckets `invoices`/`company-assets` |
| 003 | audit_logging_hardening | MED R-28: مساعد `audit_write()` + عرض `v_rpcs_missing_audit` |
| 004 | rate_limit_hardening | MED R-29: `check_rate_limit` ذرية + غلاف `rl_commit_*` |
| 005 | wire_audit_write_into_write_rpcs | ربط التدقيق بالـRPCs الكتابية |
| 006 | input_validation_triggers | حدود طول النصوص + رفض محارف التحكم خادمياً |
| 007–010 | متفرقات | تحصينات + `search_path` (R-30) |

**التنفيذ:** عبر `pg-test/run.mjs` أو Management API (كما في checkpoint 25 أغسطس).
**معيار القبول:** استعلام `schema_migrations` يظهر العشرة كلها + `v_api_v1_missing_tenant_guard` فارغ.

## B-2: تنفيذ منظومة اختبارات SQL (56 اختباراً)
- `supabase/tests/*.sql` كاملة + توثيق PASS/FAIL في `docs/evidence/`.
- **الكناري:** `test_canary_all_audit_views.sql` (14 فحصاً) + **meta-test** الفشل المتعمّد لإثبات قدرة الكشف.
- **معيار القبول:** 56/56 + 14/14 + meta-test يفشل كما يجب.

## B-3: التحقق الخصمي الحي (قلب البوابة إلى VERIFIED)
وفق خطوات التقرير النهائي حرفياً:
1. من جلسة شركة A: `api_v1_prc_cancel_po(B, PO_B, ...)` → يجب `access_denied` (إثبات R-26)
2. من شركة A: `storage.from('invoices').download('<B_id>/<file>')` → رفض
3. من شركة A: SELECT على فواتير B → صفر صفوف
4. نشر Vercel preview → `curl -I` للتحقق من CSP/COOP/COEP/CORP
5. نشر Edge Function `csp-report` المشار إليه في الترويسات لكنه غير منشور بعد
6. اختبار تزامن: دفعة 100 طلب على `rl_commit_sales_invoice_v2` خلال 100ms → تجاوز الحد يُرفض

## B-4: جدولة المخاطر المقبولة (لا تُترك بلا مالك فعّال)
| ID | الخطر | الاستحقاق المستهدف |
|---|---|---|
| R-02 | سياسة كلمات مرور عميلة فقط | Auth Hook على مستوى المشروع — 2026-09-26 |
| R-03 | JWT في localStorage | وكيل auth بمفاتيح httpOnly — 2026-12-31 |
| R-06/R-17 | fallback الصلاحيات / limit(1) | مراجعة backend — 2026-10-31 / 11-30 |

## B-5: توثيق غلق البوابة
تحديث `ADR-013-security-gate.md`: من CANNOT-VERIFY إلى VERIFIED مع روابط الأدلة، وإضافة لافتة «مُتجاوَز بواسطة» أعلى `SECURITY-AUDIT-REPORT-2026-08-26.md` (معالجة التناقض C-1 أدناه).
