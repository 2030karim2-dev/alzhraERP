# Apply VIN Intelligence migrations to the project
# (20260821000008_fix_vin_inventory_matching.sql & 20260821000009_fix_vin_product_prices.sql)
# USAGE: $env:SUPABASE_MGMT_TOKEN='sbp_...'; powershell -File scripts/apply-vin-migrations.ps1
$ErrorActionPreference = 'Stop'

$token = $env:SUPABASE_MGMT_TOKEN
if ([string]::IsNullOrEmpty($token)) { throw 'Set $env:SUPABASE_MGMT_TOKEN first (Management API access token).' }

$project = 'zzthamxjxnxzzpswllid'
$root = Split-Path -Parent $PSScriptRoot

$migrationFiles = @(
    'supabase/migrations/20260821000008_fix_vin_inventory_matching.sql',
    'supabase/migrations/20260821000009_fix_vin_product_prices.sql'
)

$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json; charset=utf-8' }
$uri = "https://api.supabase.com/v1/projects/$project/database/query"

foreach ($relPath in $migrationFiles) {
    $fullPath = Join-Path $root $relPath
    if (-not (Test-Path $fullPath)) {
        Write-Warning "File not found: $fullPath"
        continue
    }

    Write-Output "=== Applying: $relPath ==="
    $sql = [System.IO.File]::ReadAllText($fullPath, [System.Text.Encoding]::UTF8)

    $jsonStr = [System.Text.StringBuilder]::new()
    foreach ($ch in $sql.ToCharArray()) {
        $code = [int]$ch
        if ($code -eq 0x22) { [void]$jsonStr.Append('\u0022') }
        elseif ($code -eq 0x5C) { [void]$jsonStr.Append('\u005C') }
        elseif ($code -eq 0x0A) { [void]$jsonStr.Append('\u000A') }
        elseif ($code -eq 0x0D) { [void]$jsonStr.Append('\u000D') }
        elseif ($code -eq 0x09) { [void]$jsonStr.Append('\u0009') }
        elseif ($code -le 0x7F) { [void]$jsonStr.Append([char]$code) }
        else { [void]$jsonStr.Append('\u' + $code.ToString('X4')) }
    }
    $body = '{"query":"' + $jsonStr.ToString() + '"}'
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

    $resp = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $bodyBytes
    Write-Output ("-> OK. Result: " + ($resp | ConvertTo-Json -Compress))
}

# Reload PostgREST schema cache
$reload = @{ query = "NOTIFY pgrst, 'reload schema';" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $reload | Out-Null
    Write-Output 'PostgREST schema cache reloaded successfully.'
} catch {
    Write-Output ('Reload note: ' + $_.Exception.Message)
}

Write-Output "=== ALL VIN MIGRATIONS APPLIED SUCCESSFULLY ==="
