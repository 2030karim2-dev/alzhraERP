-- Migration: 20260908000014_deep_audit_fixes.sql
-- إصلاحات التدقيق العميق للتحديثات الأخيرة
-- 1. CRITICAL: get_sales_chart_data — إضافة verify_company_access (ثغرة أمنية متعددة المستأجرين)
-- 2. HIGH: استبدال 'partial' الوهمية بـ 'confirmed' الصحيحة في جميع الدوال
-- 3. MEDIUM: get_purchase_stats — تناسق invoiceCount مع statusFilter + إصلاح ترتيب topSuppliers

-- ============================================================
-- 1+2: إصلاح get_sales_chart_data (أمان + حالات الفواتير)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_sales_chart_data(
  p_company_id uuid,
  p_branch_id uuid DEFAULT NULL::uuid,
  p_date_from date DEFAULT NULL::date,
  p_date_to date DEFAULT NULL::date
)
RETURNS TABLE(
  name text,
  date date,
  value numeric,
  sales numeric,
  purchases numeric,
  expenses numeric,
  profit numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  vc uuid;
  v_from date := COALESCE(p_date_from, (CURRENT_DATE - INTERVAL '30 days'));
  v_to date := COALESCE(p_date_to, CURRENT_DATE);
  v_day date;
  v_sales numeric;
  v_purchases numeric;
  v_expenses numeric;
BEGIN
  -- CRITICAL FIX: التحقق من الصلاحية قبل أي استعلام (كان مفقوداً!)
  vc := public.verify_company_access(p_company_id);

  v_day := v_from;
  WHILE v_day <= v_to LOOP
    name := to_char(v_day, 'YYYY-MM-DD');
    date := v_day;

    SELECT
      COALESCE(SUM(CASE
        WHEN i.type = 'sale' THEN i.amount
        WHEN i.type IN ('sale_return', 'return_sale') THEN -i.amount
        ELSE 0 END), 0),
      COALESCE(SUM(CASE
        WHEN i.type = 'purchase' THEN i.amount
        WHEN i.type IN ('purchase_return', 'return_purchase') THEN -i.amount
        ELSE 0 END), 0)
    INTO v_sales, v_purchases
    FROM (
      SELECT
        i.type,
        CASE
          WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
          WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN ROUND(i.total_amount / i.exchange_rate, 2)
          ELSE ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 2)
        END AS amount
      FROM public.invoices i
      LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
      WHERE i.company_id = vc
        -- FIX: أزلنا 'partial' الوهمية وأضفنا 'confirmed' الصحيحة
        AND i.status IN ('posted', 'confirmed', 'paid', 'partially_paid')
        AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
        AND i.issue_date = v_day
        AND i.deleted_at IS NULL
    ) i;

    SELECT COALESCE(SUM(
      CASE
        WHEN e.currency_code = 'SAR' OR e.currency_code IS NULL OR sc.is_base THEN e.amount
        WHEN sc.exchange_operator = 'divide' AND e.exchange_rate > 0 THEN ROUND(e.amount / e.exchange_rate, 2)
        ELSE ROUND(e.amount * COALESCE(e.exchange_rate, 1), 2)
      END
    ), 0)
    INTO v_expenses
    FROM public.expenses e
    LEFT JOIN public.supported_currencies sc ON sc.code = e.currency_code
    WHERE e.company_id = vc
      AND e.status IN ('posted', 'paid')
      AND (p_branch_id IS NULL OR e.branch_id = p_branch_id)
      AND e.expense_date = v_day
      AND e.deleted_at IS NULL;

    value := v_sales;
    sales := v_sales;
    purchases := GREATEST(v_purchases, 0);
    expenses := GREATEST(v_expenses, 0);
    profit := v_sales - v_purchases - v_expenses;

    RETURN NEXT;
    v_day := v_day + INTERVAL '1 day';
  END LOOP;
END;
$function$;

