-- Migration: 20260914002001_optimize_low_stock_and_transfer_rpcs.sql
-- Description: Optimize dashboard low stock query and add fast stocked products RPC.

-- 1. Create fast rpc_get_channels_with_meta for chat
CREATE OR REPLACE FUNCTION public.rpc_get_channels_with_meta(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_company UUID;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User not authenticated';
    END IF;
    v_company := public.verify_company_access(p_company_id);
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_result FROM (
        SELECT c.id, c.company_id, c.type, c.name, c.description, c.branch_id,
            c.reference_type, c.reference_id, c.is_private, c.created_by,
            c.created_at, c.updated_at, c.archived_at,
            b.name AS branch_name,
            (SELECT COUNT(*) FROM public.chat_channel_members m WHERE m.channel_id = c.id) AS members_count,
            me.last_read_message_id,
            lm.id AS last_message_id, lm.content AS last_message_content,
            lm.message_type AS last_message_type, lm.sender_id AS last_message_sender_id,
            lm.created_at AS last_message_created_at,
            sp.full_name AS last_message_sender_name, sp.avatar_url AS last_message_sender_avatar,
            (
                SELECT COUNT(*) FROM public.chat_messages m2
                WHERE m2.channel_id = c.id AND m2.sender_id <> v_user_id AND m2.deleted_at IS NULL
                  AND (me.last_read_message_id IS NULL
                    OR EXISTS (SELECT 1 FROM public.chat_messages lr WHERE lr.id = me.last_read_message_id
                        AND (m2.created_at > lr.created_at
                          OR (m2.created_at = lr.created_at AND m2.id > lr.id))))
            ) AS unread_count
        FROM public.chat_channels c
        LEFT JOIN public.branches b ON b.id = c.branch_id
        LEFT JOIN public.chat_channel_members me ON me.channel_id = c.id AND me.user_id = v_user_id
        LEFT JOIN LATERAL (
            SELECT m.* FROM public.chat_messages m
            WHERE m.channel_id = c.id AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC, m.id DESC LIMIT 1
        ) lm ON TRUE
        LEFT JOIN public.profiles sp ON sp.id = lm.sender_id
        WHERE c.company_id = v_company AND c.archived_at IS NULL
          AND public.fn_can_access_chat_channel(c.id, v_user_id)
        ORDER BY c.updated_at DESC
    ) t;
    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_get_channels_with_meta(UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.rpc_get_channels_with_meta(UUID) FROM anon, PUBLIC;

-- 2. Fast get_low_stock_products query
CREATE OR REPLACE FUNCTION public.get_low_stock_products(p_company_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, name_ar text, quantity numeric, min_quantity numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH branch_warehouses AS (
        SELECT w.id FROM warehouses w 
        WHERE (p_branch_id IS NULL OR w.branch_id = p_branch_id)
    ),
    stock_agg AS (
        SELECT ps.product_id, SUM(ps.quantity) AS total_qty
        FROM product_stock ps
        JOIN branch_warehouses bw ON bw.id = ps.warehouse_id
        GROUP BY ps.product_id
    )
    SELECT
        p.id,
        p.name_ar,
        COALESCE(sa.total_qty, 0) AS quantity,
        COALESCE(NULLIF(p.min_stock_level, 0)::NUMERIC, 5) AS min_quantity
    FROM stock_agg sa
    JOIN products p ON p.id = sa.product_id
    WHERE p.company_id = p_company_id
      AND p.status = 'active'
      AND p.deleted_at IS NULL
      AND sa.total_qty <= COALESCE(NULLIF(p.min_stock_level, 0)::NUMERIC, 5)
    UNION ALL
    SELECT
        p.id,
        p.name_ar,
        0::numeric AS quantity,
        COALESCE(NULLIF(p.min_stock_level, 0)::NUMERIC, 5) AS min_quantity
    FROM products p
    WHERE p.company_id = p_company_id
      AND p.status = 'active'
      AND p.deleted_at IS NULL
      AND p.is_core = true
      AND NOT EXISTS (
          SELECT 1 FROM product_stock ps 
          JOIN branch_warehouses bw ON bw.id = ps.warehouse_id
          WHERE ps.product_id = p.id AND ps.quantity > 0
      )
    ORDER BY quantity ASC
    LIMIT 50;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_low_stock_products(uuid, uuid) TO authenticated, service_role;

-- 3. Fast get_products_with_stock query for dashboard & transfer suggestions
CREATE OR REPLACE FUNCTION public.get_products_with_stock(p_company_id uuid)
RETURNS TABLE(
    id uuid,
    company_id uuid,
    name_ar text,
    sku text,
    part_number text,
    brand text,
    category_id uuid,
    size text,
    sale_price numeric,
    purchase_price numeric,
    min_stock_level integer,
    is_core boolean,
    unit text,
    stock jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_company_access(p_company_id);

    RETURN QUERY
    WITH stocked_items AS (
        SELECT 
            ps.product_id,
            jsonb_agg(
                jsonb_build_object(
                    'warehouse_id', ps.warehouse_id,
                    'quantity', ps.quantity,
                    'warehouse_name', w.name_ar,
                    'branch_id', w.branch_id
                )
            ) AS stock_json
        FROM product_stock ps
        JOIN warehouses w ON w.id = ps.warehouse_id
        WHERE ps.quantity > 0
        GROUP BY ps.product_id
    )
    SELECT
        p.id,
        p.company_id,
        p.name_ar,
        p.sku,
        p.part_number,
        p.brand,
        p.category_id,
        p.size,
        p.sale_price,
        p.purchase_price,
        p.min_stock_level,
        p.is_core,
        p.unit,
        COALESCE(s.stock_json, '[]'::jsonb) AS stock
    FROM stocked_items s
    JOIN products p ON p.id = s.product_id
    WHERE p.company_id = p_company_id
      AND p.deleted_at IS NULL
    UNION ALL
    SELECT
        p.id,
        p.company_id,
        p.name_ar,
        p.sku,
        p.part_number,
        p.brand,
        p.category_id,
        p.size,
        p.sale_price,
        p.purchase_price,
        p.min_stock_level,
        p.is_core,
        p.unit,
        '[]'::jsonb AS stock
    FROM products p
    WHERE p.company_id = p_company_id
      AND p.deleted_at IS NULL
      AND p.is_core = true
      AND NOT EXISTS (SELECT 1 FROM product_stock ps WHERE ps.product_id = p.id AND ps.quantity > 0);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_products_with_stock(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_products_with_stock(uuid) FROM anon, PUBLIC;
