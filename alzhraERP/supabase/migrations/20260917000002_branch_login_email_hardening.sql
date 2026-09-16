-- ==============================================================================
-- Migration: 20260917000002_branch_login_email_hardening.sql
-- Description:
-- 1. Support branch-specific email (e.g. for Google OAuth / direct password login)
-- 2. Ensure setup_new_company auto-attaches users with branch email to the existing branch & company
-- 3. Trigger to auto-sync user_company_roles when branch email is set/updated
-- 4. Cross-company branch foreign keys hardening (journal_entries, parties, quotations)
-- 5. Set branch emails for Al-Nazari branches
-- ==============================================================================

-- 1. Add email column to branches with email validation and unique per company constraint
ALTER TABLE public.branches 
  ADD COLUMN IF NOT EXISTS email text;

-- Format validation
ALTER TABLE public.branches 
  DROP CONSTRAINT IF EXISTS chk_branches_email_format;

ALTER TABLE public.branches 
  ADD CONSTRAINT chk_branches_email_format 
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Unique email per company
CREATE UNIQUE INDEX IF NOT EXISTS ux_branches_company_email 
  ON public.branches(company_id, LOWER(TRIM(email))) 
  WHERE email IS NOT NULL AND TRIM(email) != '';

-- 2. Trigger function to auto-sync existing auth.users to branch when branch email is set/updated
CREATE OR REPLACE FUNCTION public.sync_branch_user_on_branch_email_change()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.email IS NOT NULL AND TRIM(NEW.email) != '' AND (OLD.email IS NULL OR LOWER(TRIM(OLD.email)) != LOWER(TRIM(NEW.email))) THEN
    -- Look for user in auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(TRIM(NEW.email))
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      -- Link user to this company and branch
      INSERT INTO public.user_company_roles (user_id, company_id, role, branch_id)
      VALUES (v_user_id, NEW.company_id, 'manager', NEW.id)
      ON CONFLICT (user_id, company_id) DO UPDATE
        SET branch_id = EXCLUDED.branch_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_branch_user_on_email_change ON public.branches;
CREATE TRIGGER trg_sync_branch_user_on_email_change
  AFTER INSERT OR UPDATE OF email ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_branch_user_on_branch_email_change();

-- 3. Update setup_new_company to automatically link branch login users
CREATE OR REPLACE FUNCTION public.setup_new_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_company_id   uuid;
  v_company_name text;
  v_branch_id    uuid;
  v_invitation   record;
  v_branch_match record;
  -- Root accounts
  v_id_assets     uuid;
  v_id_liab       uuid;
  v_id_equity     uuid;
  v_id_revenue    uuid;
  v_id_expense    uuid;
