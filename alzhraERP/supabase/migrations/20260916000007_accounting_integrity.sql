-- =========================================================================================
-- Migration: Accounting & Financial Integrity (Phase 5)
-- =========================================================================================

-- 1. Enforce Journal Entry Line integrity
-- Rule: A line must either be purely Debit or purely Credit, never both, never neither.

ALTER TABLE public.fin_journal_lines DROP CONSTRAINT IF EXISTS chk_fin_journal_line_debit_credit;
ALTER TABLE public.fin_journal_lines ADD CONSTRAINT chk_fin_journal_line_debit_credit CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
);

-- Note: The journal balance (SUM(debit) = SUM(credit)) is enforced via the Posting RPC (api_v1_fin_post_journal_entry).
-- We can also add a deferred trigger for strict database-level guarantee, but the RPC is the primary gate.

-- 2. Protect Posted Journals from accidental deletion
-- (Already handled by ON DELETE RESTRICT in Phase 2 for references, but we should also prevent deleting POSTED headers via trigger)

CREATE OR REPLACE FUNCTION public.trg_prevent_posted_journal_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'POSTED' THEN
        RAISE EXCEPTION 'Cannot delete a POSTED journal entry. It must be reversed or voided.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_posted_journal_deletion ON public.fin_journal_entries;
CREATE TRIGGER trg_prevent_posted_journal_deletion
BEFORE DELETE ON public.fin_journal_entries
FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_posted_journal_deletion();

-- 3. Invoice Amounts Protection
-- Add constraints to ensure invoice amounts make mathematical sense
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS chk_invoice_amounts;
ALTER TABLE public.invoices ADD CONSTRAINT chk_invoice_amounts CHECK (
    subtotal >= 0 AND
    tax_amount >= 0 AND
    discount_amount >= 0 AND
    total_amount = (subtotal + tax_amount - discount_amount) AND
    paid_amount >= 0 AND
    paid_amount <= total_amount AND -- Ensure no overpayment at the invoice level unless designed otherwise
    balance = (total_amount - paid_amount)
);

-- =========================================================================================
-- End of Migration
-- =========================================================================================
