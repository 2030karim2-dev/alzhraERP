# 🎨 دليل أسلوب نظام الزهرة الذكي ERP

> Style Guide v2.0 — آخر تحديث: أغسطس 2026

---

## 📐 نظام الألوان (CSS Variables)

### Light Mode (`:root`)

| المتغير                | القيمة    | الاستخدام              |
| ---------------------- | --------- | ---------------------- |
| `--app-bg`             | `#f8fafc` | خلفية الصفحات الرئيسية |
| `--app-surface`        | `#ffffff` | البطاقات والحاويات     |
| `--app-surface-hover`  | `#f1f5f9` | تأثير التحويم          |
| `--app-border`         | `#e2e8f0` | الحدود والفواصل        |
| `--app-text`           | `#1e293b` | النص الرئيسي           |
| `--app-text-secondary` | `#64748b` | النص الثانوي           |
| `--accent`             | `#3b82f6` | اللون التمييزي         |
| `--radius`             | `0.5rem`  | نصف قطر التدوير        |

### Dark Mode (`.dark`)

| المتغير                | القيمة    | نسبة التباين      |
| ---------------------- | --------- | ----------------- |
| `--app-bg`             | `#020617` | —                 |
| `--app-surface`        | `#0f172a` | —                 |
| `--app-border`         | `#334155` | 3:1 ✓             |
| `--app-text`           | `#f1f5f9` | 13.5:1 ✓          |
| `--app-text-secondary` | `#cbd5e1` | 5.1:1 ✓ (WCAG AA) |

---

## 🔤 الطباعة (Typography)

| الاستخدام    | الحجم            | الوزن           |
| ------------ | ---------------- | --------------- |
| عنوان الصفحة | `text-lg` (18px) | `font-bold`     |
| عنوان القسم  | `text-sm` (14px) | `font-bold`     |
| النص الأساسي | `text-xs` (12px) | `font-medium`   |
| النص الثانوي | `text-[10px]`    | `font-semibold` |
| أزرار كبيرة  | `text-sm` (14px) | `font-semibold` |
| أزرار صغيرة  | `text-xs` (12px) | `font-semibold` |

**الخطوط:** `Cairo` (عربي) / `Inter` (إنجليزي) — عبر `font-sans`

### أحجام الشاشة المتجاوبة

| الشاشة             | حجم الخط الأساسي (root) | ملاحظة                                         |
| ------------------ | ----------------------- | ---------------------------------------------- |
| موبايل (<768px)    | `12px`                  | `15px × --scale(0.8)` — قراءة فعلية في الميدان |
| تابلت (768-1280px) | `15px`                  |                                                |
| كمبيوتر (>1280px)  | `15.9px` فأعلى          | يتصاعد تدريجياً حتى 18px على 4K                |

> ⚠️ **ممنوع قطعاً**: `text-[1-9px]` — يرفضه `npm run check:fonts` (قرار ADR-014). الحد الأدنى العملي `text-[10px]`.

---

## 📏 المسافات (Spacing)

| العنصر         | المسافة            |
| -------------- | ------------------ |
| تباعد البطاقات | `gap-4` (16px)     |
| تباعد الأقسام  | `gap-6` (24px)     |
| حشوة البطاقة   | `p-4` / `p-5`      |
| حشوة الصفحة    | `px-4` / `md:px-6` |
| ارتفاع الأزرار | `min-h-[44px]`     |

---

## 🧩 المكونات الأساسية

### Button

```tsx
<Button variant="primary" size="md">
  نص الزر
</Button>
```

**المتغيرات:** `primary`, `secondary`, `outline`, `danger`, `ghost`, `success`, `amber`
**الأحجام:** `sm`, `md`, `lg`
**الخصائص:** `isLoading`, `fullWidth`, `leftIcon`, `rightIcon`

### Input

```tsx
<Input label="الاسم" placeholder="أدخل الاسم" />
```

### Modal

```tsx
<Modal
  isOpen={open}
  onClose={fn}
  icon={IconComponent}
  title="عنوان"
  description="وصف"
  footer={<Button>حفظ</Button>}
>
  {children}
</Modal>
```

**الأحجام:** `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, `5xl`, `full`, `resizable`

### ExcelTable

```tsx
<ExcelTable columns={cols} data={rows} title="جدول" enableSelection enablePagination enableDrag />
```

### EmptyState

```tsx
<EmptyState variant="products" title="فارغ" description="الوصف" action={<Button>إضافة</Button>} />
```

**الأنواع:** `default`, `products`, `invoices`, `customers`, `reports`

### PageLoader

```tsx
<PageLoader variant="table" />
```

**الأنواع:** `default`, `table`, `grid`, `form`, `dashboard`

### StatusBadge

```tsx
<StatusBadge status="online" label="متصل" />
```

**الحالات:** `online`, `offline`, `syncing`, `error`

### MobileCardList / MobileCardRow

```tsx
<MobileCardList isEmpty={!rows.length} emptyMessage="لا توجد بيانات">
  <MobileCardRow
    title={item.name}
    subtitle={item.phone}
    badge={<StatusBadge {...meta} />}
    meta={<>مبالغ/تفاصيل</>}
    actions={<>أزرار</>}
  />
