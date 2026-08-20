-- ============================================================
-- Journal entry numbering serialisation (Phase 2.4, H5)
-- ------------------------------------------------------------
-- 2026-08-19
--
-- `generate_journal_entry_number` (BEFORE INSERT trigger on journal_entries)
-- computed `MAX(entry_number)+1` without any lock, so two concurrent
-- postings for the same company could pick the same number and one would
-- fail on `journal_entries_unique_number_per_company`.
--
-- Fix: `pg_advisory_xact_lock` serialises per-company numbering. Under the
-- default READ COMMITTED isolation the second waiter re-reads MAX() after
-- the first commits, so it sees the latest number. (The lock releases at
-- transaction end, so a rolled-back insert simply frees the number.)
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_journal_entry_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.entry_number IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('journal_entry_number:' || NEW.company_id::text));
    NEW.entry_number := (
      SELECT COALESCE(MAX(entry_number), 0) + 1
      FROM public.journal_entries
      WHERE company_id = NEW.company_id
    );
  END IF;
  RETURN NEW;
END;
$function$;
