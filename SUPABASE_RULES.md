
# 🛡️ دستور الارتباط مع Supabase (Single Source of Truth)

هذه الوثيقة تحدد القواعد الصارمة والملزمة لأي عملية اتصال بقاعدة البيانات في نظام الزهراء. أي خروج عن هذه القواعد يعتبر "دين تقني" يجب إصلاحه فوراً.

---

## 1. المصدر الوحيد للحقيقة (The Single Source of Truth)

*   **البيانات (Data):** قاعدة بيانات **PostgreSQL** المستضافة على Supabase هي المصدر الوحيد والحصري للبيانات.
*   **حالة الواجهة (UI State):** مكتبة **TanStack Query (React Query)** هي المصدر الوحيد لحالة الخادم (Server State) داخل التطبيق.
    *   🚫 **ممنوع** تخزين بيانات قادمة من قاعدة البيانات في `useState` أو `Redux/Zustand` إلا للضرورة القصوى (مثل النماذج المؤقتة).
    *   ✅ **يجب** استخدام `useQuery` لجلب البيانات و `useMutation` للتعديل.

---

## 2. قواعد الاتصال والعميل (Client Rules)

*   **مثيل واحد فقط (Singleton):** يجب استيراد عميل `supabase` حصراً من المسار:
    `src/lib/supabaseClient.ts`
    🚫 **ممنوع** استخدام `createClient` في أي ملف آخر.
*   **الأنواع الصارمة (Strict Typing):** يجب حقن `Database` Types عند تهيئة العميل لضمان أن كل استعلام (Query) خاضع للتحقق من النوع (Type-Checked).

---

## 3. قواعد جلب البيانات (Fetching Regulations)

*   **الطبقات (Layers):** يمنع استدعاء `supabase` مباشرة داخل مكونات React (Components).
    *   ✅ المسار الصحيح: `Component` -> `Hook` -> `Service` -> `API` -> `Supabase`.
*   **التسمية (Naming):** يجب أن تطابق أسماء الحقول في واجهات TypeScript (Interfaces) أسماء الأعمدة في قاعدة البيانات (Snake_case في القاعدة -> CamelCase في التطبيق عبر Mapping Layer في الـ Service).

---

## 4. قواعد التعديل والكتابة (Mutation Regulations)

*   **الذرية (Atomicity):** العمليات التي تتطلب تعديل أكثر من جدول (مثل: إنشاء فاتورة + خصم مخزون + قيد محاسبي) **يجب** أن تنفذ عبر:
    1.  **Database Function (RPC):** وهو الخيار الأفضل والأكثر أماناً.
    2.  **Supabase Edge Function:** للخزوارزميات المعقدة.
    *   🚫 **ممنوع** تنفيذ سلسلة استدعاءات `await` متتالية في الواجهة الأمامية لعمليات مترابطة (Transaction risk).
*   **التحديث الفوري (Optimistic Updates):** عند التعديل، يجب إبطال الكاش (Invalidate Queries) فوراً لضمان ظهور البيانات الجديدة.

---

## 5. الأمان والصلاحيات (RLS & Security)

*   **لا تصفية في الواجهة (No Frontend Filtering):** الأمان لا يتحقق بإخفاء الأزرار. يجب تفعيل **Row Level Security (RLS)** في قاعدة البيانات.
*   **الشركة (Tenant Isolation):** كل استعلام **يجب** أن يحتوي (تلقائياً عبر RLS) على `company_id` لضمان عدم تسرب بيانات بين الشركات.

---

## 6. التعامل مع الأخطاء (Error Handling)

*   لا تقم أبداً بـ `throw error` للكائن الخام القادم من Supabase.
*   يجب تمرير الخطأ عبر دالة `parseError` في `src/core/utils/errorUtils.ts` لتوحيد رسائل الخطأ للمستخدم.

---

## 7. البيئة (Environment)

*   المفاتيح `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` هي الوحيدة المسموح بها.
*   يمنع منعاً باتاً كتابة المفاتيح (Hardcoded) في الكود المصدري.

---

**التوقيع:** كبير مهندسي البرمجيات - نظام الزهراء