</MobileCardList>
```

**الاستخدام:** بديل الجداول العريضة على الهاتف (`md:hidden`). يُستخدم في القيود اليومية والديون وصندوق الرسائل — عدّل هذه الشاشات بدل تكرار أنماط جديدة.

---

## ⌨️ اختصارات لوحة المفاتيح

| الاختصار   | الوظيفة                |
| ---------- | ---------------------- |
| `Ctrl + K` | فتح البحث الشامل       |
| `Ctrl + S` | حفظ النموذج الحالي     |
| `Ctrl + N` | إنشاء سجل جديد         |
| `Ctrl + D` | تكرار السجل الحالي     |
| `Escape`   | إغلاق النافذة/القائمة  |
| `?`        | إظهار قائمة الاختصارات |

---

## ♿ إرشادات إمكانية الوصول

- جميع الأزرار تحمل `aria-label` (نص عربي)
- جميع النماذج تحمل `role="search"` أو `role="dialog"`
- جميع الجداول تحمل `role="table"` و `aria-sort`
- تباين النص الثانوي ≥ 4.5:1 (WCAG AA)
- يوجد رابط `تخطي إلى المحتوى` في بداية كل صفحة
- دعم كامل للـ RTL عبر `dir="rtl"`

---

## 🖨️ أنماط الطباعة

- إخفاء العناصر غير الضرورية: `.no-print`
- عرض كامل العرض: `.print-full-width`
- فواصل الصفحات: `.print-break-before` / `.print-break-after`
- خلفية بيضاء تلقائياً، خط 12pt
- جداول بحدود واضحة للطباعة

---

## 📱 تجاوب الشاشات

| الجهاز      | العرض       | سلوك القائمة                  | التنقل السفلي      |
| ----------- | ----------- | ----------------------------- | ------------------ |
| موبايل      | <768px      | شريط سفلي + BottomSheet + FAB | ظاهر (`md:hidden`) |
| تابلت عمودي | 768-1024px  | أيقونات فقط (Sidebar مصغّر)   | مخفي               |
| تابلت أفقي  | 1024-1280px | أيقونات فقط                   | مخفي               |
| كمبيوتر     | >1280px     | قائمة موسعة اختيارياً         | مخفي               |

---

## 📱 معايير الموبايل الإلزامية (ADR-014)

> **القرارات المؤسِّسة موثّقة في** `docs/decisions/ADR-014-mobile-ux-foundation.md`. أي انحراف يحتاج ADR جديداً.

### 1. الخطوط — حد أدنى صارم

- **ممنوع**: `text-[1-9px]` (يحجبه `npm run check:fonts` في `pre-push`).
- الحد الأدنى العملي: `text-[10px]`.
- جذر الموبايل `12px` تلقائياً — لا تضف معاملات انكماش.

### 2. أهداف اللمس ≥ 44px

- استخدم `Button` من `ui/base` — قياسات الموبايل 44px (sm/md) و48px (lg) مضمنة.
- لا تُصغّر الأزرار على الموبايل بـ `max-md:h-7` ونحوها (كانت عادة ضارة سابقاً).
- الحقول: خط `16px` على الموبايل (يمنع تكبير iOS التلقائي مع بقاء التكبير اليدوي مفعّلاً).

### 3. Safe-Area — لكل عنصر سفلي ثابت

- أي عنصر `fixed bottom-*` يجب أن يحسب `env(safe-area-inset-bottom)`.
- أمثلة جاهزة: التنقل السفلي `h-[calc(3.5rem+env(safe-area-inset-bottom))]`، FAB `bottom-[calc(6rem+env(safe-area-inset-bottom))]`.
- `viewport-fit=cover` مفروض في `index.html` — لا تحذفه.

### 4. الجداول العريضة على الموبايل

- نمط سائد: الجدول `hidden md:block overflow-x-auto scroll-x-hint-surface` + بديل بطاقات `md:hidden`.
- للجداول التي تتصفح أفقياً: أضف `scroll-x-hint` / `scroll-x-hint-surface` / `scroll-x-hint-card` حسب خلفية الحاوية.
- لا تعرض جدولاً من 7+ أعمدة مباشرة على 390px — ابنِ بطاقات.

### 5. الألوان — CSS Variables إلزامية

- **ممنوع**: `bg-white dark:bg-slate-900` الصلبة — استخدم `bg-[var(--app-surface)]` ونحوها.
- مخصص الثيمات (داكن/لون مميز) يجب أن يصل لكل المكونات.

### 6. الحواجز الآلية (تُنفَّذ تلقائياً في `pre-push`)

| الحارس           | الأمر                   | يرفض                                     |
| ---------------- | ----------------------- | ---------------------------------------- |
| تعارضات الكلاسات | `npm run check:classes` | نفس utility بقيمتين في نص className واحد |
| الخطوط الدقيقة   | `npm run check:fonts`   | أي `text-[1-9px]`                        |

---

## 🎯 أفضل الممارسات

1. **استخدم CSS Variables** — لا تستخدم `bg-white dark:bg-slate-900` مباشرة
2. **استخدم مكونات ui/base** — لا تكتب أزرار أو إدخالات مخصصة
3. **اختبر RTL** — جميع الصفحات يجب أن تعمل بالاتجاهين
4. **أضف aria-label** — لكل عنصر تفاعلي
5. **استخدم الـ presets** — `retryPresets.api` للـ API calls

---

## 📂 هيكل الملفات

```
src/
├── ui/base/         # مكونات أساسية (Button, Modal, Input...)
├── ui/common/       # مكونات مشتركة (ExcelTable, StatCard...)
├── ui/layout/       # التخطيط (MainLayout, Header, Sidebar)
├── ui/cards/        # نظام البطاقات
├── core/services/   # خدمات (retryHandler, omniSearch)
├── core/store/      # Zustand stores
├── core/hooks/      # Hooks عامة
├── features/        # صفحات ومكونات الميزات
└── lib/             # مكتبات (i18n, theme...)
```
