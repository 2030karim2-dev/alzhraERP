-- ==============================================================================
-- Migration: 20260905000002_fix_reconciliation_branch_conditions.sql
-- Description: Comprehensive audit fixes for the daily reconciliation system:
--   1) Add credit_sales column to daily_reconciliations to eliminate accounting gaps.
--   2) Fix get_daily_drawer_summary:
--      - Unify branch_id condition for opening_float (strict branch match).
--      - Break down credit_sales (مبيعات الآجل) so total_sales = cash + card + transfer + credit.
--   3) Fix commit_daily_reconciliation:
--      - Enforce assertOwner guard: strictly prevent non-owners from modifying locked days.
--      - Prevent 'viewer' role from committing reconciliations.
--      - Record credit_sales in the reconciliation record.
--   4) Fix record_quick_drawer_expense:
--      - Remove overly broad OR p_branch_id IS NULL that falsely blocked other branches.
--      - Standardize error message prefix: 'عذراً، لا تمتلك صلاحية...'.
--   5) Fix check_record_not_on_locked_day:
--      - Strict branch match instead of blocking all branches when branch_id is NULL.
--   6) Add explicit DELETE RLS policy on daily_reconciliations.
-- ==============================================================================

-- 1) Add credit_sales column if not exists
ALTER TABLE public.daily_reconciliations 
ADD COLUMN IF NOT EXISTS credit_sales numeric(19,4) NOT NULL DEFAULT 0;