-- ============================================================
-- 2: إصلاح get_dashboard_summary (حالة 'partial' الوهمية + 'confirmed')
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
    p_company_id uuid,
    p_branch_id uuid DEFAULT NULL::uuid,
    p_date_from date DEFAULT NULL::date,
    p_date_to date DEFAULT NULL::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    vc uuid;
    v_effective_branch uuid;
    v_is_admin boolean;
    v_opening_cust_debts NUMERIC;
    v_opening_supp_debts NUMERIC;
BEGIN
    vc := public.verify_company_access(p_company_id);
    v_is_admin := public.is_main_branch_or_admin(vc);

    IF v_is_admin THEN
        v_effective_branch := p_branch_id;
    ELSE
        v_effective_branch := public.get_user_branch_id(vc);
    END IF;

    SELECT COALESCE(SUM(
        CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END
        * COALESCE((SELECT er.rate_to_base FROM public.exchange_rates er
            WHERE er.company_id = vc AND er.currency_code = ob.currency_code
            ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1), 1)
    ), 0) INTO v_opening_cust_debts
    FROM public.party_opening_balances ob
    JOIN public.parties p ON p.id = ob.party_id AND p.type = 'customer' AND p.deleted_at IS NULL
    WHERE ob.company_id = vc
      AND (v_effective_branch IS NULL OR ob.branch_id = v_effective_branch OR p.branch_id = v_effective_branch);

    SELECT COALESCE(SUM(
        CASE WHEN ob.direction = 'credit' THEN ob.amount ELSE -ob.amount END
        * COALESCE((SELECT er.rate_to_base FROM public.exchange_rates er
            WHERE er.company_id = vc AND er.currency_code = ob.currency_code
            ORDER BY er.effective_date DESC, er.created_at DESC LIMIT 1), 1)
    ), 0) INTO v_opening_supp_debts
    FROM public.party_opening_balances ob
    JOIN public.parties p ON p.id = ob.party_id AND p.type = 'supplier' AND p.deleted_at IS NULL
    WHERE ob.company_id = vc
      AND (v_effective_branch IS NULL OR ob.branch_id = v_effective_branch OR p.branch_id = v_effective_branch);

    RETURN (SELECT jsonb_build_object(
        'total_sales', COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
              ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
            END
          ), 2) FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc AND i.type = 'sale'
            -- FIX: 'partial' وهمية → استبدلت بـ 'confirmed' الصحيحة
            AND i.status IN ('posted', 'confirmed', 'paid', 'partially_paid')
            AND i.deleted_at IS NULL
            AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
            AND (p_date_to IS NULL OR i.issue_date <= p_date_to)
            AND (v_effective_branch IS NULL OR i.branch_id = v_effective_branch)), 0),
        'total_purchases', COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN i.total_amount
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN i.total_amount / i.exchange_rate
              ELSE i.total_amount * COALESCE(i.exchange_rate, 1)
            END
          ), 2) FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc AND i.type = 'purchase'
            AND i.status IN ('posted', 'confirmed', 'paid', 'partially_paid')
            AND i.deleted_at IS NULL
            AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
            AND (p_date_to IS NULL OR i.issue_date <= p_date_to)
            AND (v_effective_branch IS NULL OR i.branch_id = v_effective_branch)), 0),
        'total_expenses', COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN e.currency_code = 'SAR' OR e.currency_code IS NULL OR sc.is_base THEN e.amount
              WHEN sc.exchange_operator = 'divide' AND e.exchange_rate > 0 THEN e.amount / e.exchange_rate
              ELSE e.amount * COALESCE(e.exchange_rate, 1)
            END
          ), 2) FROM public.expenses e
          LEFT JOIN public.supported_currencies sc ON sc.code = e.currency_code
          WHERE e.company_id = vc AND e.status IN ('posted','paid') AND e.deleted_at IS NULL
            AND (p_date_from IS NULL OR e.expense_date >= p_date_from)
            AND (p_date_to IS NULL OR e.expense_date <= p_date_to)
            AND (v_effective_branch IS NULL OR e.branch_id = v_effective_branch)), 0),
        'receipt_bonds', COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN p.currency_code = 'SAR' OR p.currency_code IS NULL OR sc.is_base THEN p.amount
              WHEN sc.exchange_operator = 'divide' AND p.exchange_rate > 0 THEN p.amount / p.exchange_rate
              ELSE p.amount * COALESCE(p.exchange_rate, 1)
            END
          ), 2) FROM public.payments p
          LEFT JOIN public.supported_currencies sc ON sc.code = p.currency_code
          WHERE p.company_id = vc AND p.type = 'receipt' AND p.status = 'posted' AND p.deleted_at IS NULL
            AND (p_date_from IS NULL OR p.payment_date >= p_date_from)
            AND (p_date_to IS NULL OR p.payment_date <= p_date_to)
            AND (v_effective_branch IS NULL OR p.branch_id = v_effective_branch)), 0),
        'payment_bonds', COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN p.currency_code = 'SAR' OR p.currency_code IS NULL OR sc.is_base THEN p.amount
              WHEN sc.exchange_operator = 'divide' AND p.exchange_rate > 0 THEN p.amount / p.exchange_rate
              ELSE p.amount * COALESCE(p.exchange_rate, 1)
            END
          ), 2) FROM public.payments p
          LEFT JOIN public.supported_currencies sc ON sc.code = p.currency_code
          WHERE p.company_id = vc AND p.type = 'disbursement' AND p.status = 'posted' AND p.deleted_at IS NULL
            AND (p_date_from IS NULL OR p.payment_date >= p_date_from)
            AND (p_date_to IS NULL OR p.payment_date <= p_date_to)
            AND (v_effective_branch IS NULL OR p.branch_id = v_effective_branch)), 0),
        'total_debts', (COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN (i.total_amount - COALESCE(i.paid_amount, 0))
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN (i.total_amount - COALESCE(i.paid_amount, 0)) / i.exchange_rate
              ELSE (i.total_amount - COALESCE(i.paid_amount, 0)) * COALESCE(i.exchange_rate, 1)
            END
          ), 2)
          FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc AND i.type = 'sale'
            AND i.status IN ('posted', 'confirmed', 'partially_paid')
            AND i.deleted_at IS NULL
            AND (v_effective_branch IS NULL OR i.branch_id = v_effective_branch)
            AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0) + v_opening_cust_debts),
        'total_supplier_debts', (COALESCE((SELECT ROUND(SUM(
            CASE
              WHEN i.currency_code = 'SAR' OR i.currency_code IS NULL OR sc.is_base THEN (i.total_amount - COALESCE(i.paid_amount, 0))
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN (i.total_amount - COALESCE(i.paid_amount, 0)) / i.exchange_rate
              ELSE (i.total_amount - COALESCE(i.paid_amount, 0)) * COALESCE(i.exchange_rate, 1)
            END
          ), 2)
          FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc AND i.type = 'purchase'
            AND i.status IN ('posted', 'confirmed', 'partially_paid')
            AND i.deleted_at IS NULL
            AND (v_effective_branch IS NULL OR i.branch_id = v_effective_branch)
            AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0) + v_opening_supp_debts),
        'invoice_count', (SELECT COUNT(*) FROM public.invoices
            WHERE company_id = vc AND type = 'sale'
              AND status NOT IN ('draft','void','cancelled')
              AND deleted_at IS NULL
              AND (p_date_from IS NULL OR issue_date >= p_date_from)
              AND (p_date_to IS NULL OR issue_date <= p_date_to)
              AND (v_effective_branch IS NULL OR branch_id = v_effective_branch))
    ));
