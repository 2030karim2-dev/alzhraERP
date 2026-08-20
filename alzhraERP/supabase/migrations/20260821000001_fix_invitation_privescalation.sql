-- ============================================================
-- FIX (C1): Invitation privilege escalation
-- ------------------------------------------------------------
-- 1) `invitations_insert` previously required ONLY company
--    membership — ANY member (even role='viewer') could invite a
--    user with role='owner'/'admin' (the role is honoured verbatim
--    by the `setup_new_company` signup trigger -> full company
--    takeover). Now the inviter must be an owner/admin OF THAT
--    COMPANY (company-scoped, not the ambiguous get_user_role()).
--
-- 2) `setup_new_company` auto-accepted ANY pending invitation
--    regardless of `expires_at` (expired invitations remained
--    usable forever). Now expired invitations are ignored and
--    marked 'expired' for visibility.
--
-- Date: 2026-08-21
-- ============================================================

DROP POLICY IF EXISTS "invitations_insert" ON public.invitations;
CREATE POLICY "invitations_insert"
  ON public.invitations
  FOR INSERT TO public
  WITH CHECK (
    is_super_admin()
    OR (
      company_id IN (SELECT get_auth_companies())
      AND EXISTS (
        SELECT 1 FROM public.user_company_roles ucr
        WHERE ucr.user_id = auth.uid()
          AND ucr.company_id = invitations.company_id
          AND ucr.role IN ('owner', 'admin')
      )
    )
  );

-- ============================================================
-- setup_new_company — enforce expires_at on invitations
-- (full body preserved from live, only the invitation WHERE
-- clause and the expired-marking logic changed)
-- ============================================================

CREATE OR REPLACE FUNCTION public.setup_new_company()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id   uuid;
  v_company_name text;
  v_branch_id    uuid;
  v_invitation   record;
  -- معرفات الحسابات الجذرية
  v_id_assets     uuid;
  v_id_liab       uuid;
  v_id_equity     uuid;
  v_id_revenue    uuid;
  v_id_expense    uuid;