-- 2) Function: get_daily_drawer_summary (Hardened & includes credit_sales)
CREATE OR REPLACE FUNCTION public.get_daily_drawer_summary(
    p_company_id uuid,
    p_date date,
    p_branch_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id uuid;
    v_opening_float numeric(19,4) := 0;
    v_total_sales numeric(19,4) := 0;
    v_cash_sales numeric(19,4) := 0;
    v_card_sales numeric(19,4) := 0;
    v_transfer_sales numeric(19,4) := 0;
    v_credit_sales numeric(19,4) := 0;
    v_returns_cash numeric(19,4) := 0;
    v_returns_card numeric(19,4) := 0;
    v_cash_receipts numeric(19,4) := 0;
    v_cash_disbursements numeric(19,4) := 0;
    v_card_receipts numeric(19,4) := 0;
    v_petty_expenses numeric(19,4) := 0;
    v_expected_cash numeric(19,4) := 0;
    v_expected_card numeric(19,4) := 0;
    v_employee_breakdown jsonb := '[]'::jsonb;
    v_existing_reconciliation jsonb := NULL;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'عذراً، يجب تسجيل الدخول أولاً' USING ERRCODE = '42501';
    END IF;

    -- التحقق من انتماء المستخدم للشركة
    PERFORM public.verify_company_access(p_company_id);

    -- 1) جلب العهدة الافتتاحية (رصيد فكة الأمس المرحل إن وُجد)
    -- FIX: توحيد الشرط مع باقي الاستعلامات — مطابقة دقيقة للفرع
    SELECT float_retained_for_tomorrow INTO v_opening_float
    FROM public.daily_reconciliations
    WHERE company_id = p_company_id
      AND (branch_id = p_branch_id OR (branch_id IS NULL AND p_branch_id IS NULL))
      AND reconciliation_date < p_date
    ORDER BY reconciliation_date DESC, shift_number DESC
    LIMIT 1;

    v_opening_float := COALESCE(v_opening_float, 0);

    -- 2) تجميع مبيعات اليوم حسب طريقة الدفع (استبعاد المسودات والملغاة)
    -- FIX: إضافة credit_sales لفرز المبيعات الآجلة ومنع الفجوة الحسابية
    SELECT
        COALESCE(SUM(CASE WHEN type = 'sale' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'sale' AND payment_method = 'cash' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'sale' AND payment_method IN ('card', 'network', 'mada') THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'sale' AND payment_method IN ('transfer', 'bank') THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'sale' AND payment_method = 'credit' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'sale_return' AND payment_method = 'cash' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'sale_return' AND payment_method IN ('card', 'network', 'mada') THEN total_amount ELSE 0 END), 0)
    INTO
        v_total_sales,
        v_cash_sales,
        v_card_sales,
        v_transfer_sales,
        v_credit_sales,
        v_returns_cash,
        v_returns_card
    FROM public.invoices
    WHERE company_id = p_company_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND issue_date = p_date
      AND status NOT IN ('draft', 'cancelled', 'void')
      AND deleted_at IS NULL;

    -- 3) تجميع المقبوضات والمدفوعات من السندات (Payments/Bonds)
    SELECT
        COALESCE(SUM(CASE WHEN type = 'receipt' AND payment_method = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type IN ('payment', 'disbursement') AND payment_method = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'receipt' AND payment_method IN ('card', 'network', 'mada') THEN amount ELSE 0 END), 0)
    INTO
        v_cash_receipts,
        v_cash_disbursements,
        v_card_receipts
    FROM public.payments
    WHERE company_id = p_company_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND payment_date = p_date
      AND status NOT IN ('draft', 'void', 'cancelled')
      AND deleted_at IS NULL;

    -- 4) تجميع المصروفات النثرية المدفوعة نقداً من الدرج
    SELECT COALESCE(SUM(amount), 0)
    INTO v_petty_expenses
    FROM public.expenses
    WHERE company_id = p_company_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND expense_date = p_date
      AND payment_method = 'cash'
      AND status NOT IN ('draft', 'void', 'cancelled')
      AND deleted_at IS NULL;

    -- 5) حساب الكاش والشبكة المتوقعة بالدرج
    v_expected_cash := v_opening_float + v_cash_sales - v_returns_cash + v_cash_receipts - v_cash_disbursements - v_petty_expenses;
    v_expected_card := v_card_sales - v_returns_card + v_card_receipts;

    -- 6) تجميع مبيعات كل موظف على حدة
    SELECT jsonb_agg(emp_row) INTO v_employee_breakdown
    FROM (
        SELECT
            inv.created_by AS user_id,
            COALESCE(prof.full_name, 'موظف') AS employee_name,
            COUNT(inv.id) AS invoice_count,
            COALESCE(SUM(inv.total_amount), 0) AS total_sales,
            COALESCE(SUM(CASE WHEN inv.payment_method = 'cash' THEN inv.total_amount ELSE 0 END), 0) AS cash_sales,
            COALESCE(SUM(CASE WHEN inv.payment_method IN ('card', 'network', 'mada') THEN inv.total_amount ELSE 0 END), 0) AS card_sales,
            COALESCE(SUM(CASE WHEN inv.payment_method IN ('transfer', 'bank') THEN inv.total_amount ELSE 0 END), 0) AS transfer_sales
        FROM public.invoices inv
        LEFT JOIN public.user_profiles prof ON prof.id = inv.created_by
        WHERE inv.company_id = p_company_id
          AND (p_branch_id IS NULL OR inv.branch_id = p_branch_id)
          AND inv.issue_date = p_date
          AND inv.type = 'sale'
          AND inv.status NOT IN ('draft', 'cancelled', 'void')
          AND inv.deleted_at IS NULL
        GROUP BY inv.created_by, prof.full_name
        ORDER BY total_sales DESC
    ) emp_row;

    v_employee_breakdown := COALESCE(v_employee_breakdown, '[]'::jsonb);

    -- 7) جلب الإقفال الحالي إن وجد
    SELECT row_to_json(r)::jsonb INTO v_existing_reconciliation
    FROM public.daily_reconciliations r
    WHERE company_id = p_company_id
      AND (branch_id = p_branch_id OR (branch_id IS NULL AND p_branch_id IS NULL))
      AND reconciliation_date = p_date
    ORDER BY shift_number DESC
    LIMIT 1;

    RETURN jsonb_build_object(
        'date', p_date,
        'opening_float', v_opening_float,
        'total_sales', v_total_sales,
        'cash_sales', v_cash_sales,
        'card_sales', v_card_sales,
        'transfer_sales', v_transfer_sales,
        'credit_sales', v_credit_sales,
        'returns_cash', v_returns_cash,
        'returns_card', v_returns_card,
        'cash_receipts', v_cash_receipts,
        'cash_disbursements', v_cash_disbursements,
        'petty_expenses_cash', v_petty_expenses,
        'expected_cash_in_drawer', v_expected_cash,
        'expected_card_terminal', v_expected_card,
        'employee_breakdown', v_employee_breakdown,
        'existing_reconciliation', v_existing_reconciliation,
        'is_already_closed', (v_existing_reconciliation IS NOT NULL AND (v_existing_reconciliation->>'status') = 'closed')
    );
