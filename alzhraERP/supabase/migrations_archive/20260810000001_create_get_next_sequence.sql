-- ============================================
-- Migration: create_get_next_sequence_rpc
-- Creates RPC function for generating sequential numbers
-- Used by sales invoices and expense numbering
-- ============================================

CREATE OR REPLACE FUNCTION get_next_sequence(
    p_company_id UUID,
    p_type TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prefix TEXT;
    v_current_number INTEGER;
    v_next_number INTEGER;
    v_sequence_name TEXT;
BEGIN
    -- Determine prefix based on type
    v_prefix := CASE p_type
        WHEN 'expense' THEN 'EXP'
        WHEN 'invoice' THEN 'INV'
        WHEN 'purchase' THEN 'PUR'
        WHEN 'bond' THEN 'BND'
        ELSE UPPER(LEFT(p_type, 3))
    END;

    v_sequence_name := 'seq_' || p_type || '_' || REPLACE(p_company_id::TEXT, '-', '_');

    -- Create sequence if not exists (per company + type)
    EXECUTE format(
        'CREATE SEQUENCE IF NOT EXISTS %I START WITH 1 INCREMENT BY 1',
        v_sequence_name
    );

    -- Get next value
    EXECUTE format('SELECT nextval(%L)', v_sequence_name) INTO v_next_number;

    -- Format: PREFIX-XXXXX (e.g., EXP-00001, INV-00042)
    RETURN v_prefix || '-' || LPAD(v_next_number::TEXT, 5, '0');
END;
$$;