BEGIN
  -- 1. Check for pending, NON-EXPIRED invitations
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    UPDATE public.invitations 
    SET status = 'accepted', updated_at = now() 
    WHERE id = v_invitation.id;

    INSERT INTO profiles(id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
    ON CONFLICT (id) DO UPDATE
      SET full_name = CASE 
        WHEN profiles.full_name IS NULL OR profiles.full_name = '' 
        THEN EXCLUDED.full_name 
        ELSE profiles.full_name 
      END;

    INSERT INTO user_company_roles(user_id, company_id, role, branch_id)
    VALUES (NEW.id, v_invitation.company_id, v_invitation.role, v_invitation.branch_id)
    ON CONFLICT (user_id, company_id) DO UPDATE
      SET role = EXCLUDED.role, branch_id = EXCLUDED.branch_id;

    RETURN NEW;
  END IF;

  -- 1b. Mark stale pending invitations as expired
  UPDATE public.invitations
     SET status = 'expired', updated_at = now()
   WHERE LOWER(email) = LOWER(NEW.email)
     AND status = 'pending'
     AND expires_at IS NOT NULL
     AND expires_at <= now();

  -- 1c. Check if email matches an active branch designated login email
  SELECT b.id, b.company_id, b.name INTO v_branch_match
  FROM public.branches b
  WHERE LOWER(TRIM(b.email)) = LOWER(TRIM(NEW.email))
    AND b.status = 'active'
  ORDER BY b.created_at ASC
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO profiles(id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', v_branch_match.name))
    ON CONFLICT (id) DO UPDATE
      SET full_name = CASE 
        WHEN profiles.full_name IS NULL OR profiles.full_name = '' 
        THEN EXCLUDED.full_name 
        ELSE profiles.full_name 
      END;

    INSERT INTO user_company_roles(user_id, company_id, role, branch_id)
    VALUES (NEW.id, v_branch_match.company_id, 'manager', v_branch_match.id)
    ON CONFLICT (user_id, company_id) DO UPDATE
      SET branch_id = EXCLUDED.branch_id, role = EXCLUDED.role;

    RETURN NEW;
  END IF;

  -- 2. No invitation and no branch email match. Create a new company
  v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'شركتي');

  INSERT INTO companies(name_ar, owner_id, base_currency)
  VALUES (v_company_name, NEW.id, 'SAR')
  RETURNING id INTO v_company_id;

  INSERT INTO branches(company_id, name, status, is_main)
  VALUES (v_company_id, 'الفرع الرئيسي', 'active', true)
  RETURNING id INTO v_branch_id;

  INSERT INTO user_company_roles(user_id, company_id, role, branch_id)
  VALUES (NEW.id, v_company_id, 'owner', null);

  INSERT INTO profiles(id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO warehouses(company_id, branch_id, name_ar, location, is_primary)
  VALUES (v_company_id, v_branch_id, 'المستودع الرئيسي', 'الرئيسي', true);

  -- Roots
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

  -- Sub accounts
  INSERT INTO accounts(company_id, code, name_ar, type, is_system, parent_id) VALUES
    (v_company_id,'1010','الصندوق (كاش)',          'asset',false, v_id_assets),
    (v_company_id,'1020','البنك',                   'asset',false, v_id_assets),
    (v_company_id,'1100','المدينون (ذمم العملاء)',  'asset',true,  v_id_assets),
    (v_company_id,'1200','المخزون',                 'asset',true,  v_id_assets),
    (v_company_id,'1300','أصول ثابتة',              'asset',false, v_id_assets);

  INSERT INTO accounts(company_id, code, name_ar, type, is_system, parent_id) VALUES
    (v_company_id,'2100','الدائنون (ذمم الموردين)',       'liability',true, v_id_liab),
    (v_company_id,'2200','ضريبة القيمة المضافة المستحقة','liability',true, v_id_liab),
    (v_company_id,'2300','قروض وتسهيلات',                 'liability',false,v_id_liab);

  INSERT INTO accounts(company_id, code, name_ar, type, is_system, parent_id) VALUES
    (v_company_id,'3100','رأس المال',   'equity',true, v_id_equity),
    (v_company_id,'3200','أرباح مبقاة','equity',true, v_id_equity);

  INSERT INTO accounts(company_id, code, name_ar, type, is_system, parent_id) VALUES
    (v_company_id,'4100','إيرادات المبيعات', 'revenue',true, v_id_revenue),
    (v_company_id,'4200','إيرادات الخدمات', 'revenue',false,v_id_revenue),
    (v_company_id,'4300','إيرادات أخرى',    'revenue',false,v_id_revenue);

  INSERT INTO accounts(company_id, code, name_ar, type, is_system, parent_id) VALUES
    (v_company_id,'5100','تكلفة البضاعة المباعة','expense',true, v_id_expense),
    (v_company_id,'5200','مصروفات إدارية',       'expense',false,v_id_expense),
    (v_company_id,'5300','مصروفات تشغيلية',      'expense',false,v_id_expense),
    (v_company_id,'5400','رواتب وأجور',           'expense',false,v_id_expense),
    (v_company_id,'5500','إيجارات',               'expense',false,v_id_expense),
    (v_company_id,'5600','مصروفات متنوعة',        'expense',false,v_id_expense);

  INSERT INTO expense_categories(company_id, name, color, is_system) VALUES
    (v_company_id,'رواتب وأجور',      '#ef4444',true),
    (v_company_id,'إيجارات',          '#f97316',true),
    (v_company_id,'كهرباء ومياه',     '#eab308',true),
    (v_company_id,'اتصالات',          '#22c55e',true),
    (v_company_id,'صيانة',            '#3b82f6',true),
    (v_company_id,'نقل ومواصلات',     '#8b5cf6',true),
    (v_company_id,'مصروفات متنوعة',   '#6b7280',true);

  INSERT INTO fiscal_years(company_id, name, start_date, end_date)
  VALUES (
    v_company_id,
    'السنة المالية ' || EXTRACT(YEAR FROM now())::text,
    date_trunc('year', now())::date,
    (date_trunc('year', now()) + interval '1 year' - interval '1 day')::date
  );

  INSERT INTO tax_rates(company_id, name_ar, name_en, percentage, is_default, is_active)
  VALUES
    (v_company_id, 'بدون ضريبة', 'No Tax',  0,  true,  true),
    (v_company_id, 'ضريبة القيمة المضافة', 'VAT 15%', 15, false, false);

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
$$;

-- 4. Strengthen cross-company foreign keys on branch references
-- Journal Entries
ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS fk_journal_entries_company_branch;
ALTER TABLE public.journal_entries
  ADD CONSTRAINT fk_journal_entries_company_branch
  FOREIGN KEY (company_id, branch_id) 
  REFERENCES public.branches(company_id, id) ON DELETE SET NULL;

-- Parties
ALTER TABLE public.parties
  DROP CONSTRAINT IF EXISTS fk_parties_company_branch;
ALTER TABLE public.parties
  ADD CONSTRAINT fk_parties_company_branch
  FOREIGN KEY (company_id, branch_id) 
  REFERENCES public.branches(company_id, id) ON DELETE SET NULL;

-- Quotations
ALTER TABLE public.quotations
  DROP CONSTRAINT IF EXISTS fk_quotations_company_branch;
ALTER TABLE public.quotations
  ADD CONSTRAINT fk_quotations_company_branch
  FOREIGN KEY (company_id, branch_id) 
  REFERENCES public.branches(company_id, id) ON DELETE SET NULL;

-- 5. Seed / Update branch emails for Al-Nazari branches
UPDATE public.branches 
SET email = 'm713896067@gmail.com' 
WHERE id = '8dc294fb-fdb7-4571-a6b2-8389cb04b10e';

UPDATE public.branches 
SET email = '2026.wael2@gmail.com' 
WHERE id = '93fe776f-c072-42b9-98ea-aac2fdb0f4bf';
