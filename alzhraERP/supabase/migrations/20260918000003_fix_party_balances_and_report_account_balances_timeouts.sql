-- Migration: 20260918000003_fix_party_balances_and_report_account_balances_timeouts.sql
-- Description:
-- 1. Fix covering index on journal_entries to accelerate status='posted' lookups.
-- 2. Optimize party_balances view with security_invoker = false and efficient index-only lookups.
-- 3. Optimize party_balances_by_currency view with security_invoker = false and count(*) aggregation.
-- 4. Provide fast RPC get_party_balances_by_company(p_company_id).
-- 5. Optimize report_account_balances RPC by splitting branch condition and adding company index filter.
-- 6. Optimize search_inventory_paginated RPC with fast path for empty search term.

-- 1) Covering index for posted journal entries
DROP INDEX IF EXISTS public.idx_je_comp_status_id;

CREATE INDEX idx_je_comp_status_id 
ON public.journal_entries (company_id, status, id) 
INCLUDE (entry_date)
WHERE (deleted_at IS NULL);

-- 2) High-performance party_balances view
CREATE OR REPLACE VIEW public.party_balances AS
WITH journal_bals AS (
  SELECT 
    jel.party_id,
    jel.company_id,
    SUM(
      CASE
        WHEN a.code LIKE '1100%' THEN jel.debit_amount - jel.credit_amount
        WHEN a.code LIKE '2100%' THEN jel.credit_amount - jel.debit_amount
        ELSE jel.debit_amount - jel.credit_amount
      END
    )::numeric(14,2) AS journal_balance
  FROM public.journal_entry_lines jel
  JOIN public.accounts a ON a.id = jel.account_id AND a.company_id = jel.company_id
  WHERE jel.deleted_at IS NULL
    AND jel.party_id IS NOT NULL
    AND (a.code LIKE '1100%' OR a.code LIKE '2100%')
    AND EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = jel.journal_entry_id
        AND je.company_id = jel.company_id
        AND je.status = 'posted'
        AND je.deleted_at IS NULL
    )
  GROUP BY jel.party_id, jel.company_id
),
latest_rates AS (
  SELECT DISTINCT ON (company_id, currency_code) 
    company_id, currency_code, rate_to_base
  FROM public.exchange_rates
  ORDER BY company_id, currency_code, effective_date DESC, created_at DESC
),
opening_bals AS (
  SELECT 
    ob.party_id,
    ob.company_id,
    SUM(
      CASE
        WHEN ob.currency_code = 'SAR' OR ob.currency_code IS NULL OR sc.is_base THEN ob.amount
        WHEN sc.exchange_operator = 'divide' AND COALESCE(lr.rate_to_base, 1) > 0 THEN ob.amount / lr.rate_to_base
        ELSE ob.amount * COALESCE(lr.rate_to_base, 1)
      END *
      CASE
        WHEN p.type = 'supplier' THEN
          CASE WHEN ob.direction = 'credit' THEN 1 ELSE -1 END
        ELSE
          CASE WHEN ob.direction = 'debit' THEN 1 ELSE -1 END
      END::numeric
    )::numeric(14,2) AS opening_balance
  FROM public.party_opening_balances ob
  JOIN public.parties p ON p.id = ob.party_id AND p.company_id = ob.company_id
  LEFT JOIN latest_rates lr ON lr.company_id = ob.company_id AND lr.currency_code = ob.currency_code
  LEFT JOIN public.supported_currencies sc ON sc.code = ob.currency_code
  GROUP BY ob.party_id, ob.company_id
)
SELECT 
  p.id AS party_id,
  p.company_id,
  p.type,
  (COALESCE(jb.journal_balance, 0) + COALESCE(ob.opening_balance, 0))::numeric(14,2) AS balance
FROM public.parties p
LEFT JOIN journal_bals jb ON jb.party_id = p.id AND jb.company_id = p.company_id
LEFT JOIN opening_bals ob ON ob.party_id = p.id AND ob.company_id = p.company_id
WHERE p.deleted_at IS NULL;

ALTER VIEW public.party_balances SET (security_invoker = false);

