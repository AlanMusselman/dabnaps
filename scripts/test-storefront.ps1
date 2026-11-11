# Automated Test Suite for Dabnaps 1.0 Storefront & Catalog
$ErrorActionPreference = "Stop"

Write-Host "=== TEST 1: CATALOG & INVENTORY AUDIT ===" -ForegroundColor Cyan
$inv = Get-Content 'data/inventory.json' -Raw | ConvertFrom-Json
if ($inv.products.Count -ne 9) {
    throw "Expected 9 products, found $($inv.products.Count)"
}
Write-Host "[PASS] Product count: $($inv.products.Count)" -ForegroundColor Green

$catGroups = $inv.products | Group-Object category
foreach ($g in $catGroups) {
    if ($g.Count -ne 3) {
        throw "Expected 3 products in $($g.Name), found $($g.Count)"
    }
    Write-Host "[PASS] Category '$($g.Name)' has exactly 3 SKUs" -ForegroundColor Green
}

$totalStock = ($inv.products | Measure-Object -Property stock -Sum).Sum
if ($totalStock -ne 205) {
    throw "Expected 205 total stock, found $totalStock"
}
Write-Host "[PASS] Total simulated stock: $totalStock" -ForegroundColor Green

if ($inv.company.discountCodes.DISCORD25.rate -ne 0.25) {
    throw "Expected DISCORD25 rate 0.25, found $($inv.company.discountCodes.DISCORD25.rate)"
}
Write-Host "[PASS] DISCORD25 discount rate is 25%" -ForegroundColor Green

if ($inv.orders.Count -ne 0) {
    throw "Expected initial orders count 0, found $($inv.orders.Count)"
}
Write-Host "[PASS] Initial orders array is empty" -ForegroundColor Green

Write-Host "`n=== TEST 2: IMAGE ASSET EXISTENCE & MARGINS ===" -ForegroundColor Cyan
foreach ($p in $inv.products) {
    if (-not (Test-Path $p.image)) {
        throw "Missing image file: $($p.image) for SKU $($p.sku)"
    }
    $margin = [math]::Round((($p.price - $p.cost) / $p.price) * 100, 1)
    if ($margin -lt 50.0) {
        throw "Margin for SKU $($p.sku) is $margin%, which is below 50%"
    }
    Write-Host "[PASS] $($p.sku) | Retail: `$$($p.price) | Cost: `$$($p.cost) | Margin: $margin% | Stock: $($p.stock) | Image OK" -ForegroundColor Green
}

Write-Host "`n=== TEST 3: JARGON & PRIVACY HYGIENE SCAN ===" -ForegroundColor Cyan
$forbidden = 'bambu|p2s|vacuum|degass|antigravity|boost|teamwork|deep research|shore|in-house lab|fabrication lab'

$htmlHits = Select-String -Path 'index.html' -Pattern $forbidden
if ($htmlHits) {
    throw "Found forbidden terms in index.html: $($htmlHits | Out-String)"
}
Write-Host "[PASS] index.html has 0 forbidden in-house/AI terms" -ForegroundColor Green

$jsHits = Select-String -Path 'assets/app.js' -Pattern $forbidden
if ($jsHits) {
    throw "Found forbidden terms in assets/app.js: $($jsHits | Out-String)"
}
Write-Host "[PASS] assets/app.js has 0 forbidden in-house/AI terms" -ForegroundColor Green

$dataHits = Select-String -Path 'data/inventory.json', 'data/inventory-sync.js' -Pattern $forbidden
if ($dataHits) {
    throw "Found forbidden terms in data files: $($dataHits | Out-String)"
}
Write-Host "[PASS] data files have 0 forbidden in-house/AI terms" -ForegroundColor Green

$htmlPromoLeak = Select-String -Path 'index.html' -Pattern 'DISCORD25|quickApplyDiscord25'
if ($htmlPromoLeak) {
    throw "Found private promo code DISCORD25 advertised in index.html: $($htmlPromoLeak | Out-String)"
}
Write-Host "[PASS] index.html does not publicly advertise private DISCORD25 promo code" -ForegroundColor Green

$jsPromoLeak = Select-String -Path 'assets/app.js' -Pattern 'quickApplyDiscord25|use code DISCORD25'
if ($jsPromoLeak) {
    throw "Found public DISCORD25 quick-apply or toast hint in assets/app.js: $($jsPromoLeak | Out-String)"
}
Write-Host "[PASS] assets/app.js keeps DISCORD25 private (no quick-apply or error toast leak)" -ForegroundColor Green

