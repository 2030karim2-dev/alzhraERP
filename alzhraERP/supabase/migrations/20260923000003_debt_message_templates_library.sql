-- ============================================================
-- Migration: 20260923000003_debt_message_templates_library.sql
-- ============================================================
-- Debt & Collection - template library (16 ready professional Arabic templates
-- covering the whole dunning ladder + the payment lifecycle).
--
--   A) seed_default_debt_templates(company): idempotent per-name seeding,
--      callable by a managing role (owner/admin/manager/accountant) or by a
--      service_role/migration context. Never overwrites an existing template.
--   B) one-time backfill for every existing company.
--
-- Placeholders are limited to the tokens that renderReminderTemplate supports:
--   customer_name, amount, due_date, days_overdue, company_name, signature.
--   {{amount}} already carries the currency symbol, so bodies never append
--   {{currency}} (it would duplicate it). {{invoice_number}} is deliberately
--   NOT used: the reminder flow never passes it, so it would render empty.
--
-- NOTE: this file intentionally contains Arabic literals and MUST be deployed
-- as a UTF-8 **byte** body (a PowerShell string body strips Arabic - ADR-017).
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.seed_default_debt_templates(uuid);
--   DELETE FROM public.debt_message_templates WHERE name IN (<library names>);
--   (the one-time backfill only inserts rows; nothing else is modified)
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.seed_default_debt_templates(p_company_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_inserted integer := 0;
    v_role text;
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    -- A real user must hold a managing role; migrations / service_role (no JWT) pass.
    IF auth.uid() IS NOT NULL THEN
        v_role := public.get_user_role(p_company_id);
        IF COALESCE(v_role, '') NOT IN ('owner', 'admin', 'manager', 'accountant') THEN
            RAISE EXCEPTION 'insufficient permission to seed debt templates'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    WITH library(name, body) AS (VALUES
      (E'تذكير ودّي قبل الاستحقاق',
       E'السلام عليكم {{customer_name}} 🌸\nنذكّركم بلطف بأن رصيدكم المستحق لدى {{company_name}} يبلغ *{{amount}}*، ويحل موعد استحقاقه في {{due_date}}.\nنشكر لكم تعاونكم الدائم، ويسعدنا خدمتكم في أي وقت 🤝\n——————\n{{company_name}}\n{{signature}}'),
      (E'تذكير يوم الاستحقاق',
       E'السلام عليكم {{customer_name}} 🌸\nتذكير ودّي: يستحق اليوم مبلغ *{{amount}}* لصالح {{company_name}}.\nيسعدنا استلام السداد في أي وقت، ونقدّر التزامكم بالتعامل معنا.\n——————\n{{company_name}}\n{{signature}}'),
      (E'متأخر 1-15 يوم — تذكير لطيف',
       E'السلام عليكم {{customer_name}}\nنتابع معكم رصيداً مستحقاً بقيمة *{{amount}}* متأخر منذ {{days_overdue}} يوماً.\nنرجو التكرم بالسداد، أو إخبارنا بالموعد المناسب لكم 🤝\n——————\n{{company_name}}\n{{signature}}'),
      (E'متأخر 16-30 يوم — تذكير حازم',
       E'السلام عليكم {{customer_name}}\nتنبيه: الرصيد المستحق *{{amount}}* تجاوز {{days_overdue}} يوماً من تاريخ الاستحقاق ({{due_date}}).\nنأمل ترتيب السداد خلال 48 ساعة، أو التواصل معنا لجدولة موعد واضح.\n——————\n{{company_name}}\n{{signature}}'),
      (E'متأخر 31-60 يوم — مطالبة رسمية',
       E'السلام عليكم {{customer_name}}\nمطالبة رسمية: رصيدكم *{{amount}}* متأخر {{days_overdue}} يوماً.\nنرجو السداد خلال 3 أيام عمل لتفادي إيقاف التعامل الآجل، ويمكننا الاتفاق على جدولة دفعات إذا لزم الأمر.\n——————\n{{company_name}}\n{{signature}}'),
      (E'تصعيد 61-90 يوم — زيارة ميدانية',
       E'السلام عليكم {{customer_name}}\nبالإشارة إلى رصيدكم المستحق *{{amount}}* والمتأخر {{days_overdue}} يوماً، سيتم توجيه مندوب تحصيل لزيارتكم خلال الأيام القادمة.\nيمكنكم تجنّب الزيارة بالسداد أو بالتواصل معنا لتسوية ودية.\n——————\n{{company_name}}\n{{signature}}'),
      (E'تصعيد 90+ يوم — إشعار نهائي',
       E'إشعار نهائي\nعميلنا العزيز {{customer_name}}:\nرصيدكم المستحق *{{amount}}* تجاوز {{days_overdue}} يوماً.\nنمنحكم مهلة أخيرة مدتها 7 أيام لسداد المبلغ كاملاً، وبعدها يُعلَّق التعامل ويُحال الملف إلى إدارة التحصيل القانوني.\n——————\n{{company_name}}\n{{signature}}'),
      (E'إشعار قانوني قبل التقاضي',
       E'إشعار قانوني\nالسيد/{{customer_name}}:\nبموجب تعاملنا المسجّل، يبقى مبلغ *{{amount}}* غير مسدد منذ {{days_overdue}} يوماً.\nنطالبكم بالسداد خلال 5 أيام من تاريخ هذا الإشعار، وإلا اضطررنا إلى اتخاذ الإجراءات القانونية لتحصيل المبلغ وما يترتب عليها من مصاريف.\n——————\n{{company_name}}\n{{signature}}'),
      (E'تذكير وعد سداد قبل الموعد',
       E'السلام عليكم {{customer_name}} 🌸\nتذكير بودّي: موعد سدادكم المتفق عليه يقترب، والمبلغ *{{amount}}*.\nنشكر التزامكم، ونسعد بخدمتكم دائماً.\n——————\n{{company_name}}\n{{signature}}'),
      (E'وعد سداد مُخلَف — إعادة جدولة',
       E'السلام عليكم {{customer_name}}\nلاحظنا عدم تنفيذ وعد السداد الخاص بالمبلغ *{{amount}}* في موعده.\nنفهم أن الظروف قد تتغير، ونقترح إعادة الجدولة: أخبرونا بالموعد الجديد المناسب ونؤكده رسمياً.\n——————\n{{company_name}}\n{{signature}}'),
      (E'شكر بعد السداد الكامل',
       E'عميلنا العزيز {{customer_name}} 🌟\nتم استلام مبلغ *{{amount}}* بالكامل، ورصيدكم الآن صفر.\nشكراً لالتزامكم وتعاونكم، ونتشرف بخدمتكم دائماً.\n——————\n{{company_name}}\n{{signature}}'),
      (E'شكر بعد دفعة جزئية + المتبقي',
       E'عميلنا العزيز {{customer_name}} 🌟\nتم استلام دفعتكم بنجاح، وأصبح رصيدكم المتبقي *{{amount}}*.\nشكراً لالتزامكم، ونبقى في خدمتكم.\n——————\n{{company_name}}\n{{signature}}'),
      (E'عرض خطة تقسيط',
       E'السلام عليكم {{customer_name}}\nحرصاً على تسهيل السداد، نقترح تسوية الرصيد *{{amount}}* عبر خطة أقساط شهرية ميسّرة.\nأخبرونا بالدفعة الشهرية المناسبة لكم، وسنرفع لكم جدول الأقساط رسمياً 🤝\n——————\n{{company_name}}\n{{signature}}'),
      (E'كشف حساب ملخص',
       E'السلام عليكم {{customer_name}} 🧾\nملخص حسابكم لدى {{company_name}}:\n▪️ الرصيد المستحق: *{{amount}}*\n▪️ أقدم استحقاق: {{due_date}}\n▪️ أيام التأخير: {{days_overdue}}\nعند الحاجة نرسل لكم كشف الحساب التفصيلي. شاكرين تعاونكم 🌸\n——————\n{{company_name}}\n{{signature}}'),
      (E'طلب تأكيد بيانات الحوالة',
       E'السلام عليكم {{customer_name}}\nلتسريع ترحيل مبلغ *{{amount}}* على حسابكم، نرجو تزويدنا بصورة إشعار الحوالة مع اسم المُرسل وتاريخها.\nسنؤكد الاستلام فور التحقق ✅\n——————\n{{company_name}}\n{{signature}}'),
      (E'تأكيد استلام الحوالة وترحيلها',
       E'عميلنا العزيز {{customer_name}} ✅\nتم التحقق من حوالة *{{amount}}* وترحيلها على حسابكم.\nالرصيد المحدث لدينا مطابق لما في الكشف، وشكراً لالتزامكم 🌸\n——————\n{{company_name}}\n{{signature}}')
    )
    INSERT INTO public.debt_message_templates (company_id, name, body, channel, is_active)
    SELECT p_company_id, l.name, l.body, 'whatsapp', true
    FROM library l
    WHERE NOT EXISTS (
        SELECT 1 FROM public.debt_message_templates t
        WHERE t.company_id = p_company_id AND t.name = l.name
    );

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.seed_default_debt_templates(uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.seed_default_debt_templates(uuid) TO authenticated;

-- One-time backfill: every existing company gets the library (skips names it has).
DO $do$
DECLARE
    r record;
    v_total integer := 0;
BEGIN
    FOR r IN SELECT id FROM public.companies LOOP
        v_total := v_total + public.seed_default_debt_templates(r.id);
    END LOOP;
    RAISE NOTICE 'debt template library seeded: % rows', v_total;
END $do$;

COMMIT;