END;
$$;

-- 3) Function: commit_daily_reconciliation (Hardened with assertOwner on locked day)
CREATE OR REPLACE FUNCTION public.commit_daily_reconciliation(
    p_company_id uuid,
    p_date date,
    p_branch_id uuid,
    p_opening_float numeric,
    p_actual_cash_counted numeric,
    p_cash_denominations jsonb,
    p_card_terminal_receipt_total numeric,
    p_float_retained_for_tomorrow numeric,
    p_cash_handed_to_owner numeric,
    p_variance_reason text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id uuid;
    v_user_role text;
    v_summary jsonb;
    v_expected_cash numeric(19,4);
    v_cash_variance numeric(19,4);
    v_expected_card numeric(19,4);
    v_card_variance numeric(19,4);
    v_reconciliation_id uuid;
    v_existing_locked boolean := false;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'عذراً، يجب تسجيل الدخول أولاً' USING ERRCODE = '42501';
    END IF;

    PERFORM public.verify_company_access(p_company_id);

    -- جلب دور المستخدم في المنشأة
    SELECT role INTO v_user_role
    FROM public.user_company_roles
    WHERE user_id = v_user_id AND company_id = p_company_id
    LIMIT 1;

    -- منع دور المشاهد (viewer) من إقفال اليومية
    IF v_user_role = 'viewer' THEN
        RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية لإقفال يومية الصندوق والمطابقة'
            USING ERRCODE = '42501';
    END IF;

    -- التحقق من وجود إقفال سابق لنفس اليوم والفرع
    SELECT id, is_locked INTO v_reconciliation_id, v_existing_locked
    FROM public.daily_reconciliations
    WHERE company_id = p_company_id
      AND (branch_id = p_branch_id OR (branch_id IS NULL AND p_branch_id IS NULL))
      AND reconciliation_date = p_date
      AND shift_number = 1
    LIMIT 1;

    -- FIX (حارس المالك الصارم): إذا كانت اليومية مقفلة مسبقاً، يُمنع تعديلها إلا من المالك
    IF v_reconciliation_id IS NOT NULL AND v_existing_locked = true THEN
        IF v_user_role <> 'owner' THEN
            RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية لتعديل إقفال يومية مقفلة بالفعل. هذا الإجراء مقتصر على المالك فقط'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- جلب ملخص اليوم لحساب الفروقات بدقة متزامنة
    v_summary := public.get_daily_drawer_summary(p_company_id, p_date, p_branch_id);

    v_expected_cash := COALESCE((v_summary->>'expected_cash_in_drawer')::numeric, 0);
    v_expected_card := COALESCE((v_summary->>'expected_card_terminal')::numeric, 0);

    v_cash_variance := p_actual_cash_counted - v_expected_cash;
    v_card_variance := p_card_terminal_receipt_total - v_expected_card;

    IF v_reconciliation_id IS NOT NULL THEN
        UPDATE public.daily_reconciliations SET
            opening_float = COALESCE(p_opening_float, 0),
            float_retained_for_tomorrow = COALESCE(p_float_retained_for_tomorrow, 0),
            cash_handed_to_owner = COALESCE(p_cash_handed_to_owner, 0),
            total_sales = COALESCE((v_summary->>'total_sales')::numeric, 0),
            cash_sales = COALESCE((v_summary->>'cash_sales')::numeric, 0),
            card_sales = COALESCE((v_summary->>'card_sales')::numeric, 0),
            transfer_sales = COALESCE((v_summary->>'transfer_sales')::numeric, 0),
            credit_sales = COALESCE((v_summary->>'credit_sales')::numeric, 0),
            returns_cash = COALESCE((v_summary->>'returns_cash')::numeric, 0),
            returns_card = COALESCE((v_summary->>'returns_card')::numeric, 0),
            cash_receipts = COALESCE((v_summary->>'cash_receipts')::numeric, 0),
            cash_disbursements = COALESCE((v_summary->>'cash_disbursements')::numeric, 0),
            petty_expenses_cash = COALESCE((v_summary->>'petty_expenses_cash')::numeric, 0),
            expected_cash_in_drawer = v_expected_cash,
            actual_cash_counted = p_actual_cash_counted,
            cash_denominations = COALESCE(p_cash_denominations, '{}'::jsonb),
            card_terminal_receipt_total = p_card_terminal_receipt_total,
            cash_variance = v_cash_variance,
            card_variance = v_card_variance,
            variance_reason = p_variance_reason,
            employee_breakdown = COALESCE(v_summary->'employee_breakdown', '[]'::jsonb),
            notes = p_notes,
            closed_by = v_user_id,
            closed_at = now(),
            is_locked = true,
            updated_at = now()
        WHERE id = v_reconciliation_id;
    ELSE
        INSERT INTO public.daily_reconciliations (
            company_id,
            branch_id,
            reconciliation_date,
            shift_number,
            status,
            opening_float,
            float_retained_for_tomorrow,
            cash_handed_to_owner,
            total_sales,
            cash_sales,
            card_sales,
            transfer_sales,
            credit_sales,
            returns_cash,
            returns_card,
            cash_receipts,
            cash_disbursements,
            petty_expenses_cash,
            expected_cash_in_drawer,
            actual_cash_counted,
            cash_denominations,
            card_terminal_receipt_total,
            cash_variance,
            card_variance,
            variance_reason,
            employee_breakdown,
            notes,
            closed_by,
            closed_at,
            is_locked
        ) VALUES (
            p_company_id,
            p_branch_id,
            p_date,
            1,
            'closed',
            COALESCE(p_opening_float, 0),
            COALESCE(p_float_retained_for_tomorrow, 0),
            COALESCE(p_cash_handed_to_owner, 0),
            COALESCE((v_summary->>'total_sales')::numeric, 0),
            COALESCE((v_summary->>'cash_sales')::numeric, 0),
            COALESCE((v_summary->>'card_sales')::numeric, 0),
            COALESCE((v_summary->>'transfer_sales')::numeric, 0),
            COALESCE((v_summary->>'credit_sales')::numeric, 0),
            COALESCE((v_summary->>'returns_cash')::numeric, 0),
            COALESCE((v_summary->>'returns_card')::numeric, 0),
            COALESCE((v_summary->>'cash_receipts')::numeric, 0),
            COALESCE((v_summary->>'cash_disbursements')::numeric, 0),
            COALESCE((v_summary->>'petty_expenses_cash')::numeric, 0),
            v_expected_cash,
            p_actual_cash_counted,
            COALESCE(p_cash_denominations, '{}'::jsonb),
            p_card_terminal_receipt_total,
            v_cash_variance,
            v_card_variance,
            p_variance_reason,
            COALESCE(v_summary->'employee_breakdown', '[]'::jsonb),
            p_notes,
            v_user_id,
            now(),
            true
        ) RETURNING id INTO v_reconciliation_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'reconciliation_id', v_reconciliation_id,
        'cash_variance', v_cash_variance,
        'card_variance', v_card_variance,
        'message', 'تم إقفال يومية المحل واعتماد المطابقة بنجاح'
    );
