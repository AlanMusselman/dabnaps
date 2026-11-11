<#
.SYNOPSIS
    Dabnaps.gg One-Click GoDaddy FTP Deployment & Storefront Sync Script
.DESCRIPTION
    Syncs local catalog data and uploads the Dabnaps (dabnaps.gg) on-demand storefront
    and brand assets directly to your GoDaddy Web Hosting server via FTP.
    Internal strategy playbooks are excluded from deployment for customer privacy.
.EXAMPLE
    .\scripts\deploy-godaddy.ps1
#>

param(
    [switch]$InventoryOnly = $false,
    [string]$FtpHost = "",
    [string]$FtpUser = "",
    [string]$FtpPass = "",
    [string]$RemoteRoot = "",
    [switch]$NonInteractive = $false,
    [switch]$PackageZipOnly = $false
)

$ErrorActionPreference = "Stop"
$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
$ConfigPath = Join-Path $WorkspaceRoot ".godaddy-ftp.json"
$ZipPath = Join-Path $WorkspaceRoot "dabnaps-godaddy-upload.zip"

# Curated files for public storefront deployment (strictly excludes internal markdown playbooks)
$FilesToDeploy = @(
    @{ Local = "index.html";                              Remote = "index.html" },
    @{ Local = "CNAME";                                   Remote = "CNAME" },
    @{ Local = "favicon.ico";                             Remote = "favicon.ico" },
    @{ Local = "data\inventory.json";                     Remote = "data/inventory.json" },
    @{ Local = "data\inventory-sync.js";                  Remote = "data/inventory-sync.js" },
    @{ Local = "assets\styles.css";                       Remote = "assets/styles.css" },
    @{ Local = "assets\app.js";                           Remote = "assets/app.js" },
    @{ Local = "assets\images\logo.png";                  Remote = "assets/images/logo.png" },
    @{ Local = "assets\images\logo-icon.png";             Remote = "assets/images/logo-icon.png" },
    @{ Local = "assets\images\fluffy-blanket.png";        Remote = "assets/images/fluffy-blanket.png" },
    @{ Local = "assets\images\silicone-tray.png";         Remote = "assets/images/silicone-tray.png" },
    @{ Local = "assets\images\dab-tools.png";             Remote = "assets/images/dab-tools.png" },
    @{ Local = "assets\images\products\blanket-sherpa-throw.png"; Remote = "assets/images/products/blanket-sherpa-throw.png" },
    @{ Local = "assets\images\products\blanket-velveteen.png";    Remote = "assets/images/products/blanket-velveteen.png" },
    @{ Local = "assets\images\products\blanket-hooded-cloak.png"; Remote = "assets/images/products/blanket-hooded-cloak.png" },
    @{ Local = "assets\images\products\mat-hexagon.png";          Remote = "assets/images/products/mat-hexagon.png" },
    @{ Local = "assets\images\products\mat-xl-runner.png";        Remote = "assets/images/products/mat-xl-runner.png" },
    @{ Local = "assets\images\products\mat-pocket-travel.png";    Remote = "assets/images/products/mat-pocket-travel.png" },
    @{ Local = "assets\images\products\tool-titanium-carver.png"; Remote = "assets/images/products/tool-titanium-carver.png" },
    @{ Local = "assets\images\products\tool-5pc-kit.png";         Remote = "assets/images/products/tool-5pc-kit.png" },
    @{ Local = "assets\images\products\tool-magnetic-stand.png";  Remote = "assets/images/products/tool-magnetic-stand.png" }
)

# Dynamically add any additional files in logos and products
$LogosDir = Join-Path $WorkspaceRoot "assets\images\logos"
if (Test-Path $LogosDir) {
    Get-ChildItem -Path $LogosDir -File | ForEach-Object {
        $entryLocal = "assets\images\logos\$($_.Name)"
        $entryRemote = "assets/images/logos/$($_.Name)"
        if (-not ($FilesToDeploy | Where-Object { $_.Local -eq $entryLocal })) {
            $FilesToDeploy += @{ Local = $entryLocal; Remote = $entryRemote }
        }
    }
}

