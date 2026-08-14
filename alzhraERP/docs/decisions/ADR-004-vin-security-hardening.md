# ADR-004: VIN Intelligence — Security Hardening & Atomic RPC

- **الحالة:** مقبول (Accepted)
- **التاريخ:** 2026-08-14
- **النطاق:** ميزة ذكاء الشاصي (VIN Intelligence)

## السياق

أظهر تدقيق أمني حيّ أن ميزة VIN تحتوي على ثغرات حرجة:

1. **تجاوز عزل المستأجرين:** دالة `get_matching_inventory_products` كانت `SECURITY DEFINER` بلا تحقق من ملكية الشركة، وقابلة للاستدعاء من `anon` (مُثبت حيّاً).
2. **دوال حافة بلا مصادقة:** `vin-decode` و`vin-parts` تعملان دون التحقق من JWT (استنزاف أرصدة AI + تلويث كتالوج `vehicles`).
3. **تعريض `service_role`:** كُشف المفتاح في المحادثة (تمت التوصية بتدويره فوراً).
4. **إضافة غير ذرّية:** `addPartsToInventory` كانت حلقة في الواجهة (إضافة جزئية عند الفشل + منتجات مكررة).
5. **جدول `vehicles` غير مُهاجَر:** موجود في الإنتاج فقط (schema drift).

## القرار

### 1) عزل المستأجرين + أقل صلاحية
- `get_matching_inventory_products` تستدعي `verify_company_access()` وترفض أي `company_id` لا يخص المتصل.
- `REVOKE EXECUTE ... FROM PUBLIC` + `GRANT` صريح: `authenticated` لدوال القراءة، و`service_role` لدوال دالة الحافة.

### 2) مصادقة دوال الحافة
- `vin-decode` و`vin-parts` تتحققان من JWT عبر `supabase.auth.getUser()` وترفضان `anon` (401).

### 3) RPC ذرّي `add_vin_parts_to_inventory`
- معاملة واحدة: إنشاء منتج + ربط `vehicle_products` + حافة `part_compatibility` + find-or-create للمركبة.
- تفرض `verify_company_access` + `user_is_admin_or_manager` (محاكاة `products_insert` RLS).

### 4) سلامة البيانات
- `uq_part_compat` أصبح `UNIQUE NULLS NOT DISTINCT` (مع إزالة التكرارات).
- `ensure_vehicle` يعالج `model = NULL` و`year = 0` (كعلامة "غير معروف").
- `vehicle_products_insert` يتحقق من ملكية `product_id`.
- `vin_analyses.updated_at` + trigger لترتيب إعادة الحفظ.

### 5) سدّ فجوة الجدول
- مهاجرة `CREATE TABLE IF NOT EXISTS public.vehicles` مطابقة للأنواع المولّدة.

## النتائج المترتبة

- **إيجابية:** الثغرات الحرجة أُغلقت؛ الإضافة للمخزون ذرّية ومتسقة.
- **متطلبات:** بعد النشر يجب `supabase gen types typescript` (الأنواع حدّثت يدوياً مؤقتاً).
- **متابعة لاحقة:** مراجعة نموذج الأدوار (`user_is_admin_or_manager` لا يشمل `owner`)، ودمج `PartsExtractTab`/`VinsTab`.

## المهاجرات المرتبطة

`20260814000001` → `20260814000005`.
