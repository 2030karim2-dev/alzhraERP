# استكشاف Supabase — 2026-08-16

## المشروع

تم الاتصال عبر خادم Supabase MCP بنجاح. المشروع المتاح هو `alzhra100`، ومعرّفه `zzthamxjxnxzzpswllid`، وحالته `ACTIVE_HEALTHY`، ومنطقته `ap-south-1`، ومحرك PostgreSQL 17.6.1.

## الجداول

تم فحص مخطط `public` مع تفاصيل الأعمدة والمفاتيح والعلاقات. جميع الجداول التي ظهرت في نتيجة الفحص كانت مفعّلة عليها RLS، ومن الجداول المهمة: `prc_purchase_invoices` (91 صفاً)، `prc_purchase_invoice_items` (3298 صفاً)، `cashboxes` (4 صفوف)، `inv_warehouses` (0 صفوف)، `incentive_plans` (صف واحد)، `incentive_periods` (6 صفوف)، `incentive_engineer_links` (3 صفوف)، و`incentive_calculations` (صفان). كما ظهر `product_search_numbers` بعدد 87980 صفاً.

## بنية مهمة

جدول `cashboxes` يحتوي `company_id` و`branch_id` و`account_id` و`currency_code` و`is_active`. جدول `inv_warehouses` يحتوي `company_id` و`branch_id` و`code` و`name_ar` و`is_active` و`is_primary` و`deleted_at`. جدول `prc_purchase_invoice_items` يحتوي `invoice_id` و`company_id` و`product_id` و`invoiced_quantity` و`unit_price` و`tax_amount` و`total_price`. جداول العمولات تعتمد على `company_id` و`user_id` و`plan_id` و`period_id` وحقول حالة وحسابات رقمية.

## التنبيهات الأمنية

أعاد Supabase تنبيهاً بمستوى ERROR لوجود عرضين معرفين بصلاحية `SECURITY DEFINER`: `public.party_balances_by_currency` و`public.user_profiles`. كما أعاد تنبيهات WARN متعددة لدوال ذات `search_path` قابل للتغيير، ومنها `get_next_sequence` و`update_updated_at_column` و`get_user_role` و`get_sales_chart_data` و`commit_expense_v2` و`report_debt_aging` و`get_popular_products` و`get_monthly_performance` و`commit_sales_invoice` و`report_cash_flow` و`get_low_stock_products` و`save_product_uoms`.

المصادر الداخلية المستخدمة هي نتائج MCP المحفوظة في `/home/ubuntu/.mcp/tool-results/2026-08-16_12-54-56.885094561_supabase_list_projects_9e1c0317.json`، و`2026-08-16_12-55-16.009464292_supabase_list_tables_77cf00a9.json`، و`2026-08-16_12-55-53.970153612_supabase_execute_sql_44219e6d.json`، و`2026-08-16_12-56-11.690353147_supabase_get_advisors_399af9b7.json`.

## سياسات RLS

أظهر الفحص أن سياسات الجداول الحساسة مسندة إلى دور `public` مع شروط داخلية تعتمد على `auth.uid()` أو `get_user_company_id()` أو `has_permission()`. جداول `prc_purchase_invoices` و`prc_purchase_invoice_items` تستخدم عزل الشركة من `auth.jwt()->>'company_id'`. جداول `cashboxes` تستخدم `get_user_company_id()` للقراءة والتعديل، مع تقييد الإدخال والتعديل للأدوار `owner` و`admin` و`accountant`. جداول العمولات تستخدم عزل الشركة بالإضافة إلى صلاحيات العرض والحساب والمراجعة والدفع.

مخاطر تستحق المعالجة: سياسة `inv_warehouses_isolation_policy` وقيود فواتير المشتريات تعتمد على claim باسم `company_id` داخل JWT، ولذلك يجب التأكد من أن claim لا يمكن للمستخدم تغييره وأنه متزامن دائماً مع عضويته. كذلك توجد سياسات `ALL` على دور `public`، لكن شروطها الداخلية هي خط الدفاع الفعلي؛ يفضل مستقبلاً تضييق الدور إلى `authenticated` حيثما لا توجد حاجة للوصول العام. كما أن شروط الفروع في `incentive_periods` تستخدم أول فرع فقط من `user_company_roles` عند وجود صلاحية عرض فرعي، وهو ما قد لا يكون كافياً للمستخدم متعدد الفروع.
