-- ============================================================
-- FIX: extend supabase_realtime publication to cover every table
-- the frontend subscribes to in `useRealtimeSync` (TABLE_PRESET_MAP).
-- ------------------------------------------------------------
-- The publication previously covered 23 tables; the frontend also
-- subscribed to journal_entry_lines, accounts, inventory_transactions,
-- stock_transfers, stock_transfer_items, product_cross_references,
-- product_kit_items, branches, fiscal_years, exchange_rates and
-- supported_currencies — but tables outside the publication never
-- fire postgres_changes events, so those subscriptions were silent
-- no-ops and cached data went stale until fallback polling kicked in.
--
-- `stock_movements` (subscribed by the frontend) does not exist; the
-- real table is `inv_stock_movements`, which is added here so the
-- corrected subscription receives events.
--
-- postgres_changes respects RLS: users only receive changes for rows
-- they can SELECT, so cross-company data is never broadcast.
-- Date: 2026-08-22
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.journal_entry_lines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_transfer_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_cross_references;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_kit_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.branches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fiscal_years;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exchange_rates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.supported_currencies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inv_stock_movements;
