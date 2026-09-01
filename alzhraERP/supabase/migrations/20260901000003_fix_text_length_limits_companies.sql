-- Migration: 20260901000003_fix_text_length_limits_companies.sql
-- Description: Removes nonexistent 'name' column entry for 'companies' from _text_length_limits
-- and hardens guard_text_lengths trigger to safely skip non-existent columns.

-- 1. Remove invalid entry from metadata table
DELETE FROM public._text_length_limits
WHERE table_name = 'companies' AND column_name = 'name';

-- 2. Harden guard_text_lengths() trigger function
CREATE OR REPLACE FUNCTION public.guard_text_lengths()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rec record;
  v_val text;
BEGIN
  FOR v_rec IN
    SELECT l.column_name, l.max_length
    FROM public._text_length_limits l
    JOIN information_schema.columns c 
      ON c.table_schema = 'public' 
     AND c.table_name = TG_TABLE_NAME 
     AND c.column_name = l.column_name
    WHERE l.table_name = TG_TABLE_NAME
  LOOP
    EXECUTE format('SELECT ($1).%I::text', v_rec.column_name)
      INTO v_val
      USING NEW;

    IF v_val IS NOT NULL AND length(v_val) > v_rec.max_length THEN
      RAISE EXCEPTION '% exceeds maximum length of % characters',
        v_rec.column_name, v_rec.max_length
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;
