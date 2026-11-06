<#
.SYNOPSIS
    Dabnaps.gg One-Click GoDaddy FTP Deployment & Inventory Sync Script
.DESCRIPTION
    Automatically syncs local inventory data and uploads your Dabnaps.gg storefront,
    API, images, and inventory database directly to your GoDaddy Web Hosting server via FTP.
.EXAMPLE
    .\scripts\deploy-godaddy.ps1
    .\scripts\deploy-godaddy.ps1 -InventoryOnly
#>

param(
    [switch]$InventoryOnly = $false
)

$ErrorActionPreference = "Stop"
$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
$ConfigPath = Join-Path $WorkspaceRoot ".godaddy-ftp.json"

# 1. Always sync data/inventory.json -> data/inventory-sync.js first
$ManageScript = Join-Path $PSScriptRoot "manage-inventory.ps1"
if (Test-Path $ManageScript) {
    & $ManageScript -Action sync | Out-Null
}

# 2. Load or Prompt for GoDaddy FTP Credentials
if (Test-Path $ConfigPath) {
    $Config = Get-Content -Path $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
} else {
    Write-Host "`n=== FIRST-TIME GODADDY FTP SETUP (dabnaps.gg) ===" -ForegroundColor Cyan
    Write-Host "Enter your GoDaddy cPanel FTP details (they will be saved locally to .godaddy-ftp.json):`n" -ForegroundColor Gray
    $FtpHost = Read-Host "1. FTP Host / IP (e.g. ftp.dabnaps.gg or your GoDaddy Server IP)"
    $FtpUser = Read-Host "2. FTP Username (e.g. your cPanel login or user@dabnaps.gg)"
    $FtpPass = Read-Host "3. FTP Password"
    $RemoteRoot = Read-Host "4. Remote Folder (press Enter for '/public_html', or '/' if FTP user is already rooted)"
    if ([string]::IsNullOrWhiteSpace($RemoteRoot)) { $RemoteRoot = "/public_html" }

    $Config = [PSCustomObject]@{
        ftpHost    = $FtpHost.Trim()
        ftpUser    = $FtpUser.Trim()
        ftpPass    = $FtpPass
        remoteRoot = $RemoteRoot.TrimEnd('/')
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

if ($InventoryOnly) {
    # Fast sync: only push updated inventory data
    Upload-FtpFile (Join-Path $WorkspaceRoot "data\inventory.json") "data/inventory.json"
    Upload-FtpFile (Join-Path $WorkspaceRoot "data\inventory-sync.js") "data/inventory-sync.js"
    Write-Host "`n[SUCCESS] Live dabnaps.gg GoDaddy inventory updated!" -ForegroundColor Green
    exit 0
}

# Full site deployment
Ensure-FtpDirectory "ftp://$($Config.ftpHost)$CleanRoot/assets"
Ensure-FtpDirectory "ftp://$($Config.ftpHost)$CleanRoot/assets/images"
Ensure-FtpDirectory "ftp://$($Config.ftpHost)$CleanRoot/assets/images/logos"

$FilesToDeploy = @(
    @{ Local = "index.html";                              Remote = "index.html" },
    @{ Local = "favicon.ico";                             Remote = "favicon.ico" },
    @{ Local = "api.php";                                 Remote = "api.php" },
    @{ Local = "data\inventory.json";                     Remote = "data/inventory.json" },
    @{ Local = "data\inventory-sync.js";                  Remote = "data/inventory-sync.js" },
    @{ Local = "assets\styles.css";                       Remote = "assets/styles.css" },
    @{ Local = "assets\app.js";                           Remote = "assets/app.js" },
    @{ Local = "assets\blanket-tech-pack.svg";            Remote = "assets/blanket-tech-pack.svg" },
    @{ Local = "assets\blanket-pattern-guide.html";       Remote = "assets/blanket-pattern-guide.html" },
    @{ Local = "assets\images\logo.png";                  Remote = "assets/images/logo.png" },
    @{ Local = "assets\images\logo-icon.png";             Remote = "assets/images/logo-icon.png" },
    @{ Local = "assets\images\silicone-tray.png";         Remote = "assets/images/silicone-tray.png" },
    @{ Local = "assets\images\dab-tools.png";             Remote = "assets/images/dab-tools.png" },
    @{ Local = "assets\images\fluffy-blanket.png";        Remote = "assets/images/fluffy-blanket.png" },
    @{ Local = "assets\images\golden-cloud-blanket-flatlay.png"; Remote = "assets/images/golden-cloud-blanket-flatlay.png" }
)

Get-ChildItem -Path (Join-Path $WorkspaceRoot "assets\images\logos") -File | ForEach-Object {
    $FilesToDeploy += @{
        Local  = "assets\images\logos\$($_.Name)"
        Remote = "assets/images/logos/$($_.Name)"
    }
}

foreach ($Item in $FilesToDeploy) {
    $FullPath = Join-Path $WorkspaceRoot $Item.Local
    if (Test-Path $FullPath) {
        Upload-FtpFile -LocalFilePath $FullPath -RemoteRelativePath $Item.Remote
    }
}

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  DABNAPS.GG DEPLOYED TO GODADDY SUCCESSFULLY!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
