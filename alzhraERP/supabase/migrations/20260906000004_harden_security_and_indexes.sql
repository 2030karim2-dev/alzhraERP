-- 1. Covering index for system_platform_configs(updated_by)
CREATE INDEX IF NOT EXISTS idx_system_platform_configs_updated_by 
ON public.system_platform_configs(updated_by);

-- 2. Harden search_path on trigger trg_fn_set_supplier_portal_token
CREATE OR REPLACE FUNCTION public.trg_fn_set_supplier_portal_token()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.type = 'supplier' AND (NEW.portal_token IS NULL OR NEW.portal_token = '') THEN
    NEW.portal_token := lower(encode(gen_random_bytes(20), 'hex'));
  END IF;
  RETURN NEW;
END;
$function$;
