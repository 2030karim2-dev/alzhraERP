#!/usr/bin/env pwsh
# ============================================================
# scripts/run-security-canary.ps1
# Run the canary SQL test against the configured Supabase DB.
#
# Required env:
#   SUPABASE_DB_URL — postgres://postgres:PASSWORD@HOST:PORT/postgres
#                     (or use the pooled connection string)
#
# Exit codes:
#   0 — all canaries PASS
#   1 — at least one canary FAIL
#   2 — connection error
# ============================================================

$ErrorActionPreference = 'Stop'

$dbUrl = $env:SUPABASE_DB_URL
if (-not $dbUrl) {
  Write-Error "SUPABASE_DB_URL env var is not set. Set it to your Supabase DB connection string."
  exit 2
}

$canaryFile = Join-Path $PSScriptRoot "..\supabase\tests\test_canary_all_audit_views.sql"
if (-not (Test-Path $canaryFile)) {
  Write-Error "Canary file not found: $canaryFile"
  exit 2
}

# Run the canary and capture warnings
$env:PGPASSWORD = ($dbUrl | Select-String -Pattern "://[^:]+:(?<pwd>[^@]+)@" | ForEach-Object { $_.Matches.pwd } | Select-Object -First 1)

Write-Host "Running canary against $dbUrl ..." -ForegroundColor Cyan

$output = & psql "$dbUrl" -v ON_ERROR_STOP=0 -X -q -f $canaryFile 2>&1
$exitCode = $LASTEXITCODE

$canaryFails = @($output | Select-String -Pattern 'CANARY FAIL')
$canaryOks = @($output | Select-String -Pattern 'CANARY OK')
$canaryInfo = @($output | Select-String -Pattern 'CANARY INFO')
$warnings = @($output | Select-String -Pattern '^WARNING:')

Write-Host ""
Write-Host "================== CANARY SUMMARY ==================" -ForegroundColor Cyan
Write-Host "  PASS : $($canaryOks.Count)" -ForegroundColor Green
Write-Host "  INFO : $($canaryInfo.Count)" -ForegroundColor Yellow
Write-Host "  FAIL : $($canaryFails.Count)" -ForegroundColor Red
Write-Host "  OTHER WARNINGS: $($warnings.Count)" -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Cyan

if ($canaryFails.Count -gt 0) {
  Write-Host ""
  Write-Host "FAILED canaries:" -ForegroundColor Red
  $canaryFails | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  exit 1
}

Write-Host ""
Write-Host "All canaries passed." -ForegroundColor Green
exit 0
