# خطة: توحيد مسارات الأطراف (PartiesPage) بتبويبات داخلية

**الحالة:** قيد الانتظار — تتطلب بيئة تحقق كاملة (`tsc`/`build`/تشغيل يدوي) لأنها تعديل
تنقّل وواجهة، ولا يجب تنفيذها "عمياء" من أداة لا تستطيع بناء المشروع.

## المشكلة الحالية

5 مسارات تعرض نفس `PartiesPage` بنوع مختلف (`partyType`):

| الثابت | المسار | النوع |
|---|---|---|
| `SUPPLIERS` | `/suppliers` | supplier — **مستخدم من القائمة الجانبية** |
| `CLIENTS` | `/clients` | customer — **مستخدم من القائمة الجانبية وQuickActions** |
| `PARTIES` | `/parties` | customer — بلا مستخدم خارج routes |
| `PARTIES_CUSTOMERS` | `/parties/customers` | customer — مستخدم حرفياً في routePrefetcher فقط |
| `PARTIES_SUPPLIERS` | `/parties/suppliers` | supplier — مستخدم حرفياً في routePrefetcher فقط |

## الخطوات المقترحة (بعد الحصول على بيئة تحقق)

1. **`PartiesPage.tsx`**: إضافة مقسم شرائح (Segmented Control) «عملاء / موردين» أعلى
   الصفحة، مصدر الحقيقة هو الـ URL: `navigate(ROUTES.DASHBOARD.CLIENTS)` /
   `navigate(ROUTES.DASHBOARD.SUPPLIERS)`، مع قراءة `partyType` الحالي من prop كما هو.
   (لا تعتمد على حالة داخلية — تجنب انحراف البيانات عند العودة للصفحة.)
2. **`paths.ts`**: إزالة `PARTIES` و`PARTIES_CUSTOMERS` و`PARTIES_SUPPLIERS`.
3. **`routes.tsx`**: إبقاء مساري `/clients` و`/suppliers` فقط، مع `Navigate` من
   `/parties/*` القديمة إلى `/clients` (حفاظاً على الإشارات المرجعية والحشو المتصفحي).
4. **`routePrefetcher.ts`**: تغيير `'/parties/customers'`/`'/parties/suppliers'` إلى
   `'/clients'`/`'/suppliers'`.
5. **التحقق**: `tsc --noEmit`، `npm run build`، واختبار يدوي: تنقّل القائمة الجانبية،
   التبديل بين التبويبين يغيّر الـ URL والبيانات، إعادة تحميل صفحة `/clients` تبقى
   على العملاء.

## تنبيهات أُخذت من جولة سابقة

- لا تُحذف `SUPPLIERS`/`CLIENTS` من `paths.ts` — مستخدمان في `core/constants.ts`
  (القائمة الجانبية) و`QuickActions.tsx`. (جرّبناها وحصل الاسترجاع عبر grep.)
- `PartiesPage` نفسها تملك تبويبات داخلية قائمة (records/statements/categories) —
  المطلوب إضافة تبويب النوع (عميل/مورد) فوقها، وليس استبدالها.
