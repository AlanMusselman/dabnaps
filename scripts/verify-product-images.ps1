# Verify HTTP 200 on all 9 product images from local server
$ErrorActionPreference = "Stop"

$invPath = Join-Path $PSScriptRoot "..\data\inventory.json"
$inv = Get-Content $invPath -Raw -Encoding UTF8 | ConvertFrom-Json

Write-Host "`n=== PROBING ALL 9 PRODUCT IMAGES ON http://localhost:8080/ ===" -ForegroundColor Cyan

$passed = 0
$failed = 0

foreach ($p in $inv.products) {
    $urlPath = $p.image.Replace('\', '/')
    $fullUrl = "http://localhost:8080/$urlPath"
    try {
        $res = Invoke-WebRequest -Uri $fullUrl -UseBasicParsing -TimeoutSec 5
        if ($res.StatusCode -eq 200) {
            Write-Host "  [HTTP 200 OK] $($p.sku): $fullUrl ($($res.RawContentLength) bytes)" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "  [FAIL $($res.StatusCode)] $($p.sku): $fullUrl" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "  [ERROR] $($p.sku): $fullUrl - $_" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`nResult: $passed Passed, $failed Failed out of $($inv.products.Count) products." -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })

if ($failed -gt 0) {
    throw "$failed product images failed HTTP verification."
}
