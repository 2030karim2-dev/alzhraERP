# وحدة عمولات المهندسين

تستخدم هذه الوحدة Supabase مع PostgreSQL RPCs التي أُنشئت في Phase 2 وPhase 3. لا يجوز للواجهة تنفيذ عمليات انتقال الفترة أو إنشاء روابط المهندسين أو تشغيل المحرك عبر كتابة مباشرة عندما يوجد RPC إداري موثوق؛ يجب تمرير العملية عبر `api.ts` حتى تُطبق RLS والتدقيق والحماية من فترات الاختبار.

## حدود الصلاحيات

تقتصر إدارة الخطط والقواعد والشرائح على `finance_manager` و`admin` و`owner`. يرى المهندس حساباته فقط، ويرى مدير الفرع بيانات فرعه، بينما يرى المستخدم المالي والإداري بيانات الشركة وفق RLS. هذه الحواجز في الواجهة ليست بديلًا عن التحقق الخادمي أو سياسات PostgreSQL.

### عقد الصلاحيات الموحد (بادئة `incentive:*`)

تعريفات الصلاحيات وحدها في `authorization.ts` وتتطابق مع أسماء RPC في alzhra100:

- `incentive:manage_plans` — إنشاء/تحديث الخطط والقواعد والشرائح.
- `incentive:calculate_period` — تشغيل محرك الحساب الذري لفترة.
- `incentive:period_*` — انتقالات دورة الفترة (calculating/calculated/under_review/approved/locked/paid).

دواليب الواجهة (`useCommissionDashboardData`, `useCommissionConfigurationData`, `useCommissionPeriodsController`) تستدعي `canCalculatePeriodByAccess`/`canManagePlansByAccess`/`transitionPermission` من `authorization.ts` ولا تحتوي أي اسم صلاحية مضمّن يدويًا. يُزرع `role_permissions` بهذه الصلاحيات عبر `supabase/migrations/20260815000001_add_commission_permissions.sql` للأدوار `admin` و`manager` (الذي يطابق دور `finance_manager` خادميًا عبر `user_is_admin_or_manager()`)، بينما يمر `owner` من بوابة `assertPermission`.

## دورة الفترة

التسلسل المدعوم هو `open → calculating → calculated → under_review → approved → locked → paid`. لا تسمح الفترات التجريبية بعمليات `locked` أو `paid` أو `post`، ويجب أن تبقى الحماية فعالة حتى عند استدعاء RPC مباشرة.

## التشغيل الدوري

المستودع الحالي تطبيق Vite/Supabase وليس خدمة Node طويلة التشغيل؛ لذلك لا يُسمح بإضافة `setInterval` أو `node-cron`. أي جدولة فعلية يجب أن تُنفذ عبر Heartbeat/Edge Function منفصلة مع مفتاح idempotency، مهلة لا تتجاوز دقيقتين، وحماية من التوازي، ثم تُربط بالواجهة بعد اعتماد بيئة التشغيل.

## التحقق

اختبارات `engineGuards.test.ts` و`authorization.test.ts` تغطي اكتمال التوزيع، الأهلية، عزل الشركة والفرع والمهندس، وانتقالات فترات الاختبار. يبقى build الكامل بحاجة إلى بيئة أقل ضغطًا من الذاكرة قبل اعتماد checkpoint النهائي.
