-- Migration: 20260908000015_advanced_invoice_search_rpc.sql
-- Description: محرك البحث المتقدم والعميق في فواتير المبيعات والمشتريات
-- يدعم البحث بالأصناف (الاسم، رقم القطعة، الباركود، SKU) ورقم الفاتورة واسم العميل/المورد والتاريخ

CREATE OR REPLACE FUNCTION public.search_invoices_advanced(
  p_company_id UUID,
  p_type TEXT DEFAULT NULL,
  p_query TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  invoice_number TEXT,
  type TEXT,
  status TEXT,
  payment_method TEXT,
  total_amount NUMERIC,
  currency_code TEXT,
  exchange_rate NUMERIC,
  issue_date DATE,
  party_id UUID,
  party_name TEXT,
  party_phone TEXT,
  notes TEXT,
  reference_invoice_id UUID,
  item_count BIGINT,
  matched_items JSONB,
  total_matching_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_query TEXT;
  v_like TEXT;
BEGIN
  -- 1. التحقق الصارم من الأمان وعزل المنشأة
  PERFORM verify_company_access(p_company_id);

  -- 2. تنظيف وتجهيز مدخلات البحث
  v_clean_query := NULLIF(TRIM(p_query), '');
  IF v_clean_query IS NOT NULL THEN
    v_like := '%' || v_clean_query || '%';
  END IF;

  -- 3. تنفيذ الاستعلام مع احتساب العدد الإجمالي والتطابق الدقيق
  RETURN QUERY
  WITH filtered_invoices AS (
    SELECT
      i.id,
      i.company_id,
      i.invoice_number,
      i.type,
      i.status,
      i.payment_method,
      i.total_amount,
      i.currency_code,
      i.exchange_rate,
      i.issue_date,
      i.party_id,
      prt.name AS party_name,
      prt.phone AS party_phone,
      i.notes,
      i.reference_invoice_id,
      (
        SELECT COUNT(*)::BIGINT
        FROM public.invoice_items cnt_items
        WHERE cnt_items.invoice_id = i.id
      ) AS item_count,
      COUNT(*) OVER()::BIGINT AS total_matching_count
    FROM public.invoices i
    LEFT JOIN public.parties prt ON prt.id = i.party_id
    WHERE i.company_id = p_company_id
      AND i.deleted_at IS NULL
      AND i.status <> 'void'
      -- فلترة النوع (sale, purchase, etc.)
      AND (p_type IS NULL OR i.type = p_type)
      -- فلترة الحالة
      AND (p_status IS NULL OR i.status = p_status)
      -- فلترة طريقة الدفع
      AND (p_payment_method IS NULL OR i.payment_method = p_payment_method)
      -- فلترة الفرع
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      -- فلترة التاريخ
      AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
      AND (p_date_to IS NULL OR i.issue_date <= p_date_to)
      -- شرط البحث متعدد الأبعاد
      AND (
        v_clean_query IS NULL
        OR i.invoice_number ILIKE v_like
        OR prt.name ILIKE v_like
        OR prt.phone ILIKE v_like
        OR EXISTS (
          SELECT 1
          FROM public.invoice_items ii
          LEFT JOIN public.products p ON p.id = ii.product_id
          WHERE ii.invoice_id = i.id
            AND (
              ii.description ILIKE v_like
              OR p.name_ar ILIKE v_like
              OR p.sku ILIKE v_like
              OR p.part_number ILIKE v_like
              OR p.brand ILIKE v_like
              OR p.barcode ILIKE v_like
            )
        )
      )
    ORDER BY i.issue_date DESC, i.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT
    fi.id,
    fi.company_id,
    fi.invoice_number,
    fi.type,
    fi.status,
    fi.payment_method,
    fi.total_amount,
    fi.currency_code,
    fi.exchange_rate,
    fi.issue_date,
    fi.party_id,
    fi.party_name,
    fi.party_phone,
    fi.notes,
    fi.reference_invoice_id,
    fi.item_count,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', mii.id,
            'product_id', mii.product_id,
            'product_name', COALESCE(mp.name_ar, mii.description, 'صنف غير محدد'),
            'sku', mp.sku,
            'part_number', mp.part_number,
            'brand', mp.brand,
            'quantity', mii.quantity,
            'unit_price', mii.unit_price,
            'total', mii.total,
            'is_direct_match', (
              v_clean_query IS NOT NULL AND (
                mii.description ILIKE v_like
                OR mp.name_ar ILIKE v_like
                OR mp.sku ILIKE v_like
                OR mp.part_number ILIKE v_like
                OR mp.brand ILIKE v_like
                OR mp.barcode ILIKE v_like
              )
            )
          )
        )
        FROM (
          SELECT ii.*
          FROM public.invoice_items ii
          LEFT JOIN public.products p ON p.id = ii.product_id
          WHERE ii.invoice_id = fi.id
            AND (
              -- إذا وجد بحث وتطابقت أصناف محددة، نفضل جلب الأصناف المتطابقة أولاً
              v_clean_query IS NULL
              OR ii.description ILIKE v_like
              OR p.name_ar ILIKE v_like
              OR p.sku ILIKE v_like
              OR p.part_number ILIKE v_like
              OR p.brand ILIKE v_like
              OR p.barcode ILIKE v_like
            )
          LIMIT 5
        ) mii
        LEFT JOIN public.products mp ON mp.id = mii.product_id
      ),
      '[]'::jsonb
    ) AS matched_items,
    fi.total_matching_count
  FROM filtered_invoices fi;
END;
$$;

-- تصريح الاستدعاء للمستخدمين المصرح لهم
GRANT EXECUTE ON FUNCTION public.search_invoices_advanced(
  UUID, TEXT, TEXT, DATE, DATE, TEXT, TEXT, UUID, INT, INT
) TO authenticated;

COMMENT ON FUNCTION public.search_invoices_advanced IS 'دالة بحث متقدم وعميق في سجل الفواتير والمشتريات والمبيعات تدعم الأصناف وأرقام الفواتير والتاريخ';
