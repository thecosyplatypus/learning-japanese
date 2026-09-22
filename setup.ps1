# setup.ps1 - one-time installer for Learning Japanese.
# Ensures Node.js is available (installs a local copy if needed) and runs npm install.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

$localNode = Join-Path $here 'node-js'
$localExe  = Join-Path $localNode 'node.exe'

function Install-LocalNode {
  if (Test-Path $localExe) { return }
  Write-Host 'Node.js was not found - downloading a local copy (one-time)...' -ForegroundColor Cyan
  $index = Invoke-RestMethod -UseBasicParsing 'https://nodejs.org/dist/index.json'
  $lts = $index | Where-Object { $_.lts } | Select-Object -First 1
  if (-not $lts) { throw 'Could not determine the latest Node.js version. Check your internet connection.' }
  $ver = $lts.version
  $url = "https://nodejs.org/dist/$ver/node-$ver-win-x64.zip"
  $zip = Join-Path $env:TEMP "node-$ver.zip"
  $tmp = Join-Path $env:TEMP "node-$ver-win-x64"
  Write-Host "Downloading Node.js $ver ..." -ForegroundColor Cyan
  Invoke-WebRequest -UseBasicParsing $url -OutFile $zip
  if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
  Write-Host 'Extracting...' -ForegroundColor Cyan
  Expand-Archive -Path $zip -DestinationPath $env:TEMP -Force
  Remove-Item $zip -Force
  if (-not (Test-Path $localNode)) { New-Item -ItemType Directory -Path $localNode | Out-Null }
  Copy-Item (Join-Path $tmp '*') $localNode -Recurse -Force
  Remove-Item -Recurse -Force $tmp
  if (-not (Test-Path $localExe)) { throw 'Node.js download or extraction failed.' }
}

$needLocal = $false
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
  $ver = $null
  try { $ver = & node -v 2>$null } catch { $ver = $null }
  if ($ver -and ($ver -match '^v?(\d+)\.')) {
    if ([int]$Matches[1] -lt 16) { $needLocal = $true }
  } else {
    $needLocal = $true
  }
} else {
  $needLocal = $true
}

if ($needLocal) {
  Install-LocalNode
  $env:PATH = "$localNode;$env:PATH"
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is not available after setup.' }
}

Write-Host ("Using Node.js " + (& node -v))
Write-Host 'Installing Electron (one-time download)...' -ForegroundColor Cyan
& npm.cmd install
if ($LASTEXITCODE -ne 0) { throw 'npm install failed. Check your internet connection and try again.' }
Write-Host 'Setup complete.' -ForegroundColor Green