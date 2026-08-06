# خطة إصلاح لوحة تحليلات المبيعات

## الأهداف
1. إصلاح مقاييس النمو (Growth Metrics) - حقلان مخفيان حالياً بقيمة `null`
2. تحسين تجربة الجوال واللمس (Touch + Responsive CSS)
3. تحسين الأداء (Caching, Memoization)
4. توحيد الأنماط البرمجية

## الفروع المتأثرة
- `src/features/sales/components/Analytics/` - 6 ملفات
- `src/features/sales/hooks/useSalesAnalytics.ts`
- قاعدة البيانات: `supabase/migrations/` - إنشاء migration جديد

---

## المهمة 1: RPC - إضافة مقاييس النمو

**ملف جديد:** `supabase/migrations/20260807000001_add_sales_growth_to_analytics.sql`

**التعديلات على `get_sales_analytics`:**
- حساب الفترة السابقة الموازية: `v_prev_from DATE := <v_from - period_duration>; v_prev_to DATE := <v_from - 1 day>`
- إضافة 3 متغيرات جديدة: `v_prev_total_sales`, `v_prev_total_returns`, `v_prev_net_sales`
- إضافة 3 حقول في `jsonb_build_object`: `prevTotalSales`, `prevTotalReturns`, `prevNetSales`
- النمو يحسب في الواجهة الأمامية (وليس في SQL) لأن الحساب العملياتي أوضح وأسهل في الصيانة

**التحقق:** تشغيل `SELECT get_sales_analytics('<company_uuid>')` والتأكد من وجود الحقول الجديدة

---

## المهمة 2: Hook - استهلاك مقاييس النمو وحسابها

**ملف:** `src/features/sales/hooks/useSalesAnalytics.ts`

**التعديلات:**
1. إضافة `prevTotalSales`, `prevTotalReturns`, `prevNetSales` إلى واجهة `SalesAnalytics`
2. تحديث `normalizeAnalytics()` لقراءة الحقول الجديدة بنمط camelCase/snake_case المزدوج
3. إضافة getters جديدة في الـ return: `prevTotalSales`, `prevTotalReturns`, `prevNetSales`
4. إضافة `staleTime: 60_000` إلى `useQuery` لتسريع التبديل بين الفترات
5. إضافة `refetchOnWindowFocus: true`

**التحقق:** فتح تبويب analytics ومراقبة React Query DevTools للتأكد من ظهور الحقول الجديدة

---

## المهمة 3: عرض النمو في KPI Cards

**ملف:** `src/features/sales/components/Analytics/SalesAnalyticsView.tsx`

**التعديلات:**
1. استقبال القيم الجديدة من `useSalesAnalytics`: `prevTotalSales`, `prevNetSales`
2. حساب النمو الفعلي:
   - `salesGrowth = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 : null`
   - `returnsGrowth = prevTotalReturns > 0 ? ((totalReturns - prevTotalReturns) / prevTotalReturns) * 100 : null`
3. إزالة التعليق والسطرين `const salesGrowth = null; const returnsGrowth = null;`
4. تمرير `salesGrowth` و `returnsGrowth` الفعليين إلى `<SalesKPIs />`

**التحقق:** رؤية شارات النمو الخضراء/الحمراء تظهر بجانب KPI cards

---

## المهمة 4: تحسين تجربة الجوال - CSS Responsive

### 4A. SalesKPIs - تحسين الأعمدة للجوال
**ملف:** `src/features/sales/components/Analytics/components/SalesKPIs.tsx`

- الصف الأول: تغيير `md:grid-cols-2 lg:grid-cols-4` (موجود بالفعل ✓)
- الصف الثاني: إضافة `sm:grid-cols-2 md:grid-cols-4` بدلاً من `grid-cols-2 lg:grid-cols-4`
- حجم خط KPI في بطاقة Total Sales: إضافة `text-2xl sm:text-3xl` لمنع الالتفاف

### 4B. SalesTrendChart - أزرار التبديل على الجوال
**ملف:** `src/features/sales/components/Analytics/components/SalesTrendChart.tsx`

- التأكد من أن `h-72` مناسب (<300px، جيد للجوال ✓)
- المخطط `lg:col-span-2` موجود ✓

### 4C. PaymentMethodsChart - تجنب تداخل النص المركزي
**ملف:** `src/features/sales/components/Analytics/components/PaymentMethodsChart.tsx`

- زيادة ارتفاع الحاوية من `h-56` إلى `h-56 sm:h-64`
- الحاوية `ResponsiveContainer` ترث الارتفاع تلقائياً ✓

### 4D. SalesAnalyticsView - أزرار الفترة
**ملف:** `src/features/sales/components/Analytics/SalesAnalyticsView.tsx`

