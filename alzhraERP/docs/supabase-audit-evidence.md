# أدلة التدقيق الخارجي — Supabase alzhra100

تاريخ الفحص: 2026-08-15.

## المشروع

المشروع الفعلي المكتشف عبر Supabase MCP هو `alzhra100`، المعرّف `zzthamxjxnxzzpswllid`، بحالة `ACTIVE_HEALTHY`، وقاعدة PostgreSQL 17.6.1.063 في `ap-south-1`.

## نتائج Supabase Advisors

نتيجة مستشار الأمان: 514 تنبيهاً، منها 2 ERROR و512 WARN. القواعد الرئيسية: `security_definer_view` عدد 2، `function_search_path_mutable` عدد 59، `anon_security_definer_function_executable` عدد 213، `authenticated_security_definer_function_executable` عدد 239، و`auth_leaked_password_protection` عدد 1.

نتيجة مستشار الأداء: 511 تنبيهاً، منها 274 WARN و237 INFO. القواعد الرئيسية: `unindexed_foreign_keys` عدد 153، `auth_rls_initplan` عدد 71، `unused_index` عدد 84، و`multiple_permissive_policies` عدد 203.

التنبيهان الأمنيان ERROR يتعلقان بوجود views معرفة بـ `SECURITY DEFINER`، ومنها `public.party_balances_by_currency` و`public.user_profiles` بحسب نتيجة المستشار.

من أمثلة التحذيرات: دوال `SECURITY DEFINER` قابلة للتنفيذ عبر REST من أدوار `anon` أو `authenticated`، وسياسات RLS متعددة permissive على جداول مثل `incentive_tiers` و`part_catalog_cache`، إضافة إلى دوال تعيد تقييم `auth` أو `current_setting` لكل صف.

ميزة حماية كلمات المرور المسربة في Supabase Auth غير مفعلة بحسب المستشار.

## تحقق SQL مباشر

استعلام `pg_proc` أظهر أن عدداً من دوال `SECURITY DEFINER` في schema `public` ما زالت قابلة للتنفيذ من `anon` و/أو `authenticated`. أمثلة ظاهرة في النتيجة: `is_super_admin`، `is_valid_branch`، `log_audit_event`، `post_manual_journal`، `process_sales_return`، `process_stock_transfer`، `recalculate_all_party_balances`، `recalculate_party_balance`، و`recalculate_product_stock`. يجب التحقق من كون ذلك مقصوداً، ومن أن كل دالة تتحقق داخلياً من هوية المستخدم والشركة والمدخلات، لا الاكتفاء بوجود RLS على الجداول.

## فجوة migrations

سجل Supabase المنشور يحتوي عدداً كبيراً من migrations القديمة والمخصصة، بما في ذلك migrations مراحل v1-v5، إصلاحات RLS وRPC، ومراحل commission engine. المستودع المحلي يحتوي 34 ملف SQL فقط، ونتيجة المقارنة أظهرت migrations منشورة كثيرة غير موجودة محلياً. هذا يمثل خطراً على قابلية إعادة بناء البيئة والتكامل بين GitHub وSupabase، حتى لو كانت قاعدة الإنتاج حالياً تعمل.

## مصادر الأدلة

- Supabase MCP `list_projects` بتاريخ 2026-08-15.
- Supabase MCP `get_advisors` بنوع `security` بتاريخ 2026-08-15.
- Supabase MCP `get_advisors` بنوع `performance` بتاريخ 2026-08-15.
- Supabase MCP `execute_sql` على `pg_proc` بتاريخ 2026-08-15.
- Supabase MCP `list_migrations` بتاريخ 2026-08-15.

## نتائج تدقيق التكامل والواجهة — الجولة الحالية

- عميل Supabase يملك وضعاً تجريبياً صامتاً عند غياب متغيرات البيئة؛ `createMockClient` لا يطابق واجهة PostgREST الكاملة (لا يدعم `eq` و`single` و`rpc` وسلاسل الاستعلام)، وقد يحول أخطاء إعداد البيئة إلى بيانات فارغة أو سلوك نجاح وهمي.
- سياسة React Query تضبط `staleTime` على خمس دقائق، وتعطل `refetchOnMount` و`refetchOnWindowFocus` وتعتمد على Realtime. hook `useRealtimeSync` يستمع إلى `postgres_changes` دون مرشح `company_id`، ويغطي عدداً محدوداً من الجداول؛ لذلك توجد مخاطرة بتحديثات غير ضرورية بين الشركات وبقاء بعض مجالات المشتريات والعمولات قديمة في cache.
- عدد استدعاءات `supabase.from` المباشرة كبير، مع 186 استخداماً ظاهراً لـ `any` و61 تحويلة `as unknown as` في ملفات الواجهة والخدمات. أبرز مناطق المخاطرة: خدمات الصيانة التي تنفذ حذفاً وتعديلات مباشرة، وإدارات الإعدادات والتقارير.
- مقارنة عقود الجداول: Supabase يعرض 156 كيان جدولاً، وTypeScript يعرف 169 كياناً. بعد توحيد أسماء schema، الفروقات الأساسية هي سبعة جداول منشورة غير ممثلة محلياً، مقابل views/عقود محلية إضافية وعدة أسماء legacy؛ يلزم تصنيفها إلى tables وviews قبل إعادة توليد العقد.
- SQL مباشر لصلاحيات الدوال أظهر في أول 200 دالة `SECURITY DEFINER` أن 175 متاحة لـ `anon` و200 لـ `authenticated` ضمن العينة. من الدوال الحساسة المتاحة لـ anon: `commit_purchase_invoice`, `commit_sales_invoice`, `post_manual_journal`, `process_stock_transfer`, `api_v1_fin_post_journal_entry` وغيرها. بعض الدوال الحديثة تتحقق من `auth.uid()` وعضوية الشركة، لكن منح EXECUTE العام يظل اتساعاً أمنياً يجب تقييده أو ضمان حواجز داخلية موحدة لكل الدوال.
- تدقيق RLS أظهر أن RLS مفعّل في النتائج المعادة، لكن عدداً كبيراً من الجداول يملك 3–4 سياسات `PERMISSIVE`؛ هذا يطابق تنبيه Supabase ويحتاج مراجعة منطق OR الناتج عن تجميع السياسات، خصوصاً في الجداول المالية والمخزون والعمولات.