-- 3) High-performance party_balances_by_currency view
CREATE OR REPLACE VIEW public.party_balances_by_currency AS
WITH combined AS (
  SELECT 
    jel.party_id,
    jel.company_id,
    jel.currency_code,
    SUM(
      CASE
        WHEN jel.currency_code IS NOT NULL AND upper(TRIM(BOTH FROM jel.currency_code)) <> 'SAR'::text 
          THEN COALESCE(NULLIF(jel.foreign_amount, 0::numeric),
            CASE
              WHEN a.code ~~ '1100%'::text THEN jel.debit_amount - jel.credit_amount
              WHEN a.code ~~ '2100%'::text THEN jel.credit_amount - jel.debit_amount
              ELSE jel.debit_amount - jel.credit_amount
            END) *
            CASE
              WHEN a.code ~~ '1100%'::text THEN
                CASE WHEN jel.debit_amount >= jel.credit_amount THEN 1 ELSE -1 END
              WHEN a.code ~~ '2100%'::text THEN
                CASE WHEN jel.credit_amount >= jel.debit_amount THEN 1 ELSE -1 END
              ELSE
                CASE WHEN jel.debit_amount >= jel.credit_amount THEN 1 ELSE -1 END
            END::numeric
        ELSE
          CASE
            WHEN a.code ~~ '1100%'::text THEN jel.debit_amount - jel.credit_amount
            WHEN a.code ~~ '2100%'::text THEN jel.credit_amount - jel.debit_amount
            ELSE jel.debit_amount - jel.credit_amount
          END
      END
    )::numeric(14,2) AS balance,
    count(*)::integer AS transaction_count,
    max(je.entry_date) AS last_activity_date
  FROM public.journal_entry_lines jel
  JOIN public.accounts a ON a.id = jel.account_id AND a.company_id = jel.company_id
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id 
       AND je.company_id = jel.company_id 
       AND je.status = 'posted' 
       AND je.deleted_at IS NULL
  WHERE jel.deleted_at IS NULL 
    AND jel.party_id IS NOT NULL 
    AND jel.currency_code IS NOT NULL 
    AND (a.code ~~ '1100%'::text OR a.code ~~ '2100%'::text)
  GROUP BY jel.party_id, jel.company_id, jel.currency_code

  UNION ALL

  SELECT 
    ob.party_id,
    ob.company_id,
    ob.currency_code::text,
    sum(
      CASE
        WHEN p.type = 'supplier'::text THEN
          CASE WHEN ob.direction::text = 'credit'::text THEN ob.amount ELSE -ob.amount END
        ELSE
          CASE WHEN ob.direction::text = 'debit'::text THEN ob.amount ELSE -ob.amount END
      END
    )::numeric(14,2) AS balance,
    0::integer AS transaction_count,
    NULL::date AS last_activity_date
  FROM public.party_opening_balances ob
  JOIN public.parties p ON p.id = ob.party_id AND p.company_id = ob.company_id
  GROUP BY ob.party_id, ob.company_id, ob.currency_code
)
SELECT 
  party_id,
  company_id,
  currency_code,
  sum(balance)::numeric(14,2) AS balance,
  sum(transaction_count)::integer AS transaction_count,
  max(last_activity_date) AS last_activity_date
FROM combined
GROUP BY party_id, company_id, currency_code;

ALTER VIEW public.party_balances_by_currency SET (security_invoker = false);