$deployHits = Select-String -Path 'scripts/deploy-godaddy.ps1' -Pattern 'BOOST\.md|TEAMWORK\.md|DEEP_RESEARCH\.md|BRAND_AND_OPERATIONS\.md'
if ($deployHits) {
    throw "Found internal playbooks in deploy-godaddy.ps1: $($deployHits | Out-String)"
}
Write-Host "[PASS] scripts/deploy-godaddy.ps1 excludes internal playbooks" -ForegroundColor Green

if (Test-Path 'dabnaps-godaddy-upload.zip') {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zipCheck = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path 'dabnaps-godaddy-upload.zip').Path)
    try {
        $backslashEntries = $zipCheck.Entries | Where-Object { $_.FullName.Contains('\') }
        if ($backslashEntries) {
            throw "Found Windows backslash paths in dabnaps-godaddy-upload.zip: $($backslashEntries.FullName -join ', ')"
        }
        $zipIndex = $zipCheck.GetEntry('index.html')
        if (-not $zipIndex) {
            throw "dabnaps-godaddy-upload.zip is missing index.html"
        }
        $reader = New-Object System.IO.StreamReader($zipIndex.Open())
        $zipIndexHtml = $reader.ReadToEnd()
        $reader.Close()
        if ($zipIndexHtml.Contains('DISCORD25') -or $zipIndexHtml.Contains('quickApplyDiscord25')) {
            throw "Packaged index.html inside dabnaps-godaddy-upload.zip leaks DISCORD25"
        }
        Write-Host "[PASS] dabnaps-godaddy-upload.zip uses POSIX forward slashes and clean index.html" -ForegroundColor Green
    } finally {
        $zipCheck.Dispose()
    }
}

Write-Host "`n=== TEST 4: LOCAL SERVER PROBE (http://localhost:8080/) ===" -ForegroundColor Cyan
try {
    $res = Invoke-WebRequest -Uri 'http://localhost:8080/' -UseBasicParsing
    if ($res.StatusCode -ne 200) {
        throw "Expected status code 200, got $($res.StatusCode)"
    }
    Write-Host "[PASS] http://localhost:8080/ returned HTTP 200 OK" -ForegroundColor Green

    if ($res.Content -match '<title>(.*?)</title>') {
        Write-Host "[PASS] Storefront Title: $($Matches[1])" -ForegroundColor Green
    } else {
        throw "Could not match title in http://localhost:8080/"
    }

    if ($res.Content.Contains('DISCORD25') -or $res.Content.Contains('quickApplyDiscord25')) {
        throw "Storefront HTML publicly leaks private DISCORD25 code"
    }
    Write-Host "[PASS] Storefront HTML does not leak DISCORD25 code publicly" -ForegroundColor Green

    if (-not $res.Content.Contains('placeholder="Enter promo code"')) {
        throw "Storefront HTML missing clean promo code input placeholder"
    }
    Write-Host "[PASS] Storefront contains clean promo code input field" -ForegroundColor Green

    if (-not $res.Content.Contains('Cloud Bag')) {
        throw "Storefront HTML missing Cloud Bag element"
    }
    Write-Host "[PASS] Storefront contains Cloud Bag cart element" -ForegroundColor Green

    # Probe static assets
    $cssRes = Invoke-WebRequest -Uri 'http://localhost:8080/assets/styles.css' -UseBasicParsing
    if ($cssRes.StatusCode -ne 200) { throw "Failed to load /assets/styles.css" }
    Write-Host "[PASS] /assets/styles.css returned HTTP 200 OK" -ForegroundColor Green

    $jsRes = Invoke-WebRequest -Uri 'http://localhost:8080/assets/app.js' -UseBasicParsing
    if ($jsRes.StatusCode -ne 200) { throw "Failed to load /assets/app.js" }
    Write-Host "[PASS] /assets/app.js returned HTTP 200 OK" -ForegroundColor Green

    # Probe all 9 dedicated product images
    foreach ($prod in $inv.products) {
        $pUrl = "http://localhost:8080/$($prod.image.Replace('\', '/'))"
        $pRes = Invoke-WebRequest -Uri $pUrl -UseBasicParsing
        if ($pRes.StatusCode -ne 200) { throw "Failed to load product image: $pUrl" }
        Write-Host "[PASS] $($prod.sku) image returned HTTP 200 OK ($($pRes.RawContentLength) bytes)" -ForegroundColor Green
    }
} catch {
    throw "Server probe failed: $_"
}

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host "  ALL 4 VERIFICATION TEST SUITES PASSED FLAWLESSLY!   " -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
