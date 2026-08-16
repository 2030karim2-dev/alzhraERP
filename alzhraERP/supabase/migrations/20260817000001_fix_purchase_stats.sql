-- ============================================================
-- Migration: Fix get_purchase_stats (debt, branch filter, analytics)
-- Date: 2026-08-17
--
-- Bugs fixed:
--   1. totalDebt summed total_amount for status IN ('pending','partially_paid')
--      WITHOUT subtracting paid_amount AND excluding 'posted' — but the
--      purchase UI saves invoices as 'posted', so debt was ~always 0 and
--      partially-paid invoices were over-counted.
--      Now: totalDebt = SUM(total_amount - COALESCE(paid_amount,0))
--           WHERE balance > 0 AND status NOT IN ('void','draft').
--   2. pendingPaymentCount counted status='pending' only (never used by the
--      purchase flow) — now it counts the same unpaid set as totalDebt.
--   3. p_branch_id was accepted but never applied — stats ignored the
--      active branch filter. Every sub-query now honors it.
--   4. topSuppliers / chartData (consumed by PurchasesAnalytics) were never
--      returned -> the analytics page was always empty.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_purchase_stats(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_purchase_stats(p_company_id uuid, p_branch_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE vc uuid;
BEGIN
  vc := public.verify_company_access(p_company_id);
  RETURN (SELECT jsonb_build_object(
    'invoiceCount',
      (SELECT COUNT(*) FROM public.invoices
       WHERE company_id = vc AND type = 'purchase' AND status != 'void' AND deleted_at IS NULL
         AND (p_branch_id IS NULL OR branch_id = p_branch_id)),
    'totalPurchases',
      COALESCE((SELECT SUM(total_amount) FROM public.invoices
       WHERE company_id = vc AND type = 'purchase' AND status IN ('posted','paid','partially_paid') AND deleted_at IS NULL
         AND (p_branch_id IS NULL OR branch_id = p_branch_id)), 0),
    'pendingPaymentCount',
      (SELECT COUNT(*) FROM public.invoices
       WHERE company_id = vc AND type = 'purchase'
         AND (total_amount - COALESCE(paid_amount,0)) > 0
         AND status NOT IN ('void','draft')
         AND deleted_at IS NULL
         AND (p_branch_id IS NULL OR branch_id = p_branch_id)),
    'totalDebt',
      COALESCE((SELECT SUM(total_amount - COALESCE(paid_amount,0)) FROM public.invoices
       WHERE company_id = vc AND type = 'purchase'
         AND (total_amount - COALESCE(paid_amount,0)) > 0
         AND status NOT IN ('void','draft')
         AND deleted_at IS NULL
         AND (p_branch_id IS NULL OR branch_id = p_branch_id)), 0),
    'topSuppliers',
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('name', COALESCE(p.name, 'غير محدد'), 'value', s.total))
        FROM (
          SELECT i.party_id, SUM(i.total_amount - COALESCE(i.paid_amount,0)) AS total
          FROM public.invoices i
          WHERE i.company_id = vc AND i.type = 'purchase'
            AND (i.total_amount - COALESCE(i.paid_amount,0)) > 0
            AND i.status NOT IN ('void','draft')
            AND i.deleted_at IS NULL
            AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
          GROUP BY i.party_id
          ORDER BY total DESC
          LIMIT 5
        ) s
        LEFT JOIN public.parties p ON p.id = s.party_id AND p.deleted_at IS NULL
      ), '[]'::jsonb),
    'chartData',
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('date', d.day, 'amount', d.total) ORDER BY d.day)
        FROM (
          SELECT to_char(issue_date, 'YYYY-MM-DD') AS day, SUM(total_amount) AS total
          FROM public.invoices
          WHERE company_id = vc AND type = 'purchase'
            AND status IN ('posted','paid','partially_paid')
            AND deleted_at IS NULL
            AND (p_branch_id IS NULL OR branch_id = p_branch_id)
          GROUP BY 1
        ) d
      ), '[]'::jsonb)
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_purchase_stats(uuid, uuid) TO authenticated;
