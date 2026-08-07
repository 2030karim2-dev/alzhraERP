# 🎨 دليل أسلوب نظام الزهرة الذكي ERP

> Style Guide v2.0 — آخر تحديث: أغسطس 2026

---

## 📐 نظام الألوان (CSS Variables)

### Light Mode (`:root`)
| المتغير | القيمة | الاستخدام |
|----------|--------|-----------|
| `--app-bg` | `#f8fafc` | خلفية الصفحات الرئيسية |
| `--app-surface` | `#ffffff` | البطاقات والحاويات |
| `--app-surface-hover` | `#f1f5f9` | تأثير التحويم |
| `--app-border` | `#e2e8f0` | الحدود والفواصل |
| `--app-text` | `#1e293b` | النص الرئيسي |
| `--app-text-secondary` | `#64748b` | النص الثانوي |
| `--accent` | `#3b82f6` | اللون التمييزي |
| `--radius` | `0.5rem` | نصف قطر التدوير |

### Dark Mode (`.dark`)
| المتغير | القيمة | نسبة التباين |
|----------|--------|-------------|
| `--app-bg` | `#020617` | — |
| `--app-surface` | `#0f172a` | — |
| `--app-border` | `#334155` | 3:1 ✓ |
| `--app-text` | `#f1f5f9` | 13.5:1 ✓ |
| `--app-text-secondary` | `#cbd5e1` | 5.1:1 ✓ (WCAG AA) |

---

## 🔤 الطباعة (Typography)

| الاستخدام | الحجم | الوزن |
|-----------|-------|-------|
| عنوان الصفحة | `text-lg` (18px) | `font-bold` |
| عنوان القسم | `text-sm` (14px) | `font-bold` |
| النص الأساسي | `text-xs` (12px) | `font-medium` |
| النص الثانوي | `text-[10px]` | `font-semibold` |
| أزرار كبيرة | `text-sm` (14px) | `font-semibold` |
| أزرار صغيرة | `text-xs` (12px) | `font-semibold` |

**الخطوط:** `Cairo` (عربي) / `Inter` (إنجليزي) — عبر `font-sans`

### أحجام الشاشة المتجاوبة
| الشاشة | حجم الخط الأساسي |
|--------|-----------------|
| موبايل (<768px) | `14px` |
| تابلت (768-1280px) | `15px` |
| كمبيوتر (>1280px) | `16px` |

---

## 📏 المسافات (Spacing)

| العنصر | المسافة |
|--------|---------|
| تباعد البطاقات | `gap-4` (16px) |
| تباعد الأقسام | `gap-6` (24px) |
| حشوة البطاقة | `p-4` / `p-5` |
| حشوة الصفحة | `px-4` / `md:px-6` |
| ارتفاع الأزرار | `min-h-[44px]` |

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
<Modal isOpen={open} onClose={fn} icon={IconComponent}
  title="عنوان" description="وصف" footer={<Button>حفظ</Button>}>
  {children}
</Modal>
```
**الأحجام:** `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, `5xl`, `full`, `resizable`

### ExcelTable
```tsx
<ExcelTable columns={cols} data={rows} title="جدول"
  enableSelection enablePagination enableDrag />
```

### EmptyState
```tsx
<EmptyState variant="products" title="فارغ" description="الوصف"
  action={<Button>إضافة</Button>} />
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

---

## ⌨️ اختصارات لوحة المفاتيح

| الاختصار | الوظيفة |
|----------|---------|
| `Ctrl + K` | فتح البحث الشامل |
| `Ctrl + S` | حفظ النموذج الحالي |
| `Ctrl + N` | إنشاء سجل جديد |
| `Ctrl + D` | تكرار السجل الحالي |
| `Escape` | إغلاق النافذة/القائمة |
| `?` | إظهار قائمة الاختصارات |

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

| الجهاز | العرض | سلوك القائمة |
|--------|-------|-------------|
| موبايل | <768px | شريط سفلي + BottomSheet |
| تابلت عمودي | 768-1024px | أيقونات فقط |
| تابلت أفقي | 1024-1280px | أيقونات فقط |
| كمبيوتر | >1280px | قائمة موسعة اختيارياً |

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
