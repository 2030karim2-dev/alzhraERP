# 🛠️ خطة تنفيذ الإصلاحات الشاملة — Al-Zahra Smart ERP
## Automotive Spare Parts Accounting System

**تاريخ الخطة:** 2026-07-30  
**المرجع:** تقرير التدقيق الشامل `qa-audit-report-automotive-parts.md`  
**إجمالي المشاكل:** 38 (16 🔴 حرجة | 12 🟠 عالية | 10 🟡 متوسطة)  
**المدة التقديرية:** 36 يوم عمل (~7 أسابيع)

---

## 📋 جدول المحتويات
1. [المرحلة الأولى: الإصلاحات الحرجة — سلامة البيانات المالية (7 أيام)](#phase-1)
2. [المرحلة الثانية: سد الثغرات الأمنية (5 أيام)](#phase-2)
3. [المرحلة الثالثة: ميزات صناعة قطع غيار السيارات (12 يوم)](#phase-3)
4. [المرحلة الرابعة: إصلاح المشاكل التشغيلية (5 أيام)](#phase-4)
5. [المرحلة الخامسة: تحسينات إضافية (7 أيام)](#phase-5)

---

<a name="phase-1"></a>
## 🔴 المرحلة الأولى: الإصلاحات الحرجة — سلامة البيانات المالية (7 أيام)

### 1.1 إصلاح تحويل العملات وتوحيده بين المبيعات والمشتريات
**المشاكل:** 🔴 1.4, 🔴 4.2 — تحويل العملات باتجاهين متعاكسين  
**الملفات:** `src/features/sales/store.ts`, `src/features/purchases/store.ts`, `src/core/utils/currencyUtils.ts`  
**الخطوات:**
1. إنشاء دالة مساعدة موحدة في `currencyUtils.ts`:
   ```typescript
   export function convertCurrency(amount: number, rate: number, direction: 'toBase' | 'fromBase'): number {
     if (!rate || rate <= 0) throw new CurrencyError(`Invalid exchange rate: ${rate}`);
     if (!Number.isFinite(amount)) throw new CurrencyError(`Invalid amount: ${amount}`);
     return direction === 'toBase' ? amount * rate : amount / rate;
   }
   ```
2. تحديث `sales/store.ts:setProductForRow` — استخدام `convertCurrency(basePrice, rate, 'fromBase')`
3. تحديث `purchases/store.ts:setProductForRow` — استخدام `convertCurrency(costPrice, rate, 'toBase')` (أو العكس حسب المنطق الصحيح)
4. تحديث `sales/store.ts:setMetadata` — استخدام الدالة الموحدة لإعادة حساب الأسعار
5. إضافة اختبارات للدالة الجديدة

### 1.2 توحيد حد التسامح المحاسبي
**المشكلة:** 🔴 1.2 — تفاوت بين `0.01` و `0.000001`  
**الملفات:** `src/core/validators/index.ts`, `src/core/utils/decimalUtils.ts`  
**الخطوات:**
1. استيراد `SOX_BALANCE_TOLERANCE` من `decimalUtils.ts` في `validators/index.ts`
2. استبدال القيمة الثابتة `0.01` بالمتغير المستورد
3. إضافة تعليق يوضح أن هذا الحد يستخدم في جميع أنحاء النظام

### 1.3 إصلاح دالة التجزئة (Hash)
**المشكلة:** 🔴 1.3 — SHA-256 وهمي (32-bit hash)  
**الملف:** `src/core/utils/decimalUtils.ts:147-154`  
**الخطوات:**
1. استبدال دالة `hash` البسيطة بـ `crypto.subtle.digest('SHA-256', ...)`:
   ```typescript
   export async function generateCalculationHash(data: Record<string, unknown>): Promise<string> {
     const jsonString = JSON.stringify(data, Object.keys(data).sort());
     const encoder = new TextEncoder();
     const dataBuffer = encoder.encode(jsonString);
     const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
     const hashArray = Array.from(new Uint8Array(hashBuffer));
     return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
   }
   ```
2. تحديث جميع المستدعين للدالة لاستخدام `async/await`
3. إضافة fallback للمتصفحات التي لا تدعم `crypto.subtle`

### 1.4 إصلاح حساب الخصومات
**المشكلة:** 🔴 1.5 — استخدام `useDiscountStore.getState()` داخل `set()`  
**الملفات:** `src/features/sales/store.ts:178-200`, `src/features/purchases/store.ts:151-162`  
**الخطوات:**
1. نقل قراءة `useDiscountStore.getState()` خارج دالة `set()`:
   ```typescript
   calculateTotals: () => {
     const { discountEnabled } = useDiscountStore.getState(); // خارج set()
     set(state => {
       // ... استخدام discountEnabled هنا
     });
   },
   ```
2. تطبيق نفس التغيير في `purchases/store.ts`

### 1.5 إصلاح القسمة على صفر
**المشكلة:** 🔴 1.1 — `basePrice / state.exchangeRate` دون تحقق  
**الملفات:** `src/features/sales/store.ts:109,146`, `src/features/purchases/store.ts:122`  
**الخطوات:**
1. إضافة دالة تحقق في بداية `setProductForRow`:
   ```typescript
   const rate = state.exchangeRate;
   if (!rate || rate <= 0) {
     console.error('Invalid exchange rate:', rate);
     return state; // عدم تحديث الحالة
   }
   ```
2. استخدام `convertCurrency` من الخطوة 1.1

---

<a name="phase-2"></a>
## 🛡️ المرحلة الثانية: سد الثغرات الأمنية (5 أيام)

### 2.1 نقل الصلاحيات إلى الخادم (RLS Policies)
**المشكلة:** 🔴 3.1 — صلاحيات client-side بالكامل  
**الملفات:** `src/core/permissions/index.tsx` + ملفات SQL جديدة  
**الخطوات:**
1. إنشاء ملف ترحيل جديد `supabase/migrations/20260730000001_add_rls_policies.sql` يتضمن:
   ```sql
   -- RLS policy للمستخدمين العاديين (قراءة فقط)
   CREATE POLICY "viewers_select" ON public.products FOR SELECT TO authenticated
     USING (company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));
   
   -- RLS policy للمديرين (إضافة وتعديل)
   CREATE POLICY "managers_insert" ON public.products FOR INSERT TO authenticated
     WITH CHECK (
       company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
       AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager')
     );
   ```
2. إضافة دوال RPC للتحقق من الصلاحيات على مستوى الخادم
3. تحديث `permissions/index.tsx` لاستخدام RPC بدلاً من localStorage
4. إزالة تخزين الدور في localStorage

### 2.2 تفعيل JWT Validation في AI Proxy
**المشكلة:** 🔴 3.2 — لا يوجد تحقق من JWT  
**الملف:** `supabase/functions/ai-proxy/index.ts`  
**الخطوات:**
1. إضافة التحقق من JWT باستخدام `supabase.auth.getUser()`:
   ```typescript
   const authHeader = req.headers.get('Authorization');
   if (!authHeader) return new Response('Unauthorized', { status: 401 });
   
   const supabase = createClient(supabaseUrl, supabaseAnonKey, {
     global: { headers: { Authorization: authHeader } }
   });
   const { data: { user }, error } = await supabase.auth.getUser();
   if (error || !user) return new Response('Invalid token', { status: 401 });
   ```
2. تغيير `Access-Control-Allow-Origin` من `*` إلى نطاق التطبيق المحدد

### 2.3 إصلاح المصادقة
**المشكلة:** 🔴 3.3 — Auth state في localStorage  
**الملف:** `src/features/auth/store.ts`  
**الخطوات:**
1. إزالة `isAuthenticated` من قائمة الحقول المستمرة في `persist`
2. الاعتماد على `supabase.auth.getSession()` للتحقق من حالة المصادقة
3. إضافة middleware للتحقق من صحة الجلسة عند تحميل الصفحة

---

<a name="phase-3"></a>
## 🚗 المرحلة الثالثة: ميزات صناعة قطع غيار السيارات (12 يوم)

### 3.1 نظام الربط بين أرقام OEM والبدائل
**المشكلة:** 🔴 2.1 — لا يوجد نظام cross-reference  
**الملفات الجديدة:** `src/features/inventory/services/crossReferenceService.ts`  
**الخطوات:**
1. إنشاء RPC للبحث المتقدم في `product_cross_references`:
   ```sql
   CREATE OR REPLACE FUNCTION search_by_oem(p_company_id UUID, p_oem_number TEXT)
   RETURNS TABLE(product_id UUID, product_name TEXT, match_quality TEXT, ...)
   ```
2. إنشاء service في TypeScript:
   ```typescript
   export const crossReferenceService = {
     searchByOEM: async (companyId: string, oemNumber: string) => { ... },
     addCrossReference: async (baseProductId: string, altProductId: string, quality: string) => { ... },
   };
   ```
3. إضافة حقل بحث "رقم OEM" في واجهة POS والبحث عن المنتجات
4. عرض نتائج cross-reference في بطاقة المنتج

### 3.2 التحقق من توافق المركبات
**المشكلة:** 🔴 2.2 — لا يوجد التحقق من التوافق  
**الملفات:** `src/features/sales/store.ts`, `src/features/sales/service.ts`  
**الخطوات:**
1. إضافة حقل `vehicleId` في `SalesCartItem`
2. إنشاء دالة تحقق:
   ```typescript
   function validateVehicleCompatibility(productId: string, vehicleId: string): Promise<boolean>
   ```
3. عرض تحذير عند إضافة قطعة غير متوافقة مع المركبة المحددة للعميل
4. ربط `VehicleCompatibilityPage` بعملية البيع

### 3.3 نظام الإيداع والاسترجاع (Core Charge)
**المشكلة:** 🔴 2.3 — لا يوجد handling للـ core charge  
**الملفات:** `src/features/sales/store.ts`, `src/features/sales/types.ts`  
**الخطوات:**
1. إضافة `coreCharge` في `SalesCartItem`:
   ```typescript
   export interface SalesCartItem {
     // ... الحقول الموجودة
     hasCoreCharge?: boolean;
     coreChargeAmount?: number;
     coreReturned?: boolean;
   }
   ```
2. إضافة منطق حساب core charge في `calculateTotals`
3. إنشاء آلية لتتبع core returns (مرتجعات الهيكل)
4. إضافة حقل في الفاتورة لتسجيل core charge

### 3.4 إدارة المجموعات (Kits)
**المشكلة:** 🔴 2.4 — لا يوجد تجميع وفك للمجموعات  
**الملفات الجديدة:** `src/features/inventory/services/kitService.ts`  
**الخطوات:**
1. إنشاء service لإدارة kits:
   ```typescript
   export const kitService = {
     assembleKit: async (kitProductId: string, warehouseId: string, quantity: number) => {
       // 1. التحقق من توفر المكونات
       // 2. خصم المكونات من المخزون
       // 3. إضافة الـ kit إلى المخزون
     },
     disassembleKit: async (kitProductId: string, warehouseId: string, quantity: number) => {
       // 1. حذف الـ kit من المخزون
       // 2. إعادة المكونات إلى المخزون
     },
   };
   ```
2. إنشاء واجهة مستخدم لتجميع وفك المجموعات
3. عرض مكونات الـ kit في الفاتورة مع إمكانية توسيع التفاصيل

### 3.5 دمج VIN Lookup في POS
**المشكلة:** 🟠 2.7 — VIN lookup غير متصل بـ POS  
**الملفات:** `src/features/pos/pages/POSPage.tsx`, `src/features/vehicles/hooks/useVINLookup.ts`  
**الخطوات:**
1. إضافة زر "بحث بـ VIN" في شاشة POS
2. ربط `useVINLookup` بعملية البحث عن القطع
3. بعد فك VIN، عرض القطع المتوافقة مع تلك المركبة
4. إضافة خيار لتحديد المركبة في رأس الفاتورة

### 3.6 دمج رقم الجزء الخاص بالمورد في المشتريات
**المشكلة:** 🟠 2.5 — supplier_part_number غير مستخدم  
**الملفات:** `src/features/purchases/store.ts`  
**الخطوات:**
1. إضافة `supplierPartNumber` في `PurchaseInvoiceItem`
2. عند اختيار مورد، عرض أرقام القطع الخاصة به
3. إضافة عمود "رقم المورد" في جدول المشتريات

---

<a name="phase-4"></a>
## 🔧 المرحلة الرابعة: إصلاح المشاكل التشغيلية (5 أيام)

### 4.1 نقل RPC functions إلى ملفات الترحيل
**المشكلة:** 🟠 3.4, 🟠 3.5 — RPCs غير موجودة في المستودع  
**الملف الجديد:** `supabase/migrations/20260730000000_add_missing_rpcs.sql`  
**الخطوات:**
1. إضافة RPCs المفقودة (يجب استخراجها من Supabase أولاً):
   - `commit_sales_invoice`
   - `post_manual_journal`
   - `calculate_and_update_wac`
   - `report_trial_balance`
   - `report_profit_loss`
   - `report_balance_sheet`
   - `get_account_ledger`
   - `get_sales_stats`
2. إضافة تعليقات توثيق لكل RPC
3. إضافة `GRANT EXECUTE` لكل RPC

### 4.2 إصلاح توجيه حساب الخزينة
**المشكلة:** 🟠 3.6 — فقدان صامت لحساب الخزينة  
**الملف:** `src/features/sales/service.ts:80-84`  
**الخطوات:**
1. إضافة fallback صريح:
   ```typescript
   if (!routed) {
     logger.warn('SalesService', 'routeToChildByCurrency returned null, using parent account', {
       parentAccountId: finalTreasuryAccountId,
       currency: payload.currency
     });
     // استخدام الحساب الأصلي كـ fallback
   }
   ```

### 4.3 إصلاح عملة POS
**المشكلة:** 🟠 1.7 — عملة YER ثابتة  
**الملف:** `src/features/pos/pages/POSPage.tsx:309`  
**الخطوات:**
1. استبدال `{formatCurrency(summary.totalAmount)} YER` بـ:
   ```typescript
   {formatCurrency(summary.totalAmount)} {currency}
   ```
   حيث `currency` من `useSalesStore`

### 4.4 تنظيف الملفات الفارغة والمهملة
**المشاكل:** 🟡 3.7, 🟡 3.8, 🟡 4.5, 🟡 4.6  
**الخطوات:**
1. حذف 6 ملفات فارغة:
   - `src/features/inventory/components/ProductCardView.tsx`
   - `src/features/pos/components/POSHeader.tsx`
   - `src/features/parties/hooks/usePartiesData.ts`
   - `src/features/parties/hooks/usePartiesView.ts`
   - `src/features/parties/hooks/index.ts`
   - `src/features/parties/index.ts`
2. ربط smart-import بالمسارات أو إزالة المجلد
3. توحيد مسارات parties في `routes.tsx` (إزالة التكرار)
4. إصلاح `initializeItems(0)` في `POSPage.tsx`

### 4.5 إصلاح تقرير التدقيق السابق
**المشكلة:** 🔴 4.1 — تعارضات git merge  
**الملف:** `plans/comprehensive-audit-report.md`  
**الخطوات:**
1. حل تعارضات git merge (اختيار النسخة الصحيحة من كل قسم)
2. إزالة علامات `<<<<<<<`, `=======`, `>>>>>>>`

---

<a name="phase-5"></a>
## ✨ المرحلة الخامسة: تحسينات إضافية (7 أيام)

### 5.1 إزالة `as any` (64 حالة)
**الخطوات:**
1. حصر جميع استخدامات `as any` في الكود
2. استبدال كل حالة بنوع محدد
3. الأولوية للملفات المالية: `journalService.ts`, `reportService.ts`, `sales/service.ts`

### 5.2 تدويل النصوص الثابتة
**المشكلة:** 🟡 4.7 — `CASH_CUSTOMER_LABEL` غير مترجم  
**الملف:** `src/features/sales/service.ts`  
**الخطوات:**
1. نقل `CASH_CUSTOMER_LABEL` إلى ملف الترجمة
2. استخدام `t('cash_customer')` بدلاً من النص الثابت

### 5.3 تصنيف هرمي للفئات
**المشكلة:** 🟡 2.8 — category كـ string بسيط  
**الملفات:** `src/features/inventory/types.ts`, قاعدة البيانات  
**الخطوات:**
1. إنشاء جدول `product_categories` مع `parent_id` للتسلسل الهرمي
2. تحديث `Product` type لاستخدام `category_id` بدلاً من `category`
3. إنشاء واجهة مستخدم للتصنيف الهرمي

### 5.4 تتبع الأرقام التسلسلية والضمان
**المشاكل:** 🟡 2.9, 🟡 2.10  
**الملفات:** `src/features/inventory/types.ts`, `src/features/sales/types.ts`  
**الخطوات:**
1. إضافة `serial_number` في `InventoryTransaction`
2. إضافة `warranty_months` في `Product`
3. إضافة `warranty_expiry` في `Invoice` / `SalesCartItem`
4. إنشاء تقارير للضمانات المنتهية

### 5.5 كتابة اختبارات للمنطق المالي
**الملفات الجديدة:** `src/core/utils/currencyUtils.test.ts`, `src/features/sales/store.test.ts` (توسيع)  
**الخطوات:**
1. اختبارات لـ `convertCurrency`: حالات الصفر، القيم السالبة، العملات المختلفة
2. اختبارات لـ `calculateTotals`: مع وبدون خصومات، مع وبدون core charge
3. اختبارات للـ validators: قيود متوازنة وغير متوازنة
4. اختبارات لتحويل العملات في المبيعات والمشتريات

---

## 📊 ملخص المهام

| المرحلة | المهام | الملفات المتأثرة | الأيام |
|---------|--------|------------------|--------|
| الأولى: إصلاحات مالية | 5 | 6 ملفات | 7 |
| الثانية: أمن | 3 | 4 ملفات + SQL | 5 |
| الثالثة: ميزات السيارات | 6 | 10+ ملفات جديدة | 12 |
| الرابعة: تشغيلية | 5 | 8+ ملفات | 5 |
| الخامسة: تحسينات | 5 | 10+ ملفات | 7 |
| **المجموع** | **24** | **~38 ملف** | **36 يوم** |

## 🚀 البدء في التنفيذ

لبدء تنفيذ المرحلة الأولى، يرجى تأكيد الموافقة. سأبدأ بـ:
1. إصلاح `currencyUtils.ts` (إضافة دالة `convertCurrency`)
2. تحديث `sales/store.ts` و `purchases/store.ts`
3. إصلاح `validators/index.ts`
4. إصلاح `decimalUtils.ts`