- إضافة `flex-wrap` إلى `div` الأزرار (السطر 141) لمنع overflow على الشاشات الضيقة
- إضافة `gap-1` للأجهزة الصغيرة: `flex gap-1 sm:gap-2`
- إضافة `px-3 py-1.5 sm:px-4 sm:py-2` للأزرار الفردية

### 4E. تخطيط الرسوم البيانية
**ملف:** `src/features/sales/components/Analytics/SalesAnalyticsView.tsx`

- تغيير `lg:grid-cols-3` إلى `md:grid-cols-3` (السطر 174)
- تغيير `lg:grid-cols-2` إلى `md:grid-cols-2` (السطر 190)

---

## المهمة 5: دعم اللمس (Touch Interactions)

### 5A. أداة Tooltip باللمس في SalesTrendChart
**ملف:** `src/features/sales/components/Analytics/components/SalesTrendChart.tsx`

- إضافة `cursor: 'pointer'` إلى `commonProps`
- إضافة onClick handler: استخدام `setActiveIndex` state لعرض tooltip ثابت عند النقر
- تعديل `CustomTooltip` لاستقبال `activeIndex` كـ prop

### 5B. الحد الأدنى لأهداف اللمس WCAG
- أزرار تبديل المخطط: `min-w-[44px] min-h-[44px]` (السطور 205-235)
- أزرار الفترة: التأكد من `min-h-[44px]` فعلي (حالياً `py-2` = 32px، التغيير إلى `min-h-[44px]`)
- `TopProductsList` / `TopCustomersList`: إضافة `active:bg-slate-100` للتغذية الراجعة باللمس

---

## المهمة 6: إصلاحات برمجية

### 6A. توحيد الـ locale في tooltip
**ملف:** `src/features/sales/components/Analytics/components/SalesTrendChart.tsx`

- استبدال `toLocaleDateString('en-US', ...)` بـ `toLocaleDateString('ar-SA', ...)` أو استخدام متغير عام

### 6B. نقل النص العربي إلى i18n
**ملف:** `src/features/sales/components/Analytics/components/PaymentMethodsChart.tsx`

- استبدال `"من الإجمالي"` (السطر 138) بـ `t('of_total')` مع إضافة المفتاح
**ملف:** `src/features/sales/components/Analytics/components/TopProductsList.tsx`

- استبدال `"من الإجمالي"` (السطر 79) بنفس المفتاح

### 6C. React.memo على المكونات الفرعية
- `SalesKPIs`: `export default React.memo(SalesKPIs)`
- `SalesTrendChart`: `export default React.memo(SalesTrendChart)`
- `PaymentMethodsChart`: `export default React.memo(PaymentMethodsChart)`

---

## ترتيب التنفيذ

| # | المهمة | يعتمد على |
|---|--------|----------|
| 1 | RPC Migration | - |
| 2 | Hook - استهلاك البيانات الجديدة | 1 |
| 3 | عرض النمو في KPI | 2 |
| 4 | CSS Responsive | - |
| 5 | Touch Interactions | - |
| 6 | إصلاحات برمجية | - |

المهام 1←2←3 **متسلسلة**. المهام 4, 5, 6 **مستقلة** يمكن تنفيذها بالتوازي.

---

## ملفات سيتم تعديلها

| الملف | التعديل |
|-------|---------|
| `supabase/migrations/20260807000001_add_sales_growth_to_analytics.sql` | **جديد** - RPC معدل |
| `src/features/sales/hooks/useSalesAnalytics.ts` | إضافة حقول النمو + staleTime |
| `src/features/sales/components/Analytics/SalesAnalyticsView.tsx` | حساب النمو + flex-wrap + md: breakpoints |
| `src/features/sales/components/Analytics/components/SalesKPIs.tsx` | sm:grid-cols-2 + text-2xl |
| `src/features/sales/components/Analytics/components/SalesTrendChart.tsx` | touch tooltip + locale + min touch targets |
| `src/features/sales/components/Analytics/components/PaymentMethodsChart.tsx` | sm:h-64 + i18n for hardcoded Arabic |
| `src/features/sales/components/Analytics/components/TopProductsList.tsx` | i18n + active:bg + React.memo |

## المخاطر
1. **RPC Migration:** إذا فشل الـ migration، المتجر سيبقى كما هو بدون نمو - الخطر منخفض لأن `CREATE OR REPLACE`
2. **بيانات الفترة السابقة قد تكون 0:** للمتاجر الجديدة - يتم التعامل معها عبر `prevTotalSales > 0 ? ... : null` فلا تظهر شارة خاطئة
3. **Recharts onClick:** قد يتعارض مع سلوكيات hover الافتراضية - نستخدم `activeIndex` state منفصل

## الأسئلة المفتوحة
- لا يوجد. جميع القرارات محسومة.