END;
$$;

-- 4) Function: record_quick_drawer_expense (Fixed branch condition & error message)
CREATE OR REPLACE FUNCTION public.record_quick_drawer_expense(
    p_company_id uuid,
    p_amount numeric,
    p_description text,
    p_branch_id uuid DEFAULT NULL::uuid,
    p_expense_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id uuid;
    v_category_id uuid;
    v_expense_id uuid;
    v_voucher_number text;
    v_actual_date date;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'عذراً، يجب تسجيل الدخول أولاً' USING ERRCODE = '42501';
    END IF;

    PERFORM public.verify_company_access(p_company_id);

    v_actual_date := COALESCE(p_expense_date, CURRENT_DATE);

    -- FIX: مطابقة دقيقة للفرع وتفادي حظر الفروع الأخرى
    IF EXISTS (
        SELECT 1 FROM public.daily_reconciliations
        WHERE company_id = p_company_id
          AND (branch_id = p_branch_id OR (branch_id IS NULL AND p_branch_id IS NULL))
          AND reconciliation_date = v_actual_date
          AND is_locked = true
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_company_roles
            WHERE user_id = v_user_id
              AND company_id = p_company_id
              AND role = 'owner'
        ) THEN
            RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية لإضافة مصروف ليوم تم إقفاله ومطابقته (تاريخ: %). هذا الإجراء مقتصر على المالك'
                , v_actual_date
                USING ERRCODE = '42501';
        END IF;
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'مبلغ المصروف يجب أن يكون أكبر من صفر';
    END IF;

    IF p_description IS NULL OR trim(p_description) = '' THEN
        RAISE EXCEPTION 'يرجى كتابة بيان المصروف';
    END IF;

    -- البحث عن تصنيف المصروفات النثرية أو العام
    SELECT id INTO v_category_id
    FROM public.expense_categories
    WHERE company_id = p_company_id AND deleted_at IS NULL
    ORDER BY (CASE WHEN name LIKE '%نثر%' OR name LIKE '%نثريات%' THEN 0 ELSE 1 END), created_at ASC
    LIMIT 1;

    -- إذا لم يوجد تصنيف، ننشئ تصنيفاً افتراضياً للنثريات
    IF v_category_id IS NULL THEN
        INSERT INTO public.expense_categories (company_id, name, description)
        VALUES (p_company_id, 'نثريات ومصروفات الدرج', 'المصروفات النثرية اليومية السريعة من الدرج')
        RETURNING id INTO v_category_id;
    END IF;

    -- توليد رقم إيصال المصروف
    v_voucher_number := 'EXP-' || to_char(now(), 'YYYYMMDD') || '-' || substring(gen_random_uuid()::text, 1, 4);

    -- تسجيل المصروف
    INSERT INTO public.expenses (
        company_id,
        branch_id,
        category_id,
        voucher_number,
        description,
        amount,
        currency_code,
        exchange_rate,
        expense_date,
        status,
        payment_method,
        created_by
    ) VALUES (
        p_company_id,
        p_branch_id,
        v_category_id,
        v_voucher_number,
        trim(p_description),
        p_amount,
        'SAR',
        1,
        v_actual_date,
        'posted',
        'cash',
        v_user_id
    )
    RETURNING id INTO v_expense_id;

    RETURN jsonb_build_object(
        'success', true,
        'expense_id', v_expense_id,
        'amount', p_amount,
        'voucher_number', v_voucher_number,
        'description', trim(p_description),
        'expense_date', v_actual_date,
        'message', 'تم تسجيل مصروف الدرج بنجاح'
    );
END;
$$;

-- 5) Trigger Function: check_record_not_on_locked_day (Accurate branch matching & standard error prefix)
CREATE OR REPLACE FUNCTION public.check_record_not_on_locked_day()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_company_id uuid;
    v_branch_id uuid;
    v_target_date date;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_company_id := OLD.company_id;
        v_branch_id := OLD.branch_id;
        IF TG_TABLE_NAME = 'invoices' THEN
            v_target_date := OLD.issue_date;
        ELSIF TG_TABLE_NAME = 'expenses' THEN
            v_target_date := OLD.expense_date;
        ELSIF TG_TABLE_NAME = 'payments' THEN
            v_target_date := OLD.payment_date;
        END IF;
    ELSE
        v_company_id := NEW.company_id;
        v_branch_id := NEW.branch_id;
        IF TG_TABLE_NAME = 'invoices' THEN
            v_target_date := NEW.issue_date;
        ELSIF TG_TABLE_NAME = 'expenses' THEN
            v_target_date := NEW.expense_date;
        ELSIF TG_TABLE_NAME = 'payments' THEN
            v_target_date := NEW.payment_date;
        END IF;
    END IF;

    -- FIX: التحقق الدقيق — مطابقة الفرع بدقة بدلاً من حظر جميع الفروع عند NULL
    IF EXISTS (
        SELECT 1 FROM public.daily_reconciliations
        WHERE company_id = v_company_id
          AND (branch_id = v_branch_id OR (branch_id IS NULL AND v_branch_id IS NULL))
          AND reconciliation_date = v_target_date
          AND is_locked = true
    ) THEN
        -- السماح للمالك فقط
        IF NOT EXISTS (
            SELECT 1 FROM public.user_company_roles
            WHERE user_id = auth.uid()
              AND company_id = v_company_id
              AND role = 'owner'
        ) THEN
            RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية لإجراء عمليات (%) على % ليوم تم إقفاله ومطابقته (تاريخ: %). يتطلب إذن المالك.'
                , TG_OP, TG_TABLE_NAME, v_target_date
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- في حال تحديث سجل وتغيير التاريخ من يوم كان مقفلاً
    IF TG_OP = 'UPDATE' THEN
        DECLARE
            v_old_date date;
        BEGIN
            IF TG_TABLE_NAME = 'invoices' THEN
                v_old_date := OLD.issue_date;
            ELSIF TG_TABLE_NAME = 'expenses' THEN
                v_old_date := OLD.expense_date;
            ELSIF TG_TABLE_NAME = 'payments' THEN
                v_old_date := OLD.payment_date;
            END IF;

            IF v_old_date IS NOT NULL AND v_old_date <> v_target_date THEN
                IF EXISTS (
                    SELECT 1 FROM public.daily_reconciliations
                    WHERE company_id = OLD.company_id
                      AND (branch_id = OLD.branch_id OR (branch_id IS NULL AND OLD.branch_id IS NULL))
                      AND reconciliation_date = v_old_date
                      AND is_locked = true
                ) THEN
                    IF NOT EXISTS (
                        SELECT 1 FROM public.user_company_roles
                        WHERE user_id = auth.uid()
                          AND company_id = OLD.company_id
                          AND role = 'owner'
                    ) THEN
                        RAISE EXCEPTION 'عذراً، لا تمتلك صلاحية لنقل أو تعديل سجل كان يتبع يوماً مقفلاً (تاريخ: %). يتطلب إذن المالك.'
                            , v_old_date
                            USING ERRCODE = '42501';
                    END IF;
                END IF;
            END IF;
        END;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 6) Add explicit DELETE policy on daily_reconciliations (deny all direct deletes)
DROP POLICY IF EXISTS "Nobody can delete reconciliations directly" ON public.daily_reconciliations;
CREATE POLICY "Nobody can delete reconciliations directly"
    ON public.daily_reconciliations FOR DELETE
    USING (FALSE);

-- Re-grant execute on updated functions
REVOKE EXECUTE ON FUNCTION public.get_daily_drawer_summary(uuid, date, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_drawer_summary(uuid, date, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.commit_daily_reconciliation(uuid, date, uuid, numeric, numeric, jsonb, numeric, numeric, numeric, text, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_daily_reconciliation(uuid, date, uuid, numeric, numeric, jsonb, numeric, numeric, numeric, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.record_quick_drawer_expense(uuid, numeric, text, uuid, date) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_quick_drawer_expense(uuid, numeric, text, uuid, date) TO authenticated, service_role;
