# Build supabase/migrations/20260825000001_restore_dashboard_rpcs.sql
# by extracting the exact function definitions from the canonical sources.
$ErrorActionPreference = 'Stop'

$root = 'C:\Users\seens\12\alzhraERP-1\alzhraERP'
$utf8 = [System.Text.Encoding]::UTF8
# IMPORTANT: read source files with explicit UTF-8. PowerShell 5.1 Get-Content
# defaults to ANSI and corrupts Arabic (double-encoded UTF-8 mojibake), which
# the repo's check-encoding pre-push hook rejects.
$baseline = [System.IO.File]::ReadAllLines((Join-Path $root 'supabase/migrations/20260819000002_baseline_functions.sql'), $utf8)
$archSummary = [System.IO.File]::ReadAllLines((Join-Path $root 'supabase/migrations_archive/20260817000002_restore_dashboard_rpcs.sql'), $utf8)
$chartFix = [System.IO.File]::ReadAllLines((Join-Path $root 'supabase/migrations/20260824000002_fix_dashboard_sales_chart_data.sql'), $utf8)
$plFix = [System.IO.File]::ReadAllLines((Join-Path $root 'supabase/migrations/20260820000004_accounting_type_based_reports_and_journal_guards.sql'), $utf8)

function Extract-Func([string[]]$lines, [string]$name) {
    $start = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match ('CREATE OR REPLACE FUNCTION public\.' + [regex]::Escape($name) + '\(')) { $start = $i; break }
    }
    if ($start -lt 0) { throw "NOT FOUND: $name" }
    $end = -1
    for ($i = $start + 1; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^\$function\$;?\s*$') { $end = $i; break }
    }
    if ($end -lt 0) { throw "NO END: $name" }
    $out = @($lines[$start..$end])
    if ($out[$out.Count - 1] -notmatch ';\s*$') { $out[$out.Count - 1] = $out[$out.Count - 1] + ';' }
    return $out
}

$blocks = [System.Collections.Generic.List[string]]::new()
$blocks.Add("-- ============================================================")
$blocks.Add("-- Migration: Restore dashboard RPCs (get_dashboard_summary 4-arg")
$blocks.Add("--           + the 8 dashboard/report functions used by")
$blocks.Add("--           src/features/dashboard/api/index.ts).")
$blocks.Add("-- Date: 2026-08-25")
$blocks.Add("--")
$blocks.Add("-- WHY: The production DB was restored from a snapshot that lacks")
$blocks.Add("-- most dashboard RPCs, so every dashboard load fired 9-12 PGRST202")
$blocks.Add("-- errors and the widgets fell back to zeros. This migration")
$blocks.Add("-- re-creates all of them (CREATE OR REPLACE = idempotent).")
$blocks.Add("--")
$blocks.Add("-- SECURITY: every function keeps its original SECURITY DEFINER +")
$blocks.Add("-- verify_company_access() tenant guard; EXECUTE is granted only")
$blocks.Add("-- to the authenticated role (never anon/public).")
$blocks.Add("-- ============================================================")
$blocks.Add("BEGIN;")
$blocks.Add("")

# 1. get_dashboard_summary (4-arg) — canonical 4-arg overload the frontend calls
foreach ($l in (Extract-Func $archSummary 'get_dashboard_summary')) { $blocks.Add($l) }
$blocks.Add("")
# 2. get_sales_chart_data (multi-series) — canonical current definition
foreach ($l in (Extract-Func $chartFix 'get_sales_chart_data')) { $blocks.Add($l) }
$blocks.Add("")
# 3-7. baseline dashboard functions
foreach ($name in @('get_low_stock_products','get_top_products_and_customers','get_expense_categories_summary','get_top_selling_products','get_debt_followup_dashboard','report_trial_balance')) {
    foreach ($l in (Extract-Func $baseline $name)) { $blocks.Add($l) }
    $blocks.Add("")
}
# 8. report_profit_loss — 4-arg (branch-aware) version the frontend calls
foreach ($l in (Extract-Func $plFix 'report_profit_loss')) { $blocks.Add($l) }
$blocks.Add("")

# ── GRANTs (idempotent) ──────────────────────────────────────────────
$blocks.Add("GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, uuid, date, date) TO authenticated;")
$blocks.Add("GRANT EXECUTE ON FUNCTION public.get_sales_chart_data(uuid, uuid, date, date) TO authenticated;")
$blocks.Add("GRANT EXECUTE ON FUNCTION public.get_low_stock_products(uuid, uuid) TO authenticated;")
$blocks.Add("GRANT EXECUTE ON FUNCTION public.get_top_products_and_customers(uuid, uuid, integer) TO authenticated;")
$blocks.Add("GRANT EXECUTE ON FUNCTION public.get_expense_categories_summary(uuid, date, date, uuid) TO authenticated;")
$blocks.Add("GRANT EXECUTE ON FUNCTION public.get_top_selling_products(uuid, integer, integer) TO authenticated;")
$blocks.Add("GRANT EXECUTE ON FUNCTION public.get_debt_followup_dashboard(uuid, integer, integer, integer) TO authenticated;")
$blocks.Add("GRANT EXECUTE ON FUNCTION public.report_trial_balance(uuid, date, date, uuid) TO authenticated;")
$blocks.Add("GRANT EXECUTE ON FUNCTION public.report_profit_loss(uuid, date, date, uuid) TO authenticated;")
$blocks.Add("")
$blocks.Add("COMMIT;")

$outPath = Join-Path $root 'supabase/migrations/20260825000001_restore_dashboard_rpcs.sql'
# UTF-8 WITHOUT BOM to match the rest of supabase/migrations.
[System.IO.File]::WriteAllLines($outPath, $blocks, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("WROTE " + $outPath + " (" + $blocks.Count + " lines)")
