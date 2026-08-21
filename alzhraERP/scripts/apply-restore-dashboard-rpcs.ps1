# Apply supabase/migrations/20260825000001_restore_dashboard_rpcs.sql to the project
# via the Management API using a robust JSON serializer (handles Arabic/comments).
# USAGE: $env:SUPABASE_MGMT_TOKEN='sbp_...'; powershell -File apply-restore-dashboard-rpcs.ps1
$ErrorActionPreference = 'Stop'

$token = $env:SUPABASE_MGMT_TOKEN
if ([string]::IsNullOrEmpty($token)) { throw 'Set $env:SUPABASE_MGMT_TOKEN first (Management API access token).' }

$project = 'zzthamxjxnxzzpswllid'
$sqlPath = 'C:\Users\seens\12\alzhraERP-1\alzhraERP\supabase\migrations\20260825000001_restore_dashboard_rpcs.sql'

Add-Type -AssemblyName System.Web.Extensions
$sql = [System.IO.File]::ReadAllText($sqlPath, [System.Text.Encoding]::UTF8)

# Build a PURE-ASCII JSON body: every non-ASCII char is escaped as \uXXXX and
# every JSON-special char is escaped explicitly. This avoids any ambiguity in
# how the Management API decodes the request charset (a literal-Arabic body was
# being misread as Latin-1 and stored double-encoded).
$jsonStr = [System.Text.StringBuilder]::new()
foreach ($ch in $sql.ToCharArray()) {
    $code = [int]$ch
    if ($code -eq 0x22) { [void]$jsonStr.Append('\u0022') }          # "
    elseif ($code -eq 0x5C) { [void]$jsonStr.Append('\u005C') }      # \
    elseif ($code -eq 0x0A) { [void]$jsonStr.Append('\u000A') }      # LF
    elseif ($code -eq 0x0D) { [void]$jsonStr.Append('\u000D') }      # CR
    elseif ($code -eq 0x09) { [void]$jsonStr.Append('\u0009') }      # tab
    elseif ($code -le 0x7F) { [void]$jsonStr.Append([char]$code) }   # ASCII
    else { [void]$jsonStr.Append('\u' + $code.ToString('X4')) }      # non-ASCII
}
$body = '{"query":"' + $jsonStr.ToString() + '"}'

$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json; charset=utf-8' }
$uri = "https://api.supabase.com/v1/projects/$project/database/query"

Write-Output ("Sending migration (" + $body.Length + " bytes)...")
# Send raw UTF-8 bytes so Arabic text inside SQL comments cannot corrupt the JSON frame.
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
$resp = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $bodyBytes
Write-Output ("APPLIED OK. rows=" + $resp.Count)
if ($resp) { Write-Output ($resp | ConvertTo-Json -Compress -Depth 4) }

# Reload PostgREST schema cache so the re-created functions are picked up immediately
$reload = @{ query = "NOTIFY pgrst, 'reload schema';" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $reload | Out-Null
    Write-Output 'PostgREST schema cache reloaded.'
} catch {
    Write-Output ('Reload note: ' + $_.Exception.Message)
}

# Verify the functions exist after the run
$verify = @{ query = "SELECT proname, pg_get_function_identity_arguments(oid) AS args FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('get_dashboard_summary','get_sales_chart_data','get_low_stock_products','get_top_products_and_customers','get_expense_categories_summary','get_top_selling_products','get_debt_followup_dashboard','report_trial_balance','report_profit_loss') ORDER BY proname" } | ConvertTo-Json
$vresp = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $verify
Write-Output ("Verified " + $vresp.Count + " functions:")
$vresp | ForEach-Object { Write-Output ("  " + $_.proname + "(" + $_.args + ")") }

