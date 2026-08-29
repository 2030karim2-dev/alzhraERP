# ADR-014: Mobile-First UX Foundation — Typography, Touch, Safe-Area, Tables

## Status

Accepted

## Date

2026-08-30

## Context

نظام الزهراء يُدار بكثرة من الهواتف (نقطة بيع، متابعة ديون، جرد ميداني)، لكن واجهة
الموبايل كانت تحتوي مشاكل نظامية جعلتها غير صالحة للإنتاج:

| المشكلة          | القياس قبل الإصلاح                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| خطوط لا تُقرأ    | جذر الخط على الموبايل = `15px × 0.8 × 0.77` ≈ **9.2px**، مع وجود `text-[7px]` و`text-[8px]` في أكثر من 173 ملفاً     |
| تكبير معطّل      | `maximum-scale=1.0, user-scalable=no` في `index.html` — مخالفة WCAG 1.4.4                                            |
| صفر safe-area    | لا `viewport-fit=cover` ولا `env(safe-area-inset-*)` — شريط التنقل السفلي وFAB يختفيان تحت نوتش آيفون/شريط الإيماءات |
| أهداف لمس معكوسة | `Button.tsx` كان **يُصغّر** الأزرار على الموبايل (`max-md:min-h-[26px]` للحجم sm) بدل تكبيرها                        |
| جداول مزدحمة     | جداول من 7-9 أعمدة (`FollowUpTable`, `JournalTable`, صندوق الرسائل) تُعصر على 390px                                  |

قررنا وضع أساس موبايل-فيرست مؤسسي بدل إصلاحات تجميلية متفرقة.

## Decision

### D1 — التكبير اليدوي مفعّل + منع تكبير iOS التلقائي للحقول

- `index.html`: `width=device-width, initial-scale=1.0, viewport-fit=cover`
- حذف `maximum-scale=1.0` و`user-scalable=no` (WCAG 1.4.4).
- بديل منع التكبير التلقائي عند تركيز الحقول: `@media (max-width: 767px) { input, select, textarea { font-size: 16px !important; } }`
  في `src/index.css` — الحل القياسي الذي يحافظ على قابلية التكبير اليدوي.

### D2 — حد أدنى إلزامي لأحجام الخطوط

- جذر الموبايل: `calc(var(--app-font-size, 15px) * var(--scale, 1))` (= **12px**، إلغاء معامل `×0.77`).
- الديسكتوب لم يتغيّر (كان 15px عند md فأعلى — لا أثر رجعي).
- أي `text-[1-9px]` مرفوض بواسطة الحارس `npm run check:fonts`
  (`alzhraERP/scripts/check-tiny-fonts.mjs`) — حد أدنى عملي `text-[10px]`.

### D3 — أهداف لمس ≥44px على الموبايل

- `Button.tsx` أُعيد قلبه: الموبايل **يكبّر** (`sm/md → 44px`، `lg → 48px`) بدل أن يصغّر.
- `Header.tsx`: ارتفاع الموبايل `h-12` وزر قائمة `p-2.5` (منطقة ~40px فعالة).

### D4 — Safe-Area لكل العناصر السفلية الثابتة

- `viewport-fit=cover` + `env(safe-area-inset-bottom)` في:
  - شريط التنقل السفلي: `h-[calc(3.5rem+env(safe-area-inset-bottom))]`
  - حشوة المحتوى: `pb-[calc(5rem+env(safe-area-inset-bottom))]`
  - `QuickActionFAB`: `bottom-[calc(6rem+env(safe-area-inset-bottom))]`
  - `BottomSheet`/`Modal`/`CartTotals` (زر الدفع في POS): `pb-[max(Nrem, env(...))]`

### D5 — بطاقات موبايل بدل الجداول العريضة

- الجدول محفوظ للديسكتوب: `hidden md:block` + `overflow-x-auto scroll-x-hint-surface`.
- بديل بطاقات `md:hidden` يُبنى لكل شاشة كثيفة الأعمدة (نمط `TransferMobileCard`):
  `FollowUpTable`, `PromisesPage`, `OutboxPage`, `JournalTable`.
- للجداول التي لا تزال تتصفح أفقياً (فواتير/مشتريات/عمولات): تلميح ظل تلقائي
  `scroll-x-hint*` في `index.css` (خدعة `background-attachment: local/scroll`) يظهر فقط عند فائض فعلي.

### D6 — توحيد الألوان على CSS Variables

- كل `bg-white dark:bg-slate-900` → `bg-[var(--app-surface)]` (276 موضعاً في 159 ملفاً).
- مخصص الثيمات (الوضع الداكن/اللون المميز) يؤثر الآن على كل البطاقات بلا استثناء.

### D7 — الحواجز المؤسسية (تُنفَّذ في `pre-push`)

- `check:classes` (`check-contradicting-classes.mjs`): يرفض نفس utility بقيمتين في نص className واحد.
- `check:fonts` (`check-tiny-fonts.mjs`): يرفض `text-[1-9px]`.
- إضافة `playwright-report/` و`test-results/` إلى `.gitignore`.

## Consequences

### Positive

- جذر الموبايل 12px + حد أدنى 10px → قراءة فعلية في الميدان.
- `e2e/mobile-responsive.spec.ts` يتحقق من: لا overflow أفقي، لا نصوص <9.5px، سلامة الشريط السفلي — قابل للتشغيل في CI.
- أهداف اللمس تلبي Apple HIG / Material (44px+).
- الثيم الداكن متسق الآن عبر المكونات.

### Negative / Trade-offs

- ارتفاع خط الموبايل +30%: النصوص أوضح لكن الشاشات الكثيفة (POS) قد تحتاج ضبطاً بصرياً لاحقاً — مقبول كمقايضة.
- `dark:bg-slate-800` (548 موضعاً في 214 ملفاً) تُركت متعمّدة: أتمتتها تغيّر سياقات متنوعة بدون فهم — مؤجلة لمراجعة يدوية.
- بطاقات الموبايل تُضاعف JSX (جدول + بطاقة لكل شاشة) — يُخفَّف لاحقاً بمكوّن `MobileCardList` موحّد (P4).

## Verification

| الفحص                                  | قبل        | بعد                          |
| -------------------------------------- | ---------- | ---------------------------- |
| `tsc --noEmit`                         | —          | ✅ بلا أخطاء                 |
| Vitest                                 | —          | ✅ 567/567                   |
| `check:classes`                        | 31 تعارضاً | ✅ 0                         |
| `check:fonts`                          | —          | ✅ 0 (`text-[1-9px]`)        |
| e2e موبايل (390×844)                   | —          | ✅ 4/5 (1 يتخطّى بلا مصادقة) |
| `bg-white dark:bg-slate-900` في `src/` | 276        | ✅ 0                         |

الخطة التفصيلية والمراحل القادمة (P4/P5): `alzhraERP/plans/mobile-ux-repair-plan.md`