$ProductsDir = Join-Path $WorkspaceRoot "assets\images\products"
if (Test-Path $ProductsDir) {
    Get-ChildItem -Path $ProductsDir -File | ForEach-Object {
        $entryLocal = "assets\images\products\$($_.Name)"
        $entryRemote = "assets/images/products/$($_.Name)"
        if (-not ($FilesToDeploy | Where-Object { $_.Local -eq $entryLocal })) {
            $FilesToDeploy += @{ Local = $entryLocal; Remote = $entryRemote }
        }
    }
}

# 1. Package Zip Archive (using forward-slash POSIX entry paths for Linux/cPanel compatibility)
Write-Host "`n=== PACKAGING RELEASE ARCHIVE ($ZipPath) ===" -ForegroundColor Cyan
if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipArchive = [System.IO.Compression.ZipFile]::Open($ZipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($Item in $FilesToDeploy) {
        $srcFile = Join-Path $WorkspaceRoot $Item.Local
        if (Test-Path $srcFile) {
            $entryName = $Item.Remote.Replace('\', '/').TrimStart('/')
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zipArchive,
                $srcFile,
                $entryName,
                [System.IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null
        }
    }
} finally {
    $zipArchive.Dispose()
}
$ZipItem = Get-Item $ZipPath
Write-Host "[OK] Created release zip: $ZipPath ($([math]::Round($ZipItem.Length / 1MB, 2)) MB)" -ForegroundColor Green

if ($PackageZipOnly) {
    Write-Host "`nPackaging complete (--PackageZipOnly specified). Exiting." -ForegroundColor Green
    return
}

# 2. Resolve GoDaddy FTP Credentials
$Config = $null
if (Test-Path $ConfigPath) {
    $Config = Get-Content -Path $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
} elseif ($FtpHost -and $FtpUser -and $FtpPass) {
    $cleanRoot = if ($RemoteRoot) { $RemoteRoot.TrimEnd('/') } else { "/public_html" }
    $Config = [PSCustomObject]@{
        ftpHost    = $FtpHost.Trim()
        ftpUser    = $FtpUser.Trim()
        ftpPass    = $FtpPass
        remoteRoot = $cleanRoot
    }
} elseif ($env:GODADDY_FTP_HOST -and $env:GODADDY_FTP_USER -and $env:GODADDY_FTP_PASS) {
    $cleanRoot = if ($env:GODADDY_FTP_ROOT) { $env:GODADDY_FTP_ROOT.TrimEnd('/') } else { "/public_html" }
    $Config = [PSCustomObject]@{
        ftpHost    = $env:GODADDY_FTP_HOST.Trim()
        ftpUser    = $env:GODADDY_FTP_USER.Trim()
        ftpPass    = $env:GODADDY_FTP_PASS
        remoteRoot = $cleanRoot
    }
} else {
    $isAutomated = $NonInteractive -or [Console]::IsInputRedirected -or (-not [Environment]::UserInteractive)
    if ($isAutomated) {
        Write-Host "`n[NOTICE] GoDaddy FTP credentials (.godaddy-ftp.json) not detected in automated environment." -ForegroundColor Yellow
        Write-Host "Release package dabnaps-godaddy-upload.zip is ready for direct upload in cPanel File Manager or FTP." -ForegroundColor Yellow
        Write-Host "To configure automated FTP, provide .godaddy-ftp.json or set GODADDY_FTP_HOST, GODADDY_FTP_USER, and GODADDY_FTP_PASS." -ForegroundColor Gray
        return
    }

    Write-Host "`n=== FIRST-TIME GODADDY FTP SETUP (dabnaps.gg) ===" -ForegroundColor Cyan
    Write-Host "Enter your GoDaddy cPanel FTP details (they will be saved locally to .godaddy-ftp.json):`n" -ForegroundColor Gray
    $promptHost = Read-Host "1. FTP Host / IP (e.g. ftp.dabnaps.gg or your GoDaddy Server IP)"
    $promptUser = Read-Host "2. FTP Username (e.g. your cPanel login or user@dabnaps.gg)"
    $promptPass = Read-Host "3. FTP Password"
    $promptRoot = Read-Host "4. Remote Folder (press Enter for '/public_html', or '/' if FTP user is already rooted)"
    if ([string]::IsNullOrWhiteSpace($promptRoot)) { $promptRoot = "/public_html" }

    if ([string]::IsNullOrWhiteSpace($promptHost) -or [string]::IsNullOrWhiteSpace($promptUser)) {
        Write-Host "[WARN] Incomplete FTP credentials provided. Package is available at $ZipPath." -ForegroundColor Yellow
        return
    }

    $Config = [PSCustomObject]@{
        ftpHost    = $promptHost.Trim()
        ftpUser    = $promptUser.Trim()
        ftpPass    = $promptPass
        remoteRoot = $promptRoot.TrimEnd('/')
    }
    $Config | ConvertTo-Json | Set-Content -Path $ConfigPath -Encoding UTF8
    Write-Host "`n[OK] Saved FTP configuration to $ConfigPath`n" -ForegroundColor Green
}

$Creds = New-Object System.Net.NetworkCredential($Config.ftpUser, $Config.ftpPass)

function Ensure-FtpDirectory {
    param([string]$RemoteDirUrl)
    try {
        $Req = [System.Net.FtpWebRequest]::Create($RemoteDirUrl)
        $Req.Credentials = $Creds
        $Req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $Req.UsePassive = $true
        $Req.KeepAlive = $false
        $Resp = $Req.GetResponse()
        $Resp.Close()
    } catch {
        # Directory already exists or parent handles it
    }
}

function Upload-FtpFile {
    param(
        [string]$LocalFilePath,
        [string]$RemoteRelativePath
    )
    $CleanRoot = $Config.remoteRoot.TrimEnd('/')
    $RemoteUrl = "ftp://$($Config.ftpHost)$CleanRoot/$($RemoteRelativePath.TrimStart('/'))"

    Write-Host "Uploading $RemoteRelativePath -> $RemoteUrl ..." -ForegroundColor Yellow -NoNewline

    $FileBytes = [System.IO.File]::ReadAllBytes($LocalFilePath)
    $Req = [System.Net.FtpWebRequest]::Create($RemoteUrl)
    $Req.Credentials = $Creds
    $Req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $Req.UseBinary = $true
    $Req.UsePassive = $true
    $Req.KeepAlive = $false
    $Req.ContentLength = $FileBytes.Length

    $Stream = $Req.GetRequestStream()
    $Stream.Write($FileBytes, 0, $FileBytes.Length)
    $Stream.Close()

    $Resp = $Req.GetResponse()
    $Resp.Close()
    Write-Host " [DONE]" -ForegroundColor Green
}

Write-Host "`n=== DEPLOYING DABNAPS.GG TO GODADDY ($($Config.ftpHost)) ===" -ForegroundColor Cyan

$CleanRoot = $Config.remoteRoot.TrimEnd('/')
Ensure-FtpDirectory "ftp://$($Config.ftpHost)$CleanRoot/data"
Ensure-FtpDirectory "ftp://$($Config.ftpHost)$CleanRoot/assets"
Ensure-FtpDirectory "ftp://$($Config.ftpHost)$CleanRoot/assets/images"
Ensure-FtpDirectory "ftp://$($Config.ftpHost)$CleanRoot/assets/images/logos"
Ensure-FtpDirectory "ftp://$($Config.ftpHost)$CleanRoot/assets/images/products"

foreach ($Item in $FilesToDeploy) {
    $FullPath = Join-Path $WorkspaceRoot $Item.Local
    if (Test-Path $FullPath) {
        Upload-FtpFile -LocalFilePath $FullPath -RemoteRelativePath $Item.Remote
    }
}

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  DABNAPS.GG DEPLOYED TO GODADDY SUCCESSFULLY!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