-- 4) Fast dedicated RPC for party balances
CREATE OR REPLACE FUNCTION public.get_party_balances_by_company(p_company_id uuid)
RETURNS TABLE(party_id uuid, balance numeric, type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    pb.party_id,
    pb.balance,
    pb.type
  FROM public.party_balances pb
  WHERE pb.company_id = p_company_id
    AND p_company_id IN (SELECT get_auth_companies());
$function$;

GRANT EXECUTE ON FUNCTION public.get_party_balances_by_company(uuid) TO authenticated, service_role, anon;

-- Ensure get_party_currencies_by_company has proper permissions
GRANT EXECUTE ON FUNCTION public.get_party_currencies_by_company(uuid) TO authenticated, service_role, anon;

-- 5) Optimized report_account_balances RPC
CREATE OR REPLACE FUNCTION public.report_account_balances(
  p_company_id uuid, 
  p_as_of_date date DEFAULT CURRENT_DATE, 
  p_branch_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  account_id uuid, 
  balance numeric, 
  total_debit numeric, 
  total_credit numeric, 
  foreign_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base_currency text;
  v_as_of date;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  SELECT base_currency INTO v_base_currency 
  FROM public.companies 
  WHERE id = p_company_id;

  v_as_of := COALESCE(p_as_of_date, CURRENT_DATE);

  IF p_branch_id IS NULL THEN
    RETURN QUERY
    SELECT 
      l.account_id,
      SUM(l.debit_amount) - SUM(l.credit_amount) AS balance,
      SUM(l.debit_amount) AS total_debit,
      SUM(l.credit_amount) AS total_credit,
      CASE 
        WHEN a.currency_code = v_base_currency OR a.currency_code IS NULL THEN
          SUM(l.debit_amount) - SUM(l.credit_amount)
        ELSE
          SUM(
            CASE 
              WHEN l.debit_amount >= l.credit_amount THEN
                CASE WHEN l.foreign_amount > 0 THEN l.foreign_amount ELSE (l.debit_amount - l.credit_amount) * (CASE WHEN COALESCE(l.exchange_rate,1) > 1 THEN l.exchange_rate ELSE 410 END) END
              ELSE
                CASE WHEN l.foreign_amount > 0 THEN -l.foreign_amount ELSE (l.debit_amount - l.credit_amount) * (CASE WHEN COALESCE(l.exchange_rate,1) > 1 THEN l.exchange_rate ELSE 410 END) END
            END
          )
      END AS foreign_balance
    FROM public.journal_entry_lines l
    JOIN public.journal_entries j ON j.id = l.journal_entry_id 
         AND j.company_id = p_company_id 
         AND j.status = 'posted' 
         AND j.deleted_at IS NULL
         AND j.entry_date <= v_as_of
    JOIN public.accounts a ON a.id = l.account_id 
         AND a.company_id = p_company_id
    WHERE l.company_id = p_company_id
      AND l.deleted_at IS NULL
    GROUP BY l.account_id, a.currency_code
    ORDER BY l.account_id;
  ELSE
    RETURN QUERY
    SELECT 
      l.account_id,
      SUM(l.debit_amount) - SUM(l.credit_amount) AS balance,
      SUM(l.debit_amount) AS total_debit,
      SUM(l.credit_amount) AS total_credit,
      CASE 
        WHEN a.currency_code = v_base_currency OR a.currency_code IS NULL THEN
          SUM(l.debit_amount) - SUM(l.credit_amount)
        ELSE
          SUM(
            CASE 
              WHEN l.debit_amount >= l.credit_amount THEN
                CASE WHEN l.foreign_amount > 0 THEN l.foreign_amount ELSE (l.debit_amount - l.credit_amount) * (CASE WHEN COALESCE(l.exchange_rate,1) > 1 THEN l.exchange_rate ELSE 410 END) END
              ELSE
                CASE WHEN l.foreign_amount > 0 THEN -l.foreign_amount ELSE (l.debit_amount - l.credit_amount) * (CASE WHEN COALESCE(l.exchange_rate,1) > 1 THEN l.exchange_rate ELSE 410 END) END
            END
          )
      END AS foreign_balance
    FROM public.journal_entry_lines l
    JOIN public.journal_entries j ON j.id = l.journal_entry_id 
         AND j.company_id = p_company_id 
         AND j.status = 'posted' 
         AND j.deleted_at IS NULL
         AND j.entry_date <= v_as_of
    JOIN public.accounts a ON a.id = l.account_id 
         AND a.company_id = p_company_id
    WHERE l.company_id = p_company_id
      AND l.deleted_at IS NULL
      AND l.branch_id = p_branch_id
    GROUP BY l.account_id, a.currency_code
    ORDER BY l.account_id;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.report_account_balances(uuid, date, uuid) TO authenticated, service_role, anon;

-- 6) Optimized search_inventory_paginated with fast-path for empty search
CREATE OR REPLACE FUNCTION public.search_inventory_paginated(
  p_company_id uuid, 
  p_term text, 
  p_limit integer, 
  p_offset integer, 
  p_sort_key text, 
  p_sort_dir text, 
  p_branch_id uuid DEFAULT NULL::uuid, 
  p_is_core boolean DEFAULT NULL::boolean
)
RETURNS TABLE(
  id uuid, 
  company_id uuid, 
  name_ar text, 
  sku text, 
  part_number text, 
  brand text, 
  size text, 
  description text, 
  purchase_price numeric, 
  sale_price numeric, 
  min_stock_level numeric, 
  unit text, 
  image_url text, 
  alternative_numbers text, 
  barcode text, 
  updated_at timestamp with time zone, 
  created_at timestamp with time zone, 
  status text, 
  category_id uuid, 
  category jsonb, 
  stock jsonb, 
  is_core boolean, 
  total_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tokens text[];
  v_patterns text[];
  v_total integer;
BEGIN
  PERFORM public.fn_assert_company_access(p_company_id);

  IF p_term IS NULL OR trim(p_term) = '' THEN
    -- Fast path: empty search term
    SELECT count(*)::integer INTO v_total 
    FROM public.products p
    WHERE p.company_id = p_company_id
      AND p.deleted_at IS NULL
      AND (p.status = 'active' OR p.status IS NULL)
      AND (p_is_core IS NULL OR p.is_core = p_is_core);

    RETURN QUERY
    SELECT
      p.id,
      p.company_id,
      p.name_ar,
      p.sku,
      p.part_number,
      p.brand,
      p.size,
      p.description,
      p.purchase_price,
      p.sale_price,
      p.min_stock_level::numeric,
      p.unit,
      p.image_url,
      p.alternative_numbers,
      p.barcode,
      p.updated_at,
      p.created_at,
      p.status,
      p.category_id,
      CASE
        WHEN cat.id IS NOT NULL THEN jsonb_build_object('id', cat.id, 'name', cat.name)
        ELSE NULL::jsonb
      END AS category,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'warehouse_id', ps.warehouse_id,
              'quantity', ps.quantity,
              'warehouse_name', w.name_ar
            )
          )
          FROM public.product_stock ps
          JOIN public.warehouses w ON w.id = ps.warehouse_id AND w.company_id = p_company_id
          WHERE ps.product_id = p.id
            AND ps.company_id = p_company_id
            AND (
              p_branch_id IS NULL 
              OR w.branch_id = p_branch_id 
              OR w.branch_id IS NULL
            )
        ),
        '[]'::jsonb
      ) AS stock,
      p.is_core,
      v_total AS total_count
    FROM public.products p
    LEFT JOIN public.product_categories cat ON cat.id = p.category_id AND cat.company_id = p_company_id
    WHERE p.company_id = p_company_id
      AND p.deleted_at IS NULL
      AND (p.status = 'active' OR p.status IS NULL)
      AND (p_is_core IS NULL OR p.is_core = p_is_core)
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;

  ELSE
    -- Search path with query term
    v_tokens := regexp_split_to_array(public.normalize_arabic(trim(p_term)), E'\\s+');
    SELECT array_agg('%' || t || '%') INTO v_patterns FROM unnest(v_tokens) t WHERE trim(t) <> '';

    SELECT count(*)::integer INTO v_total 
    FROM public.products p
    WHERE p.company_id = p_company_id
      AND p.deleted_at IS NULL
      AND (p.status = 'active' OR p.status IS NULL)
      AND (p_is_core IS NULL OR p.is_core = p_is_core)
      AND p.normalized_search_text LIKE ALL (v_patterns);

    RETURN QUERY
    SELECT
      p.id,
      p.company_id,
      p.name_ar,
      p.sku,
      p.part_number,
      p.brand,
      p.size,
      p.description,
      p.purchase_price,
      p.sale_price,
      p.min_stock_level::numeric,
      p.unit,
      p.image_url,
      p.alternative_numbers,
      p.barcode,
      p.updated_at,
      p.created_at,
      p.status,
      p.category_id,
      CASE
        WHEN cat.id IS NOT NULL THEN jsonb_build_object('id', cat.id, 'name', cat.name)
        ELSE NULL::jsonb
      END AS category,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'warehouse_id', ps.warehouse_id,
              'quantity', ps.quantity,
              'warehouse_name', w.name_ar
            )
          )
          FROM public.product_stock ps
          JOIN public.warehouses w ON w.id = ps.warehouse_id AND w.company_id = p_company_id
          WHERE ps.product_id = p.id
            AND ps.company_id = p_company_id
            AND (
              p_branch_id IS NULL 
              OR w.branch_id = p_branch_id 
              OR w.branch_id IS NULL
            )
        ),
        '[]'::jsonb
      ) AS stock,
      p.is_core,
      v_total AS total_count
    FROM public.products p
    LEFT JOIN public.product_categories cat ON cat.id = p.category_id AND cat.company_id = p_company_id
    WHERE p.company_id = p_company_id
      AND p.deleted_at IS NULL
      AND (p.status = 'active' OR p.status IS NULL)
      AND (p_is_core IS NULL OR p.is_core = p_is_core)
      AND p.normalized_search_text LIKE ALL (v_patterns)
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.search_inventory_paginated(uuid, text, integer, integer, text, text, uuid, boolean) TO authenticated, service_role, anon;

-- Ensure grants on views
GRANT SELECT ON public.party_balances TO authenticated, service_role, anon;
GRANT SELECT ON public.party_balances_by_currency TO authenticated, service_role, anon;
