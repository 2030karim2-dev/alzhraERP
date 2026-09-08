-- Migration: Fix Purchase Analytics Currency Normalization
-- Description:
--   1. Fix get_purchase_stats so totalPurchases and chartData convert foreign
--      currencies to base currency (SAR) using supported_currencies.exchange_operator.
--   2. Fix topSuppliers to rank ALL suppliers by purchase volume (not just
--      those with outstanding credit debt), using correct base-currency amounts.
--   3. chartData now aggregates base-currency amounts per day.
-- Note: The existing function only summed raw total_amount without normalizing
--   foreign currencies (YER, USD, etc.), producing inflated/fictional totals.

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

      -- عدد الفواتير (لا يتأثر بالعملة)
      'invoiceCount',
        (SELECT COUNT(*)
         FROM public.invoices
         WHERE company_id = vc
           AND type = 'purchase'
           AND status != 'void'
           AND deleted_at IS NULL
           AND (p_branch_id IS NULL OR branch_id = p_branch_id)),

      -- إجمالي المشتريات بالعملة الأساسية (تحويل بسعر الصرف الصحيح)
      'totalPurchases',
        COALESCE((
          SELECT SUM(
            CASE
              WHEN i.currency_code IS NULL OR i.currency_code = 'SAR'
                THEN i.total_amount
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0
                THEN ROUND(i.total_amount / i.exchange_rate, 4)
              ELSE
                ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 4)
            END
          )
          FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc
            AND i.type = 'purchase'
            AND i.status IN ('posted', 'paid', 'partially_paid')
            AND i.deleted_at IS NULL
            AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
        ), 0),

      -- عدد الفواتير ذات الرصيد المتبقي (آجل فقط)
      'pendingPaymentCount',
        (SELECT COUNT(*)
         FROM public.invoices
         WHERE company_id = vc
           AND type = 'purchase'
           AND (total_amount - COALESCE(paid_amount, 0)) > 0
           AND status NOT IN ('void', 'draft')
           AND COALESCE(payment_method, 'credit') = 'credit'
           AND deleted_at IS NULL
           AND (p_branch_id IS NULL OR branch_id = p_branch_id)),

      -- إجمالي الدين المتبقي بالعملة الأساسية (آجل فقط، مع تحويل العملة)
      'totalDebt',
        COALESCE((
          SELECT SUM(
            CASE
              WHEN i.currency_code IS NULL OR i.currency_code = 'SAR'
                THEN (i.total_amount - COALESCE(i.paid_amount, 0))
              WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0
                THEN ROUND((i.total_amount - COALESCE(i.paid_amount, 0)) / i.exchange_rate, 4)
              ELSE
                ROUND((i.total_amount - COALESCE(i.paid_amount, 0)) * COALESCE(i.exchange_rate, 1), 4)
            END
          )
          FROM public.invoices i
          LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
          WHERE i.company_id = vc
            AND i.type = 'purchase'
            AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
            AND i.status NOT IN ('void', 'draft')
            AND COALESCE(i.payment_method, 'credit') = 'credit'
            AND i.deleted_at IS NULL
            AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
        ), 0),

      -- أفضل الموردين حسب إجمالي المشتريات (جميع طرق الدفع، مع تحويل العملة)
      'topSuppliers',
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object('name', COALESCE(p.name, 'غير محدد'), 'value', s.total_base)
          )
          FROM (
            SELECT
              i.party_id,
              SUM(
                CASE
                  WHEN i.currency_code IS NULL OR i.currency_code = 'SAR'
                    THEN i.total_amount
                  WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0
                    THEN ROUND(i.total_amount / i.exchange_rate, 4)
                  ELSE
                    ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 4)
                END
              ) AS total_base
            FROM public.invoices i
            LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
            WHERE i.company_id = vc
              AND i.type = 'purchase'
              AND i.status IN ('posted', 'paid', 'partially_paid')
              AND i.deleted_at IS NULL
              AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
            GROUP BY i.party_id
            ORDER BY total_base DESC
            LIMIT 5
          ) s
          LEFT JOIN public.parties p ON p.id = s.party_id AND p.deleted_at IS NULL
        ), '[]'::jsonb),

      -- بيانات الرسم البياني اليومي (بالعملة الأساسية)
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
                  WHEN i.currency_code IS NULL OR i.currency_code = 'SAR'
                    THEN i.total_amount
                  WHEN sc.exchange_operator = 'divide' AND i.exchange_rate > 0
                    THEN ROUND(i.total_amount / i.exchange_rate, 4)
                  ELSE
                    ROUND(i.total_amount * COALESCE(i.exchange_rate, 1), 4)
                END
              ) AS total
            FROM public.invoices i
            LEFT JOIN public.supported_currencies sc ON sc.code = i.currency_code
            WHERE i.company_id = vc
              AND i.type = 'purchase'
              AND i.status IN ('posted', 'paid', 'partially_paid')
              AND i.deleted_at IS NULL
              AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
            GROUP BY 1
          ) d
        ), '[]'::jsonb)

    )
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_purchase_stats(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_purchase_stats(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_purchase_stats(uuid, uuid) FROM PUBLIC;
