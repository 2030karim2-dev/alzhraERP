# اكتشاف أتمتة العمولات في alzhra100

تم التحقق عبر MCP من أن مشروع Supabase المطابق للاسم `alzhra100` هو `zzthamxjxnxzzpswllid`، حالته `ACTIVE_HEALTHY` ومنطقته `ap-south-1`.

المشروع يحتوي على جداول العمولات `incentive_plans`, `incentive_rules`, `incentive_tiers`, `incentive_assignments`, `incentive_periods`, `incentive_engineer_links`, `incentive_pending_invoices`, `incentive_calculations`, `incentive_targets`, `incentive_calculation_lines`, `incentive_adjustments`, و`incentive_payments`، وجميع الجداول المفحوصة مفعّل عليها RLS.

الدالة `public.incentive_detect_pending_invoices(uuid, uuid)` موجودة كـ SECURITY DEFINER وتعيد عدد السجلات الجديدة. تعتمد حالياً على `has_permission(...)` و`user_is_admin_or_manager()`، وتمنع التكرار عبر عدم إنشاء سجل جديد إذا كان للفاتورة سجل `pending` أو `assigned`.

المشروع لا يحتوي Edge Function مخصصة للعمولات. الوظائف المنشورة الحالية هي: `send-notification`, `fetch-exchange-rates-aden`, `car-ai-assistant`, `ai-part-lookup`, `ai-product-image`, `ai-proxy`, `get-products`, `part-search`, `vin-decode`, و`vin-parts`.

يوجد نظام وظائف داخلي بجداول `sys_job_types`, `sys_job_queue`, `sys_background_workers`, `sys_dead_letter_queue`, و`sys_job_archive`. أنواع الوظائف الحالية تشمل `document_expiry_reminder`, `po_supplier_notification`, `rfq_auto_close`, `rfq_supplier_notification`, `supplier_analytics_batch`, و`workflow_state_transition`. لا توجد دوال عامة باسم `enqueue_job`, `claim_job`, `complete_job`, أو `fail_job` ضمن الاستعلام المحدد.

إضافة `pg_cron` مفعّلة بالإصدار `1.6.4` ضمن `pg_catalog`، كما أن `pg_net` مفعّلة. لذلك توجد إمكانية استخدام جدولة PostgreSQL، لكن لا ينبغي استدعاء RPC الحالي مباشرة لكل الشركات قبل معالجة اعتماد الصلاحيات؛ `has_permission` يعتمد على `auth.uid()`، بينما `incentive_actor(company_id)` لديه fallback إلى مالك أو مدير الشركة.

المراجع الخارجية المستخدمة: نتائج MCP لخادم Supabase بتاريخ 2026-08-15، ومخطط التشغيل الدوري المحلي `/home/ubuntu/skills/webdev-periodic-updates/SKILL.md` الذي يفرض idempotency، مهلة قصوى دقيقتين، ومسار Heartbeat يبدأ بـ `/api/scheduled/` عند استخدام جدولة Manus.
