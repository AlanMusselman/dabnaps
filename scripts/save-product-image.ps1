param(
    [Parameter(Mandatory=$true)][string]$SrcPath,
    [Parameter(Mandatory=$true)][string]$DestName
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$destDir = Join-Path $PSScriptRoot "..\assets\images\products"
if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

$destPath = Join-Path $destDir $DestName
$img = [System.Drawing.Image]::FromFile($SrcPath)
$img.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()

Write-Host "SAVED: $destPath ($((Get-Item $destPath).Length) bytes)"
