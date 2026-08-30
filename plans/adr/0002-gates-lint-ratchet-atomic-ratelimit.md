# ADR-0002: إغلاق بوابات الحوكمة والأمان (Lint Ratchet + Rate-Limit ذري + CSP)

**التاريخ:** 2026-08-30
**الحالة:** مقبول
**السياق:** أظهر إصلاح البوابات أن الـ lint الكامل (13,000+ مشكلة تاريخية) لا يمكن أن يصبح مانعاً
دفعة واحدة دون شلّ الإنتاج، بينما ترك `eslint --max-warnings 0` على الملفات المتغيرة يفشل على
دين بنيوي سابق في مكوّنات تعمل. كما أن edge-functions كانت تستخدم ledger rate-limit غير ذري.

## القرارات

### 1. راتشيت lint لكل ملف (scripts/check-lint-ratchet.mjs)
- `lint-baseline.json`: خريطة `ملف → عدد أخطاء ESLint` الحالي (بُذرت من الشجرة كاملة).
- البوابة ترفض أي **نمو** في عدد الأخطاء لملف متغيّر، وتفرض صفر أخطاء على الملفات الجديدة.
- الديون البنيوية القديمة (max-lines/complexity في مكوّنات كبيرة) **مجمّدة ومرئية** في الأساس،
  وتُسَدّ تدريجياً (وضع `--update` يُستخدم فقط عند سداد مقصود).
- مدمجة في: `lint-staged` (pre-commit) و CI على الملفات المتغيرة.
- **درس مستفاد (2026-08-30):** أثناء محاولة أول commit، `eslint --fix` الخام داخل lint-staged
  فشل على الدين المجمد (86 خطأً في 8 ملفات) ففشل الـ pre-commit، ثم آلية استعادة lint-staged
  نفّذت `git reset --hard HEAD` مرتين فمسحت الفهرس والشجرة. الاستعادة تمت من الـ stash
  التلقائي `stash@{0}`. **القرار النهائي:** بوابة الـ commit هي الـ ratchet وحدها
  (`prettier --write` ثم `node scripts/check-lint-ratchet.mjs --files={paths}`) — لا `eslint --fix`
  الخام في lint-staged أبداً؛ الـ autofix اختياري عبر `npm run lint:fix`.
- البديل المرجوّض: إعادة كتابة مكوّنات (413 سطراً في PrayerTimesModal) — مخاطرة عالية خارج نطاق الإصلاح.

### 2. Rate limit ذري fail-closed بدل ledger غير ذري
- `ai-proxy` و `vin-decode` كانتا تستخدمان جدول `ai_request_log` بنمط insert-then-count
  تتحمل TOCTOU وتفشل مفتوحة. استُبدل باستدعاء RPC `check_rate_limit` (SECURITY DEFINER)
  فوق `api_rate_limits` ذي UNIQUE(company_id, endpoint) — أي سباق تحوّله القاعدة لفشل مغلق.
- يدعى بـ JWT المستخدم (لا service_role) لأن الـ RPC يتحقق بـ `auth.uid()`.
- الفشل البنيوي (DB/RPC) يرفض الطلب (fail-closed) بدل السماح.
- **ملاحظة تشغيلية:** لم يعد يُكتب في `ai_request_log`؛ أي خلل تخزين للـ AI يُحتسب في api_rate_limits.

### 3. CSP: إزالة 'unsafe-eval'
- فحص أثبت صفر استخدام `eval()`/`new Function()` في src → إزالة `unsafe-eval` من
  `alzhraERP/index.html`, `vercel.json`, `netlify.toml`. `unsafe-inline` يبقى مؤقتاً
  حتى يكتمل مسار nonce (خطوة CSP-Enforce التالية موثقة في خطة الإصلاح).

## العواقب
- pre-commit يُمرر الملفات ذات الدين المجمّد تلقائياً، ويمنع أي خطأ lint جديد — دون `--no-verify`.
- أي PR يمسّ ملفاً ثقيل الدين يظهر في baseline كدين مجمّد (شفافية كاملة) يُسَدّ تدريجياً.