END;
$function$;

-- ============================================================
-- 3: إصلاح get_purchase_stats (invoiceCount + ترتيب topSuppliers)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_purchase_stats(
  p_company_id uuid,
  p_branch_id  uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  vc uuid;
BEGIN
  vc := public.verify_company_access(p_company_id);

  RETURN (
    SELECT jsonb_build_object(

      -- FIX: invoiceCount يستخدم نفس شرط الحالة مثل totalPurchases للتناسق
      'invoiceCount',
        (SELECT COUNT(*)
         FROM public.invoices
         WHERE company_id = vc
           AND type = 'purchase'
           AND status IN ('posted', 'confirmed', 'paid', 'partially_paid')
           AND deleted_at IS NULL
           AND (p_branch_id IS NULL OR branch_id = p_branch_id)),

      'totalPurchases',
        COALESCE((
          SELECT SUM(
            CASE
              WHEN i.currency_code IS NULL OR i.currency_code = 'SAR' THEN i.total_amount
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN ROUND(i.total_amount / i.exchange_rate, 4)
              ELSE ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 4)
            END
          )
          FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc
            AND i.type = 'purchase'
            AND i.status IN ('posted', 'confirmed', 'paid', 'partially_paid')
            AND i.deleted_at IS NULL
            AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
        ), 0),

      'pendingPaymentCount',
        (SELECT COUNT(*)
         FROM public.invoices
         WHERE company_id = vc
           AND type = 'purchase'
           AND (total_amount - COALESCE(paid_amount, 0)) > 0
           AND status NOT IN ('void', 'draft', 'cancelled')
           AND COALESCE(payment_method, 'credit') = 'credit'
           AND deleted_at IS NULL
           AND (p_branch_id IS NULL OR branch_id = p_branch_id)),

      'totalDebt',
        COALESCE((
          SELECT SUM(
            CASE
              WHEN i.currency_code IS NULL OR i.currency_code = 'SAR' THEN (i.total_amount - COALESCE(i.paid_amount, 0))
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN ROUND((i.total_amount - COALESCE(i.paid_amount, 0)) / i.exchange_rate, 4)
              ELSE ROUND((i.total_amount - COALESCE(i.paid_amount, 0)) * COALESCE(i.exchange_rate, 1), 4)
            END
          )
          FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc
            AND i.type = 'purchase'
            AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
            AND i.status NOT IN ('void', 'draft', 'cancelled')
            AND COALESCE(i.payment_method, 'credit') = 'credit'
            AND i.deleted_at IS NULL
            AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
        ), 0),

      -- FIX: ORDER BY داخل jsonb_agg لضمان الترتيب
      'topSuppliers',
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object('name', COALESCE(p.name, 'غير محدد'), 'value', s.total_base)
            ORDER BY s.total_base DESC
          )
          FROM (
            SELECT
              i.party_id,
              SUM(
                CASE
                  WHEN i.currency_code IS NULL OR i.currency_code = 'SAR' THEN i.total_amount
                  WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN ROUND(i.total_amount / i.exchange_rate, 4)
                  ELSE ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 4)
                END
              ) AS total_base
            FROM public.invoices i
            LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
            WHERE i.company_id = vc
              AND i.type = 'purchase'
              AND i.status IN ('posted', 'confirmed', 'paid', 'partially_paid')
              AND i.deleted_at IS NULL
              AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
            GROUP BY i.party_id
            ORDER BY total_base DESC
            LIMIT 5
          ) s
          LEFT JOIN public.parties p ON p.id = s.party_id AND p.deleted_at IS NULL
        ), '[]'::jsonb),

      'chartData',
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object('date', d.day, 'amount', d.total)
            ORDER BY d.day
          )
          FROM (
            SELECT
              to_char(i.issue_date, 'YYYY-MM-DD') AS day,
              SUM(
                CASE
                  WHEN i.currency_code IS NULL OR i.currency_code = 'SAR' THEN i.total_amount
                  WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0 THEN ROUND(i.total_amount / i.exchange_rate, 4)
                  ELSE ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 4)
                END
              ) AS total
            FROM public.invoices i
            LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
            WHERE i.company_id = vc
              AND i.type = 'purchase'
              AND i.status IN ('posted', 'confirmed', 'paid', 'partially_paid')
              AND i.deleted_at IS NULL
              AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
            GROUP BY 1
          ) d
        ), '[]'::jsonb)

    )
  );
END;
$function$;

-- ============================================================
-- Privileges
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_sales_chart_data(uuid, uuid, date, date) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_sales_chart_data(uuid, uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_sales_chart_data(uuid, uuid, date, date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_purchase_stats(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_purchase_stats(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_purchase_stats(uuid, uuid) FROM PUBLIC;
