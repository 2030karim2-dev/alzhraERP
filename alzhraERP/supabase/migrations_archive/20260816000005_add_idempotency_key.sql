-- ============================================================
-- Migration: Add invoices.idempotency_key column
-- Date: 2026-08-16
--
-- BUG: commit_sales_invoice_v2 (used by the sales UI) references
-- invoices.idempotency_key for retry-safe idempotency, but the column
-- did not exist -> every sale returned 400:
--   "column idempotency_key does not exist"
--
-- FIX: add a nullable text column + partial unique index.
-- ============================================================

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_idempotency_key
    ON public.invoices (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