BEGIN
  -- 1. Check for pending, NON-EXPIRED invitations
  --    [SECURITY] An expired invitation must never auto-accept:
  --    it is marked 'expired' instead so the inviter can re-send.
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    -- Invitation found. Link user to company instead of creating a new one.

    -- Update invitation status
    UPDATE public.invitations SET status = 'accepted', updated_at = now() WHERE id = v_invitation.id;

    -- Create profile
    INSERT INTO profiles(id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
    ON CONFLICT (id) DO NOTHING;

    -- Assign role and branch
    INSERT INTO user_company_roles(user_id, company_id, role, branch_id)
    VALUES (NEW.id, v_invitation.company_id, v_invitation.role, v_invitation.branch_id);

    RETURN NEW;
  END IF;

  -- 1b. Mark stale pending invitations as expired (visibility only)
  UPDATE public.invitations
     SET status = 'expired', updated_at = now()
   WHERE email = NEW.email
     AND status = 'pending'
     AND expires_at IS NOT NULL
     AND expires_at <= now();

  -- 2. No valid invitation found. Create a new company (Existing Logic)
  v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'شركتي');

  -- إنشاء الشركة
  INSERT INTO companies(name_ar, owner_id, base_currency)
  VALUES (v_company_name, NEW.id, 'SAR')
  RETURNING id INTO v_company_id;

  -- إنشاء الفرع الرئيسي
  INSERT INTO branches(company_id, name, status)
  VALUES (v_company_id, 'الفرع الرئيسي', 'active')
  RETURNING id INTO v_branch_id;

  -- ربط المالك (صاحب الشركة لا يتم ربطه بفرع محدد ليرى كل الفروع، branch_id = null)
  INSERT INTO user_company_roles(user_id, company_id, role, branch_id)
  VALUES (NEW.id, v_company_id, 'owner', null);

  -- إنشاء profile إن لم يكن موجوداً
  INSERT INTO profiles(id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;

  -- مستودع رئيسي مرتبط بالفرع
  INSERT INTO warehouses(company_id, branch_id, name_ar, location, is_primary)
  VALUES (v_company_id, v_branch_id, 'المستودع الرئيسي', 'الرئيسي', true);

  -- ============================================================
  -- شجرة الحسابات مع parent_id صحيح
  -- ============================================================

  -- جذور خمسة
  INSERT INTO accounts(company_id, code, name_ar, type, is_system)
  VALUES (v_company_id,'1000','الأصول',        'asset',    true) RETURNING id INTO v_id_assets;

  INSERT INTO accounts(company_id, code, name_ar, type, is_system)
  VALUES (v_company_id,'2000','الخصوم',        'liability',true) RETURNING id INTO v_id_liab;

  INSERT INTO accounts(company_id, code, name_ar, type, is_system)
  VALUES (v_company_id,'3000','حقوق الملكية',  'equity',   true) RETURNING id INTO v_id_equity;

  INSERT INTO accounts(company_id, code, name_ar, type, is_system)
  VALUES (v_company_id,'4000','الإيرادات',     'revenue',  true) RETURNING id INTO v_id_revenue;

  INSERT INTO accounts(company_id, code, name_ar, type, is_system)
  VALUES (v_company_id,'5000','المصروفات',     'expense',  true) RETURNING id INTO v_id_expense;

  -- أصول فرعية
  INSERT INTO accounts(company_id, code, name_ar, type, is_system, parent_id) VALUES
    (v_company_id,'1010','الصندوق (كاش)',          'asset',false, v_id_assets),
    (v_company_id,'1020','البنك',                   'asset',false, v_id_assets),
    (v_company_id,'1100','المدينون (ذمم العملاء)',  'asset',true,  v_id_assets),
    (v_company_id,'1200','المخزون',                 'asset',true,  v_id_assets),
    (v_company_id,'1300','أصول ثابتة',              'asset',false, v_id_assets);

  -- خصوم فرعية
  INSERT INTO accounts(company_id, code, name_ar, type, is_system, parent_id) VALUES
    (v_company_id,'2100','الدائنون (ذمم الموردين)',       'liability',true, v_id_liab),
    (v_company_id,'2200','ضريبة القيمة المضافة المستحقة','liability',true, v_id_liab),
    (v_company_id,'2300','قروض وتسهيلات',                 'liability',false,v_id_liab);

  -- حقوق ملكية فرعية
  INSERT INTO accounts(company_id, code, name_ar, type, is_system, parent_id) VALUES
    (v_company_id,'3100','رأس المال',   'equity',true, v_id_equity),
    (v_company_id,'3200','أرباح مبقاة','equity',true, v_id_equity);

  -- إيرادات فرعية
  INSERT INTO accounts(company_id, code, name_ar, type, is_system, parent_id) VALUES
    (v_company_id,'4100','إيرادات المبيعات', 'revenue',true, v_id_revenue),
    (v_company_id,'4200','إيرادات الخدمات', 'revenue',false,v_id_revenue),
    (v_company_id,'4300','إيرادات أخرى',    'revenue',false,v_id_revenue);

  -- مصروفات فرعية
  INSERT INTO accounts(company_id, code, name_ar, type, is_system, parent_id) VALUES
    (v_company_id,'5100','تكلفة البضاعة المباعة','expense',true, v_id_expense),
    (v_company_id,'5200','مصروفات إدارية',       'expense',false,v_id_expense),
    (v_company_id,'5300','مصروفات تشغيلية',      'expense',false,v_id_expense),
    (v_company_id,'5400','رواتب وأجور',           'expense',false,v_id_expense),
    (v_company_id,'5500','إيجارات',               'expense',false,v_id_expense),
    (v_company_id,'5600','مصروفات متنوعة',        'expense',false,v_id_expense);

  -- فئات المصروفات
  INSERT INTO expense_categories(company_id, name, color, is_system) VALUES
    (v_company_id,'رواتب وأجور',      '#ef4444',true),
    (v_company_id,'إيجارات',          '#f97316',true),
    (v_company_id,'كهرباء ومياه',     '#eab308',true),
    (v_company_id,'اتصالات',          '#22c55e',true),
    (v_company_id,'صيانة',            '#3b82f6',true),
    (v_company_id,'نقل ومواصلات',     '#8b5cf6',true),
    (v_company_id,'مصروفات متنوعة',   '#6b7280',true);

  -- سنة مالية افتراضية
  INSERT INTO fiscal_years(company_id, name, start_date, end_date)
  VALUES (
    v_company_id,
    'السنة المالية ' || EXTRACT(YEAR FROM now())::text,
    date_trunc('year', now())::date,
    (date_trunc('year', now()) + interval '1 year' - interval '1 day')::date
  );

  -- معدل ضريبة افتراضي (0% — غير مفعّل حتى يختار المستخدم)
  INSERT INTO tax_rates(company_id, name_ar, name_en, percentage, is_default, is_active)
  VALUES
    (v_company_id, 'بدون ضريبة', 'No Tax',  0,  true,  true),
    (v_company_id, 'ضريبة القيمة المضافة', 'VAT 15%', 15, false, false);

  -- إعدادات الإشعارات الافتراضية
  INSERT INTO messaging_config(
    company_id,
    notify_on_sale, notify_on_purchase,
    notify_on_payment_bond, notify_on_expense,
    notify_on_stock_transfer, notify_on_low_stock
  ) VALUES (
    v_company_id,
    false, false, false, false, false, false
  );

  RETURN NEW;
END;
$function$;

-- Defensive privileges (re-applied, idempotent)
GRANT EXECUTE ON FUNCTION public.setup_new_company() TO service_role;
