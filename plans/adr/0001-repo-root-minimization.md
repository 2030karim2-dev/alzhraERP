# ADR-0001: تجنيف جذر المستودع وتصفية الملفات الميتة

**التاريخ:** 2026-08-30
**الحالة:** مقبول
**السياق:** مراجعة صارمة كشفت ازدواجية كاملة للـ toolchain بين الجذر و`alzhraERP/`، ومرآة تبعيات متخلفة (الجذر يفتقد `adhan` ويحمل `vite-plugin-pwa` المُهمَل)، وسكربتات لمرة واحدة تراكمت في `scripts/`.

## القرار

### 1. الجذر أصبح مُنسِّقاً فقط
- `package.json` الجذري: scripts فقط (كلها `npm --prefix alzhraERP ...`) + `build.js` للنشر + `husky` كتبعية تطوير وحيدة (لأجل `prepare`).
- **ممنوع إضافة أي تبعية للت الجذر** — كل الأدوات تعيش في `alzhraERP/`.
- حُذفت من الجذر: `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `vitest.config.ts`, `postcss.config.js`, `tailwind.config.js`, `eslint.config.js`, `package-lock.json` (يُعاد توليده صغيراً), `index.html`, `public/` (manifest, pwa-icon, vite.svg), `metadata.json`, `check-case.mjs`.
- **الدليل:** `build.js` يبني من `alzhraERP/` وينقل `dist` للجذر؛ `vercel.json`/`netlify.toml` يستدعيان `npm run build` فقط؛ لا شيء يشير لملفات الجذر المحذوفة (فحص 2026-08-30).

### 2. تبعيات حُذفت (مع الدليل)
| التبعية | السبب |
|---|---|
| `@google/genai` | صفر استيراد في src؛ استدعاءات AI عبر `supabase/functions/ai-proxy` (Deno) |
| `@types/decimal.js` | حزمة types مهملة رسمياً؛ `decimal.js` يأتي بأنواعه |
| `vite-plugin-pwa` | كان في الجذر فقط؛ لا SW مُولَّد ولا plugin مسجل |

> **تصحيح بعد الاختبار (2026-08-30):** `react-is` حُذفت مبدئياً (صفر استيراد في src)
> لكن `vite build` فشل — `recharts/es6/util/ReactUtils.js` يستورده مباشرة وقت التشغيل،
> وكان يُرضى يدوياً عبر package.json (npm يتخطى التبعيات الممررة مع `legacy-peer-deps`).
> **أُعيدت كتبعية تشغيل إلزامية.** الدرس: تبعية تُرضى يدوياً لا تُحذف بفحص الاستيراد وحده —
> المعيار هو `npm ls <pkg>` + `vite build` كامل.

### 3. تبعيات بدايت ميتة وهي حية — أُبقيت (منع هلوسة الحذف)
- `qrcode` — import ديناميكي في `src/features/supplier-portal/services/pdfEngine.ts:28`
- `stream-browserify` + `vite-plugin-node-polyfills` — يستهلكهما `alzhraERP/vite.config.ts` عبر `nodePolyfills()`
- `decimal.js` — 8 ملفات تستوردها
- `react-is` — مطلوب وقت التشغيل من `recharts` (أثبته فشل البناء 2026-08-30)

### 4. سكربتات `alzhraERP/scripts/`
- **أُبقيت** (خطافات/CI): `check-encoding.ts`, `check-ts-baseline.ts`, `check-i18n-keys.mjs`, `check-contradicting-classes.mjs`, `check-tiny-fonts.mjs`, `ts-error-baseline.txt`, `apply-migrations.mjs` (ADR-010), `run-security-canary.ps1`, `quality-report.ts`, `type-safety-scanner.ts`, `validate-barrels.ts`
- **حُذفت** (لمرة واحدة، قابلة للاسترجاع من git): 14 ملفاً — أدوات تشخيص/ترحيل استُهلكت (`apply-*-migrations.ps1`, `rollback-snapshot-*.sql`, `verify-fixes.mjs`, أدوات "auto commit" القديمة، `generate-baseline.mjs` بلا أي مرجع)
- **ممنوع إنشاء مجلدات أرشيف** (`old/`, `backup/`) — git هو الأرشيف.

### 5. إصلاحات مرافقة
- `Modal.tsx`: `icon/description/footer` أصبحت اختيارية + خاصية `hideHeader` جديدة (كان `PrayerTimesModal` يمررها دون وجود → خطأ TS).
- سكربت `clean` الداخلي حُذف (كان يستدعي `cleanup.sh` غير الموجود).
- `security-canary.yml`: `ON_ERROR_STOP=1` + `tee -a sql_output.log` + فحص `CANARY FAIL` فعلي (كان لا يستطيع الفشل إطلاقاً).

## العواقب
- النشر عبر Vercel/Netlify لا يتغير (`npm run build` → `build.js` → بناء داخلي).
- أي مطور يشغّل `npm install` في الجذر سيحصل على بيئة hooks سليمة وحدها.
- مرجعية الحقيقة الواحدة للتوليد: `alzhraERP/package.json`.
